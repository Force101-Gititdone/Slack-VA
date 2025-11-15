# Production Deployment Guide - Slack VA
## Using slackva.force101.com with nginx + SSL

**Last Updated:** 2025-11-14  
**Status:** Production Deployment Plan  
**Domain:** `slackva.force101.com`  
**Server:** Zeus (72.60.170.161)

---

## 🔒 Security Overview

### Why This Setup is Secure

1. **Service Isolation**: Slack VA service binds to `127.0.0.1:3001` only (localhost)
2. **Reverse Proxy**: nginx handles all public traffic, proxies to localhost
3. **HTTPS/SSL**: All traffic encrypted with Let's Encrypt certificates
4. **Request Verification**: Slack Bolt verifies all requests using signing secret
5. **Firewall Protection**: UFW firewall restricts access to necessary ports only
6. **Rate Limiting**: nginx rate limiting prevents abuse
7. **Security Headers**: Hardened nginx configuration with security headers

### Security Layers

```
Internet → UFW Firewall → nginx (HTTPS) → Slack VA (localhost only)
                ↓              ↓                    ↓
            Port 443      SSL/TLS            Request Verification
            Allowed       Encryption          (Slack Signing Secret)
```

---

## 📋 Prerequisites

- ✅ Slack VA service running on Zeus (`127.0.0.1:3001`)
- ✅ Domain control for `force101.com` (Hostinger)
- ✅ SSH access to Zeus server
- ✅ sudo access on Zeus server
- ✅ nginx installed on Zeus
- ✅ certbot installed (for SSL)

---

## Step 1: DNS Configuration (Hostinger)

**Purpose:** Point subdomain to Zeus server IP

### 1.1 Add A Record

1. Go to: https://hpanel.hostinger.com
2. Log in with your Hostinger account
3. Find domain: `force101.com`
4. Navigate to: **DNS / Name Servers** or **DNS Zone Editor**
5. Click: **Add Record** or **Add New Record**
6. Configure:
   - **Type:** `A`
   - **Name/Host:** `slackva` (or `pos` if you prefer)
   - **Points to/Target:** `72.60.170.161`
   - **TTL:** `3600` (or default)
7. Click: **Save**

### 1.2 Verify DNS Propagation

**Wait 1-48 hours** (usually 1-2 hours) for DNS to propagate, then verify:

```bash
# From your local machine
dig slackva.force101.com
# OR
nslookup slackva.force101.com

# Should return: 72.60.170.161
```

**DNS Checker Tools:**
- https://www.whatsmydns.net/#A/slackva.force101.com
- https://dnschecker.org/#A/slackva.force101.com

---

## Step 2: Firewall Configuration (Zeus)

**Purpose:** Allow HTTPS traffic while maintaining security

### 2.1 Check Current Firewall Status

```bash
# SSH to Zeus
ssh bc@72.60.170.161

# Check firewall status
sudo ufw status verbose
```

### 2.2 Allow HTTPS Traffic

```bash
# Allow HTTPS (port 443) from anywhere
sudo ufw allow 443/tcp comment 'HTTPS for Slack VA'

# Allow HTTP (port 80) temporarily for Let's Encrypt verification
sudo ufw allow 80/tcp comment 'HTTP for Let's Encrypt (temporary)'

# Verify rules
sudo ufw status numbered
```

**Expected Output:**
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
```

**Security Note:** Port 80 is only needed for initial Let's Encrypt verification. After SSL is set up, you can optionally remove it (HTTPS will still work).

---

## Step 3: nginx Configuration (Zeus)

**Purpose:** Secure reverse proxy with rate limiting and security headers

### 3.1 Create nginx Configuration

```bash
# SSH to Zeus
ssh bc@72.60.170.161

# Create nginx config file
sudo nano /etc/nginx/sites-available/slack-va
```

### 3.2 Add Secure Configuration

**Copy this complete configuration:**

```nginx
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
```

### 3.3 Enable Site

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/slack-va /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

**Expected Output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Step 4: SSL/HTTPS Setup (Let's Encrypt)

**Purpose:** Encrypt all traffic with free SSL certificates

### 4.1 Install Certbot (if not installed)

```bash
# Update package list
sudo apt update

# Install certbot and nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

### 4.2 Obtain SSL Certificate

```bash
# Get SSL certificate (replace email with your email)
sudo certbot --nginx -d slackva.force101.com \
    --email bc@force101.com \
    --agree-tos \
    --non-interactive \
    --redirect

# The --redirect flag automatically configures HTTP to HTTPS redirect
```

**What This Does:**
- Contacts Let's Encrypt
- Verifies domain ownership (via HTTP challenge)
- Obtains SSL certificate
- Automatically updates nginx config with SSL paths
- Sets up auto-renewal

### 4.3 Verify Auto-Renewal

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

**Expected:** Auto-renewal should be enabled and working

### 4.4 Verify SSL Configuration

After certbot runs, check that nginx config was updated:

```bash
# View updated config
sudo cat /etc/nginx/sites-available/slack-va | grep ssl_certificate
```

**Should show:**
```
ssl_certificate /etc/letsencrypt/live/slackva.force101.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/slackva.force101.com/privkey.pem;
```

---

## Step 5: Security Verification

**Purpose:** Verify all security measures are in place

### 5.1 Verify Service Binding

```bash
# Check that Slack VA is bound to localhost only
ss -tlnp | grep 3001

# Should show: LISTEN ... 127.0.0.1:3001 ... (NOT 0.0.0.0:3001)
```

### 5.2 Verify Firewall Rules

```bash
# Check firewall status
sudo ufw status verbose

# Should show:
# - 22/tcp ALLOW (SSH)
# - 443/tcp ALLOW (HTTPS)
# - 80/tcp ALLOW (HTTP - optional, can remove after SSL setup)
```

### 5.3 Test HTTPS Endpoint

```bash
# From your local machine (not Zeus)
curl -I https://slackva.force101.com/health

# Should return:
# HTTP/2 200
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# ... (other security headers)
```

### 5.4 Test SSL Configuration

```bash
# Test SSL with SSL Labs (online)
# Go to: https://www.ssllabs.com/ssltest/analyze.html?d=slackva.force101.com

# Or test locally
openssl s_client -connect slackva.force101.com:443 -servername slackva.force101.com
```

**Expected:** SSL Labs should give A or A+ rating

### 5.5 Verify Rate Limiting

```bash
# Test rate limiting (should be limited after 10 requests/second)
for i in {1..15}; do curl -I https://slackva.force101.com/health; done

# After 10 requests, should see: 503 Service Temporarily Unavailable
```

---

## Step 6: Update Slack App Configuration

**Purpose:** Point Slack to your new public URL

### 6.1 Update Event Subscriptions

1. Go to: https://api.slack.com/apps
2. Select your Slack app
3. Navigate to: **Features → Event Subscriptions**
4. Enable Events: Toggle **ON**
5. Request URL: `https://slackva.force101.com/slack/events`
6. Click: **Save Changes**
7. Wait for Slack to verify URL (should show ✅ Verified)

### 6.2 Subscribe to Bot Events

In the same **Event Subscriptions** page:
- Scroll to **Subscribe to bot events**
- Add events:
  - `app_mention`
  - `message.channels`
- Click: **Save Changes**

### 6.3 Update Slash Commands

1. Navigate to: **Features → Slash Commands**
2. For each command (`/gmail`, `/calendar`, `/crm`):
   - Click **Edit**
   - Update **Request URL** to: `https://slackva.force101.com/slack/events`
   - Click **Save**

---

## Step 7: Testing

### 7.1 Test Health Endpoint

```bash
# From your local machine
curl https://slackva.force101.com/health

# Should return: {"status":"ok"}
```

### 7.2 Test Slack Commands

In Slack, test each command:
- `/gmail categorize`
- `/gmail query test`
- `/calendar schedule meeting tomorrow`
- `/crm who-next`

### 7.3 Monitor Logs

```bash
# On Zeus, monitor nginx logs
sudo tail -f /var/log/nginx/slack-va-access.log
sudo tail -f /var/log/nginx/slack-va-error.log

# Monitor Slack VA service logs
sudo journalctl -u slack-va -f
```

---

## 🔒 Security Checklist

### ✅ Pre-Deployment

- [ ] DNS A record added (`slackva.force101.com` → `72.60.170.161`)
- [ ] DNS propagation verified
- [ ] Firewall rules configured (ports 80, 443 allowed)
- [ ] nginx configuration created with security headers
- [ ] Rate limiting configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Auto-renewal verified

### ✅ Post-Deployment

- [ ] Service bound to localhost only (`127.0.0.1:3001`)
- [ ] HTTPS working (no HTTP access)
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] SSL Labs rating A or A+
- [ ] Slack app URLs updated
- [ ] Slack webhook verification successful
- [ ] All Slack commands tested
- [ ] Logs monitored for errors

### ✅ Ongoing Security

- [ ] SSL certificate auto-renewal working
- [ ] Regular log review
- [ ] Monitor for unusual traffic patterns
- [ ] Keep nginx and system packages updated
- [ ] Review firewall rules periodically

---

## 🚨 Security Considerations

### Why This Setup is Secure

1. **Service Isolation**
   - Slack VA service only listens on `127.0.0.1:3001` (localhost)
   - Not accessible from internet directly
   - Only accessible via nginx reverse proxy

2. **Request Verification**
   - Slack Bolt framework verifies all requests using `SLACK_SIGNING_SECRET`
   - Invalid requests are automatically rejected
   - No authentication bypass possible

3. **HTTPS/SSL**
   - All traffic encrypted with TLS 1.2/1.3
   - Let's Encrypt certificates (automatically renewed)
   - HSTS header forces HTTPS

4. **Rate Limiting**
   - 10 requests/second limit (burst: 20)
   - 100 requests/minute limit (burst: 50)
   - Prevents DDoS and abuse

5. **Security Headers**
   - `Strict-Transport-Security`: Forces HTTPS
   - `X-Frame-Options`: Prevents clickjacking
   - `X-Content-Type-Options`: Prevents MIME sniffing
   - `X-XSS-Protection`: XSS protection
   - `Content-Security-Policy`: Restricts resource loading

6. **Firewall Protection**
   - Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
   - All other ports blocked
   - Defense in depth

7. **Logging**
   - All requests logged
   - Error logs for debugging
   - Can detect suspicious activity

### Potential Security Risks & Mitigations

| Risk | Mitigation | Status |
|------|------------|--------|
| DDoS attacks | Rate limiting (10 req/s) | ✅ Mitigated |
| SSL certificate expiration | Auto-renewal enabled | ✅ Mitigated |
| Man-in-the-middle | HTTPS/TLS encryption | ✅ Mitigated |
| Request forgery | Slack signing secret verification | ✅ Mitigated |
| Information disclosure | Security headers, server_tokens off | ✅ Mitigated |
| Service exposure | Localhost binding only | ✅ Mitigated |

### Additional Hardening (Optional)

If you want even more security:

1. **IP Whitelisting** (if Slack IPs are known):
   ```nginx
   # In nginx config, add to location /:
   allow 52.23.23.23;  # Slack IP range
   allow 52.23.23.24;
   deny all;
   ```
   **Note:** Slack IPs change frequently, so this may break functionality.

2. **Remove HTTP (Port 80)** after SSL setup:
   ```bash
   sudo ufw delete allow 80/tcp
   ```
   **Note:** This prevents Let's Encrypt auto-renewal via HTTP challenge. Use DNS challenge instead.

3. **Fail2Ban** for additional protection:
   ```bash
   sudo apt install fail2ban
   # Configure to monitor nginx logs
   ```

---

## 📊 Monitoring & Maintenance

### Regular Checks

**Weekly:**
- Review nginx access logs for unusual patterns
- Check SSL certificate expiration: `sudo certbot certificates`
- Verify service is running: `sudo systemctl status slack-va`

**Monthly:**
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review firewall rules: `sudo ufw status verbose`
- Check disk space: `df -h`

### Log Locations

- **nginx access:** `/var/log/nginx/slack-va-access.log`
- **nginx error:** `/var/log/nginx/slack-va-error.log`
- **Slack VA service:** `sudo journalctl -u slack-va`

### Troubleshooting

**Service not responding:**
```bash
# Check service status
sudo systemctl status slack-va

# Check logs
sudo journalctl -u slack-va -n 50

# Check nginx
sudo nginx -t
sudo systemctl status nginx
```

**SSL certificate issues:**
```bash
# Check certificate
sudo certbot certificates

# Renew manually if needed
sudo certbot renew
```

**Rate limiting too strict:**
- Adjust limits in nginx config: `rate=10r/s` → `rate=20r/s`
- Reload nginx: `sudo systemctl reload nginx`

---

## 📝 Quick Reference

### URLs
- **Production:** https://slackva.force101.com
- **Health Check:** https://slackva.force101.com/health
- **Slack Events:** https://slackva.force101.com/slack/events

### Commands
```bash
# Restart Slack VA service
sudo systemctl restart slack-va

# Reload nginx config
sudo systemctl reload nginx

# Check SSL certificate
sudo certbot certificates

# View nginx logs
sudo tail -f /var/log/nginx/slack-va-access.log

# Test SSL
openssl s_client -connect slackva.force101.com:443
```

---

## 🎯 Next Steps After Deployment

1. ✅ Test all Slack commands
2. ✅ Monitor logs for 24 hours
3. ✅ Verify SSL auto-renewal (wait 30 days or test with `--dry-run`)
4. ✅ Document any issues or adjustments needed
5. ✅ Consider setting up monitoring/alerting (optional)

---

**Ready to deploy?** Follow steps 1-7 in order, checking off each item in the Security Checklist as you go.

**Questions or issues?** Check the Troubleshooting section or review the logs.

