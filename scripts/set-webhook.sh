#!/usr/bin/env bash
set -euo pipefail

# Re-registers the Telegram webhook after local dev (polling mode deletes it)
# Usage: npm run webhook

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "Error: TELEGRAM_BOT_TOKEN not set"
  exit 1
fi

WEBHOOK_URL="${WEBHOOK_URL:-https://replai-bot-388390937362.us-central1.run.app}"
SECRET="${WEBHOOK_SECRET:-}"

echo "Setting webhook to ${WEBHOOK_URL}/webhook ..."

PARAMS="url=${WEBHOOK_URL}/webhook"
if [ -n "$SECRET" ]; then
  PARAMS="${PARAMS}&secret_token=${SECRET}"
fi

RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?${PARAMS}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "Webhook set successfully."
else
  echo "Error: $RESPONSE"
  exit 1
fi
