# Deploy Slack VA to Zeus - Step by Step Guide

## Prerequisites

- ✅ All credentials stored in 1Password
- ✅ OAuth flow tested locally
- ✅ Server builds and runs locally
- ✅ Zeus server access (SSH)

---

## Deployment Steps

### Local Machine

**1) Prepare for deployment**
1.1) Stop local server if running (Ctrl+C in terminal)
1.2) Verify all changes are committed to git
1.3) Run deployment script: `./Infrastructure/Zeus/scripts/deploy-to-zeus.sh`

---

### Zeus Server

**2) Verify 1Password access**
2.1) SSH to Zeus: `ssh zeus`
2.2) Load service account token: `source ~/.op-env`
2.3) Test 1Password access: `op account list`
2.4) Verify .env file exists: `cat /opt/slack-va/.env`

**3) Verify .env file**
3.1) Check .env file has op:// references: `cat /opt/slack-va/.env | grep op://`
3.2) If .env is missing, copy from local: `scp .env bc@72.60.170.161:/opt/slack-va/.env`

**4) Start the service**
4.1) Enable service: `sudo systemctl enable slack-va`
4.2) Start service: `sudo systemctl start slack-va`
4.3) Check status: `sudo systemctl status slack-va`
4.4) View logs: `sudo journalctl -u slack-va -f`

**5) Verify service is running**
5.1) Check port binding: `ss -tlnp | grep 3001` (should show 127.0.0.1:3001)
5.2) Test health endpoint via SSH tunnel (see step 6)

---

### Local Machine (SSH Tunnel)

**6) Set up SSH tunnel**
6.1) Open new terminal
6.2) Create tunnel: `ssh -L 3001:localhost:3001 bc@72.60.170.161`
6.3) Keep this terminal open (tunnel stays active)

**7) Test service**
7.1) In another terminal: `curl http://localhost:3001/health`
7.2) Should return: `{"ok":true,"timestamp":"..."}`

---

### Update Slack App

**8) Update Slack Request URLs**
8.1) Go to: https://api.slack.com/apps
8.2) Select your "Slack VA" app
8.3) Go to: Features → Slash Commands
8.4) For each command (`/gmail`, `/calendar`, `/crm`):
   - Click "Edit"
   - Update Request URL to: `https://your-zeus-domain.com/slack/events`
   - Or use ngrok URL if testing: `https://your-ngrok-url.ngrok.io/slack/events`
8.5) Click "Save"

**Note:** If Zeus doesn't have a public domain, you'll need to:
- Use ngrok for testing: `ngrok http 3001` (on Zeus, via SSH tunnel)
- Or set up nginx reverse proxy on Zeus

---

## Troubleshooting

**Service won't start:**
- Check logs: `sudo journalctl -u slack-va -n 50`
- Verify 1Password token: `source ~/.op-env && op account list`
- Check .env file: `cat /opt/slack-va/.env`

**Port already in use:**
- Check what's using port: `sudo lsof -i :3001`
- Stop conflicting service or change port in .env

**1Password access fails:**
- Verify token: `cat ~/.op/service-account-token`
- Test manually: `source ~/.op-env && op account list`

**Slack commands not working:**
- Verify Request URLs are updated in Slack app
- Check service logs for incoming requests
- Verify Slack credentials in 1Password

---

## Monitoring

**View logs:**
```bash
sudo journalctl -u slack-va -f
```

**Check status:**
```bash
sudo systemctl status slack-va
```

**Restart service:**
```bash
sudo systemctl restart slack-va
```

---

## Security Notes

- ✅ Service binds to 127.0.0.1 only (localhost)
- ✅ Access via SSH tunnel only
- ✅ All secrets via 1Password `op run`
- ✅ OAuth tokens encrypted in database

---

*Ready to deploy? Run: `./Infrastructure/Zeus/scripts/deploy-to-zeus.sh`*

