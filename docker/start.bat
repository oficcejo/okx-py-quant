@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==================================
echo OKX 量化交易系统 - Docker 部署
echo ==================================
echo.

REM 检查 Docker 是否安装
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Docker，请先安装 Docker Desktop
    pause
    exit /b 1
)

REM 检查 Docker Compose 是否安装
where docker-compose >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Docker Compose，请先安装 Docker Compose
    pause
    exit /b 1
)

echo ✅ Docker 和 Docker Compose 已安装
echo.

REM 检查 .env 文件
if not exist ".env" (
    echo ⚠️  未找到 .env 文件，将从模板创建...
    copy .env.example .env >nul
    echo ✅ 已创建 .env 文件，请编辑后再次运行
    echo.
    echo 必须配置以下项：
    echo   - OKX_API_KEY
    echo   - OKX_API_SECRET
    echo   - OKX_PASSPHRASE
    echo.
    pause
    exit /b 1
)

echo ✅ 环境变量文件存在
echo.

:menu
echo 请选择操作：
echo   1) 首次启动（构建并启动）
echo   2) 启动服务（使用现有镜像）
echo   3) 停止服务
echo   4) 重启服务
echo   5) 查看日志
echo   6) 清理所有（停止并删除容器、镜像）
echo   0) 退出
echo.
set /p option="请输入选项 [0-6]: "

if "%option%"=="1" goto build_start
if "%option%"=="2" goto start
if "%option%"=="3" goto stop
if "%option%"=="4" goto restart
if "%option%"=="5" goto logs
if "%option%"=="6" goto cleanup
if "%option%"=="0" goto exit
goto invalid

:build_start
echo.
echo 🔨 构建镜像...
docker-compose build
echo.
echo 🚀 启动服务...
docker-compose up -d
echo.
echo ✅ 服务已启动！
echo.
echo 访问地址：
echo   - 前端: http://localhost
echo   - 后端API: http://localhost:8000
echo   - API文档: http://localhost:8000/docs
echo.
echo 查看日志: docker-compose logs -f
echo.
pause
goto end

:start
echo.
echo 🚀 启动服务...
docker-compose up -d
echo.
echo ✅ 服务已启动！
echo.
pause
goto end

:stop
echo.
echo 🛑 停止服务...
docker-compose down
echo.
echo ✅ 服务已停止
echo.
pause
goto end

:restart
echo.
echo 🔄 重启服务...
docker-compose restart
echo.
echo ✅ 服务已重启
echo.
pause
goto end

:logs
echo.
echo 📋 查看日志（按 Ctrl+C 退出）...
docker-compose logs -f
goto end

:cleanup
echo.
set /p confirm="⚠️  确认要清理所有容器和镜像吗？[y/N] "
if /i "!confirm!"=="y" (
    echo 🗑️  停止并删除容器...
    docker-compose down
    echo 🗑️  删除镜像...
    docker rmi okx-py-quant-qoder_backend okx-py-quant-qoder_frontend 2>nul
    echo ✅ 清理完成
) else (
    echo ❌ 已取消
)
echo.
pause
goto end

:invalid
echo ❌ 无效选项
echo.
pause
goto menu

:exit
echo 👋 再见！
exit /b 0

:end
endlocal
