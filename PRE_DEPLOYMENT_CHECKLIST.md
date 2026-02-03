# Pre-Deployment Checklist for Puter Monitor AI

Use this checklist to ensure your application is ready for production deployment to Puter Cloud.

## 📋 Pre-Deployment Checklist

### 1. Environment Setup

- [ ] **Install Puter CLI**
  ```bash
  npm install -g puter-cli
  puter --version
  ```

- [ ] **Create Puter Account**
  - Sign up at [puter.com](https://puter.com)
  - Verify your email address

- [ ] **Authenticate with Puter**
  ```bash
  puter login
  ```

### 2. Application Configuration

- [ ] **Create Production Environment File**
  ```bash
  cp .env.production.example .env.production
  ```

- [ ] **Generate Strong Secrets**
  ```bash
  # Generate JWT Secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # Generate JWT Refresh Secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # Generate Session Secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Configure Database**
  - Set up PostgreSQL database (Puter provides this or use external)
  - Update `DATABASE_URL` in `.env.production`
  - Test database connection

- [ ] **Configure Redis (Optional but Recommended)**
  - Set up Redis instance for session storage
  - Update `REDIS_URL` in `.env.production`

- [ ] **Set Admin Credentials**
  - Update `INITIAL_ADMIN_EMAIL` in `.env.production`
  - Set strong `INITIAL_ADMIN_PASSWORD`

### 3. Security Configuration

- [ ] **Review Security Settings**
  - Verify all secrets are strong and unique
  - Check CORS settings match your domain
  - Enable CSRF protection
  - Configure rate limiting

- [ ] **Set Up Error Tracking**
  - Create Sentry account (optional but recommended)
  - Add `SENTRY_DSN` to `.env.production`

- [ ] **Review Authentication**
  - Test JWT token generation
  - Verify password hashing works
  - Check session management

### 4. Build and Test

- [ ] **Install Dependencies**
  ```bash
  cd Puter-Monitor-AI
  npm install
  ```

- [ ] **Run Type Checking**
  ```bash
  npm run check
  ```

- [ ] **Build Application**
  ```bash
  npm run build
  ```

- [ ] **Verify Build Output**
  - Check `dist/` directory exists
  - Verify `dist/index.cjs` is present
  - Check static assets in `dist/public/`

- [ ] **Test Locally**
  ```bash
  npm start
  # Visit http://localhost:5000
  ```

### 5. Database Setup

- [ ] **Push Database Schema**
  ```bash
  npm run db:push
  ```

- [ ] **Create Initial Admin User**
  - Run admin creation script
  - Verify admin can log in

- [ ] **Test Database Queries**
  - Verify all tables are created
  - Test CRUD operations
  - Check indexes are in place

### 6. AI Services Configuration (Optional)

- [ ] **Set Up Qdrant**
  - Create Qdrant instance
  - Add `QDRANT_URL` and `QDRANT_API_KEY`

- [ ] **Configure OpenAI**
  - Get OpenAI API key
  - Add `OPENAI_API_KEY`
  - Test AI features locally

### 7. Review Application Files

- [ ] **Check puter.json**
  - Verify service configurations
  - Check runtime settings
  - Validate environment variables

- [ ] **Review .gitignore**
  - Ensure `.env*` files are ignored
  - Check `node_modules` is ignored
  - Verify sensitive files are excluded

- [ ] **Update Documentation**
  - Review README.md
  - Update API documentation
  - Check deployment guides

### 8. Performance Optimization

- [ ] **Optimize Build**
  - Minify JavaScript
  - Compress CSS
  - Optimize images

- [ ] **Enable Caching**
  - Configure Redis caching
  - Set up CDN (if needed)
  - Enable browser caching

- [ ] **Resource Limits**
  - Check memory allocation
  - Verify CPU limits
  - Monitor disk usage

### 9. Monitoring and Logging

- [ ] **Configure Logging**
  - Set appropriate `LOG_LEVEL`
  - Test log output
  - Set up log rotation

- [ ] **Set Up Monitoring**
  - Enable application metrics
  - Configure health checks
  - Set up alerts

### 10. Final Checks

- [ ] **Security Audit**
  - No hardcoded secrets in code
  - All environment variables set
  - HTTPS enabled (automatic with Puter)
  - Security headers configured

- [ ] **Backup Strategy**
  - Database backup plan
  - Environment file backup
  - Code repository backup

- [ ] **Rollback Plan**
  - Document rollback procedure
  - Keep previous version accessible
  - Test rollback process

## 🚀 Ready to Deploy?

Once all items are checked, you're ready to deploy!

### Deploy with Script (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\deploy-puter.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/deploy-puter.sh
./scripts/deploy-puter.sh
```

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Puter
puter app:create puter-monitor-ai ./dist --description="AI-powered monitoring dashboard" --subdomain=monitor-ai

# Or update existing app
puter app:update puter-monitor-ai ./dist
```

## 📝 Post-Deployment

After deployment, verify:

- [ ] Application is accessible at the provided URL
- [ ] Login functionality works
- [ ] Database connectivity is working
- [ ] AI features are operational
- [ ] Monitoring dashboard displays data
- [ ] Error tracking is active
- [ ] Performance is acceptable

## 🆘 Troubleshooting

If deployment fails:

1. Check Puter CLI authentication: `puter whoami`
2. Verify build output: `ls dist/`
3. Review deployment logs
4. Check disk space: `puter df`
5. Consult [PUTER_DEPLOYMENT_GUIDE.md](./PUTER_DEPLOYMENT_GUIDE.md)

## 📚 Resources

- [Puter Deployment Guide](./PUTER_DEPLOYMENT_GUIDE.md)
- [Puter CLI Documentation](https://github.com/HeyPuter/puter-cli)
- [Project Documentation](./docs/)
- [Deployment Documentation](./docs/DEPLOYMENT.md)

