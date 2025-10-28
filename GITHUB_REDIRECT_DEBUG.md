# GitHub App Redirect Debugging

## Problem
The configurator is not auto-opening after GitHub App installation.

## What Should Happen

1. User clicks "Import from GitHub" in configurator
2. User is redirected to: `https://github.com/apps/apiblaze/installations/new`
3. User installs the app
4. GitHub redirects to: **Setup URL** (configured on GitHub App settings)
5. The Setup URL should be: `https://dashboard.apiblaze.com/github/callback`
6. `/github/callback` page sets localStorage and redirects to `/dashboard?open_create_dialog=true`
7. Dashboard detects `open_create_dialog=true` and opens configurator

## Current Debug Steps

### Step 1: Check GitHub App Setup URL Configuration

**CRITICAL**: Go to GitHub App settings and verify the Setup URL is set correctly.

1. Go to: https://github.com/settings/apps/apiblaze
2. Scroll to "Post installation" section
3. Check **Setup URL (optional)**: Should be `https://dashboard.apiblaze.com/github/callback`
4. If it's not set or different, update it and click "Save changes"

### Step 2: Test the Flow with Console Open

1. Open browser console (F12)
2. Go to dashboard
3. Click "Create Project"
4. Click "Import from GitHub"
5. Install/configure the app on GitHub
6. Watch what happens and check console logs

Expected console logs:
```
[GitHub Callback] Returned from GitHub app installation
[GitHub Callback] Parameters: { setupAction: 'install', installationId: '...' }
[Dashboard] Checking for GitHub return parameters...
[Dashboard] Current URL: https://dashboard.apiblaze.com/dashboard?open_create_dialog=true
[Dashboard] All URL parameters: { open_create_dialog: 'true' }
[Dashboard] 🎉 GitHub app detected! Opening create dialog
```

### Step 3: Check Where GitHub Actually Redirects

After clicking "Install" on GitHub, check the URL you land on:

**Scenario A**: Lands on `/github/callback` with parameters
- URL: `https://dashboard.apiblaze.com/github/callback?code=xxx&installation_id=xxx&setup_action=install`
- ✅ This is correct! Should redirect to dashboard and open configurator
- If not opening: Check console logs for errors

**Scenario B**: Lands directly on `/dashboard` with parameters
- URL: `https://dashboard.apiblaze.com/dashboard?code=xxx&installation_id=xxx&setup_action=install`
- ⚠️ This means GitHub is NOT using the Setup URL
- **Fix**: Set Setup URL in GitHub App settings (see Step 1)

**Scenario C**: Lands on `/dashboard` without parameters
- URL: `https://dashboard.apiblaze.com/dashboard` (no query params)
- ❌ GitHub is using a different redirect URL
- **Check**: What is set as "Callback URL" in GitHub App settings?
- **Should be**: `https://dashboard.apiblaze.com/auth/callback` (for OAuth)
- **Setup URL**: `https://dashboard.apiblaze.com/github/callback` (for app installation)

## GitHub App Settings Checklist

These are TWO DIFFERENT URLs for TWO DIFFERENT purposes:

### Callback URL (for OAuth login)
- Purpose: Where to redirect after OAuth login
- Should be: `https://dashboard.apiblaze.com/auth/callback`
- Used when: User clicks "Sign in with GitHub"

### Setup URL (for app installation) - **THIS IS WHAT WE NEED**
- Purpose: Where to redirect after installing GitHub App
- Should be: `https://dashboard.apiblaze.com/github/callback`
- Used when: User installs the GitHub App
- **Location in GitHub**: Settings → Developer settings → GitHub Apps → APIBlaze → General → Post installation → Setup URL (optional)

## Quick Fix

If the Setup URL is not set or wrong:

1. Go to: https://github.com/settings/apps/apiblaze
2. Find "Post installation" section
3. Check "Redirect on update"
4. Set **Setup URL**: `https://dashboard.apiblaze.com/github/callback`
5. Click "Save changes"
6. Test the flow again

## Alternative: Direct URL Detection

If you can't change the GitHub App Setup URL, we can detect the parameters directly on `/dashboard`:

The current code already does this! It checks for:
- `setup_action=install`
- `installation_id`
- `open_create_dialog=true`

So even if GitHub redirects directly to `/dashboard` with these parameters, it should work.

## What's Working Now

✅ Enhanced logging in console
✅ Detection of multiple parameter combinations
✅ Handles both `/github/callback` and direct `/dashboard` redirects
✅ Sets localStorage flags
✅ Opens configurator with 100ms delay

## Next Steps

1. Check console logs during the flow
2. Note the exact URL GitHub redirects to
3. Verify GitHub App Setup URL is set correctly
4. Report back what you see in the console!

