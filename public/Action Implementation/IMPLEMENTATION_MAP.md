# Action Implementation Map

Quick reference guide showing where to find each action's code and documentation.

## How to Find Action Code

All custom action implementations are now organized in `src/actions/{action-name}/`:

```
src/actions/
├── arrest-dissidents/
│   ├── ArrestDissidentsAction.ts
│   └── README.md
├── establish-settlement/
│   ├── EstablishSettlementAction.ts
│   ├── EstablishSettlementDialog.svelte
│   └── README.md
├── repair-structure/
│   ├── RepairStructureAction.ts
│   ├── RepairCostChoice.svelte
│   ├── RepairStructureDialog.svelte
│   └── README.md
├── upgrade-settlement/
│   ├── UpgradeSettlementAction.ts
│   ├── UpgradeSettlementDialog.svelte
│   ├── UpgradeSettlementSelectionDialog.svelte
│   ├── UpgradeSettlementConfirmDialog.svelte
│   └── README.md
└── shared/
    ├── ActionHelpers.ts
    └── IMPLEMENTATION_GUIDE.md
```

## Complete Mapping Table

| Action | Category | Documentation | Controller | UI Components | Data JSON | Status |
|--------|----------|--------------|------------|---------------|-----------|--------|
| **arrest-dissidents** | Uphold Stability | [uphold-stability/arrest-dissidents.md](uphold-stability/arrest-dissidents.md) | `src/actions/arrest-dissidents/ArrestDissidentsAction.ts` | _(uses generic allocation UI)_ | `data/player-actions/arrest-dissidents.json` | ✅ |
| **deal-with-unrest** | Uphold Stability | [uphold-stability/deal-with-unrest.md](uphold-stability/deal-with-unrest.md) | _(generic action)_ | - | `data/player-actions/deal-with-unrest.json` | ✅ |
| **execute-or-pardon-prisoners** | Uphold Stability | [uphold-stability/execute-or-pardon-prisoners.md](uphold-stability/execute-or-pardon-prisoners.md) | - | - | `data/player-actions/execute-or-pardon-prisoners.json` | ⬜ |
| **deploy-army** | Military Operations | [military-operations/deploy-army.md](military-operations/deploy-army.md) | - | - | `data/player-actions/deploy-army.json` | ⬜ |
| **disband-army** | Military Operations | [military-operations/disband-army.md](military-operations/disband-army.md) | - | - | `data/player-actions/disband-army.json` | ⬜ |
| **outfit-army** | Military Operations | [military-operations/outfit-army.md](military-operations/outfit-army.md) | - | - | `data/player-actions/outfit-army.json` | ⬜ |
| **recover-army** | Military Operations | [military-operations/recover-army.md](military-operations/recover-army.md) | - | - | `data/player-actions/recover-army.json` | ⬜ |
| **recruit-unit** | Military Operations | [military-operations/recruit-unit.md](military-operations/recruit-unit.md) | - | - | `data/player-actions/recruit-unit.json` | ⬜ |
| **train-army** | Military Operations | [military-operations/train-army.md](military-operations/train-army.md) | - | - | `data/player-actions/train-army.json` | ⬜ |
| **build-roads** | Expand Borders | [expand-borders/build-roads.md](expand-borders/build-roads.md) | - | - | `data/player-actions/build-roads.json` | ⬜ |
| **claim-hexes** | Expand Borders | [expand-borders/claim-hexes.md](expand-borders/claim-hexes.md) | - | - | `data/player-actions/claim-hexes.json` | ⬜ |
| **fortify-hex** | Expand Borders | [expand-borders/fortify-hex.md](expand-borders/fortify-hex.md) | - | - | `data/player-actions/fortify-hex.json` | ⬜ |
| **harvest-resources** | Expand Borders | [expand-borders/harvest-resources.md](expand-borders/harvest-resources.md) | - | - | `data/player-actions/harvest-resources.json` | ⬜ |
| **send-scouts** | Expand Borders | [expand-borders/send-scouts.md](expand-borders/send-scouts.md) | - | - | `data/player-actions/send-scouts.json` | ⬜ |
| **build-structure** | Urban Planning | [urban-planning/build-structure.md](urban-planning/build-structure.md) | `src/controllers/BuildStructureController.ts` | `src/view/kingdom/components/BuildStructureDialog/` | `data/player-actions/build-structure.json` | ✅ |
| **establish-settlement** | Urban Planning | [urban-planning/establish-settlement.md](urban-planning/establish-settlement.md) | `src/actions/establish-settlement/EstablishSettlementAction.ts` | `src/actions/establish-settlement/EstablishSettlementDialog.svelte` | `data/player-actions/establish-settlement.json` | ✅ |
| **repair-structure** | Urban Planning | [urban-planning/repair-structure.md](urban-planning/repair-structure.md) | `src/actions/repair-structure/RepairStructureAction.ts` | `src/actions/repair-structure/*.svelte` (2 files) | `data/player-actions/repair-structure.json` | ✅ |
| **upgrade-settlement** | Urban Planning | [urban-planning/upgrade-settlement.md](urban-planning/upgrade-settlement.md) | `src/actions/upgrade-settlement/UpgradeSettlementAction.ts` | `src/actions/upgrade-settlement/*.svelte` (3 files) | `data/player-actions/upgrade-settlement.json` | ✅ |
| **establish-diplomatic-relations** | Foreign Affairs | [foreign-affairs/establish-diplomatic-relations.md](foreign-affairs/establish-diplomatic-relations.md) | - | - | `data/player-actions/establish-diplomatic-relations.json` | ⬜ |
| **hire-adventurers** | Foreign Affairs | [foreign-affairs/hire-adventurers.md](foreign-affairs/hire-adventurers.md) | - | - | `data/player-actions/hire-adventurers.json` | ⬜ |
| **infiltration** | Foreign Affairs | [foreign-affairs/infiltration.md](foreign-affairs/infiltration.md) | - | - | `data/player-actions/infiltration.json` | ⬜ |
| **request-economic-aid** | Foreign Affairs | [foreign-affairs/request-economic-aid.md](foreign-affairs/request-economic-aid.md) | - | - | `data/player-actions/request-economic-aid.json` | ⬜ |
| **request-military-aid** | Foreign Affairs | [foreign-affairs/request-military-aid.md](foreign-affairs/request-military-aid.md) | - | - | `data/player-actions/request-military-aid.json` | ⬜ |
| **collect-stipend** | Economic & Resources | [economic-resources/collect-stipend.md](economic-resources/collect-stipend.md) | - | - | `data/player-actions/collect-stipend.json` | ⬜ |
| **create-worksite** | Economic & Resources | [economic-resources/create-worksite.md](economic-resources/create-worksite.md) | - | - | `data/player-actions/create-worksite.json` | ⬜ |
| **purchase-resources** | Economic & Resources | [economic-resources/purchase-resources.md](economic-resources/purchase-resources.md) | - | - | `data/player-actions/purchase-resources.json` | ⬜ |
| **sell-surplus** | Economic & Resources | [economic-resources/sell-surplus.md](economic-resources/sell-surplus.md) | - | - | `data/player-actions/sell-surplus.json` | ⬜ |

## Quick Navigation Patterns

### From Documentation to Code

1. Find action in table above
2. Check "Controller" column for TypeScript file
3. Check "UI Components" column for Svelte files
4. Each action folder has a README with more details

### From Code to Documentation

1. Look at folder name in `src/actions/{action-name}/`
2. Open `README.md` in that folder
3. Follow link to detailed documentation in `public/Action Implementation/`

### Finding Shared Utilities

- **ActionHelpers:** `src/actions/shared/ActionHelpers.ts`
- **Implementation Guide:** `src/actions/shared/IMPLEMENTATION_GUIDE.md`
- **Registry:** `src/controllers/actions/implementations/index.ts`

## Notes

- ✅ = Complete implementation
- ⬜ = Not yet implemented (uses generic action system)
- **Build Structure** uses separate controller structure (not in `src/actions/` yet)
- **Deal with Unrest** is a simple resource action (no custom code needed)

## Adding New Actions

When implementing a new action:

1. Create folder: `src/actions/{action-name}/`
2. Add controller: `{ActionName}Action.ts`
3. Add UI components: `*.svelte` (if needed)
4. Create `README.md` with links to documentation
5. Register in `src/controllers/actions/implementations/index.ts`
6. Update this map
