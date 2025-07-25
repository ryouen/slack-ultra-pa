@echo off
echo [STOP] Stopping Slack Personal Assistant...

REM Find and kill node processes running our app
for /f "tokens=2" %%i in ('tasklist ^| findstr "node.exe"') do (
    for /f "tokens=1" %%j in ('wmic process where ProcessId^=%%i get CommandLine 2^>nul ^| findstr "src\\app.js"') do (
        echo [STOP] Killing process %%i
        taskkill /F /PID %%i >nul 2>&1
    )
)

REM Also try to kill by port
for /f "tokens=5" %%i in ('netstat -aon ^| findstr ":3000"') do (
    echo [STOP] Killing process on port 3000 (PID: %%i)
    taskkill /F /PID %%i >nul 2>&1
)

echo [STOP] Application stopped.