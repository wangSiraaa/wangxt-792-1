#!/bin/bash

set -e

echo "=== 二手捐赠分拣台 - 启动脚本 ==="

if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ 未找到 docker-compose 或 docker compose，请先安装 Docker"
    exit 1
fi

echo "📦 构建并启动容器..."
$DOCKER_COMPOSE up -d --build

echo "⏳ 等待服务启动..."
sleep 3

if curl -s http://localhost:3000 > /dev/null; then
    echo ""
    echo "✅ 服务启动成功！"
    echo "🌐 访问地址: http://localhost:3000"
    echo ""
    echo "📋 可用命令："
    echo "   查看日志: $DOCKER_COMPOSE logs -f"
    echo "   停止服务: $DOCKER_COMPOSE down"
else
    echo "❌ 服务启动失败，请检查日志"
    $DOCKER_COMPOSE logs
    exit 1
fi
