@echo off
setlocal

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":3456 .*LISTENING"') do (
  taskkill /pid %%P /f >nul 2>nul
)

echo Silentium local server stopped.
timeout /t 2 /nobreak >nul
