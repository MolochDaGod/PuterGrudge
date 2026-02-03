# Puter Monitor AI - Deployment Guide

## Overview
This guide covers deploying the Network AI Monitoring Dashboard to Vercel with full authentication, AI capabilities, and production-ready configuration.

## Prerequisites
- Node.js 20+ installed
- PostgreSQL database (can use Vercel Postgres, Supabase, or Neon)
- Vercel account
- GitHub account (for CI/CD)
- Optional: Qdrant instance for AI vector search
- Optional: OpenAI API key for advanced AI features

## Environment Setup

### 1. Database Setup

#### Option A: Vercel Postgres
```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Create Postgres database
vercel postgres create puter-monitor-db

# Connect to your project
vercel env pull .env
```

#### Option B: External PostgreSQL
Add to `.env`:
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 2. Run Migrations
```bash
# Generate migration files
npm run db:push

# Verify tables created
# Connect to your database and verify:
# - users
# - sessions
# - audit_logs
# - api_keys
```

### 3. Create Initial Admin User
```bash
# Create a script to seed admin user
node scripts/create-admin.js
```

Create `scripts/create-admin.js`:
```javascript
import { db } from "./server/db.js";
import { users } from "./shared/schema.js";
import { hashPassword } from "./server/auth.js";

const email = process.env.INITIAL_ADMIN_EMAIL || "admin@example.com";
const password = process.env.INITIAL_ADMIN_PASSWORD || "change-this-password";

const passwordHash = await hashPassword(password);

await db.insert(users).values({
  username: "admin",
  email,
  password: passwordHash,
  role: "admin",
});

console.log(`✓ Admin user created: ${email}`);
process.exit(0);
```

## Vercel Deployment

### 1. Update package.json Scripts
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "tsx script/build.ts && npm run build:client",
    "build:client": "vite build",
    "start": "NODE_ENV=production node dist/index.cjs",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

### 2. Create Vercel Build Script
Update `vercel.json`:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "dist/public",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  }
}
```

### 3. Configure Environment Variables in Vercel
Go to your Vercel project settings and add:

```bash
# Required
NODE_ENV=production
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_chars
SESSION_SECRET=your_session_secret_min_32_chars

# Optional AI Features
QDRANT_URL=https://your-qdrant-instance.cloud
QDRANT_API_KEY=your_qdrant_api_key
OPENAI_API_KEY=sk-your-openai-key
AI_MODEL=gpt-4-turbo-preview

# Optional Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info

# Security
CORS_ORIGIN=https://your-domain.vercel.app
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_CSRF=true

# Admin
INITIAL_ADMIN_EMAIL=admin@yourdomain.com
INITIAL_ADMIN_PASSWORD=secure_password_change_after_first_login
```

### 4. Deploy to Vercel

#### Via GitHub (Recommended)
```bash
# Push to GitHub
git add .
git commit -m "Deploy Puter Monitor AI"
git push origin main

# Import to Vercel
# Go to vercel.com/new
# Import your GitHub repository
# Configure environment variables
# Deploy
```

#### Via Vercel CLI
```bash
# Login
vercel login

# Deploy to production
vercel --prod
```

## Post-Deployment

### 1. Database Migrations
```bash
# After first deployment, run migrations
vercel env pull .env.production
npm run db:push
```

### 2. Create Admin User
```bash
# Run the admin creation script
node scripts/create-admin.js
```

### 3. Test Authentication
```bash
# Test login endpoint
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}'
```

### 4. Update Admin Password
1. Login to the dashboard
2. Navigate to Settings > Account
3. Change the default password immediately

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT secrets (min 32 characters)
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Configure CORS for your domain
- [ ] Enable rate limiting
- [ ] Set up Sentry for error tracking
- [ ] Review and limit API key permissions
- [ ] Enable audit logging
- [ ] Set up database backups
- [ ] Configure firewall rules (if using external DB)

## Monitoring & Maintenance

### View Logs
```bash
# Vercel logs
vercel logs

# Or via dashboard
# https://vercel.com/your-username/your-project/logs
```

### Database Backups
- Vercel Postgres: Automatic daily backups
- External DB: Configure automated backups per provider

### Performance Monitoring
- Enable Vercel Analytics in project settings
- Set up custom monitoring dashboards
- Configure alerts for critical metrics

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
node -e "require('./server/db').testDatabaseConnection()"

# Check connection string format
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### Build Failures
```bash
# Clear build cache
vercel --force

# Check build logs
vercel logs --build
```

### Authentication Issues
- Verify JWT_SECRET is set correctly
- Check token expiration times
- Ensure DATABASE_URL has SSL mode if required

## CI/CD Pipeline

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Scaling Considerations

### Database
- Use connection pooling (already configured)
- Consider read replicas for high traffic
- Monitor query performance

### API
- Vercel automatically scales Edge Functions
- Configure function regions for low latency
- Use caching strategies for static data

### AI Services
- Implement request queuing for AI operations
- Cache common AI responses
- Consider serverless GPU for intensive ML tasks

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

## Next Steps

1. Deploy application to Vercel
2. Configure custom domain
3. Set up SSL/TLS
4. Enable monitoring and alerts
5. Train team on admin features
6. Document AI capabilities for end users
7. Set up regular maintenance schedule
