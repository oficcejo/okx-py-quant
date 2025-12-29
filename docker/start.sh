#!/bin/bash

# OKX 量化交易系统 - Docker 快速启动脚本

set -e

echo "=================================="
echo "OKX 量化交易系统 - Docker 部署"
echo "=================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker Compose，请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，将从模板创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请编辑后再次运行"
    echo ""
    echo "必须配置以下项："
    echo "  - OKX_API_KEY"
    echo "  - OKX_API_SECRET"
    echo "  - OKX_PASSPHRASE"
    exit 1
fi

echo "✅ 环境变量文件存在"

# 询问用户操作
echo ""
echo "请选择操作："
echo "  1) 首次启动（构建并启动）"
echo "  2) 启动服务（使用现有镜像）"
echo "  3) 停止服务"
echo "  4) 重启服务"
echo "  5) 查看日志"
echo "  6) 清理所有（停止并删除容器、镜像）"
echo "  0) 退出"
echo ""
read -p "请输入选项 [0-6]: " option

case $option in
    1)
        echo ""
        echo "🔨 构建镜像..."
        docker-compose build
        echo ""
        echo "🚀 启动服务..."
        docker-compose up -d
        echo ""
        echo "✅ 服务已启动！"
        echo ""
        echo "访问地址："
        echo "  - 前端: http://localhost"
        echo "  - 后端API: http://localhost:8000"
        echo "  - API文档: http://localhost:8000/docs"
        echo ""
        echo "查看日志: docker-compose logs -f"
        ;;
    2)
        echo ""
        echo "🚀 启动服务..."
        docker-compose up -d
        echo ""
        echo "✅ 服务已启动！"
        ;;
    3)
        echo ""
        echo "🛑 停止服务..."
        docker-compose down
        echo ""
        echo "✅ 服务已停止"
        ;;
    4)
        echo ""
        echo "🔄 重启服务..."
        docker-compose restart
        echo ""
        echo "✅ 服务已重启"
        ;;
    5)
        echo ""
        echo "📋 查看日志（按 Ctrl+C 退出）..."
        docker-compose logs -f
        ;;
    6)
        echo ""
        read -p "⚠️  确认要清理所有容器和镜像吗？[y/N] " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo "🗑️  停止并删除容器..."
            docker-compose down
            echo "🗑️  删除镜像..."
            docker rmi okx-py-quant-qoder_backend okx-py-quant-qoder_frontend 2>/dev/null || true
            echo "✅ 清理完成"
        else
            echo "❌ 已取消"
        fi
        ;;
    0)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
