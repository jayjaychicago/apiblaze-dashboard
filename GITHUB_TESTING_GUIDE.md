# 🧪 GitHub Integration Testing Guide

**Date**: October 28, 2025  
**Purpose**: Test and verify GitHub app installation flow

---

## 🎯 Overview

This guide helps you test the complete GitHub app installation and repository browsing flow.

---

## 🔧 Setup Required

### 1. GitHub App Configuration

The GitHub App at https://github.com/apps/apiblaze MUST have:

**Setup URL (Post-installation)**: `https://dashboard.apiblaze.com/github/callback`

OR for local testing:
**Setup URL**: `http://localhost:3000/github/callback`

This is where GitHub redirects users after they install the app.

### 2. Environment Variables

Ensure `.env.local` has:
```bash
GITHUB_APP_ID=1093969
```

---

## 🧪 Testing Instructions

### Test 1: Fresh Installation (Clean State)

**Prepare**:
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
```

**Steps**:
1. Navigate to http://localhost:3000/dashboard
2. Click "Create Project"
3. Select "GitHub" source type
4. Should show: "Import API Spec from GitHub" card
5. Button text: "Import from GitHub"
6. Click the button
7. Install modal should open
8. Click "Connect GitHub"
9. **→ Redirects to GitHub**
10. Install the app (select repos)
11. **→ GitHub redirects to /github/callback**
12. **→ Callback page shows "GitHub Connected!"**
13. **→ Auto-redirects to /dashboard?open_create_dialog=true**
14. **→ Create dialog opens automatically** ✅
15. **→ General tab active, GitHub source selected**
16. **→ Button now shows: "Browse Repositories"** ✅

**Expected Console Logs**:
```
[General Section] Component mounted, checking GitHub installation
[General Section] checkGitHubInstallation called, accessToken: true
[General Section] Starting installation check...
[General Section] Installation check response: { installed: true, installation_id: "..." }
[General Section] Is installed: true
[General Section] State updated, githubAppInstalled: true
```

### Test 2: Already Installed

**Prepare**:
```javascript
// App should already be installed from Test 1
```

**Steps**:
1. Click "Create Project"
2. Select "GitHub" source
3. Should immediately show: "Browse Repositories" button
4. Click button
5. **→ Repository selector modal opens** ✅
6. **→ Should see your REAL GitHub repositories** ✅

### Test 3: Uninstall Detection

**Prepare**:
```javascript
// Go to https://github.com/settings/installations
// Uninstall APIBlaze app
```

**Steps**:
1. Return to dashboard (don't reload)
2. Click "Create Project"
3. Select "GitHub" source
4. Click "Browse Repositories" (it still thinks it's installed)
5. **→ API returns 401/403**
6. **→ Modal closes**
7. **→ Button changes to "Import from GitHub"** ✅

---

## 🔍 Debugging Tools

### Check Installation Status

```javascript
// In browser console:
const token = localStorage.getItem('access_token');

if (!token) {
  console.log('❌ No access token found!');
} else {
  console.log('✅ Access token found');
  
  fetch('/api/github/installation-status', {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  })
  .then(r => r.json())
  .then(data => {
    console.log('Installation status:', data);
    if (data.installed) {
      console.log('✅ GitHub App is installed');
      console.log('Installation ID:', data.installation_id);
    } else {
      console.log('❌ GitHub App is NOT installed');
    }
  })
  .catch(err => console.error('Error:', err));
}
```

### Check All Flags

```javascript
console.log('=== Storage Flags ===');
console.log('access_token:', !!localStorage.getItem('access_token'));
console.log('github_app_installed:', localStorage.getItem('github_app_installed'));
console.log('github_app_just_installed:', localStorage.getItem('github_app_just_installed'));
```

### Simulate GitHub Return (For Testing)

```javascript
// Simulate user returning from GitHub after installation
localStorage.setItem('github_app_just_installed', 'true');
window.location.href = '/dashboard?open_create_dialog=true';
```

### Test API Endpoint Directly

```javascript
// Test installation status endpoint
const token = localStorage.getItem('access_token');

fetch('/api/github/installation-status', {
  headers: { 'Authorization': `Bearer ${token}` },
  cache: 'no-store'
})
.then(async r => {
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Response:', data);
})
.catch(console.error);
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "No access token available"

**Symptoms**: Console shows "No access token, skipping check"

**Solution**:
```javascript
// Check if user is logged in
const token = localStorage.getItem('access_token');
console.log('Token exists:', !!token);

// If no token, log in again
if (!token) {
  window.location.href = '/auth/login';
}
```

### Issue 2: API returns 401 Unauthorized

**Symptoms**: Installation check fails with 401

**Causes**:
- Access token expired
- Access token invalid
- Not logged in

**Solution**:
```javascript
// Clear auth and re-login
localStorage.removeItem('access_token');
localStorage.removeItem('user');
window.location.href = '/auth/login';
```

### Issue 3: Returns "installed: false" when app IS installed

**Symptoms**: App is installed on GitHub but API returns false

**Possible Causes**:
- Wrong `GITHUB_APP_ID` in environment variables
- Token doesn't have proper scopes
- App not installed for current user

**Solution**:
```javascript
// Check which app ID we're looking for
console.log('Looking for app ID:', process.env.GITHUB_APP_ID || '1093969');

// Go to GitHub and verify:
// 1. App is installed: https://github.com/settings/installations
// 2. Check the app ID matches
```

### Issue 4: Dialog doesn't open on return

**Symptoms**: Return from GitHub but dialog stays closed

**Solution**:
```javascript
// Check if callback page set the flag
console.log('Just installed flag:', localStorage.getItem('github_app_just_installed'));

// Manually trigger:
localStorage.setItem('github_app_just_installed', 'true');
window.location.href = '/dashboard?open_create_dialog=true';
```

---

## 📋 Checklist for Successful Flow

### Before Installation
- [ ] User is logged in (has access token)
- [ ] Dashboard loads successfully
- [ ] Create dialog opens when clicking "Create Project"
- [ ] GitHub source type can be selected
- [ ] Shows "Import from GitHub" button
- [ ] Clicking shows install modal

### During Installation
- [ ] "Connect GitHub" button redirects to GitHub
- [ ] GitHub app installation page loads
- [ ] User can select repositories
- [ ] After install, redirects to /github/callback
- [ ] Callback page shows "GitHub Connected!"
- [ ] Auto-redirects to /dashboard?open_create_dialog=true

### After Installation
- [ ] Dashboard loads
- [ ] Create dialog opens automatically
- [ ] General tab is active
- [ ] GitHub source is selected
- [ ] Button shows "Browse Repositories" (not "Import from GitHub")
- [ ] Clicking "Browse Repositories" opens modal
- [ ] Modal shows user's REAL repositories
- [ ] Can select repo → scan for specs
- [ ] Can select spec → fields auto-populate
- [ ] Deploy button enables

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ USER                                                    │
├─────────────────────────────────────────────────────────┤
│ 1. Login with GitHub OAuth                             │
│    → Get access token → Store in localStorage          │
├─────────────────────────────────────────────────────────┤
│ 2. Open Create Project Dialog                          │
│    → Select GitHub source                              │
│    → System checks installation status                 │
├─────────────────────────────────────────────────────────┤
│ 3. Not Installed? Show "Import from GitHub"            │
│    → Click → Install modal opens                       │
│    → Click "Connect GitHub"                            │
│    → Redirect to github.com/apps/apiblaze              │
├─────────────────────────────────────────────────────────┤
│ 4. On GitHub                                            │
│    → Install app                                       │
│    → Select repositories                               │
│    → Authorize                                         │
├─────────────────────────────────────────────────────────┤
│ 5. GitHub Redirects to /github/callback                │
│    → Set localStorage.github_app_just_installed=true   │
│    → Set localStorage.github_app_installed=true        │
│    → Redirect to /dashboard?open_create_dialog=true    │
├─────────────────────────────────────────────────────────┤
│ 6. Dashboard Loads                                      │
│    → Sees ?open_create_dialog=true                     │
│    → Opens create dialog                               │
│    → General section mounts                            │
│    → Detects github_app_just_installed flag            │
│    → Calls /api/github/installation-status             │
│    → Gets real status from GitHub                      │
│    → Updates UI: "Browse Repositories"                 │
├─────────────────────────────────────────────────────────┤
│ 7. User Clicks "Browse Repositories"                   │
│    → Re-checks installation (safety check)             │
│    → Opens repository modal                            │
│    → Loads REAL repos from GitHub                      │
│    → User selects repo & spec                          │
│    → Fields auto-populate                              │
│    → Deploy! 🚀                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Test Commands

### Reset Everything
```javascript
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

### Simulate Return from GitHub
```javascript
localStorage.setItem('github_app_just_installed', 'true');
localStorage.setItem('github_app_installed', 'true');
window.location.href = '/dashboard?open_create_dialog=true';
```

### Force Re-Check Installation
```javascript
const token = localStorage.getItem('access_token');
if (token) {
  fetch('/api/github/installation-status', {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  }).then(r => r.json()).then(data => {
    console.log('Installation status:', data);
    if (data.installed) {
      localStorage.setItem('github_app_installed', 'true');
      console.log('✅ Installed - refresh to see button change');
      window.location.reload();
    }
  });
}
```

---

## ⚠️ Important Notes

### GitHub App Setup URL

**CRITICAL**: In your GitHub App settings at https://github.com/apps/apiblaze, set:

**Setup URL**: 
- Local: `http://localhost:3000/github/callback`
- Production: `https://dashboard.apiblaze.com/github/callback`

If this is not set correctly, users will not be redirected back to your app after installation!

### Access Token Scopes

The GitHub OAuth must request these scopes:
- `read:user`
- `user:email`  
- `repo` (to read repository contents)

### CORS & Credentials

All API calls use:
```typescript
credentials: 'include'
```

This ensures cookies/session data is sent with requests.

---

## 📚 Summary

With proper logging and the dedicated `/github/callback` page:

✅ **Clear flow**: User → GitHub → Callback → Dashboard  
✅ **Auto-opens dialog**: No manual clicks needed  
✅ **Real-time detection**: Updates immediately  
✅ **Console logs**: Debug any issues  
✅ **Test utilities**: Simulate any scenario  

**Follow the setup and testing steps above to verify everything works! 🚀**

