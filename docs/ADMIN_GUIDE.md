# Admin Guide - Puter Monitor AI

## Overview
This guide covers all administrative features and capabilities of the Puter Monitor AI dashboard.

## Authentication & Authorization

### User Roles

#### Viewer
- View monitoring dashboards
- Access basic system metrics
- Read AI insights
- No administrative access

#### Moderator
- All Viewer permissions
- View audit logs
- Generate API keys for themselves
- Access advanced analytics

#### Admin
- All Moderator permissions
- Create/edit/delete users
- Manage user roles
- Full audit log access
- System configuration
- API key management for all users

### Login Process
1. Navigate to `/login`
2. Enter email and password
3. Receive access token (15 minutes) and refresh token (7 days)
4. Token automatically refreshes before expiration

### Session Management
- Sessions stored in database with metadata
- Each login creates new session entry
- Track IP address and user agent
- Manual logout invalidates session
- Sessions auto-expire based on token lifetime

## User Management

### Creating Users
```bash
POST /api/auth/register
Authorization: Bearer <admin_token>

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "role": "viewer"  // Optional: defaults to "viewer"
}
```

**Admin Dashboard UI:**
1. Navigate to Admin > Users
2. Click "Add User"
3. Fill in user details
4. Select role
5. Click "Create"

### Updating User Roles
```bash
PUT /api/admin/users/:id/role
Authorization: Bearer <admin_token>

{
  "role": "moderator"
}
```

**Admin Dashboard UI:**
1. Go to Admin > Users
2. Find user in list
3. Click role dropdown
4. Select new role
5. Changes apply immediately

### Deactivating Users
```bash
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

**Note:** Users cannot delete or modify their own accounts for security.

## API Key Management

### Creating API Keys
API keys allow programmatic access to the monitoring API without user credentials.

```bash
POST /api/admin/api-keys
Authorization: Bearer <user_token>

{
  "name": "Monitoring Script",
  "permissions": ["read:metrics", "read:insights"],
  "expiresInDays": 90  // Optional: null for no expiration
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key-id",
    "name": "Monitoring Script",
    "key": "pk_3f2a8b9c4d5e6f7a8b9c0d1e2f3a4b5c...",  // SAVE THIS
    "keyPrefix": "pk_3f2a8b9",
    "permissions": ["read:metrics", "read:insights"],
    "expiresAt": "2024-07-01T00:00:00Z",
    "createdAt": "2024-04-01T00:00:00Z"
  }
}
```

⚠️ **Important:** The full API key is only shown once. Save it securely!

### Using API Keys
```bash
# Add to request headers
curl -H "Authorization: Bearer pk_your_api_key_here" \
  https://your-app.vercel.app/api/metrics
```

### Revoking API Keys
```bash
DELETE /api/admin/api-keys/:id
Authorization: Bearer <user_token>
```

## Audit Logging

All administrative actions are automatically logged with:
- User ID and email
- Action performed
- Resource affected
- Timestamp
- IP address
- User agent

### Viewing Audit Logs
```bash
GET /api/admin/audit-log?limit=100&offset=0
Authorization: Bearer <moderator_or_admin_token>
```

**Admin Dashboard UI:**
1. Navigate to Admin > Audit Log
2. Filter by:
   - User
   - Action type
   - Date range
   - Resource
3. Export logs as CSV for compliance

### Audit Log Events
- `user.login` - User logged in
- `user.logout` - User logged out
- `user.register` - New user created
- `user.update_role` - User role changed
- `user.delete` - User deleted
- `api_key.create` - API key generated
- `api_key.delete` - API key revoked
- `config.update` - System configuration changed

## AI Configuration

### AI Features Overview
- **Anomaly Detection:** Automatic detection of unusual system behavior
- **Predictive Analytics:** Forecast resource usage trends
- **Natural Language Queries:** Ask questions about system state
- **AI Insights:** Proactive recommendations and alerts

### Configuring AI Settings

#### Qdrant Vector Database (Optional)
For semantic search and advanced AI features:

```bash
QDRANT_URL=https://your-qdrant-instance.cloud:6333
QDRANT_API_KEY=your_api_key
```

Create collections:
```bash
# System metrics collection
curl -X PUT "https://qdrant-url:6333/collections/system_metrics" \
  -H "api-key: $QDRANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

#### OpenAI Integration (Optional)
For advanced natural language processing:

```bash
OPENAI_API_KEY=sk-your-key
AI_MODEL=gpt-4-turbo-preview
```

### AI Endpoints

#### Analyze Metrics
```bash
POST /api/ai/analyze
Authorization: Bearer <token>

{
  "metrics": [
    {
      "cpu": 75.2,
      "memory": 68.5,
      "disk": 45.0,
      "network": { "in": 1024, "out": 2048 },
      "timestamp": "2024-04-01T12:00:00Z"
    }
  ]
}
```

#### Natural Language Query
```bash
POST /api/ai/query
Authorization: Bearer <token>

{
  "query": "Is CPU usage normal right now?",
  "context": {
    "includeHistory": true,
    "timeRange": "1h"
  }
}
```

#### Get AI Insights
```bash
GET /api/ai/insights
Authorization: Bearer <token>
```

Returns proactive recommendations based on system state.

## System Configuration

### Monitoring Settings

#### Enable/Disable Monitoring Features
```bash
ENABLE_DOCKER_MONITORING=true
ENABLE_NETWORK_MONITORING=true
ENABLE_PROCESS_MONITORING=true
MONITORING_INTERVAL=5000  # milliseconds
```

### Security Settings

#### Rate Limiting
Protects against abuse:

```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # per window
```

#### CORS Configuration
```bash
CORS_ORIGIN=https://your-domain.com,https://app.yourdomain.com
```

#### Session Configuration
```bash
JWT_EXPIRES_IN=15m        # Access token lifetime
JWT_REFRESH_EXPIRES_IN=7d # Refresh token lifetime
```

### Database Maintenance

#### Connection Pooling
```bash
DB_POOL_MIN=2
DB_POOL_MAX=10
```

#### Backup Strategy
1. **Automated Backups:** Configure with your database provider
2. **Manual Backups:**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```
3. **Restore:**
   ```bash
   psql $DATABASE_URL < backup_20240401.sql
   ```

## Monitoring Dashboard Features

### Overview Dashboard
- Real-time system metrics (CPU, Memory, Disk, Network)
- Active alerts count
- AI insights summary
- Recent activity feed

### Network Monitor
- Active connections
- Traffic analysis
- Bandwidth usage
- Port monitoring

### Docker Containers
- Container status and health
- Resource usage per container
- Logs and inspection
- Quick actions (start/stop/restart)

### Process Monitor
- Running processes
- CPU and memory per process
- Kill/restart processes

### Storage Analysis
- Disk usage breakdown
- Directory tree visualization
- Largest files/folders
- Cleanup recommendations

### AI Assistant
- Chat interface for natural language queries
- Proactive insights cards
- Trend analysis
- Recommendation engine

## Best Practices

### Security
1. **Regular Password Updates:** Enforce password changes every 90 days
2. **Principle of Least Privilege:** Assign minimum necessary roles
3. **API Key Rotation:** Rotate keys every 6 months
4. **Audit Review:** Review audit logs weekly
5. **Session Monitoring:** Watch for unusual login patterns

### Performance
1. **Database Indexing:** Ensure indexes on frequently queried fields
2. **Query Optimization:** Monitor slow queries and optimize
3. **Caching:** Implement Redis for session storage in production
4. **CDN:** Use CDN for static assets

### Maintenance
1. **Regular Updates:** Keep dependencies up to date
2. **Database Cleanup:** Archive old audit logs quarterly
3. **Session Cleanup:** Remove expired sessions monthly
4. **Backup Verification:** Test restores monthly

## Troubleshooting

### User Can't Login
1. Check if account is active
2. Verify password hasn't expired
3. Check for too many failed attempts (rate limiting)
4. Review audit logs for clues

### API Keys Not Working
1. Verify key hasn't expired
2. Check permissions match required access
3. Ensure proper Authorization header format
4. Verify key is active in database

### Audit Logs Missing
1. Check database connection
2. Verify audit logging is enabled
3. Review application logs for errors
4. Check database disk space

### AI Features Not Responding
1. Verify Qdrant/OpenAI credentials
2. Check API quota limits
3. Review AI service logs
4. Test connectivity to external services

## Support & Resources

- **Documentation:** `/docs`
- **API Reference:** `/api/docs`
- **Status Page:** `/status`
- **Support Email:** admin@yourdomain.com
- **GitHub Issues:** `your-repo/issues`

## Emergency Procedures

### Security Breach
1. Immediately revoke all active sessions:
   ```sql
   DELETE FROM sessions;
   ```
2. Rotate all JWT secrets
3. Force password reset for all users
4. Review audit logs for unauthorized access
5. Notify affected users

### Database Failure
1. Switch to read-only mode
2. Restore from latest backup
3. Verify data integrity
4. Resume normal operations
5. Post-mortem analysis

### Performance Degradation
1. Check database connection pool
2. Review slow query logs
3. Scale up resources if needed
4. Enable caching
5. Optimize frequent queries
