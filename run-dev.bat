@echo off
echo [START] Starting Slack Personal Assistant (Ctrl+C safe mode)...
echo.

REM Use node directly with tsx loader
node --loader tsx/esm --no-warnings src/app.ts

echo.
echo [STOP] Application stopped.
pause