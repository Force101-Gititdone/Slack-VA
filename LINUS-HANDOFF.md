# Linus Handoff - Deployment Configuration for Slack VA

## Task: Prepare Deployment Configuration for Zeus Server

### Objective
Create all deployment artifacts, systemd service file, and deployment scripts for running Slack VA on Zeus server with proper security (localhost binding).

### Steps for Linus

1. **Review Current Deployment Docs**
   - Review: `docs/deployment.md`
   - Review: `docs/deployment-systemd.service`
   - Verify security requirements (127.0.0.1 binding)

2. **Create Systemd Service File**
   - Location: `docs/slack-va.service`
   - User: `bc`
   - Working Directory: `/opt/slack-va`
   - Bind to: `127.0.0.1:3001` (CRITICAL - localhost only)
   - Use `op run` for environment variables
   - Auto-restart on failure
   - Logs to journald

3. **Create Deployment Script**
   - Script: `Infrastructure/Zeus/scripts/deploy-to-zeus.sh`
   - Steps:
     - Create directory structure
     - Copy files to Zeus
     - Install dependencies
     - Set up systemd service
     - Configure permissions
     - Start service
   - Include rollback capability

4. **Create Environment Setup Script**
   - Script: `scripts/setup-zeus-env.sh`
   - Create .env file with op:// references
   - Verify 1Password CLI access
   - Test op run functionality

5. **Verify Security Bindings**
   - Ensure server binds to 127.0.0.1 only
   - Update `src/index.ts` if needed: `app.listen(PORT, '127.0.0.1')`
   - Document SSH tunnel setup
   - Create verification script

6. **Create Backup Script**
   - Script: `scripts/backup-slack-va.sh`
   - Backup application files
   - Backup database (via Supabase)
   - Store in `/opt/backups/slack-va/`

7. **Create Monitoring Script**
   - Script: `scripts/monitor-slack-va.sh`
   - Check service status
   - Check logs
   - Check port binding
   - Health check endpoint

### Files to Create/Update

- `docs/slack-va.service` - Systemd service file (final version)
- `Infrastructure/Zeus/scripts/deploy-to-zeus.sh` - Main deployment script
- `scripts/setup-zeus-env.sh` - Environment setup
- `scripts/backup-slack-va.sh` - Backup script
- `scripts/monitor-slack-va.sh` - Monitoring script
- `docs/zeus-deployment-guide.md` - Complete deployment guide
- Update `src/index.ts` if needed for localhost binding

### Security Requirements (CRITICAL)

- **MANDATORY:** Service MUST bind to `127.0.0.1:3001` ONLY
- Never bind to `0.0.0.0` or all interfaces
- Access only via SSH tunnel
- Use `op run` for all secrets
- Verify with: `ss -tlnp | grep 3001` (should show 127.0.0.1:3001)

### Success Criteria

- ✅ Systemd service file created and tested
- ✅ Deployment script works end-to-end
- ✅ Service binds to 127.0.0.1 only
- ✅ Environment setup script works
- ✅ Backup script functional
- ✅ Monitoring script functional
- ✅ All scripts documented
- ✅ Deployment guide complete

### Notes

- Follow Zeus patterns from existing projects
- Use 1Password `op run` integration
- Test locally before deployment
- Document all commands and procedures
- Include rollback procedures

---

**Status:** Ready for Linus to execute
**Priority:** High (needed for deployment)
**Estimated Time:** 30-45 minutes

