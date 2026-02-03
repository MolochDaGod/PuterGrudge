# Quick Deploy to Puter - 5 Minutes

Get your Puter Monitor AI application deployed in 5 minutes!

## Prerequisites

- Node.js v20+
- Puter account ([sign up here](https://puter.com))

## Step 1: Install Puter CLI (30 seconds)

```bash
npm install -g puter-cli
```

## Step 2: Login to Puter (30 seconds)

```bash
puter login
```

This opens your browser for authentication.

## Step 3: Build Your App (2 minutes)

```bash
cd Puter-Monitor-AI
npm install
npm run build
```

## Step 4: Deploy! (1 minute)

### Option A: Automated Script (Recommended)

**Windows:**
```powershell
.\scripts\deploy-puter.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy-puter.sh
./scripts/deploy-puter.sh
```

### Option B: Manual Commands

```bash
# Create and deploy new app
puter app:create puter-monitor-ai ./dist --description="AI-powered monitoring dashboard" --subdomain=monitor-ai

# Or update existing app
puter app:update puter-monitor-ai ./dist
```

## Step 5: Access Your App! (30 seconds)

Your app is now live at:
```
https://monitor-ai.puter.site
```

## Common Commands

```bash
# View your apps
puter apps

# Check disk usage
puter df

# View sites
puter sites

# Update app
puter app:update puter-monitor-ai ./dist

# Delete app
puter app:delete puter-monitor-ai
```

## Environment Variables

For production, create `.env.production`:

```bash
# Copy template
cp .env.production.example .env.production

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env.production with your values
```

**Required:**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Strong random string
- `JWT_REFRESH_SECRET` - Different strong string
- `SESSION_SECRET` - Another strong string

## Troubleshooting

### Build fails?
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Not authenticated?
```bash
puter logout
puter login
```

### Deployment fails?
```bash
# Check status
puter whoami
puter apps
puter df

# Try force deploy
puter app:delete -f puter-monitor-ai
puter app:create puter-monitor-ai ./dist --subdomain=monitor-ai
```

## Next Steps

1. ✅ Set up database (PostgreSQL)
2. ✅ Configure environment variables
3. ✅ Create admin user
4. ✅ Test application
5. ✅ Set up monitoring (Sentry)
6. ✅ Configure backups

## Full Documentation

- [Complete Deployment Guide](./PUTER_DEPLOYMENT_GUIDE.md)
- [Pre-Deployment Checklist](./PRE_DEPLOYMENT_CHECKLIST.md)
- [Project Documentation](./docs/)

## Support

- [Puter CLI Docs](https://github.com/HeyPuter/puter-cli)
- [Puter Platform](https://puter.com)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**That's it! Your app is deployed! 🚀**

