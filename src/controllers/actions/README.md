# Action Infrastructure

This folder contains the **infrastructure** for loading and executing actions, NOT the action definitions themselves.

## Purpose

This is the "game engine" layer for actions - it provides the plumbing that makes actions work.

## What Lives Here

- **action-loader.ts** - Loads action definitions from pipelines
- **action-resolver.ts** - Executes actions through the pipeline coordinator
- **action-types.ts** - Shared type definitions
- **ActionExecutionHelpers.ts** - Helper utilities for execution
- **game-commands.ts** - Game command utilities
- **shared-requirements.ts** - Common requirement checks

## What Does NOT Live Here

❌ **Action definitions** (those live in `src/pipelines/actions/`)  
❌ **Business logic** (that belongs in the pipelines)  
❌ **Custom implementations** (all actions use the unified pipeline now)

## Architecture

```
Action Infrastructure (this folder) = HOW to run actions
Action Pipelines (src/pipelines/actions/) = WHAT each action does
```

Think of it like:
- **This folder** = JavaScript engine
- **Pipelines folder** = JavaScript code being executed

## See Also

- `src/pipelines/actions/` - Where action definitions live
- `.clinerules/ARCHITECTURE_SUMMARY.md` - Section 8: Pipeline Architecture
