# Action Migration Progress Checker

Utility script to track the migration of actions from the legacy system to the unified pipeline system.

## Quick Start

```bash
# Basic check
npm run check-migration

# Verbose mode (shows all migrated actions)
npm run check-migration:verbose
```

## What It Checks

### 1. Pipeline Files
- Scans `src/pipelines/actions/` for `*.ts` files
- Converts filenames (e.g., `claimHexes.ts` → `claim-hexes`)
- Verifies each has a corresponding entry in MIGRATED_ACTIONS

### 2. MIGRATED_ACTIONS Set
- Parses `ActionsPhase.svelte` for the MIGRATED_ACTIONS constant
- Validates that each entry has a corresponding pipeline file
- Detects mismatches (pipelines without markers, markers without pipelines)

### 3. Legacy Files
- Checks `src/actions/` for old action folders
- Identifies which can be safely deleted (already migrated)
- Provides `rm -rf` command for cleanup

### 4. Remaining Work
- Lists all actions not yet migrated
- Categorizes by complexity:
  - 🔧 **Complex**: Has custom implementation in `implementations/`
  - 📁 **Moderate**: Has legacy folder in `src/actions/`
  - 📄 **Simple**: Data-only (in `data/player-actions/`)

## Output Example

```
🔍 Checking Action Migration Progress...

📊 Summary:
   Total Actions: 26
   Migrated: 4 (15%)
   Remaining: 22

   [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 15%

⚠️  Actions with pipelines but NOT in MIGRATED_ACTIONS:
   - build-structure
   - repair-structure
   → Add these to MIGRATED_ACTIONS in ActionsPhase.svelte

🗑️  Legacy action folders safe to DELETE:
   - src/actions/claim-hexes/
   - src/actions/purchase-resources/
   → rm -rf src/actions/claim-hexes src/actions/purchase-resources

📝 Remaining Actions (22/26):
   🔧 build-structure
   📁 collect-stipend
   📄 create-worksite
   ...

✅ Migration in progress: 4/26 actions complete
```

## Error States

### Actions with pipelines but NOT in MIGRATED_ACTIONS
**Problem:** Pipeline config exists but not marked as migrated.

**Fix:** Add the action to MIGRATED_ACTIONS in ActionsPhase.svelte:
```typescript
const MIGRATED_ACTIONS = new Set([
  'claim-hexes',
  'deal-with-unrest',
  'sell-surplus',
  'purchase-resources',
  'your-new-action'  // ✅ Add here
]);
```

### Actions in MIGRATED_ACTIONS but NO pipeline config
**Problem:** Marked as migrated but no pipeline file exists.

**Fix:** Either:
1. Create the missing pipeline config in `src/pipelines/actions/`
2. Remove from MIGRATED_ACTIONS if not actually migrated

## Integration with CI/CD

To block PRs with incomplete migrations:

```json
{
  "scripts": {
    "test": "npm run check-migration && npm run build"
  }
}
```

The script exits with code 1 if validation fails.

## Completion Milestone

When all actions are migrated:

```
🎉 All actions migrated! Ready for cleanup phase.

Next steps:
1. Delete src/actions/ folder
2. Delete src/controllers/actions/implementations/ folder
3. Delete or simplify src/controllers/actions/action-resolver.ts
4. Update documentation
```

## File Structure

```
buildscripts/
  check-action-migration.cjs    # Main script (CommonJS)

src/
  pipelines/
    actions/
      claimHexes.ts              # Pipeline configs
      dealWithUnrest.ts
      ...
  view/kingdom/turnPhases/
    ActionsPhase.svelte          # MIGRATED_ACTIONS set
```

## Technical Details

### Filename Conversion
- Pipeline files use camelCase: `claimHexes.ts`
- Action IDs use kebab-case: `claim-hexes`
- Script converts automatically: `claimHexes` → `claim-hexes`

### MIGRATED_ACTIONS Parsing
Uses regex to extract the Set literal:
```javascript
const match = content.match(/const MIGRATED_ACTIONS = new Set\(\[([\s\S]*?)\]\);/);
```

Handles:
- Single quotes: `'claim-hexes'`
- Double quotes: `"claim-hexes"`
- Multi-line formatting
- Trailing commas

### Exit Codes
- `0` = All checks pass (or migration in progress)
- `1` = Validation errors found
