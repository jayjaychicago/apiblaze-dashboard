#!/bin/bash
#
# cleanup.sh - Delete all KV and D1 entries for APIBlaze v2
# 
# ⚠️  WARNING: THIS WILL DELETE ALL DATA ⚠️
# This script will permanently delete:
# - All KV namespace entries (PROJECTS, API_KEYS, CLAIM_CODES, USERS)
# - All D1 database records (projects, deployments, teams, users, etc.)
#
# Usage:
#   ./cleanup.sh [--dry-run] [--confirm]
#
# Options:
#   --dry-run   Show what would be deleted without actually deleting
#   --confirm   Skip confirmation prompt and proceed with deletion
#
# Example:
#   ./cleanup.sh --dry-run           # See what would be deleted
#   ./cleanup.sh --confirm           # Delete everything without prompt
#   ./cleanup.sh                     # Delete with confirmation prompt
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Configuration
WORKER_DIR="/home/ubuntu/code/v2APIblaze/workers/admin-api"
KV_PROJECTS_ID="6cd31ae100a749a0968641aaaebaba5c"
KV_API_KEYS_ID="8abf4e6437f54c0c9036802f2a907adb"
KV_CLAIM_CODES_ID="23faec5753144c60b809b808919c9962"
KV_USERS_ID="997eba0973dc452d8594005066bca10c"
D1_DB_NAME="apiblaze-production"
DEBUG_ENDPOINT="https://api.apiblaze.com/debug/kv"

# Parse arguments
DRY_RUN=false
CONFIRM=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --confirm)
      CONFIRM=true
      shift
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: $0 [--dry-run] [--confirm]"
      exit 1
      ;;
  esac
done

echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                                                            ║${NC}"
echo -e "${RED}║        ⚠️  APIBlaze v2 COMPLETE DATA CLEANUP  ⚠️          ║${NC}"
echo -e "${RED}║                                                            ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}Running in DRY-RUN mode - no data will be deleted${NC}"
  echo ""
fi

# Function to count KV keys via wrangler
count_kv_keys_wrangler() {
  local namespace_id=$1
  local count=$(wrangler kv key list --namespace-id="$namespace_id" 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
  echo "$count"
}

# Function to count KV keys via worker debug endpoint
count_kv_keys_worker() {
  local total=$(curl -s "$DEBUG_ENDPOINT" 2>/dev/null | jq -r '.totalKeys' 2>/dev/null || echo "0")
  echo "$total"
}

# Function to count D1 records
count_d1_records() {
  local query=$1
  cd "$WORKER_DIR"
  # Parse wrangler output - skip banner lines and get JSON
  local output=$(wrangler d1 execute "$D1_DB_NAME" --remote --command="$query" 2>/dev/null)
  # Extract just the JSON array (starts with '[')
  local json=$(echo "$output" | grep -A 1000 '^\[' | head -n 1000)
  local count=$(echo "$json" | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
  echo "$count"
}

# Function to get all KV keys for a namespace
get_kv_keys() {
  local namespace_id=$1
  wrangler kv key list --namespace-id="$namespace_id" 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo ""
}

echo -e "${YELLOW}Gathering data statistics...${NC}"
echo ""

# Try to get KV counts from wrangler first, then fall back to worker
echo "📦 KV Namespaces:"
PROJECTS_COUNT=$(count_kv_keys_wrangler "$KV_PROJECTS_ID")
API_KEYS_COUNT=$(count_kv_keys_wrangler "$KV_API_KEYS_ID")
CLAIM_CODES_COUNT=$(count_kv_keys_wrangler "$KV_CLAIM_CODES_ID")
USERS_COUNT=$(count_kv_keys_wrangler "$KV_USERS_ID")

TOTAL_KV=$((PROJECTS_COUNT + API_KEYS_COUNT + CLAIM_CODES_COUNT + USERS_COUNT))

# If wrangler shows 0 but worker shows data, use worker count
if [ "$TOTAL_KV" = "0" ]; then
  WORKER_COUNT=$(count_kv_keys_worker)
  if [ "$WORKER_COUNT" != "0" ] && [ "$WORKER_COUNT" != "" ]; then
    echo -e "  ${YELLOW}Note: Wrangler CLI shows 0 keys, but worker sees $WORKER_COUNT keys${NC}"
    echo -e "  ${YELLOW}This may indicate the data exists in the worker's runtime but not locally${NC}"
    TOTAL_KV=$WORKER_COUNT
  fi
fi

echo "  • PROJECTS:    $PROJECTS_COUNT keys"
echo "  • API_KEYS:    $API_KEYS_COUNT keys"
echo "  • CLAIM_CODES: $CLAIM_CODES_COUNT keys"
echo "  • USERS:       $USERS_COUNT keys"
echo "  TOTAL KV KEYS: $TOTAL_KV"
echo ""

# D1 Statistics
echo "🗄️  D1 Database ($D1_DB_NAME):"
DB_PROJECTS=$(count_d1_records "SELECT COUNT(*) as count FROM projects")
DB_DEPLOYMENTS=$(count_d1_records "SELECT COUNT(*) as count FROM deployments")
DB_TEAMS=$(count_d1_records "SELECT COUNT(*) as count FROM teams")
DB_TEAM_MEMBERS=$(count_d1_records "SELECT COUNT(*) as count FROM team_members")
DB_USERS=$(count_d1_records "SELECT COUNT(*) as count FROM users")

echo "  • projects:      $DB_PROJECTS records"
echo "  • deployments:   $DB_DEPLOYMENTS records"
echo "  • teams:         $DB_TEAMS records"
echo "  • team_members:  $DB_TEAM_MEMBERS records"
echo "  • users:         $DB_USERS records"
echo "  TOTAL D1 RECORDS: $((DB_PROJECTS + DB_DEPLOYMENTS + DB_TEAMS + DB_TEAM_MEMBERS + DB_USERS))"
echo ""

# Show sample data
if [ "$DB_PROJECTS" != "0" ]; then
  echo "📋 Sample Projects (first 5):"
  cd "$WORKER_DIR"
  SAMPLE_OUTPUT=$(wrangler d1 execute "$D1_DB_NAME" --remote --command="SELECT project_id, api_version, display_name FROM projects LIMIT 5" 2>/dev/null)
  SAMPLE_JSON=$(echo "$SAMPLE_OUTPUT" | grep -A 1000 '^\[')
  echo "$SAMPLE_JSON" | jq -r '.[0].results[] | "  • \(.project_id) (v\(.api_version)): \(.display_name)"' 2>/dev/null || echo "  (Unable to fetch sample data)"
  echo ""
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "${GREEN}[DRY-RUN] Would delete all data above${NC}"
  exit 0
fi

# Confirmation
if [ "$CONFIRM" = false ]; then
  echo -e "${RED}⚠️  THIS WILL PERMANENTLY DELETE ALL DATA ABOVE ⚠️${NC}"
  echo ""
  read -p "Type 'DELETE ALL' to proceed: " confirmation
  
  if [ "$confirmation" != "DELETE ALL" ]; then
    echo -e "${YELLOW}Aborted. No data was deleted.${NC}"
    exit 0
  fi
fi

echo ""
echo -e "${YELLOW}Starting deletion...${NC}"
echo ""

# Delete KV Entries
echo "🗑️  Deleting KV entries..."

delete_kv_namespace() {
  local namespace_id=$1
  local namespace_name=$2
  
  echo "  Deleting $namespace_name..."
  local keys=$(get_kv_keys "$namespace_id")
  
  if [ -z "$keys" ]; then
    echo "    ✓ No keys to delete (or unable to access)"
    return
  fi
  
  local count=0
  while IFS= read -r key; do
    if [ ! -z "$key" ]; then
      wrangler kv key delete --namespace-id="$namespace_id" "$key" >/dev/null 2>&1
      ((count++))
    fi
  done <<< "$keys"
  
  echo "    ✓ Deleted $count keys"
}

delete_kv_namespace "$KV_PROJECTS_ID" "PROJECTS"
delete_kv_namespace "$KV_API_KEYS_ID" "API_KEYS"
delete_kv_namespace "$KV_CLAIM_CODES_ID" "CLAIM_CODES"
delete_kv_namespace "$KV_USERS_ID" "USERS"

echo ""

# Delete D1 Records
echo "🗑️  Deleting D1 records..."
cd "$WORKER_DIR"

# Delete in reverse order of foreign key dependencies
if [ "$DB_DEPLOYMENTS" != "0" ]; then
  echo "  Deleting deployments..."
  wrangler d1 execute "$D1_DB_NAME" --remote --command="DELETE FROM deployments" >/dev/null 2>&1
  echo "    ✓ Deleted $DB_DEPLOYMENTS records"
fi

if [ "$DB_TEAM_MEMBERS" != "0" ]; then
  echo "  Deleting team_members..."
  wrangler d1 execute "$D1_DB_NAME" --remote --command="DELETE FROM team_members" >/dev/null 2>&1
  echo "    ✓ Deleted $DB_TEAM_MEMBERS records"
fi

if [ "$DB_PROJECTS" != "0" ]; then
  echo "  Deleting projects..."
  wrangler d1 execute "$D1_DB_NAME" --remote --command="DELETE FROM projects" >/dev/null 2>&1
  echo "    ✓ Deleted $DB_PROJECTS records"
fi

if [ "$DB_TEAMS" != "0" ]; then
  echo "  Deleting teams..."
  wrangler d1 execute "$D1_DB_NAME" --remote --command="DELETE FROM teams" >/dev/null 2>&1
  echo "    ✓ Deleted $DB_TEAMS records"
fi

if [ "$DB_USERS" != "0" ]; then
  echo "  Deleting users..."
  wrangler d1 execute "$D1_DB_NAME" --remote --command="DELETE FROM users" >/dev/null 2>&1
  echo "    ✓ Deleted $DB_USERS records"
fi

echo ""

# Verify deletion
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo ""
echo "Verifying deletion..."

VERIFY_KV=$(count_kv_keys_wrangler "$KV_PROJECTS_ID")
if [ "$VERIFY_KV" = "0" ]; then
  VERIFY_KV=$(count_kv_keys_worker)
fi

VERIFY_DB=$(count_d1_records "SELECT COUNT(*) as count FROM projects")

echo "  KV keys remaining: $VERIFY_KV"
echo "  D1 projects remaining: $VERIFY_DB"

if [ "$VERIFY_KV" = "0" ] && [ "$VERIFY_DB" = "0" ]; then
  echo -e "${GREEN}✓ All data successfully deleted${NC}"
else
  echo -e "${YELLOW}⚠️  Some data may remain. You may need to run the script again.${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
