#!/bin/bash
# Deploy Slack VA to Zeus server
# This script copies files, installs dependencies, and sets up the systemd service
# Can be run from any directory

set -euo pipefail

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ZEUS_HOST="bc@72.60.170.161"
APP_DIR="/opt/slack-va"
SERVICE_NAME="slack-va"

echo "=== Deploying Slack VA to Zeus ==="
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/index.ts" ]; then
    echo "❌ Error: Cannot find Slack VA project files"
    echo "   Expected: $PROJECT_ROOT"
    exit 1
fi

echo "📁 Project directory: $PROJECT_ROOT"
echo ""

# Build locally first
echo "1. Building project locally..."
npm run build
echo "✅ Build complete"
echo ""

# Create deployment package
echo "2. Creating deployment package..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy necessary files
rsync -av --exclude 'node_modules' --exclude '.git' \
    --include 'package.json' --include 'package-lock.json' \
    --include 'tsconfig.json' --include 'drizzle.config.ts' \
    --include 'src/' --include 'dist/' \
    --include '.env' \
    --include 'docs/' --include 'scripts/' \
    --exclude '*' \
    ./ "$TEMP_DIR/slack-va/"

echo "✅ Deployment package created"
echo ""

# Copy to Zeus
echo "3. Copying files to Zeus..."
# Try to create directory without sudo first, use sudo only if needed
ssh -o IdentitiesOnly=yes -o PreferredAuthentications=publickey "$ZEUS_HOST" << 'ENDSSH'
if [ ! -d /opt/slack-va ]; then
    # Try without sudo first (in case user has permissions)
    mkdir -p /opt/slack-va 2>/dev/null || {
        # If that fails, try with sudo (may require password)
        echo "Creating /opt/slack-va requires sudo..."
        sudo mkdir -p /opt/slack-va && sudo chown bc:bc /opt/slack-va
    }
else
    # Directory exists, just ensure ownership
    sudo chown -R bc:bc /opt/slack-va 2>/dev/null || true
fi
ENDSSH
rsync -av -e "ssh -o IdentitiesOnly=yes -o PreferredAuthentications=publickey" --delete "$TEMP_DIR/slack-va/" "$ZEUS_HOST:$APP_DIR/"
echo "✅ Files copied to Zeus"
echo ""

# Install dependencies and setup on Zeus
echo "4. Setting up on Zeus..."
ssh -o IdentitiesOnly=yes -o PreferredAuthentications=publickey "$ZEUS_HOST" << 'ENDSSH'
set -euo pipefail
cd /opt/slack-va

echo "Installing dependencies..."
npm install --production

echo "Verifying .env file exists..."
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. You'll need to create it."
    echo "   Copy from .env.example and update with op:// references"
fi

echo "✅ Setup complete on Zeus"
ENDSSH

echo ""
echo "5. Installing systemd service..."
scp -o IdentitiesOnly=yes -o PreferredAuthentications=publickey "$PROJECT_ROOT/docs/deployment-systemd.service" "$ZEUS_HOST:/tmp/slack-va.service"
ssh -o IdentitiesOnly=yes -o PreferredAuthentications=publickey "$ZEUS_HOST" << 'ENDSSH'
echo "Installing systemd service (requires sudo)..."
sudo mv /tmp/slack-va.service /etc/systemd/system/slack-va.service
sudo systemctl daemon-reload
echo "✅ Systemd service installed"
ENDSSH

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. SSH to Zeus: ssh zeus"
echo "2. Verify .env file: cat /opt/slack-va/.env"
echo "3. Test 1Password access: source ~/.op-env && op account list"
echo "4. Start service: sudo systemctl start slack-va"
echo "5. Check status: sudo systemctl status slack-va"
echo "6. View logs: sudo journalctl -u slack-va -f"
echo ""

