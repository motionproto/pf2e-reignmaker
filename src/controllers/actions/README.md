# Action Infrastructure

This folder contains the **infrastructure** for loading and executing actions, NOT the action definitions themselves.

## Purpose

This is the "game engine" layer for actions - it provides the plumbing that makes actions work.

## What Lives Here

- **game-commands.ts** - Game command utilities
- **pipeline-types.ts** - Shared type definitions
- **shared-requirements.ts** - Common requirement checks

All action definitions now live in `src/pipelines/actions/` and are accessed via `PipelineRegistry`.

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
