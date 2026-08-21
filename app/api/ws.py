from __future__ import annotations

import asyncio
import json
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.okx_ws import okx_ws_client

router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


# 注册后台 WS 消息转发
def _on_ws_market_data(data: dict) -> None:
    asyncio.create_task(manager.broadcast(data))


okx_ws_client.register_subscriber(_on_ws_market_data)


@router.websocket("/market")
async def websocket_market_endpoint(websocket: WebSocket) -> None:
    """前端客户端连接的实时行情 WebSocket 端点"""
    await manager.connect(websocket)

    # 首次连接，先推送当前所有已知币种最新行情快照
    try:
        await websocket.send_json(
            {
                "type": "snapshot",
                "tickers": list(okx_ws_client.latest_tickers.values()),
            }
        )
    except Exception:
        manager.disconnect(websocket)
        return

    try:
        while True:
            # 保持连接活跃，接收客户端心跳 ping
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
