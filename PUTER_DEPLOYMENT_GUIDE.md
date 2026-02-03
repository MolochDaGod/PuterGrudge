# Puter CLI Deployment Guide - Best Practices

## 🚀 Quick Start Deployment

This guide will help you deploy your Puter Monitor AI application using the Puter CLI with industry best practices.

## Prerequisites

1. **Node.js** (v20 or higher)
2. **Puter Account** - Sign up at [puter.com](https://puter.com)
3. **Puter CLI** - Install globally: `npm install -g puter-cli`

## Step 1: Install Puter CLI

```bash
npm install -g puter-cli
```

Verify installation:
```bash
puter --version
```

## Step 2: Authenticate with Puter

```bash
puter login
```

This will open a browser window for authentication. After successful login, your credentials will be saved.

## Step 3: Prepare Your Application

### Build the Application

```bash
cd Puter-Monitor-AI
npm install
npm run build
```

This creates the production build in the `dist/` directory.

### Environment Variables

Create a `.env.production` file with your production settings:

```bash
# Copy from example
cp .env.example .env.production

# Edit with production values
# IMPORTANT: Use strong secrets in production!
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random string (min 32 chars)
- `JWT_REFRESH_SECRET` - Different strong random string
- `SESSION_SECRET` - Another strong random string

## Step 4: Deploy Using Puter CLI

### Option A: Deploy as Static Site (Recommended for Frontend)

If you have a separate frontend build:

```bash
# Navigate to your project
cd Puter-Monitor-AI

# Create and deploy static site
puter site:create puter-monitor-ai ./dist --subdomain=monitor-ai

# Or deploy to existing site
puter site:deploy ./dist --subdomain=monitor-ai
```

### Option B: Deploy as Application (Full-Stack)

For the complete application with backend:

```bash
# Create application
puter app:create puter-monitor-ai ./dist --description="AI-powered monitoring dashboard"

# Update application (for subsequent deployments)
puter app:update puter-monitor-ai ./dist
```

## Step 5: Configure Application Settings

### Update puter.json

The `puter.json` file in your project root defines your application configuration:

```json
{
  "name": "puter-monitor-ai",
  "version": "2.0.0",
  "description": "AI-powered monitoring dashboard",
  "type": "app",
  "services": {
    "web": {
      "type": "web",
      "runtime": "node20",
      "entrypoint": "dist/index.cjs",
      "build": "npm run build",
      "env": {
        "NODE_ENV": "production",
        "PORT": "5000"
      }
    }
  }
}
```

## Step 6: Verify Deployment

After deployment, Puter will provide you with a URL. Test your application:

```bash
# List your applications
puter apps

# Check disk usage
puter df

# View your sites
puter sites
```

## Best Practices

### 1. **Security**
- ✅ Use strong, unique secrets for JWT and sessions
- ✅ Never commit `.env` files to version control
- ✅ Enable HTTPS (Puter provides this automatically)
- ✅ Implement rate limiting (already configured in the app)
- ✅ Use environment-specific configurations

### 2. **Performance**
- ✅ Build and minify assets before deployment
- ✅ Enable compression (configured in Express)
- ✅ Use CDN for static assets
- ✅ Implement caching strategies
- ✅ Monitor resource usage with `puter df`

### 3. **Deployment Workflow**
- ✅ Test locally before deploying
- ✅ Use version control (Git)
- ✅ Create deployment scripts
- ✅ Keep deployment logs
- ✅ Have a rollback strategy

### 4. **Monitoring**
- ✅ Set up error tracking (Sentry)
- ✅ Monitor application logs
- ✅ Track performance metrics
- ✅ Set up alerts for critical issues

## Deployment Script

Create a `deploy.sh` (or `deploy.ps1` for Windows) script:

See `scripts/deploy-puter.ps1` for the automated deployment script.

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Authentication Issues
```bash
# Re-authenticate
puter logout
puter login
```

### Deployment Fails
```bash
# Check your application status
puter apps

# View disk usage
puter df

# Check logs (if available)
puter logs puter-monitor-ai
```

## Next Steps

1. **Set up Database** - Configure PostgreSQL (use Puter's database services or external)
2. **Configure Environment** - Set all required environment variables
3. **Test Application** - Verify all features work in production
4. **Set up Monitoring** - Configure Sentry and logging
5. **Create Backups** - Regular database backups
6. **Documentation** - Update API documentation

## Resources

- [Puter CLI Documentation](https://github.com/HeyPuter/puter-cli)
- [Puter Platform](https://puter.com)
- [Project Documentation](./docs/)

## Support

For issues:
- Check [DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- Review [README_DEPLOYMENT.md](./README_DEPLOYMENT.md)
- Open an issue on GitHub

