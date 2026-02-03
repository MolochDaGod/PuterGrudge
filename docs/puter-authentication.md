# Puter Authentication & Deployment - GrudgeOS

## Overview

GrudgeOS integrates with Puter.js SDK to provide free, unlimited cloud services including:
- User authentication (login/signup/logout)
- Cloud storage via Puter KV
- Static website deployment to *.puter.site
- AI services (GPT-4o, Claude, Gemini, DeepSeek)

## Authentication System

### PuterAuthService

Located at: `public/grudgeos/lib/puter-auth.js`

The `PuterAuthService` class handles all authentication operations with graceful offline fallback.

#### Methods

- `init()` - Initialize authentication and check current user status
- `login()` - Open Puter's sign-in dialog
- `signup()` - Open Puter's sign-up/sign-in dialog (same flow)
- `logout()` - Sign out current user
- `getUser()` - Get current user object
- `getUsername()` - Get username or "Guest"
- `onAuthChange(callback)` - Subscribe to auth state changes

#### Usage Example

```javascript
// Initialize on page load
await window.PuterAuth.init();

// Listen for auth changes
window.PuterAuth.onAuthChange((state) => {
  console.log('Auth state:', state.isAuthenticated, state.user?.username);
});

// Login
const result = await window.PuterAuth.login();
if (result.success) {
  console.log('Logged in as:', result.user.username);
}

// Logout
await window.PuterAuth.logout();
```

### UI Integration

The launcher footer displays:
- User avatar with first letter of username
- Username or "Guest"
- Status indicator (Online/Guest Mode/Offline)
- Login button (when not authenticated)
- Logout button (when authenticated)

## Deployment System

### PuterDeployService

The `PuterDeployService` class handles static website deployment to Puter hosting.

#### Methods

- `deploy(appName, files)` - Deploy files to *.puter.site
- `deployFromDir(appName, dirPath)` - Deploy from Puter filesystem directory
- `listDeployments()` - Get list of deployed apps
- `deleteDeployment(subdomain)` - Remove a deployment

#### Usage Example

```javascript
// Deploy files
const result = await window.PuterDeploy.deploy('my-app', {
  'index.html': '<html><body>Hello World</body></html>',
  'style.css': 'body { font-family: sans-serif; }'
});

if (result.success) {
  console.log('Deployed to:', result.deployment.url);
  // e.g., https://my-app.puter.site
}

// List all deployments
const deployments = await window.PuterDeploy.listDeployments();

// Delete a deployment
await window.PuterDeploy.deleteDeployment('my-app');
```

## Offline Mode

GrudgeOS gracefully handles scenarios where Puter services are unavailable:

1. **Detection**: All Puter operations check `typeof puter !== 'undefined'` before proceeding
2. **Fallback**: When offline, features gracefully degrade:
   - Auth shows "Guest" mode
   - Storage operations return empty/default values
   - Deployment shows error messages
3. **Retry Logic**: GrudgeCloud initialization retries 3 times before falling back

### Known Behavior

The Puter.js SDK may log "Unexpected token '<'" errors when services are unreachable. This is internal SDK behavior and does not affect application functionality.

## Success Verification

To verify Puter authentication is working:

1. Open GrudgeOS desktop at `/grudgeos/desktop.html`
2. Click the launcher button (bottom-left)
3. Look at the footer - you should see:
   - "Guest" with "Offline" or "Guest Mode" status if not logged in
   - Login button (arrow pointing right)
4. Click the Login button
5. Puter's authentication dialog should appear
6. After logging in, the footer updates to show your username and "Online" status

## File Locations

- `public/grudgeos/lib/puter-auth.js` - Authentication and deployment services
- `public/grudgeos/desktop.html` - UI integration with auth state
- `public/grudgeos/lib/grudge-cloud.js` - Cloud storage operations
- `public/grudgeos/lib/agent-sync.js` - Agent state sync with Puter KV
