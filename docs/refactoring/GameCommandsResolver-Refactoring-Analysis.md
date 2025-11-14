# GameCommandsResolver Refactoring Analysis

**Created:** 2025-11-14  
**Purpose:** Organize GameCommandsResolver.ts into maintainable, domain-separated components  
**Goal:** Improve maintainability and understandability WITHOUT changing functionality

---

## Current State

**File:** `src/services/GameCommandsResolver.ts`  
**Size:** ~1,500 lines  
**Status:** Highly complex, tangled, difficult to navigate

### Problems Identified

1. **Single Responsibility Violation** - Handles 6+ domains in one file
2. **Mixed Patterns** - PreparedCommand and ResolveResult patterns intermixed
3. **Scattered Helpers** - Utility functions mixed with main logic
4. **Hard to Navigate** - Finding specific functionality requires scrolling through 1,500 lines
5. **Difficult to Test** - Monolithic structure makes unit testing challenging

---

## Method Inventory

### Army Commands (6 methods)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `recruitArmy` | PreparedCommand | 65-121 | armyService, ARMY_TYPES | Uses globalThis.__pendingRecruitArmy |
| `disbandArmy` | PreparedCommand | 123-168 | armyService | Simple prepare/commit |
| `trainArmy` | PreparedCommand | 467-597 | armyService, partyLevel | Adds PF2e effects (Heroism, Frightened) |
| `outfitArmy` | ResolveResult | 599-847 | armyService, Dialog (interactive) | Interactive selection needed |
| `deployArmy` | ResolveResult | 849-1049 | armyService, tokenAnimation | Interactive path selection + animation |
| `getPartyLevel` | Helper | 599-609 | game.actors | Used by trainArmy |

**Domain Logic:**
- Recruit: Create army with NPC actor, support allied armies
- Disband: Remove army, refund resources (handled by armyService)
- Train: Level up to party level, apply outcome-based effects
- Outfit: Equipment upgrades (armor, runes, weapons, gear), dialog-based selection
- Deploy: Path selection, animation, condition application, critical failure randomization

### Settlement Commands (2 methods)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `foundSettlement` | PreparedCommand | 170-213 | Settlement model | Creates village (tier 1) |
| `giveActorGold` | PreparedCommand | 215-252 | character.inventory | Transfers stipend to player |

**Domain Logic:**
- Found: Create settlement at location, optional free structure slot
- Gold Transfer: Calculate stipend from settlement level + taxation tier

### Resource Commands (2 methods + 2 helpers)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `giveActorGold` | PreparedCommand | 215-252 | taxation helpers | Also listed under settlements |
| `getKingdomTaxationTier` | Helper | 254-283 | REVENUE_STRUCTURES | Finds highest revenue structure |
| `calculateIncome` | Helper | 285-319 | INCOME_TABLE | Level + tier → gold amount |
| `chooseAndGainResource` | ResolveResult | 1293-1358 | Dialog (interactive) | User picks resource type |

**Domain Logic:**
- Income calculation based on settlement level + revenue structures
- Resource selection via dialog

### Unrest/Justice Commands (2 methods)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `reduceImprisoned` | ResolveResult | 321-398 | settlements | Settlement-specific unrest reduction |
| `releaseImprisoned` | ResolveResult | 1157-1228 | settlements | Convert imprisoned → regular unrest |

**Domain Logic:**
- Reduce: Lower imprisoned unrest in specific settlement
- Release: Prison break events, proportional release across settlements

### Structure Commands (2 methods)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `destroyStructure` | ResolveResult | 1230-1363 | structuresService | Tier 1 = remove, Tier 2+ = downgrade |
| `damageStructure` | ResolveResult | 1365-1451 | structureTargetingService | Random or targeted damage |

**Domain Logic:**
- Destroy: Remove tier 1, downgrade tier 2+ (damaged state)
- Damage: Mark structure as damaged via targeting service

### Territory Commands (2 methods + 1 helper)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `removeBorderHexes` | ResolveResult | 1453-1546 | hexSelectorService | Interactive hex selection |
| `getBorderHexes` | Helper | 1548-1572 | hexValidation | Filter hexes with unclaimed neighbors |

**Domain Logic:**
- Remove: Dice roll OR fixed count, hex selector, validation for border-only

### Faction Commands (1 method)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `adjustFactionAttitude` | PreparedCommand | 1574-1703 | factionService | Improve/worsen relations |

**Domain Logic:**
- Adjust: Steps up/down attitude ladder, diplomatic structure constraints

### Condition/Combat Helpers (2 methods)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `calculateRandomNearbyHex` | Helper | 1051-1110 | hex math | Critical failure random destination |
| `applyConditionToActor` | Helper | 1112-1225 | PF2e conditions | Parse + apply condition strings |

**Domain Logic:**
- Random hex: 1d6 direction, distance roll, hex offset math
- Conditions: Initiative/saves/attack modifiers, PF2e condition lookup

### Equipment Helpers (2 methods)

| Method | Pattern | Lines | Dependencies | Notes |
|--------|---------|-------|--------------|-------|
| `createEquipmentEffect` | Helper | 777-841 | PF2e Rule Elements | Generate effect data with bonuses |
| `getEquipmentDisplayName` | Helper | 843-853 | - | Map type → display name |

**Domain Logic:**
- Create PF2e effect data for army equipment upgrades

---

## Pattern Distribution

### PreparedCommand Pattern (7 methods)
- ✅ `recruitArmy`
- ✅ `disbandArmy`
- ✅ `foundSettlement`
- ✅ `giveActorGold`
- ✅ `trainArmy`
- ✅ `adjustFactionAttitude`

**Characteristics:**
- Returns `{ specialEffect, commit }`
- Data available BEFORE "Apply Result" click
- No post-roll user interaction needed
- Preview shown, then committed

### ResolveResult Pattern (8 methods)
- ✅ `reduceImprisoned`
- ✅ `outfitArmy`
- ✅ `deployArmy`
- ✅ `releaseImprisoned`
- ✅ `destroyStructure`
- ✅ `damageStructure`
- ✅ `removeBorderHexes`
- ✅ `chooseAndGainResource`

**Characteristics:**
- Returns `{ success, error?, data? }`
- Needs post-roll interaction (dialogs, hex selection)
- Executes immediately, returns result
- More complex state changes

### Helper Methods (9 methods)
- `getPartyLevel`
- `getKingdomTaxationTier`
- `calculateIncome`
- `calculateRandomNearbyHex`
- `applyConditionToActor`
- `getBorderHexes`
- `createEquipmentEffect`
- `getEquipmentDisplayName`

---

## Proposed Refactored Structure

```
src/services/commands/
├── index.ts                           # Barrel export (createGameCommandsResolver)
├── types.ts                           # Shared interfaces (PreparedCommand, ResolveResult)
│
├── armies/
│   ├── ArmyCommands.ts               # recruitArmy, disbandArmy, trainArmy
│   ├── ArmyInteractiveCommands.ts    # outfitArmy, deployArmy (needs dialogs/hex selection)
│   ├── armyHelpers.ts                # getPartyLevel
│   └── equipmentHelpers.ts           # createEquipmentEffect, getEquipmentDisplayName
│
├── settlements/
│   ├── SettlementCommands.ts         # foundSettlement
│   └── settlementHelpers.ts          # (future: settlement validation, etc.)
│
├── resources/
│   ├── ResourceCommands.ts           # giveActorGold, chooseAndGainResource
│   └── incomeHelpers.ts              # getKingdomTaxationTier, calculateIncome
│
├── unrest/
│   └── UnrestCommands.ts             # reduceImprisoned, releaseImprisoned
│
├── structures/
│   └── StructureCommands.ts          # destroyStructure, damageStructure
│
├── territory/
│   ├── TerritoryCommands.ts          # removeBorderHexes
│   └── hexHelpers.ts                 # getBorderHexes
│
├── factions/
│   └── FactionCommands.ts            # adjustFactionAttitude
│
├── combat/
│   └── conditionHelpers.ts           # calculateRandomNearbyHex, applyConditionToActor
│
└── shared/
    ├── validation.ts                 # Common validation (actor exists, kingdom exists)
    ├── dialogHelpers.ts              # Reusable dialog patterns
    └── errorHandling.ts              # Standard error responses
```

---

## Shared Code Patterns to Extract

### 1. Actor/Kingdom Validation (appears 15+ times)

**Current Pattern:**
```typescript
const actor = getKingdomActor();
if (!actor) {
  throw new Error('No kingdom actor available');
}

const kingdom = actor.getKingdomData();
if (!kingdom) {
  throw new Error('No kingdom data available');
}
```

**Extract to:** `shared/validation.ts`
```typescript
export function getValidatedKingdom() {
  const actor = getKingdomActor();
  if (!actor) throw new Error('No kingdom actor available');
  
  const kingdom = actor.getKingdomData();
  if (!kingdom) throw new Error('No kingdom data available');
  
  return { actor, kingdom };
}
```

### 2. Dialog Selection Pattern (appears 4+ times)

**Current Pattern:**
```typescript
const selectedId = await new Promise<string | null>((resolve) => {
  const Dialog = (globalThis as any).Dialog;
  new Dialog({
    title: 'Select Something',
    content: `<form>...</form>`,
    buttons: {
      ok: { label: 'Select', callback: (html) => resolve(html.find('[name="id"]').val()) },
      cancel: { label: 'Cancel', callback: () => resolve(null) }
    }
  }).render(true);
});
```

**Extract to:** `shared/dialogHelpers.ts`
```typescript
export async function showSelectionDialog<T>(
  title: string,
  items: Array<{ id: string; label: string; data?: T }>,
  fieldName: string = 'selection'
): Promise<string | null>
```

### 3. Error Response Pattern (appears 10+ times)

**Current Pattern:**
```typescript
return {
  success: false,
  error: 'Some error message'
};
```

**Extract to:** `shared/errorHandling.ts`
```typescript
export function createErrorResult(error: string | Error): ResolveResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : error
  };
}

export function createSuccessResult(message: string, data?: any): ResolveResult {
  return { success: true, data: { message, ...data } };
}
```

---

## Migration Strategy

### Phase 1: Create Infrastructure (No Breaking Changes)

1. ✅ Create `src/services/commands/` directory structure
2. ✅ Create `types.ts` with shared interfaces
3. ✅ Create `shared/` utilities (validation, dialogs, errors)
4. ✅ Create empty domain files (with exports)

### Phase 2: Extract Domain by Domain (Incremental)

**Order of extraction** (least dependencies first):

1. **Combat Helpers** → `combat/conditionHelpers.ts`
   - Zero dependencies on other commands
   - Pure utility functions

2. **Territory** → `territory/TerritoryCommands.ts`, `territory/hexHelpers.ts`
   - Depends only on hexSelectorService
   - Self-contained domain

3. **Factions** → `factions/FactionCommands.ts`
   - Depends only on factionService
   - Single method, clean extraction

4. **Structures** → `structures/StructureCommands.ts`
   - Depends on structuresService, structureTargetingService
   - Self-contained domain

5. **Unrest** → `unrest/UnrestCommands.ts`
   - Depends on settlements (already have data)
   - Self-contained domain

6. **Resources** → `resources/ResourceCommands.ts`, `resources/incomeHelpers.ts`
   - Depends on taxation/income calculations
   - Helper functions cleanly separable

7. **Settlements** → `settlements/SettlementCommands.ts`
   - Depends on Settlement model
   - Includes foundSettlement (simple)

8. **Armies** → `armies/ArmyCommands.ts`, `armies/ArmyInteractiveCommands.ts`, helpers
   - Most complex domain (6 methods + 3 helpers)
   - Split into simple (PreparedCommand) and interactive (ResolveResult)

### Phase 3: Update Main Resolver (Delegation)

**Transform GameCommandsResolver.ts into a thin coordinator:**

```typescript
// src/services/GameCommandsResolver.ts
import { createArmyCommands } from './commands/armies/ArmyCommands';
import { createArmyInteractiveCommands } from './commands/armies/ArmyInteractiveCommands';
// ... other imports

export async function createGameCommandsResolver() {
  const armyCommands = await createArmyCommands();
  const armyInteractive = await createArmyInteractiveCommands();
  // ... other domains
  
  return {
    // Army methods (delegate)
    recruitArmy: armyCommands.recruitArmy,
    disbandArmy: armyCommands.disbandArmy,
    trainArmy: armyCommands.trainArmy,
    outfitArmy: armyInteractive.outfitArmy,
    deployArmy: armyInteractive.deployArmy,
    
    // ... delegate all other methods
  };
}
```

### Phase 4: Update Imports (No Logic Changes)

Update files that import from GameCommandsResolver:
- `src/controllers/actions/action-resolver.ts`
- `src/services/ActionEffectsService.ts`
- Other consumers

**No logic changes needed** - exports remain identical.

---

## File Size Estimates (After Refactoring)

| File | Current Lines | New Lines | Reduction |
|------|--------------|-----------|-----------|
| GameCommandsResolver.ts | ~1,500 | ~150 (coordinator) | -90% |
| armies/ArmyCommands.ts | - | ~200 | NEW |
| armies/ArmyInteractiveCommands.ts | - | ~350 | NEW |
| armies/helpers.ts | - | ~100 | NEW |
| settlements/SettlementCommands.ts | - | ~80 | NEW |
| resources/ResourceCommands.ts | - | ~150 | NEW |
| resources/incomeHelpers.ts | - | ~100 | NEW |
| structures/StructureCommands.ts | - | ~200 | NEW |
| territory/TerritoryCommands.ts | - | ~120 | NEW |
| factions/FactionCommands.ts | - | ~150 | NEW |
| unrest/UnrestCommands.ts | - | ~150 | NEW |
| combat/conditionHelpers.ts | - | ~150 | NEW |
| shared/*.ts | - | ~100 | NEW |

**Result:** 1 monolithic file → 13+ focused, maintainable files

---

## Benefits

### Maintainability
- ✅ Easy to find code (navigate by domain)
- ✅ Smaller files (150-350 lines each)
- ✅ Clear separation of concerns

### Understandability
- ✅ Each file has single responsibility
- ✅ Helper functions grouped with domain
- ✅ Patterns clearly separated (PreparedCommand vs ResolveResult)

### Testability
- ✅ Can unit test domains independently
- ✅ Can mock dependencies cleanly
- ✅ Smaller surface area per file

### Future Work
- ✅ Easy to add new commands (clear pattern to follow)
- ✅ Easy to refactor patterns (contained to domain)
- ✅ Easy to optimize (identify performance bottlenecks by domain)

---

## Risks & Mitigations

### Risk 1: Breaking Existing Imports
**Mitigation:** Keep GameCommandsResolver.ts as coordinator that re-exports everything

### Risk 2: Circular Dependencies
**Mitigation:** Use shared utilities, avoid cross-domain imports

### Risk 3: Merge Conflicts
**Mitigation:** Extract one domain at a time, get each merged before next

### Risk 4: Testing Overhead
**Mitigation:** No logic changes = existing tests still pass

---

## Next Steps

1. **Get approval** on this refactoring plan
2. **Create folder structure** and shared utilities
3. **Extract domains incrementally** (one PR per domain)
4. **Update coordinator** as we go
5. **Document new structure** in ARCHITECTURE.md

---

## Questions for Discussion

1. Does this domain separation make sense?
2. Should we extract all helpers, or leave some inline?
3. Should we split armies further (recruitment vs. combat)?
4. Any other domains I've missed?
