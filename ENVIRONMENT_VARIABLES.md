# Environment Variables Configuration

## Required Environment Variables

### App Configuration
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
# or in production:
# NEXT_PUBLIC_APP_URL=https://dashboard.apiblaze.com
```

### Auth Worker (Cloudflare Worker for OAuth)
```bash
NEXT_PUBLIC_AUTH_WORKER_URL=https://auth.apiblaze.com
```

### Internal API (Backend for project management)
```bash
INTERNAL_API_URL=https://internalapi.apiblaze.com
INTERNAL_API_KEY=your-internal-api-key
```

### GitHub App Configuration
```bash
# The numeric ID of your GitHub App
GITHUB_APP_ID=1093969

# URL where users install the app
GITHUB_APP_INSTALL_URL=https://github.com/apps/apiblaze/installations/new

# GitHub App OAuth credentials (for the app)
GITHUB_APP_CLIENT_ID=your-github-app-client-id
GITHUB_APP_CLIENT_SECRET=your-github-app-client-secret
```

## Optional Variables

### Analytics
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## GitHub App Setup

The GitHub App at https://github.com/apps/apiblaze should be configured with:

### Callback URLs
- Homepage URL: `https://dashboard.apiblaze.com`
- Callback URL: `https://dashboard.apiblaze.com/dashboard`
- Setup URL: `https://dashboard.apiblaze.com`

### Permissions Required
- **Repository contents**: Read-only
- **Repository metadata**: Read-only

### User permissions
- **Read access to code**: To read OpenAPI spec files

## How Installation Detection Works

1. User clicks "Import from GitHub" button
2. Frontend checks if they're authenticated (has GitHub access token)
3. Calls `/api/github/installation-status` with `Authorization: Bearer {access_token}` header
4. Backend uses Octokit to call GitHub API: `octokit.rest.apps.listInstallationsForAuthenticatedUser()`
5. Checks if APIBlaze app (ID: 1093969) is in the installations list
6. Returns `{ installed: true }` or `{ installed: false }`
7. Frontend shows appropriate UI (browse repos or install prompt)

## Notes

- The `GITHUB_APP_ID` is the numeric ID of the APIBlaze GitHub App
- All GitHub API calls from backend routes use the user's GitHub access token passed via Authorization header
- Frontend stores the GitHub access token in localStorage (set during OAuth callback)
- Backend API routes extract the token from `Authorization: Bearer {token}` header

