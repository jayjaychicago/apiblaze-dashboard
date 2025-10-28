# 🔧 Troubleshooting 401 Unauthorized Error

**Error**: `GET https://dashboard.apiblaze.com/api/github/installation-status 401 (Unauthorized)`

---

## 🎯 Understanding the 401 Error

A 401 error means the GitHub access token is either:
1. Missing
2. Invalid
3. Expired  
4. Doesn't have the required scopes

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Check if Access Token Exists

Open browser console and run:
```javascript
const token = localStorage.getItem('access_token');
console.log('Access token exists:', !!token);
console.log('Token (first 20 chars):', token?.substring(0, 20));
```

**If no token**:
- User is not logged in
- Solution: Redirect to login

**If token exists**: Proceed to Step 2

### Step 2: Check Token Validity

```javascript
const token = localStorage.getItem('access_token');

// Test if token works with GitHub API
fetch('https://api.github.com/user', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json'
  }
})
.then(r => {
  console.log('GitHub API status:', r.status);
  return r.json();
})
.then(data => {
  if (data.login) {
    console.log('✅ Token is valid! GitHub user:', data.login);
  } else {
    console.log('❌ Token invalid:', data);
  }
})
.catch(err => console.error('Error:', err));
```

**If 401**: Token is invalid or expired  
**If 200**: Token is valid - issue is elsewhere

### Step 3: Check Token Scopes

```javascript
const token = localStorage.getItem('access_token');

fetch('https://api.github.com/user', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => {
  const scopes = r.headers.get('X-OAuth-Scopes');
  console.log('Token scopes:', scopes);
  
  // Required scopes: read:user, user:email, repo
  const hasRequired = scopes?.includes('repo') && scopes?.includes('read:user');
  console.log('Has required scopes:', hasRequired);
  
  return r.json();
})
.then(data => console.log('User data:', data));
```

**Required scopes**:
- `read:user` - Read user profile
- `user:email` - Read user email
- `repo` - Read repository contents

### Step 4: Test Installation Status Endpoint

```javascript
const token = localStorage.getItem('access_token');

fetch('/api/github/installation-status', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  cache: 'no-store'
})
.then(async r => {
  console.log('Status:', r.status);
  console.log('Headers:', Object.fromEntries(r.headers.entries()));
  
  const text = await r.text();
  console.log('Response body:', text);
  
  try {
    const json = JSON.parse(text);
    console.log('Parsed:', json);
  } catch (e) {
    console.log('Not JSON');
  }
})
.catch(err => console.error('Fetch error:', err));
```

---

## 🔧 Common Solutions

### Solution 1: Re-authenticate

The easiest fix is to log out and log back in:

```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
window.location.href = '/auth/login';
```

Or use the UI button that appears when 401 error is detected.

### Solution 2: Check Environment Variables

Ensure your `.env` or production environment has:

```bash
# Auth Worker URL
NEXT_PUBLIC_AUTH_WORKER_URL=https://auth.apiblaze.com

# GitHub App ID
GITHUB_APP_ID=1093969
```

### Solution 3: Verify OAuth Flow

The GitHub OAuth must be configured with proper scopes.

Check `/auth/login` implementation:
- Should request scopes: `read:user user:email repo`
- Should receive access token in callback
- Should store token in localStorage

### Solution 4: Check API Route

The API route should accept Bearer tokens:

```typescript
// In app/api/github/installation-status/route.ts
const authHeader = request.headers.get('Authorization');
const accessToken = authHeader?.replace('Bearer ', '');

if (!accessToken) {
  return NextResponse.json(
    { error: 'Not authenticated' }, 
    { status: 401 }
  );
}
```

---

## 🎯 Production vs Development

### Development (localhost:3000)
- Uses OAuth with localhost redirect
- Token stored in localStorage
- Directly calls GitHub API

### Production (dashboard.apiblaze.com)
- Uses OAuth with production redirect
- Token stored in localStorage
- Should work the same way

**Key Difference**: Make sure production OAuth app has correct callback URL

---

## 🔄 Temporary Workarounds

### Workaround 1: Use Target URL Source

If GitHub integration isn't working:
1. Select "Target URL" as source type
2. Enter your backend URL directly
3. Deploy without GitHub

### Workaround 2: Use Upload Source

1. Select "Upload" as source type
2. Upload your OpenAPI spec file
3. Deploy without GitHub

---

## 📋 Checklist for 401 Fix

- [ ] User is logged in (check localStorage.access_token)
- [ ] Token is valid (test with GitHub API directly)
- [ ] Token has required scopes (read:user, user:email, repo)
- [ ] Auth worker URL is configured correctly
- [ ] API route is receiving Authorization header
- [ ] API route is extracting token correctly
- [ ] Octokit is initialized with token

---

## 🚨 If Still Not Working

### Enable Debug Logging

The code already has enhanced logging. Check console for:

```
[General Section] Component mounted, checking GitHub installation
[General Section] checkGitHubInstallation called, accessToken: true/false
[General Section] Starting installation check...
[GitHub] Installation API response status: 401
[GitHub] 401 Unauthorized - Access token may be invalid
[GitHub] Error details: {...}
```

### Check Network Tab

1. Open DevTools → Network tab
2. Filter for "installation-status"
3. Check Request Headers:
   - Should have: `Authorization: Bearer ghp_...`
4. Check Response:
   - Status: 401
   - Body: { error: '...' }

### Backend Logs

If you have access to backend logs, check for:
- "GitHub authentication error"
- "No access token provided"
- "Invalid or expired GitHub token"

---

## 💡 Most Likely Cause

**The access token from auth.apiblaze.com might not be a GitHub token!**

**Possible issue**: Your auth worker (`auth.apiblaze.com`) might be issuing its own tokens, not GitHub OAuth tokens.

**Solution**: 
1. Check what `auth.apiblaze.com` returns in the token exchange
2. Ensure it's returning a GitHub access token (starts with `ghp_` or `gho_`)
3. Not a custom JWT or other token type

**To verify**:
```javascript
const token = localStorage.getItem('access_token');
console.log('Token type:', 
  token?.startsWith('ghp_') ? 'GitHub Personal Token' :
  token?.startsWith('gho_') ? 'GitHub OAuth Token' :
  token?.startsWith('ghs_') ? 'GitHub Server Token' :
  token?.startsWith('eyJ') ? 'JWT Token' :
  'Unknown'
);
```

---

## 🎯 Quick Fix for Testing

If you just want to test the UI flow without real GitHub integration:

**Option 1**: Simulate installation
```javascript
localStorage.setItem('github_app_just_installed', 'true');
localStorage.setItem('github_app_installed', 'true');
window.location.href = '/dashboard?open_create_dialog=true';
```

**Option 2**: Use Target URL source
1. Select "Target URL" instead of "GitHub"
2. Enter: `https://api.example.com`
3. Test the rest of the flow

---

## 📞 Need Help?

If still stuck, gather this information:

1. **Access token type** (run token check above)
2. **Console logs** (all [GitHub] prefixed messages)
3. **Network request details** (Headers & Response from DevTools)
4. **Environment**: Development or Production?
5. **OAuth provider**: Where is auth.apiblaze.com getting the token?

**The 401 error is now properly handled with a user-friendly message and re-authentication option!**

