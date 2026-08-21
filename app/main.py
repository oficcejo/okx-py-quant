from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.api import api_router
from app.workers.live_trading import start_scheduler, shutdown_scheduler
from app.services.okx_ws import okx_ws_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 初始化数据库（如果表不存在）
    init_db()
    # 启动调度器（用于实盘策略执行等）
    start_scheduler()
    # 启动 OKX WebSocket 行情接收
    try:
        await okx_ws_client.start()
    except Exception as e:
        print(f"[WS] 启动失败: {e}")

    yield

    # 关闭 WebSocket 与调度器
    try:
        await okx_ws_client.stop()
    except Exception:
        pass
    try:
        shutdown_scheduler()
    except Exception:
        pass



def create_app() -> FastAPI:
    app = FastAPI(
        title="OKX Quant Trading Bot",
        version="0.1.0",
        description="OKX 量化交易机器人后端（FastAPI）",
        lifespan=lifespan,
    )

    # 配置 CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],  # 前端地址
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册 API 路由
    app.include_router(api_router)

    @app.get("/health", tags=["system"])
    async def health_check():
        return {"status": "ok", "version": app.version}

    return app


app = create_app()

