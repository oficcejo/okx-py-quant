# ==========================================
# 阶段 1：构建 React 前端产物
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# 缓存前端依赖
COPY frontend/package*.json ./
RUN npm install

# 复制前端源码并执行打包构建
COPY frontend/ ./
RUN npm run build

# ==========================================
# 阶段 2：构建 Python 后端与完整全栈镜像
# ==========================================
FROM python:3.12-slim

WORKDIR /app

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DATABASE_URL=sqlite:////app/data/okx_quant.db

# 安装基础系统构建依赖与 curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制并安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端业务源码
COPY app/ ./app/
COPY *.py ./

# 复制前端打包产物（放置于 frontend/dist 供 FastAPI 直接挂载静态托管）
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# 创建持久化数据目录
RUN mkdir -p /app/data

# 暴露统一全栈端口
EXPOSE 8000

# 容器健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动单容器全栈服务 (Uvicorn 托管 API + WebSocket + React SPA)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

