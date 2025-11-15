# Deployment Guide

## Prerequisites

- Zeus server access (SSH)
- Supabase project with pgvector enabled
- Google Cloud Project with Gmail & Calendar APIs enabled
- Slack App created
- 1Password CLI configured with service account token

## Deployment Steps

### 1. Prepare Zeus Server

```bash
# SSH to Zeus
ssh zeus

# Create application directory
sudo mkdir -p /opt/slack-va
sudo chown bc:bc /opt/slack-va
```

### 2. Clone Repository

```bash
cd /opt/slack-va
git clone <repository-url> .
```

### 3. Install Dependencies

```bash
npm install
npm run build
```

### 4. Set Up Environment

```bash
# Create .env file with op:// references
cp .env.example .env
# Edit .env with your credentials
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Create Systemd Service

Create `/etc/systemd/system/slack-va.service`:

```ini
[Unit]
Description=Slack VA Service
After=network.target

[Service]
Type=simple
User=bc
WorkingDirectory=/opt/slack-va
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/slack-va/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 7. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable slack-va
sudo systemctl start slack-va
sudo systemctl status slack-va
```

### 8. Set Up SSH Tunnel

Access the service via SSH tunnel:

```bash
# From local machine
ssh -L 3001:localhost:3001 bc@72.60.170.161
```

Then access at `http://localhost:3001`

## Monitoring

```bash
# View logs
sudo journalctl -u slack-va -f

# Check status
sudo systemctl status slack-va

# Restart service
sudo systemctl restart slack-va
```

## Security

- Service binds to 127.0.0.1 only (localhost)
- Access via SSH tunnel only
- All secrets via 1Password `op run`
- OAuth tokens encrypted in database

