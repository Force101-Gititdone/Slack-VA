#!/bin/bash
# Verify .env file has all required variables
# This checks that all op:// references are present

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found!"
  echo "   Run: cp .env.example .env"
  exit 1
fi

echo "🔍 Checking .env file for required variables..."
echo ""

REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_DATABASE_URL"
  "SLACK_BOT_TOKEN"
  "SLACK_SIGNING_SECRET"
  "SLACK_CLIENT_ID"
  "SLACK_CLIENT_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "GOOGLE_REDIRECT_URI"
  "OPENAI_API_KEY"
  "ENCRYPTION_KEY"
)

MISSING=0

for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^${var}=" "$ENV_FILE"; then
    value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
    if [[ "$value" == op://* ]]; then
      echo "✅ $var = $value"
    elif [ -z "$value" ] || [ "$value" == "" ]; then
      echo "⚠️  $var is empty"
      MISSING=$((MISSING + 1))
    else
      echo "⚠️  $var is set but not using op:// reference"
    fi
  else
    echo "❌ $var is missing"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "✅ All required variables are present!"
  echo "   You can now test the server with: npm run dev"
else
  echo "❌ $MISSING variable(s) missing or empty"
  echo "   Please check CREDENTIALS-CHECKLIST.md"
fi

