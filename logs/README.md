# Logging Setup

## How It Works

The `create-proxy` endpoint now includes **debug logs directly in the API response**.

### Response Format

```json
{
  "success": true,
  "project_id": "example",
  "debugLogs": [
    "[CreateProxy] Creating project for user: {\"username\":\"testuser\"}",
    "[CreateProxy] Processing request: {\"username\":\"testuser\",\"target\":\"https://api.example.com\",\"auth_type\":\"none\"}",
    "[CreateProxy] OpenAPI spec obtained: {\"hasSpec\":false,\"source\":\"none\"}",
    "[CreateProxy] Generated tenant name from target: {\"hostname\":\"api.example.com\",\"tenantName\":\"example\"}",
    "[CreateProxy] Project created successfully: {\"tenantName\":\"example\",\"apiVersion\":\"1.0.0\",\"endpoints\":[\"dev\",\"prod\"]}"
  ]
}
```

## Scripts

### `./logs/log`
Captures live logs from the worker (still useful for seeing ALL requests)
- Writes to `logs/requests.log`
- Newest entries at the top
- Uses wrangler tail

### `./logs/deploy-admin-api`
Builds and deploys the admin-api worker to production

## Viewing Logs

**Option 1: Check the API response**
The easiest way! The `debugLogs` array in the response shows exactly what happened during project creation.

**Option 2: Use wrangler tail**
```bash
./logs/log
```

Then create a project in the dashboard. You'll see logs in real-time.

**Option 3: Check the log file**
```bash
cat logs/requests.log | less
```

## What Gets Logged

- User and request details
- GitHub fetching (if applicable)
- Tenant name generation
- Database operations
- Success/error states
- All intermediate steps

## Console.log Note

While console.log statements are in the code, Cloudflare Workers may not always capture them in the tail logs. That's why we **include the logs directly in the response** - it's more reliable and easier to debug!

