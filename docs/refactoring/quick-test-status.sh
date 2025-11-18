#!/bin/bash
# Quick script to check action testing status

echo "========================================="
echo "Action Testing Status"
echo "========================================="
echo ""

# Count by status (only in action entries, not type definitions)
untested=$(grep -E "^\s+\['.+',\s*'untested'\]" src/constants/migratedActions.ts | wc -l | tr -d ' ')
testing=$(grep -E "^\s+\['.+',\s*'testing'\]" src/constants/migratedActions.ts | wc -l | tr -d ' ')
tested=$(grep -E "^\s+\['.+',\s*'tested'\]" src/constants/migratedActions.ts | wc -l | tr -d ' ')
verified=$(grep -E "^\s+\['.+',\s*'verified'\]" src/constants/migratedActions.ts | wc -l | tr -d ' ')
total=26

complete=$((untested + testing + tested + verified))
tested_complete=$((tested + verified))
percent=$((tested_complete * 100 / total))

echo "Untested:  $untested"
echo "Testing:   $testing"
echo "Tested:    $tested"
echo "Verified:  $verified"
echo "-------------------"
echo "Total:     $tested_complete/$total ($percent%)"
echo ""

# List untested actions
if [ $untested -gt 0 ]; then
  echo "Remaining untested actions:"
  echo "-------------------"
  grep -E "^\s+\['.+',\s*'untested'\]" src/constants/migratedActions.ts | sed "s/.*\['\([^']*\)'.*/  - \1/"
fi

echo ""
echo "========================================="
