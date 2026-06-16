@echo off
chcp 65001 >nul
set PORT=8765
echo 正在释放端口 %PORT% ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
  echo 结束 PID=%%a
  taskkill /PID %%a /F >nul 2>&1
)
echo 完成。请重新双击 start.bat
pause
