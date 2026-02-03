# Frontend Implementation Guide

## ✅ Completed Components

### Authentication System
- **AuthContext** (`client/src/contexts/AuthContext.tsx`)
  - JWT token management
  - Auto-refresh tokens
  - Role-based access control
  - Protected route wrapper

- **Login Page** (`client/src/pages/Login.tsx`)
  - Clean, modern login form
  - Email/password authentication
  - Error handling with toast notifications

### Admin Dashboard
- **Admin Layout** (`client/src/pages/admin/AdminLayout.tsx`)
  - Responsive sidebar navigation
  - Role-based menu filtering
  - User profile display
  - Mobile-friendly with hamburger menu

- **User Management** (`client/src/pages/admin/UserManagement.tsx`)
  - Create, read, update, delete users
  - Role assignment (Admin/Moderator/Viewer)
  - Inline role editing
  - Delete confirmation dialogs

- **API Keys** (`client/src/pages/admin/ApiKeys.tsx`)
  - Generate API keys with permissions
  - View all keys with metadata
  - One-time key display with copy-to-clipboard
  - Revoke keys
  - Expiration management

## 🔨 Integration Steps

### 1. Update App.tsx

Replace your existing `App.tsx`:

```typescript path=client/src/App.tsx
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { AuthProvider, ProtectedRoute } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import AdminLayout from "@/pages/admin/AdminLayout";
import UserManagement from "@/pages/admin/UserManagement";
import ApiKeys from "@/pages/admin/ApiKeys";
// Import other admin pages as you create them

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Public routes */}
            <Route path="/login" component={Login} />
            
            {/* Protected admin routes */}
            <Route path="/dashboard">
              {() => (
                <ProtectedRoute>
                  <AdminLayout>
                    <div className="space-y-6">
                      <h1 className="text-3xl font-bold">Dashboard Overview</h1>
                      <p>Welcome to Puter Monitor AI</p>
                      {/* Add dashboard widgets here */}
                    </div>
                  </AdminLayout>
                </ProtectedRoute>
              )}
            </Route>

            <Route path="/dashboard/users">
              {() => (
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <UserManagement />
                  </AdminLayout>
                </ProtectedRoute>
              )}
            </Route>

            <Route path="/dashboard/api-keys">
              {() => (
                <ProtectedRoute>
                  <AdminLayout>
                    <ApiKeys />
                  </AdminLayout>
                </ProtectedRoute>
              )}
            </Route>

            {/* Add more routes as needed */}

            {/* Default redirect */}
            <Route path="/">
              {() => {
                window.location.href = "/dashboard";
                return null;
              }}
            </Route>
          </Switch>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 2. Add Missing UI Components

If you don't have all shadcn/ui components installed, add them:

```bash
npx shadcn-ui@latest add table dialog alert-dialog badge avatar select
```

### 3. Required Additional Pages

Create these pages to complete the admin dashboard:

#### Dashboard Overview
`client/src/pages/admin/Dashboard.tsx`:
```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Key, FileText } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground">All systems running</p>
          </CardContent>
        </Card>
        
        {/* Add more metric cards */}
      </div>
    </div>
  );
}
```

#### Audit Log
`client/src/pages/admin/AuditLog.tsx`:
```typescript
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  createdAt: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/admin/audit-log?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{log.userId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.resource}</TableCell>
                  <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### 4. Router Integration

Install wouter if not already installed:

```bash
npm install wouter
```

### 5. Environment Variables

No frontend environment variables needed - all API calls use relative URLs that work with your Vercel deployment.

## 🎨 Styling & Theme

The components use your existing Tailwind + shadcn/ui setup. Make sure you have:

1. **Tailwind configured** with shadcn/ui paths
2. **Dark mode support** (optional but recommended)
3. **CSS variables** in `globals.css` for theme colors

## 🔐 Authentication Flow

1. **User visits any protected route** → Redirected to `/login`
2. **User logs in** → Tokens stored in localStorage
3. **AuthContext loads user** → Fetches user data with token
4. **Auto-refresh** → Tokens refresh every 10 minutes
5. **User logs out** → Tokens cleared, redirected to login

## 📱 Responsive Design

All components are mobile-responsive:
- Sidebar collapses to hamburger menu on mobile
- Tables scroll horizontally on small screens
- Dialogs adapt to screen size
- Forms stack vertically on mobile

## 🚀 Next Steps

### Immediate
1. **Integrate routes** in App.tsx
2. **Test authentication** flow
3. **Create remaining pages** (Monitoring, AI Insights, Settings)

### Additional Features
1. **Dashboard Widgets**
   - Real-time metrics display
   - CPU/Memory/Disk charts
   - Active alerts panel

2. **Monitoring Page**
   - System metrics visualization
   - Docker containers list
   - Network activity graphs

3. **AI Insights Page**
   - AI-generated recommendations
   - Anomaly detection results
   - Predictive analytics charts
   - Natural language query interface

4. **Settings Page**
   - System configuration
   - Notification preferences
   - Theme customization

## 🧪 Testing

### Manual Testing Checklist
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Navigate between pages
- [ ] Create new user (as admin)
- [ ] Update user role
- [ ] Delete user
- [ ] Generate API key
- [ ] Copy API key to clipboard
- [ ] Revoke API key
- [ ] View audit logs
- [ ] Logout

### Automated Testing (Optional)
```bash
# Install testing libraries
npm install -D @testing-library/react @testing-library/jest-dom vitest

# Create test files
# client/src/contexts/__tests__/AuthContext.test.tsx
# client/src/pages/admin/__tests__/UserManagement.test.tsx
```

## 📦 Build & Deploy

```bash
# Development
npm run dev

# Production build
npm run build

# Deploy to Vercel
vercel --prod
```

## 🐛 Troubleshooting

### Token Refresh Issues
- Check that `JWT_SECRET` and `JWT_REFRESH_SECRET` are set correctly
- Verify token expiration times in environment variables

### CORS Errors
- Ensure `CORS_ORIGIN` includes your Vercel domain
- Check that API routes are properly proxied

### 404 on Refresh
- Vercel should handle SPA routing automatically
- Check `vercel.json` rewrites configuration

### API Errors
- Check browser console for error messages
- Verify authentication headers are sent
- Check server logs in Vercel dashboard

## 📚 Component Reference

### useAuth Hook
```typescript
const { user, login, logout, hasRole, isAuthenticated, loading } = useAuth();

// Check if user has specific role
if (hasRole("admin")) {
  // Admin-only functionality
}

// Get current user
console.log(user.email, user.role);

// Logout
await logout();
```

### ProtectedRoute Component
```typescript
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>

// With role requirement
<ProtectedRoute requiredRole="admin">
  <AdminOnlyComponent />
</ProtectedRoute>
```

## 🎯 Best Practices

1. **Always use ProtectedRoute** for authenticated pages
2. **Check roles** before rendering admin-only UI
3. **Handle loading states** in all async operations
4. **Show toast notifications** for user feedback
5. **Validate forms** before submission
6. **Use TypeScript interfaces** for API responses
7. **Keep tokens secure** (httpOnly cookies in production)
8. **Implement error boundaries** for crash recovery

## 📖 Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Wouter Documentation](https://github.com/molefrog/wouter)
- [React Query](https://tanstack.com/query/latest)
