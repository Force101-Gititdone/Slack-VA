#!/bin/bash
# Generate encryption key for Slack VA
# This generates a secure 32-byte (64 hex character) key

echo "🔐 Generating encryption key for Slack VA..."
echo ""
KEY=$(openssl rand -hex 32)
echo "Your encryption key:"
echo "$KEY"
echo ""
echo "📋 Copy this key and store it in 1Password:"
echo "   Vault: Force101"
echo "   Item: slack-va-encryption"
echo "   Field: ENCRYPTION_KEY"
echo ""
echo "⚠️  Keep this key secure - it's used to encrypt OAuth tokens in the database!"

