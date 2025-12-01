# Archived JSON Data

**Archived on:** December 1, 2025  
**Reason:** Migration to TypeScript-only pipeline architecture

## What's Here

This directory contains the original JSON data files for:
- **events/** - 37 kingdom event definitions
- **incidents/** - 30 kingdom incident definitions  
- **player-actions/** - 27 player action definitions

## Why Archived

These files were archived during migration to a TypeScript-only architecture where:
- **All event/incident/action data now lives in TypeScript pipelines** (`src/pipelines/`)
- **PipelineRegistry is the single source of truth** for runtime access
- **No JSON compilation or generation needed** - pure TypeScript

## What Was Migrated

From JSON to TypeScript:
- ✅ Base data: descriptions, skills, modifiers
- ✅ `endsEvent` flags (for ongoing events)
- ✅ `traits` arrays (for display/filtering)
- ✅ All outcome definitions

What was ADDED in TypeScript (not in JSON):
- ✨ `outcomeBadges` - Static preview badges for possible outcomes
- ✨ `preview.calculate()` - Dynamic preview generation  
- ✨ `execute()` - Custom execution logic with game commands
- ✨ `postApplyInteractions` - Map selection, dialogs, custom UI
- ✨ Full TypeScript type safety and IDE support

## Data Differences

### Events (endsEvent is critical!)
JSON had `endsEvent: true/false` on each outcome to control ongoing event lifecycle. This **was migrated** to TypeScript pipelines and must be preserved.

### Incidents
JSON had basic outcomes. TypeScript added custom execute logic for automated effects (e.g., `destroyWorksite` for bandit raids).

### Actions  
Some actions (like `fortify-hex`) have additional configuration data in JSON that needs to be embedded in TypeScript or kept as reference data.

## How to Use This Archive

- **For reference**: Compare JSON to TypeScript to see what data exists
- **For migration**: If creating new events/incidents, use these as templates
- **For recovery**: Git history has full JSON if needed to restore

## Current Architecture

```
Runtime:  PipelineRegistry.getPipelinesByType('event'|'incident'|'action')
          ↓
          TypeScript Pipeline Files (src/pipelines/)
          ↓
          Full CheckPipeline objects with code + data
```

## Related Documentation

- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) - System architecture
- [`docs/BUILD_SYSTEM.md`](../../docs/BUILD_SYSTEM.md) - Build process
- [`docs/systems/core/pipeline-patterns.md`](../../docs/systems/core/pipeline-patterns.md) - Pipeline patterns

