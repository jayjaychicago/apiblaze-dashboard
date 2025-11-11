# 🚀 Quick Start Guide - APIBlaze Dashboard

## What is this?

The **APIBlaze Dashboard** is a beautiful, modern web application for managing API proxies. Think of it as "Vercel for APIs" - you can create, deploy, and manage API proxies with a beautiful UI.

This implementation completes **Phase 0: GitHub OAuth Foundation** which provides:
- ✅ Secure GitHub authentication
- ✅ Beautiful, responsive UI
- ✅ User profile management
- ✅ Protected routes
- ✅ Ready for production deployment

## 🎯 Current Status

**Phase 0: COMPLETE** ✅

All authentication infrastructure is in place and working. Ready to move to Phase 1 (project creation).

## 💻 Run Locally (5 minutes)

### 1. Install Dependencies

```bash
cd /home/ubuntu/code/dashboard-apiblazev3
npm install
```

### 2. Create Environment File

The `.env.local` file is in `.gitignore`, so you need to create it manually with these exact values:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv23liwZOuwO0lPP9R9P
GITHUB_CLIENT_SECRET=0d73085efb4261f76fd42ad1c2f37434d2c044c1
NEXT_PUBLIC_AUTH_WORKER_URL=https://auth.apiblaze.com
INTERNAL_API_URL=https://internalapi.apiblaze.com
INTERNAL_API_KEY=2f74b48a4880ec418eab2e1e30fed513ba3242dfb3ab04cc5ee2ad4df0bedc0d
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Open Browser

Visit: `http://localhost:3000`

You should see:
1. Redirect to `/auth/login`
2. Beautiful login page
3. "Sign in with GitHub" button

**Note**: The GitHub OAuth callback won't work locally unless you add `http://localhost:3000/auth/callback` to the GitHub App's authorized callback URLs.

## 🌐 Deploy to Production (10 minutes)

### Option 1: GitHub + Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   cd /home/ubuntu/code/dashboard-apiblazev3
   git add .
   git commit -m "Phase 0: Complete"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import repository: `jayjaychicago/apiblaze-dashboard`
   - Add environment variables (see [DEPLOYMENT.md](./DEPLOYMENT.md))
   - Deploy

3. **Configure Domain**:
   - Add `dashboard.apiblaze.com` in Vercel
   - Update DNS in Cloudflare

**Full deployment instructions**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd /home/ubuntu/code/dashboard-apiblazev3
vercel --prod
```

## 📁 Project Structure

```
dashboard-apiblazev3/
├── app/                          # Next.js App Router
│   ├── auth/
│   │   ├── login/page.tsx       # Login page
│   │   └── callback/page.tsx    # OAuth callback
│   ├── dashboard/page.tsx       # Main dashboard
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home (redirects)
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── auth-provider.tsx        # Auth init
│   └── user-menu.tsx            # User menu
├── lib/
│   ├── auth.ts                  # Auth utilities
│   ├── api.ts                   # API client
│   └── utils.ts                 # Helpers
├── store/
│   └── auth.ts                  # Zustand store
├── middleware.ts                # Route protection
└── package.json                 # Dependencies
```

## 🧪 Test the Application

### Test Checklist

1. ✅ **Home page**: Should redirect to `/auth/login`
2. ✅ **Login page**: Beautiful UI with GitHub button
3. ✅ **Login flow**: Click button → GitHub → Callback → Dashboard
4. ✅ **Dashboard**: Shows welcome message with your name
5. ✅ **User menu**: Click avatar → Shows profile options
6. ✅ **Logout**: Click logout → Returns to login page
7. ✅ **Protected routes**: Direct access to `/dashboard` without auth redirects to login
8. ✅ **Responsive**: Works on mobile, tablet, desktop

### Manual Testing

```bash
# Start dev server
npm run dev

# In browser:
# 1. Visit http://localhost:3000
# 2. Click "Sign in with GitHub"
# 3. Authorize (if prompted)
# 4. Should land on dashboard
# 5. Click user avatar
# 6. Click logout
# 7. Should return to login
```

## 🎨 What You Get

### Beautiful UI
- Modern gradient backgrounds
- Clean typography with Inter font
- shadcn/ui components
- Responsive design
- Dark mode ready

### Secure Authentication
- GitHub OAuth integration
- Token verification
- Protected routes
- Session management

### Developer Experience
- TypeScript for type safety
- Hot reload in development
- Fast builds with Next.js 15
- Clean, maintainable code

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| Zustand | State management |
| Lucide React | Icons |
| Vercel | Deployment |

## 📚 Documentation

- **[README.md](./README.md)** - Full project documentation
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide
- **[PHASE0_COMPLETE.md](./PHASE0_COMPLETE.md)** - Phase 0 details
- **[MASTER_PLAN.txt](./MASTER_PLAN.txt)** - Complete roadmap

## 🐛 Troubleshooting

### Issue: Dependencies fail to install

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Build fails

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Try building
npm run build
```

### Issue: Port 3000 in use

```bash
# Use different port
PORT=3001 npm run dev
```

### Issue: OAuth callback fails

- Make sure `http://localhost:3000/auth/callback` is in GitHub App settings
- Check that auth worker at `auth.apiblaze.com` is running
- Verify environment variables are set correctly

## 🎯 What's Next?

Now that Phase 0 is complete, the next steps are:

### Phase 1: Project Creation
- Create project UI
- GitHub repository browser
- OpenAPI spec upload
- Project management

See [MASTER_PLAN.txt](./MASTER_PLAN.txt) for the full roadmap.

## 💡 Tips

1. **Use the dev server** - It has hot reload for fast development
2. **Check the console** - Errors will show in browser console
3. **Inspect network** - Use browser DevTools to debug API calls
4. **Read the code** - It's well-commented and easy to understand

## 🙋 Need Help?

1. Check the documentation in this directory
2. Review the code - it's clean and commented
3. Check browser console for errors
4. Verify environment variables are set

## 🎉 Success!

If you can:
1. ✅ Run `npm run dev`
2. ✅ See the login page
3. ✅ Click "Sign in with GitHub"
4. ✅ Land on the dashboard

Then **Phase 0 is working perfectly!** 🚀

---

**Built with ❤️ for APIBlaze**



