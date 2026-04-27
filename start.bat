@echo off
REM ============================================================
REM  慢康智枢 ChroniCare OS — Windows 一键启动脚本
REM ============================================================
echo.
echo   ==========================================
echo   慢病管理平台 ChroniCare OS
echo   ==========================================
echo   前端:     http://localhost:8000
echo   API文档:  http://localhost:8000/docs
echo   健康检查: http://localhost:8000/health
echo   ==========================================
echo.

python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
