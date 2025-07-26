@echo off
echo Starting ngrok with consistent subdomain...
echo.

REM 無料プランの場合、完全に同じURLは保証されませんが、
REM 以下のオプションで安定性を向上できます

REM 基本的なngrok起動（現在と同じ）
ngrok http 3000

REM 有料プランの場合は以下のようにサブドメインを指定
REM ngrok http 3000 --subdomain=your-custom-subdomain

echo.
echo Note: 無料プランでは毎回異なるURLが割り当てられます
echo 有料プランでは固定サブドメインが使用できます
echo.
echo Slack App設定でRequest URLを更新する必要があります：
echo 1. https://api.slack.com/apps でアプリを選択
echo 2. Event Subscriptions → Request URL を更新
echo 3. Interactivity & Shortcuts → Request URL を更新
echo 4. Slash Commands → 各コマンドのRequest URL を更新
pause