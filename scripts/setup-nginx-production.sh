#!/bin/bash
# Production nginx setup for Slack VA
# Run this script on Zeus server after DNS is configured

set -euo pipefail

DOMAIN="slackva.force101.com"
NGINX_CONFIG="/etc/nginx/sites-available/slack-va"

echo "=== Setting up nginx for Slack VA Production ==="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run with sudo"
    echo "   Usage: sudo bash $0"
    exit 1
fi

# Step 1: Check firewall status
echo "1. Checking firewall status..."
ufw status verbose
echo ""

# Step 2: Allow HTTPS traffic
echo "2. Configuring firewall..."
ufw allow 443/tcp comment 'HTTPS for Slack VA'
ufw allow 80/tcp comment 'HTTP for Lets Encrypt (temporary)'
echo "✅ Firewall rules added"
echo ""

# Step 3: Create nginx configuration
echo "3. Creating nginx configuration..."
cat > "$NGINX_CONFIG" << 'NGINX_EOF'
# Rate limiting zones (prevents abuse)
limit_req_zone $binary_remote_addr zone=slack_va_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=slack_va_burst:10m rate=100r/m;

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name slackva.force101.com;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server - main configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name slackva.force101.com;
    
    # SSL Configuration (will be auto-configured by certbot)
    # These paths will be set by certbot:
    # ssl_certificate /etc/letsencrypt/live/slackva.force101.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/slackva.force101.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none';" always;
    
    # Hide nginx version
    server_tokens off;
    
    # Logging
    access_log /var/log/nginx/slack-va-access.log;
    error_log /var/log/nginx/slack-va-error.log;
    
    # Main location - proxy to Slack VA service
    location / {
        # Rate limiting
        limit_req zone=slack_va_limit burst=20 nodelay;
        limit_req zone=slack_va_burst burst=50 nodelay;
        
        # Proxy settings
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # Don't cache
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
    }
    
    # Health check endpoint (optional - for monitoring)
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        access_log off;
    }
    
    # Block access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINX_EOF

echo "✅ nginx configuration created at $NGINX_CONFIG"
echo ""

# Step 4: Enable site
echo "4. Enabling nginx site..."
ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/slack-va
echo "✅ Site enabled"
echo ""

# Step 5: Test nginx configuration
echo "5. Testing nginx configuration..."
if nginx -t; then
    echo "✅ nginx configuration is valid"
else
    echo "❌ nginx configuration test failed"
    exit 1
fi
echo ""

# Step 6: Reload nginx
echo "6. Reloading nginx..."
systemctl reload nginx
echo "✅ nginx reloaded"
echo ""

echo "=== nginx Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Wait for DNS to propagate (check with: dig slackva.force101.com)"
echo "2. Install certbot if needed: sudo apt install certbot python3-certbot-nginx -y"
echo "3. Get SSL certificate: sudo certbot --nginx -d slackva.force101.com --email bc@force101.com --agree-tos --non-interactive --redirect"
echo "4. Update Slack app URLs to: https://slackva.force101.com/slack/events"
echo ""

