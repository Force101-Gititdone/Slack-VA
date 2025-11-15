#!/bin/bash
# SSL Certificate Setup Script for Slack VA
# Run this script on Zeus server after DNS is configured and Hostinger firewall is opened

set -euo pipefail

DOMAIN="slackva.force101.com"
EMAIL="bc@force101.com"

echo "=== SSL Certificate Setup for Slack VA ==="
echo ""
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run with sudo"
    echo "   Usage: sudo bash $0"
    exit 1
fi

# Step 1: Check if certbot is installed
echo "1. Checking certbot installation..."
if ! command -v certbot &> /dev/null; then
    echo "   Installing certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
    echo "✅ certbot installed"
else
    echo "✅ certbot is already installed"
fi
echo ""

# Step 2: Check DNS propagation
echo "2. Checking DNS propagation..."
DNS_IP=$(dig +short $DOMAIN | tail -n1)
EXPECTED_IP="72.60.170.161"

if [ "$DNS_IP" != "$EXPECTED_IP" ]; then
    echo "⚠️  Warning: DNS may not be fully propagated"
    echo "   Expected IP: $EXPECTED_IP"
    echo "   Current IP:  $DNS_IP"
    echo "   Check DNS propagation: https://www.whatsmydns.net/#A/$DOMAIN"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Please wait for DNS to propagate and try again."
        exit 1
    fi
else
    echo "✅ DNS is correctly configured ($DNS_IP)"
fi
echo ""

# Step 3: Check if nginx is configured
echo "3. Checking nginx configuration..."
if [ ! -f "/etc/nginx/sites-available/slack-va" ]; then
    echo "❌ nginx configuration not found"
    echo "   Please run: sudo bash scripts/setup-nginx-production.sh first"
    exit 1
fi

if ! nginx -t &> /dev/null; then
    echo "❌ nginx configuration test failed"
    echo "   Run: sudo nginx -t to see errors"
    exit 1
fi
echo "✅ nginx is configured correctly"
echo ""

# Step 4: Ensure HTTP port is open for Let's Encrypt verification
echo "4. Checking firewall for HTTP access (required for Let's Encrypt)..."
if ufw status | grep -q "80/tcp.*ALLOW"; then
    echo "✅ Port 80 is open"
else
    echo "⚠️  Port 80 is not open - opening now for Let's Encrypt verification"
    ufw allow 80/tcp comment 'HTTP for Lets Encrypt verification'
    echo "✅ Port 80 opened"
fi
echo ""

# Step 5: Get SSL certificate
echo "5. Requesting SSL certificate from Let's Encrypt..."
echo "   This may take a few minutes..."
echo ""

# Try nginx method first (preferred)
if certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect; then
    echo "✅ SSL certificate obtained and configured via nginx"
else
    echo "⚠️  nginx method failed, trying standalone method..."
    echo "   Note: This will temporarily stop nginx"
    
    # Stop nginx for standalone mode
    systemctl stop nginx
    
    # Get certificate in standalone mode
    if certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
        echo "✅ SSL certificate obtained via standalone method"
        
        # Update nginx config with certificate paths
        sed -i "s|# ssl_certificate|ssl_certificate|g" /etc/nginx/sites-available/slack-va
        sed -i "s|# ssl_certificate_key|ssl_certificate_key|g" /etc/nginx/sites-available/slack-va
        sed -i "s|/etc/letsencrypt/live/slackva.force101.com/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" /etc/nginx/sites-available/slack-va
        sed -i "s|/etc/letsencrypt/live/slackva.force101.com/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" /etc/nginx/sites-available/slack-va
        
        # Test and reload nginx
        nginx -t
        systemctl start nginx
        systemctl reload nginx
        echo "✅ nginx configured with SSL certificate"
    else
        echo "❌ Failed to obtain SSL certificate"
        systemctl start nginx
        exit 1
    fi
fi
echo ""

# Step 6: Test SSL certificate
echo "6. Testing SSL certificate..."
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" | grep -q "200\|404"; then
    echo "✅ SSL certificate is working"
else
    echo "⚠️  SSL certificate obtained but HTTPS test failed"
    echo "   This may be normal if the service isn't running yet"
fi
echo ""

# Step 7: Set up auto-renewal
echo "7. Setting up certificate auto-renewal..."
if [ -f "/etc/cron.d/certbot" ]; then
    echo "✅ Auto-renewal cron job already exists"
else
    echo "0 0,12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" > /etc/cron.d/certbot
    echo "✅ Auto-renewal cron job created"
fi
echo ""

echo "=== SSL Certificate Setup Complete ==="
echo ""
echo "✅ SSL certificate installed for $DOMAIN"
echo ""
echo "Next steps:"
echo "1. Update Slack app Request URL to: https://$DOMAIN/slack/events"
echo "2. Test Slack commands"
echo "3. Verify HTTPS is working: curl https://$DOMAIN/health"
echo ""
echo "Certificate will auto-renew via cron job"
echo ""

