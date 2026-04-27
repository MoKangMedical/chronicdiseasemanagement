#!/bin/bash
# ============================================================
#  慢康智枢 ChroniCare OS — 一键启动脚本
# ============================================================
cd "$(dirname "$0")"

echo ""
echo "  =========================================="
echo "  🏥 慢康智枢 ChroniCare OS"
echo "  =========================================="
echo "  前端:     http://localhost:8000"
echo "  API文档:  http://localhost:8000/docs"
echo "  健康检查: http://localhost:8000/health"
echo "  =========================================="
echo ""

# 尝试使用 python3.12, 不存在则 fallback 到 python3 / python
PYTHON_CMD="python3.12"
if ! command -v "$PYTHON_CMD" &>/dev/null; then
    PYTHON_CMD="python3"
fi
if ! command -v "$PYTHON_CMD" &>/dev/null; then
    PYTHON_CMD="python"
fi

echo "使用 Python: $PYTHON_CMD"
echo ""

exec "$PYTHON_CMD" -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
