# PowerShell版の開発環境再起動スクリプト

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "開発環境再起動スクリプト" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# 1. 既存のNode.jsプロセスを停止
Write-Host "[1/3] 既存のプロセスを停止中..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Node.jsプロセスを停止しました" -ForegroundColor Green
Write-Host ""

# 2. ngrokを新しいウィンドウで起動
Write-Host "[2/3] ngrokを起動します..." -ForegroundColor Yellow
Write-Host "新しいウィンドウでngrokが開きます" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "ngrok http 3000"
Write-Host ""

# 3. URLメモの案内
Write-Host "========== 重要 ==========" -ForegroundColor Red
Write-Host "ngrokの新しいURLをメモしてください" -ForegroundColor Yellow
Write-Host "例: https://xxxxx.ngrok-free.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Slack App設定の更新が必要です:" -ForegroundColor Yellow
Write-Host "1. https://api.slack.com/apps" -ForegroundColor White
Write-Host "2. Event Subscriptions → Request URL" -ForegroundColor White
Write-Host "3. Interactivity & Shortcuts → Request URL" -ForegroundColor White
Write-Host "4. Slash Commands → 各コマンドのURL" -ForegroundColor White
Write-Host "=========================" -ForegroundColor Red
Write-Host ""

# 4. 少し待機
Write-Host "5秒後に開発サーバーを起動します..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 5. 開発サーバーを起動
Write-Host "[3/3] 開発サーバーを起動します..." -ForegroundColor Yellow
$env:NODE_ENV = "development"
Write-Host "NODE_ENV=development (auth.testエラーを回避)" -ForegroundColor Green
npm run dev