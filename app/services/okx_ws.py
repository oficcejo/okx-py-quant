from __future__ import annotations

import asyncio
import json
import traceback
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set

import websockets

from app.core.config import settings


class OkxWsClient:
    """OKX 公共 WebSocket 实时行情客户端与广播总线"""

    def __init__(self, ws_url: Optional[str] = None) -> None:
        # 支持实盘与模拟盘 WS 地址
        if ws_url:
            self.ws_url = ws_url
        elif getattr(settings, "okx_simulated", False) or "pap" in getattr(settings, "okx_base_url", ""):
            self.ws_url = "wss://wspap.okx.com:8443/ws/v5/public"
        else:
            self.ws_url = "wss://ws.okx.com:8443/ws/v5/public"


        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._subscribers: Set[Callable[[Dict[str, Any]], Any]] = set()

        # 内存最新行情缓存
        self.latest_tickers: Dict[str, Dict[str, Any]] = {
            "BTC-USDT-SWAP": {
                "instId": "BTC-USDT-SWAP",
                "last": "96500.0",
                "open24h": "94200.0",
                "high24h": "97200.0",
                "low24h": "93800.0",
                "vol24h": "125000",
                "change24h": "+2.44%",
                "ts": datetime.now().isoformat(),
            },
            "ETH-USDT-SWAP": {
                "instId": "ETH-USDT-SWAP",
                "last": "2780.0",
                "open24h": "2690.0",
                "high24h": "2820.0",
                "low24h": "2660.0",
                "vol24h": "480000",
                "change24h": "+3.35%",
                "ts": datetime.now().isoformat(),
            },
            "SOL-USDT-SWAP": {
                "instId": "SOL-USDT-SWAP",
                "last": "185.5",
                "open24h": "178.0",
                "high24h": "191.0",
                "low24h": "175.2",
                "vol24h": "920000",
                "change24h": "+4.21%",
                "ts": datetime.now().isoformat(),
            },
        }

        self.subscribed_channels = [
            {"channel": "tickers", "instId": "BTC-USDT-SWAP"},
            {"channel": "tickers", "instId": "ETH-USDT-SWAP"},
            {"channel": "tickers", "instId": "SOL-USDT-SWAP"},
            {"channel": "tickers", "instId": "DOGE-USDT-SWAP"},
        ]

    def register_subscriber(self, callback: Callable[[Dict[str, Any]], Any]) -> None:
        self._subscribers.add(callback)

    def unregister_subscriber(self, callback: Callable[[Dict[str, Any]], Any]) -> None:
        self._subscribers.discard(callback)

    async def _broadcast(self, data: Dict[str, Any]) -> None:
        for cb in list(self._subscribers):
            try:
                res = cb(data)
                if asyncio.iscoroutine(res):
                    await res
            except Exception:
                pass

    async def start(self) -> None:
        """启动后台 WebSocket 连接任务"""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        """停止 WebSocket"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run_loop(self) -> None:
        while self._running:
            try:
                async with websockets.connect(
                    self.ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    # 发送订阅请求
                    sub_msg = {"op": "subscribe", "args": self.subscribed_channels}
                    await ws.send(json.dumps(sub_msg))

                    while self._running:
                        msg = await ws.recv()
                        if msg == "pong":
                            continue

                        try:
                            parsed = json.loads(msg)
                            if "data" in parsed and isinstance(parsed["data"], list):
                                for item in parsed["data"]:
                                    inst_id = item.get("instId")
                                    if inst_id:
                                        last_p = float(item.get("last", 0) or 0)
                                        open_p = float(item.get("open24h", last_p) or last_p)
                                        chg = ((last_p - open_p) / open_p * 100) if open_p > 0 else 0.0
                                        chg_str = f"{'+' if chg >= 0 else ''}{chg:.2f}%"

                                        ticker_data = {
                                            "instId": inst_id,
                                            "last": str(last_p),
                                            "open24h": str(open_p),
                                            "high24h": item.get("high24h", str(last_p)),
                                            "low24h": item.get("low24h", str(last_p)),
                                            "vol24h": item.get("vol24h", "0"),
                                            "change24h": chg_str,
                                            "ts": datetime.now().isoformat(),
                                        }
                                        self.latest_tickers[inst_id] = ticker_data
                                        await self._broadcast({"type": "ticker", "data": ticker_data})
                        except Exception as parse_err:
                            pass
            except Exception as e:
                # 若外部 WebSocket 连接失败（如无外网或被墙），等待重试
                await asyncio.sleep(5)


# 全局单例
okx_ws_client = OkxWsClient()
