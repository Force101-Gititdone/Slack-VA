#!/bin/bash
# Calendar OAuth Setup Helper Script
# This script guides through enabling Google Calendar API

echo "📅 Calendar OAuth Setup Helper"
echo ""
echo "Follow these steps to set up Calendar OAuth:"
echo ""
echo "1. Go to Google Cloud Console: https://console.cloud.google.com/"
echo "2. Select the same project used for Gmail API"
echo "3. Enable Google Calendar API:"
echo "   - Navigate to 'APIs & Services' > 'Library'"
echo "   - Search for 'Google Calendar API'"
echo "   - Click 'Enable'"
echo ""
echo "4. Update OAuth consent screen (if not already done):"
echo "   - Go to 'APIs & Services' > 'OAuth consent screen'"
echo "   - Add scopes:"
echo "     - https://www.googleapis.com/auth/gmail.readonly"
echo "     - https://www.googleapis.com/auth/gmail.modify"
echo "     - https://www.googleapis.com/auth/calendar"
echo "     - https://www.googleapis.com/auth/calendar.events"
echo ""
echo "5. Use the same OAuth credentials as Gmail (same Client ID/Secret)"
echo ""
echo "✅ Setup complete!"

