@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 直接用默认浏览器打开网页（需先运行 start.bat 启动服务）
echo.
echo 若尚未启动服务，请先双击 start.bat
start "" "http://127.0.0.1:8765/web/"
timeout /t 3 >nul
