@echo off
echo ===================================
echo 開発環境再起動スクリプト
echo ===================================
echo.

echo [1/3] 既存のプロセスを停止中...
taskkill /F /IM node.exe 2>nul
echo Node.jsプロセスを停止しました
echo.

echo [2/3] ngrokを起動します...
echo 新しいウィンドウでngrokが開きます
echo.
start cmd /k "ngrok http 3000"
echo.

echo ngrokが起動したら、新しいURLをメモしてください
echo 例: https://xxxxx.ngrok-free.app
echo.
echo [3/3] 開発サーバーを起動します...
timeout /t 5 /nobreak > nul
echo.

echo NODE_ENV=developmentで起動（auth.testエラーを回避）
set NODE_ENV=development
npm run dev

pause