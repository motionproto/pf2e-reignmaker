# Kingdom Actions

This directory contains all custom kingdom action implementations, organized by action. Each action folder contains all related files (controllers, UI components, documentation).

## Structure

```
src/actions/
├── arrest-dissidents/
│   ├── ArrestDissidentsAction.ts      # Controller/business logic
│   ├── (UI components if any)
│   └── README.md                       # Links to docs, usage notes
├── repair-structure/
│   ├── RepairStructureAction.ts
│   ├── RepairStructureDialog.svelte
│   ├── RepairCostChoice.svelte
│   └── README.md
└── ...
```

## Quick Reference

| Action | Has Controller | Has UI Components | Status |
|--------|---------------|-------------------|--------|
| arrest-dissidents | ✅ | ❌ | ✅ Complete |
| establish-settlement | ✅ | ✅ | ✅ Complete |
| repair-structure | ✅ | ✅ | ✅ Complete |
| upgrade-settlement | ✅ | ✅ | ✅ Complete |

## Finding Action Files

Each action has its own folder containing:
- **Controller** (`*Action.ts`) - Business logic, requirements, custom resolution
- **UI Components** (`*.svelte`) - Dialogs, selection interfaces, choice components
- **README** - Links to detailed documentation in `public/Action Implementation/`

## Adding a New Action

1. Create folder: `src/actions/{action-name}/`
2. Add controller: `{ActionName}Action.ts`
3. Add UI components (if needed): `*.svelte`
4. Create README.md with link to documentation
5. Register in `src/actions/index.ts`

See `ActionHelpers.ts` for shared utilities and patterns.
