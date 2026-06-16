@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
set PORT=8765
set URL=http://127.0.0.1:%PORT%/web/

echo ========================================
echo   抓住神经猫 - 本地网页试玩
echo ========================================
echo.

set PY=
where py >nul 2>&1 && set PY=py -3
if not defined PY where python >nul 2>&1 && set PY=python
if not defined PY (
  echo [错误] 未找到 Python。请安装 Python 3 并勾选 "Add to PATH"。
  pause
  exit /b 1
)

REM 清理占用本端口的旧 python 服务（多次双击 start.bat 会留下僵尸进程）
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  set FOUND=1
  echo 结束旧进程 PID=%%a （释放端口 %PORT%）
  taskkill /PID %%a /F >nul 2>&1
)
if !FOUND!==1 timeout /t 1 /nobreak >nul

echo 工作目录: %CD%
echo 服务地址: %URL%
echo 手机同 WiFi: http://本机IP:%PORT%/web/
echo.
echo *** 请保持本窗口打开；关闭窗口即停止服务 ***
echo.
if not exist "web\assets\spider\f00.png" (
  echo 导出蜘蛛耄耋素材...
  %PY% export_spider_web.py
)
echo.

start "" "%URL%"
%PY% -m http.server %PORT%
if errorlevel 1 (
  echo.
  echo [错误] 启动失败。可运行 stop.bat 后再试，或手动:
  echo   cd /d "%~dp0.."
  echo   python -m http.server 8766
  pause
)
