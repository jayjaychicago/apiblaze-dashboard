# APIBlaze Dashboard v3

**Vercel for APIs** - The modern API management platform

## 🎯 Phase 0: GitHub OAuth Foundation - COMPLETE

This is the initial implementation of the APIBlaze Dashboard, focusing on rock-solid authentication and user experience.

### ✨ Features Implemented

- ✅ **GitHub OAuth Authentication** - Secure login via GitHub
- ✅ **Zustand State Management** - Global auth state
- ✅ **Protected Routes** - Middleware-based route protection
- ✅ **Beautiful UI** - Modern design with Tailwind CSS and shadcn/ui
- ✅ **User Menu** - Profile and logout functionality
- ✅ **Responsive Design** - Works on all devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub OAuth App (credentials provided in spec)

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# GitHub OAuth Configuration
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv23liwZOuwO0lPP9R9P
GITHUB_CLIENT_SECRET=0d73085efb4261f76fd42ad1c2f37434d2c044c1

# Auth Worker URL
NEXT_PUBLIC_AUTH_WORKER_URL=https://auth.apiblaze.com

# Internal API Configuration
INTERNAL_API_URL=https://internalapi.apiblaze.com
INTERNAL_API_KEY=2f74b48a4880ec418eab2e1e30fed513ba3242dfb3ab04cc5ee2ad4df0bedc0d

# Application URLs
NEXT_PUBLIC_APP_URL=https://dashboard.apiblaze.com
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Deployment to Vercel

This project is configured to deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

The project will be available at `dashboard.apiblaze.com`.

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Authentication**: GitHub OAuth via auth.apiblaze.com
- **Icons**: Lucide React
- **Deployment**: Vercel

### Project Structure

```
dashboard-apiblazev3/
├── app/                      # Next.js App Router
│   ├── auth/                 # Authentication pages
│   │   ├── login/           # Login page
│   │   └── callback/        # OAuth callback
│   ├── dashboard/           # Main dashboard
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── auth-provider.tsx    # Auth initialization
│   └── user-menu.tsx        # User menu component
├── lib/                     # Utilities
│   ├── auth.ts             # Auth helpers
│   ├── api.ts              # API client
│   └── utils.ts            # General utilities
├── store/                   # State management
│   └── auth.ts             # Auth store (Zustand)
└── middleware.ts           # Route protection
```

## 🔐 Authentication Flow

1. **User visits dashboard** → Redirected to `/auth/login`
2. **Clicks "Sign in with GitHub"** → Redirected to `auth.apiblaze.com/login`
3. **Auth worker handles OAuth** → Redirects to GitHub
4. **User authorizes** → GitHub redirects back to auth worker
5. **Auth worker exchanges code** → Gets access token
6. **Redirected to callback** → `/auth/callback?access_token=...`
7. **Callback verifies token** → Gets user info from GitHub API
8. **Stores auth state** → Sets Zustand store + localStorage
9. **Redirects to dashboard** → User is logged in

## 🎨 UI Components

All UI components are from shadcn/ui:

- Button
- Card
- Dropdown Menu
- Icons (Lucide React)

## 📋 Next Steps (Phase 1)

- [ ] Project creation UI
- [ ] GitHub repository integration
- [ ] OpenAPI spec upload
- [ ] Project listing and management
- [ ] Team management

## 🔗 Related Services

- **Auth Worker**: `auth.apiblaze.com` - Handles OAuth flow
- **Internal API**: `internalapi.apiblaze.com` - Backend API
- **Main Proxy**: `*.apiblaze.com` - API proxies

## 📝 Documentation

See the following files for more information:

- `MASTER_PLAN.txt` - Complete project roadmap
- `newspec.txt` - Project specifications
- `information_architecture.txt` - IA guidelines

## 🙏 Acknowledgments

Built with ❤️ for the APIBlaze platform.

---

**Phase 0 Status**: ✅ **COMPLETE**

# apiblaze-dashboard


