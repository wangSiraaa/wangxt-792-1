@echo off
setlocal enabledelayedexpansion

echo === 二手捐赠分拣台 - 启动脚本 ===

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到 Docker，请先安装 Docker
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    set DOCKER_COMPOSE=docker compose
) else (
    where docker-compose >nul 2>&1
    if %errorlevel% equ 0 (
        set DOCKER_COMPOSE=docker-compose
    ) else (
        echo ❌ 未找到 docker-compose 或 docker compose
        pause
        exit /b 1
    )
)

echo 📦 构建并启动容器...
%DOCKER_COMPOSE% up -d --build

echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

curl -s http://localhost:3000 >nul
if %errorlevel% equ 0 (
    echo.
    echo ✅ 服务启动成功！
    echo 🌐 访问地址: http://localhost:3000
    echo.
    echo 📋 可用命令：
    echo    查看日志: %DOCKER_COMPOSE% logs -f
    echo    停止服务: %DOCKER_COMPOSE% down
) else (
    echo ❌ 服务启动失败，请检查日志
    %DOCKER_COMPOSE% logs
    pause
    exit /b 1
)

endlocal
