# 🚀 Deployment Guide - APIBlaze Dashboard

## Quick Deployment to Vercel

### Prerequisites

- GitHub account (connected to Vercel)
- Vercel account
- Repository: `jayjaychicago/apiblaze-dashboard`

### Step 1: Push to GitHub

The code is already in the `/home/ubuntu/code/dashboard-apiblazev3` directory.

```bash
cd /home/ubuntu/code/dashboard-apiblazev3

# Initialize git (if not already done)
git init
git add .
git commit -m "Phase 0: GitHub OAuth Foundation - Complete"

# Push to GitHub repository
git remote add origin https://github.com/jayjaychicago/apiblaze-dashboard.git
git branch -M main
git push -u origin main
```

### Step 2: Configure Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import `jayjaychicago/apiblaze-dashboard` from GitHub
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 3: Add Environment Variables

Add these environment variables in Vercel Dashboard:

#### Required Variables

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | `Iv23liwZOuwO0lPP9R9P` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | `0d73085efb4261f76fd42ad1c2f37434d2c044c1` | GitHub OAuth App Client Secret |
| `NEXT_PUBLIC_AUTH_WORKER_URL` | `https://auth.apiblaze.com` | Auth worker URL |
| `INTERNAL_API_URL` | `https://internalapi.apiblaze.com` | Internal API URL |
| `INTERNAL_API_KEY` | `2f74b48a4880ec418eab2e1e30fed513ba3242dfb3ab04cc5ee2ad4df0bedc0d` | Internal API Key |
| `NEXT_PUBLIC_APP_URL` | `https://dashboard.apiblaze.com` | Production app URL |

#### How to Add in Vercel

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add each variable one by one:
   - Variable name: (from table above)
   - Value: (from table above)
   - Environment: Production, Preview, Development (select all)
3. Click "Save"

### Step 4: Configure Custom Domain

1. In Vercel project settings, go to **Domains**
2. Add custom domain: `dashboard.apiblaze.com`
3. Vercel will provide DNS records
4. Add the DNS records to your Cloudflare dashboard:
   - Type: `CNAME`
   - Name: `dashboard`
   - Value: `cname.vercel-dns.com`
   - Proxy status: DNS only (gray cloud)
5. Wait for DNS propagation (usually <5 minutes)
6. Vercel will automatically provision SSL certificate

### Step 5: Deploy

Once environment variables and domain are configured:

1. Click "Deploy" in Vercel
2. Wait for build to complete (~2-3 minutes)
3. Visit `https://dashboard.apiblaze.com`
4. Test login flow with GitHub OAuth

## Alternative: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd /home/ubuntu/code/dashboard-apiblazev3
vercel --prod

# Follow prompts and enter environment variables when asked
```

## Local Development

### Setup

```bash
cd /home/ubuntu/code/dashboard-apiblazev3

# Install dependencies
npm install

# Create .env.local file (manually, as it's in .gitignore)
# Add the environment variables from the table above

# Run development server
npm run dev
```

Visit `http://localhost:3000`

### Environment Variables for Local Development

Create `.env.local` file:

```env
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv23liwZOuwO0lPP9R9P
GITHUB_CLIENT_SECRET=0d73085efb4261f76fd42ad1c2f37434d2c044c1
NEXT_PUBLIC_AUTH_WORKER_URL=https://auth.apiblaze.com
INTERNAL_API_URL=https://internalapi.apiblaze.com
INTERNAL_API_KEY=2f74b48a4880ec418eab2e1e30fed513ba3242dfb3ab04cc5ee2ad4df0bedc0d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: For local development, change `NEXT_PUBLIC_APP_URL` to `http://localhost:3000`

## Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

## GitHub OAuth Callback URLs

Make sure these callback URLs are configured in your GitHub App:

- `https://dashboard.apiblaze.com/api/auth/callback/github`
- `https://dashboard.apiblaze.com/auth/callback`
- `https://auth.apiblaze.com/callback`
- `http://localhost:3000/auth/callback` (for local dev)

## Testing Deployment

After deployment, test the following:

1. ✅ Visit `https://dashboard.apiblaze.com`
2. ✅ Should redirect to `/auth/login`
3. ✅ Click "Sign in with GitHub"
4. ✅ Authorize GitHub OAuth App
5. ✅ Should redirect back to dashboard
6. ✅ User menu should show your GitHub profile
7. ✅ Click logout should return to login page

## Troubleshooting

### Issue: OAuth callback fails

**Solution**: Check that all redirect URIs are configured in GitHub App settings

### Issue: Environment variables not working

**Solution**: 
1. Verify variables are added in Vercel dashboard
2. Redeploy after adding variables
3. Check that variable names match exactly (case-sensitive)

### Issue: Build fails

**Solution**:
1. Check build logs in Vercel
2. Run `npm run build` locally to identify issues
3. Make sure all dependencies are in `package.json`

### Issue: Domain not resolving

**Solution**:
1. Wait for DNS propagation (up to 24 hours, usually <5 min)
2. Check DNS records in Cloudflare
3. Verify CNAME points to `cname.vercel-dns.com`
4. Ensure proxy is disabled (gray cloud)

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Custom domain configured and resolving
- [ ] SSL certificate provisioned
- [ ] Login flow works end-to-end
- [ ] User menu displays correctly
- [ ] Logout redirects to login
- [ ] No console errors in browser
- [ ] Mobile responsive design works

## Monitoring

### Vercel Analytics

Enable Vercel Analytics for:
- Page views
- User sessions
- Performance metrics
- Error tracking

### GitHub OAuth Monitoring

Monitor GitHub App OAuth in GitHub settings:
- Check authorized users
- Review OAuth permissions
- Monitor rate limits

## Continuous Deployment

Once configured, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for PRs
- Run build and type checks
- Update production if build succeeds

## Next Steps

After successful deployment:

1. ✅ Phase 0 complete - Authentication working
2. 🚧 Phase 1 - Implement project creation
3. 🚧 Phase 2 - Zero state and onboarding
4. 🚧 Phase 3 - Information architecture
5. 🚧 And so on...

---

**Need help?** Check the [README.md](./README.md) or [PHASE0_COMPLETE.md](./PHASE0_COMPLETE.md)



