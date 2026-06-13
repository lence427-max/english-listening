@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "NODE_EXE=D:\node.js\node.exe"
if not exist "%NODE_EXE%" (
  for /f "delims=" %%I in ('where node 2^>nul') do (
    set "NODE_EXE=%%I"
    goto :node_found
  )
)

:node_found
if not exist "%NODE_EXE%" (
  echo [Silentium] 找不到 Node.js。
  echo 请确认 D:\node.js\node.exe 存在，或将 node.exe 加入 PATH。
  pause
  exit /b 1
)

title Silentium Local Server
echo.
echo ==========================================
echo   Silentium 本地服务器
echo ==========================================
echo.
echo 正在启动：http://192.168.31.234:3456
echo 使用网站期间请保持此窗口开启。
echo 按 Ctrl+C 可以停止服务器。
echo.

set "DISPLAY_HOST=192.168.31.234"
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://192.168.31.234:3456/'"

"%NODE_EXE%" "%~dp0scripts\serve-local.mjs"

echo.
echo [Silentium] 服务器已停止，或启动时发生错误。
pause
