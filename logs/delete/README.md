# APIBlaze v2 Data Cleanup Scripts

This directory contains scripts for cleaning up KV and D1 data.

## ⚠️ WARNING ⚠️

These scripts will **PERMANENTLY DELETE** all data from:
- KV namespaces (PROJECTS, API_KEYS, CLAIM_CODES, USERS)
- D1 database (projects, deployments, teams, users, team_members)

**THERE IS NO UNDO**

## cleanup.sh

Main cleanup script that deletes all KV and D1 data.

### Usage

```bash
# See what would be deleted (safe)
./cleanup.sh --dry-run

# Delete with confirmation prompt
./cleanup.sh

# Delete without confirmation (dangerous!)
./cleanup.sh --confirm
```

### What it does

1. **Counts** all KV keys and D1 records
2. **Shows statistics** of what will be deleted
3. **Asks for confirmation** (unless --confirm flag used)
4. **Deletes** all data:
   - All keys from KV namespaces
   - All records from D1 tables (in correct order to handle foreign keys)
5. **Verifies** deletion was successful

### Requirements

- Wrangler CLI must be installed and authenticated
- Must be run from the repository root or have correct paths
- Requires `jq` for JSON parsing

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        ⚠️  APIBlaze v2 COMPLETE DATA CLEANUP  ⚠️          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

Gathering data statistics...

📦 KV Namespaces:
  • PROJECTS:    50 keys
  • API_KEYS:    12 keys
  • CLAIM_CODES: 8 keys
  • USERS:       3 keys
  TOTAL KV KEYS: 73

🗄️  D1 Database (apiblaze-production):
  • projects:      9 records
  • deployments:   9 records
  • teams:         5 records
  • team_members:  5 records
  • users:         4 records
  TOTAL D1 RECORDS: 32

⚠️  THIS WILL PERMANENTLY DELETE ALL DATA ABOVE ⚠️

Type 'DELETE ALL' to proceed: 
```

## Safety Features

1. **Dry-run mode**: See what would be deleted without deleting
2. **Confirmation prompt**: Must type 'DELETE ALL' to proceed
3. **Statistics first**: Shows counts before deletion
4. **Verification**: Checks that deletion was successful
5. **Exit on error**: Script stops if any command fails

## Recovery

**There is no built-in recovery mechanism.** Once data is deleted, it's gone.

To backup data before cleanup:

```bash
# Backup KV
wrangler kv key list --namespace-id=6cd31ae100a749a0968641aaaebaba5c > kv_backup_projects.json

# Backup D1
wrangler d1 export apiblaze-production --remote --output=d1_backup.sql
```

## Support

If you need help or encounter issues:
1. Always test with `--dry-run` first
2. Make backups before running cleanup
3. Review the output carefully before confirming

Last Updated: 2025-10-29

