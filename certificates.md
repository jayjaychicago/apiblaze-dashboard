---------------------------------------------------------------------------
 SSL Certificate Architecture for apiblaze.com hosted on cloudflare
---------------------------------------------------------------------------

1) Tenant Services Certificate (Advanced)
   Hosts Covered:
     - *.apiblaze.com (the api proxy for end users of tenants)
     - *.admin.apiblaze.com (the admin api for the api proxy for admin end users: add users, groups, list api keys...)
     - *.auth.apiblaze.com (auth for the api proxy for end users)
     - *.groups.apiblaze.com (groups for the api proxy for end users)
     - *.portal.apiblaze.com (portal for the api proxy for end users)
     - auth.apiblaze.com (apiblaze github app), needs a worker pointing to that
     - dashboard.apiblaze.com (the dashboard that allows tenant to create proxies and update them), currently a cloudflare CNAME that points to vercel
   Purpose:
     Covers all tenant-facing endpoints including API, authentication,
     group membership, and developer portal.
   Reason:
     Wildcard coverage automatically includes new tenants; simplifies
     management and reduces certificate count.

2) Platform Management Certificate (Advanced or Universal)
   Hosts Covered:
     - api.apiblaze.com (external api for tenants to create/delete proxies)
     - internalapi.apiblaze.com (internal api for apiblaze to create/delete proxies on behalf of tenants)
     - dashboard.apiblaze.com (ui for tenants to create/delete proxies)
   Purpose:
     Covers provider-level endpoints used by your internal control plane
     to manage tenant proxies.
   Reason:
     Keeps internal and external endpoints isolated for security and
     operational clarity.

3) Backup Universal Certificate (Cloudflare-managed)
   Hosts Covered:
     - *.apiblaze.com
   Purpose:
     Provides automatic fallback SSL coverage in case of Advanced
     certificate issues.
   Reason:
     Cloudflare maintains this automatically; ensures continuity if
     Advanced certificates are unavailable.

---------------------------------------------------------------------------
Summary:
- Total Certificates: 2 Advanced + 1 Backup Universal
- Security Isolation: Tenant vs. Provider separation
- Scalability: Wildcards handle dynamic tenant creation
- Operational Simplicity: Minimal manual renewal management
---------------------------------------------------------------------------
