import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

    # 配置 CORS（支持本地开发与任意远程宿主机 IP 访问）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册 API 路由
    app.include_router(api_router)

    @app.get("/health", tags=["system"])
    async def health_check():
        return {"status": "ok", "version": app.version}

    # 注册静态文件与 SPA 路由（支持前后端单容器部署）
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    possible_dist_dirs = [
        os.path.join(base_dir, "frontend", "dist"),
        os.path.join(base_dir, "dist"),
        os.path.join(os.getcwd(), "frontend", "dist"),
        os.path.join(os.getcwd(), "dist"),
    ]

    dist_dir = None
    for d in possible_dist_dirs:
        if os.path.isdir(d) and os.path.exists(os.path.join(d, "index.html")):
            dist_dir = d
            break

    if dist_dir:
        assets_dir = os.path.join(dist_dir, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            if full_path.startswith(("api/", "ws/", "docs", "openapi.json", "redoc", "health")):
                return {"detail": "Not Found"}
            
            target_file = os.path.join(dist_dir, full_path)
            if os.path.isfile(target_file):
                return FileResponse(target_file)
            
            index_file = os.path.join(dist_dir, "index.html")
            if os.path.isfile(index_file):
                return FileResponse(index_file)
            return {"detail": "Not Found"}

    return app


app = create_app()


