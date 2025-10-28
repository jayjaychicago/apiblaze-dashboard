# 📸 Phase 1: Visual Guide

## What You'll See

### 1. Dashboard (Zero State)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔷 APIBlaze v3.0             [@username ▼]                  │
│    Vercel for APIs                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Welcome back, [Your Name]! 👋                               │
│  You haven't created any API proxies yet. Let's get started!│
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        ┌──────┐                                      │   │
│  │        │  +   │                                      │   │
│  │        └──────┘                                      │   │
│  │   Create Your First API Project                     │   │
│  │   Deploy your API proxy in seconds using            │   │
│  │   GitHub, upload, or manual configuration           │   │
│  │                                                      │   │
│  │          [➤ Create Project]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [GitHub]        [Domains]         [Teams]                  │
│  Integration     Custom Domains    Collaboration            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Project Creation Dialog (General Tab)
```
┌──────────────────────────────────────────────────────────────┐
│ Create New API Project                                   [X] │
│ Configure your API proxy with sensible defaults.             │
│ Deploy instantly or customize settings across all sections.  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [General][Auth][Targets][Portal][Throttling][Processing][Domains]
│                                                               │
│ Project Name & API Version                                   │
│ This determines the URL your API will be accessible at       │
│                                                               │
│ [myawesomeapi_________] .apiblaze.com / [1.0.0]              │
│ Your API: myawesomeapi.apiblaze.com/1.0.0                    │
│                                                               │
│ ─────────────────────────────────────────────────────────────│
│                                                               │
│ Source                                                        │
│ Choose how to configure your API                             │
│                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 🔀 GitHub   │ │ 🌐 Target   │ │ 📤 Upload   │            │
│ │ [Recommended]│ │    URL      │ │             │            │
│ │ Import spec │ │ Manual      │ │ Upload file │            │
│ │ from repo   │ │ configure   │ │             │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔷 Install GitHub App                                   │ │
│ │ To import from GitHub, authorize the APIBlaze App       │ │
│ │ [⚡ Authorize GitHub App]                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ GitHub User/Org      Repository                              │
│ [mycompany____]      [my-api-specs_________]                 │
│                                                               │
│ Path to Spec              Branch                             │
│ [specs/openapi.yaml]      [main____]                         │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ All sections have defaults. Deploy now or customize first.   │
│                                      [Cancel] [🚀 Deploy API]│
└──────────────────────────────────────────────────────────────┘
```

### 3. Authentication Tab
```
┌──────────────────────────────────────────────────────────────┐
│ Create New API Project                                   [X] │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [General][Auth][Targets][Portal][Throttling][Processing][Domains]
│         ▲▲▲▲▲▲                                                │
│                                                               │
│ User Group Name                                               │
│ Name for RBAC control. Can be reused across APIs             │
│ [my-api-users__________]                                      │
│                                                               │
│ ─────────────────────────────────────────────────────────────│
│                                                               │
│ Authentication Methods                                        │
│                                                               │
│ ┌────────────────────────────────────────────────┐           │
│ │ ✓ Enable API Key Authentication         [ON]  │           │
│ │   Users authenticate using API keys            │           │
│ └────────────────────────────────────────────────┘           │
│                                                               │
│ ┌────────────────────────────────────────────────┐           │
│ │ ✓ Enable Social Authentication          [ON]  │           │
│ │   Users authenticate using OAuth tokens        │           │
│ └────────────────────────────────────────────────┘           │
│                                                               │
│   ┌────────────────────────────────────────────┐             │
│   │ ⚡ Bring My Own OAuth Provider      [ON]  │             │
│   │   Use Google, Auth0, or other provider    │             │
│   └────────────────────────────────────────────┘             │
│                                                               │
│   ⚠️ Important: Add callback URL to your provider            │
│   https://apiportal.myInstantAPI.com                         │
│                                                               │
│   OAuth Provider                                             │
│   [Google ▼]                                                 │
│                                                               │
│   Identity Provider Domain                                   │
│   [https://accounts.google.com]                              │
│                                                               │
│   Client ID                  Client Secret                   │
│   [your-client-id]           [••••••••••••]                  │
│                                                               │
│   Authorized Scopes                                          │
│   [email] [openid] [profile] [custom-scope ×] [+]           │
│                                                               │
│   📖 Google Cloud Platform Setup                             │
│   1. Go to Google Cloud Console...                           │
│   2. Select your project...                                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4. Target Servers Tab
```
┌──────────────────────────────────────────────────────────────┐
│ Create New API Project                                   [X] │
├──────────────────────────────────────────────────────────────┤
│ [General][Auth][Targets][Portal][Throttling][Processing][Domains]
│                 ▲▲▲▲▲▲▲                                       │
│                                                               │
│ Target Servers                                                │
│ Configure target servers for different environments           │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Stage    Target Server URL              Config    [🗑]  │  │
│ │ [prod]   [https://api.example.com/prod] [⚙️ 3]         │  │
│ │ 🔗 projectname.apiblaze.com/1.0.0/prod                  │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Stage    Target Server URL              Config    [🗑]  │  │
│ │ [test]   [https://api.example.com/test] [⚙️ Add]       │  │
│ │ 🔗 projectname.apiblaze.com/1.0.0/test                  │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Stage    Target Server URL              Config    [🗑]  │  │
│ │ [dev]    [https://api.example.com/dev]  [⚙️ Add]       │  │
│ │ 🔗 projectname.apiblaze.com/1.0.0/dev                   │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [+ Add Target Server]                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘

Configuration Dialog:
┌──────────────────────────────────────┐
│ Server Configuration             [X] │
│ Add headers, params, or body vars    │
├──────────────────────────────────────┤
│ ┌────────────────────────────────┐   │
│ │ [Header ▼] [X-API-KEY] [1234] │🗑│ │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ [Param ▼]  [token]     [abc]  │🗑│ │
│ └────────────────────────────────┘   │
│ [+ Add Configuration]                │
│                                      │
│                          [Done]      │
└──────────────────────────────────────┘
```

### 5. Portal Tab
```
┌──────────────────────────────────────────────────────────────┐
│ [General][Auth][Targets][Portal][Throttling][Processing][Domains]
│                         ▲▲▲▲▲▲                                │
│                                                               │
│ API Developer Portal                                          │
│ Configure the developer portal for your API users             │
│                                                               │
│ ┌────────────────────────────────────────────────┐           │
│ │ ✓ Create API Developer Portal          [ON]   │           │
│ │   Generate interactive portal for docs        │           │
│ └────────────────────────────────────────────────┘           │
│                                                               │
│   Portal Logo URL                                            │
│   [https://example.com/logo.png_________________]            │
│   URL to logo displayed in the developer portal              │
│                                                               │
│   🔗 Your portal: projectname.portal.apiblaze.com            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 6. Throttling Tab
```
┌──────────────────────────────────────────────────────────────┐
│ [General][Auth][Targets][Portal][Throttling][Processing][Domains]
│                                 ▲▲▲▲▲▲▲▲▲▲                   │
│                                                               │
│ Throttling & Quotas                                           │
│ Configure rate limiting and usage quotas for your API         │
│                                                               │
│ Throttling Rate (requests per second)                         │
│ [10__]                                                        │
│ Maximum number of requests allowed per second                 │
│                                                               │
│ Throttling Burst                                              │
│ [20__]                                                        │
│ Maximum burst before throttling kicks in                      │
│                                                               │
│ Quota Limit           Quota Period                            │
│ [1000]                [Per Day ▼]                             │
│ Total requests allowed per time period                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 7. Success Toast Notification
```
┌─────────────────────────────────┐
│ Project Created! 🎉         [×] │
│ myawesomeapi has been           │
│ successfully deployed.          │
└─────────────────────────────────┘
```

### 8. Error Toast Notification
```
┌─────────────────────────────────┐
│ Deployment Failed           [×] │
│ Project name already exists     │
└─────────────────────────────────┘
```

## Key Visual Features

### 🎨 Color Coding
- **Blue**: Primary actions and links
- **Green**: Success states
- **Red**: Errors and destructive actions
- **Purple**: Secondary features
- **Orange**: Warnings

### ✨ Visual Feedback
- ✅ Green checkmarks for success
- ❌ Red X for errors
- 🔄 Spinners for loading
- 💡 Badges for recommendations
- ⚠️ Warning icons for important info

### 📱 Responsive Design
- Desktop: Full width dialog with side-by-side layouts
- Tablet: Adjusted columns and spacing
- Mobile: Single column, stacked elements

### 🎯 User Flow
```
Dashboard → [Create Project] → Dialog Opens
                                    ↓
                         Choose General Settings
                                    ↓
                      (Optional) Configure Other Tabs
                                    ↓
                              [Deploy API]
                                    ↓
                            Success Toast! 🎉
                                    ↓
                         Project List Refreshes
```

## Testing the UI

### Quick Test
1. Click "Create Project" button
2. Enter a project name
3. See real-time URL preview
4. Click "Deploy API"
5. See success notification

### Full Configuration Test
1. Navigate to each tab
2. Fill in various fields
3. See visual feedback on all inputs
4. Test validation (try empty project name)
5. Check all sections render correctly

### Interaction Tests
- Switch between source types (GitHub/Target URL/Upload)
- Toggle authentication options
- Add/remove target servers
- Open configuration dialog
- Add custom scopes
- Select different OAuth providers

## Accessibility

✅ **Keyboard Navigation**: Tab through all fields
✅ **Screen Readers**: Proper labels and ARIA attributes
✅ **Focus Indicators**: Visible focus states
✅ **Color Contrast**: WCAG 2.1 AA compliant
✅ **Semantic HTML**: Proper heading hierarchy

---

**The UI is production-ready and provides an excellent user experience! 🚀**

