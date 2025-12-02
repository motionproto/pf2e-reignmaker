# Migrate GameCommandsResolver Methods to Handler Pattern

**Status:** Planned  
**Priority:** Medium  
**Estimated Effort:** 3-4 hours  

---

## Context

The handler pattern (used by `DestroyWorksiteHandler`, `SpendPlayerActionHandler`, etc.) provides:
- ✅ Preview badges showing exactly what will happen
- ✅ Prepare-commit pattern (no re-selection between preview and execute)
- ✅ Reusable across incidents/actions/events
- ✅ Testable and self-contained
- ✅ Consistent architecture

Currently, some game commands still use the old `GameCommandsResolver` pattern which returns legacy `ResolveResult` instead of `PreparedCommand`.

---

## Completed Handlers ✅

These already follow the handler pattern:

1. ✅ `RecruitArmyHandler` - Army recruitment
2. ✅ `DisbandArmyHandler` - Army disbanding
3. ✅ `TrainArmyHandler` - Army training
4. ✅ `FoundSettlementHandler` - Settlement founding
5. ✅ `GiveActorGoldHandler` - Gold rewards
6. ✅ `OutfitArmyHandler` - Army equipment
7. ✅ `AdjustFactionHandler` - Faction attitudes
8. ✅ `DestroyWorksiteHandler` - Worksite destruction
9. ✅ `SpendPlayerActionHandler` - Character action spending
10. ✅ `DamageStructureHandler` - Structure damage (NEW!)

---

## Handlers to Create 🔨

### High Priority (Used by Incidents)

#### 1. DestroyStructureHandler
**Current:** `destroyStructure(category?, targetTier?, count)`  
**Location:** `src/services/commands/structures/damageCommands.ts`  
**Used by:** Major incidents (religious-schism, economic-crash, etc.)  

**What it does:**
- Removes tier 1 structures entirely
- Downgrades tier 2+ structures to previous tier (damaged)
- Can filter by category (e.g., 'commerce', 'faith')
- Can target specific tiers ('highest', 'lowest', or number)

**Handler should:**
- Show which structure(s) will be destroyed/downgraded in preview
- Handle category filtering
- Handle tier targeting
- Return PreparedCommand with preview badge

---

#### 2. RemoveBorderHexesHandler
**Current:** `removeBorderHexes(count, dice?)`  
**Location:** `src/services/commands/territory/borderHexes.ts`  
**Used by:** Major incidents (secession-crisis, etc.)

**What it does:**
- Removes hexes from kingdom borders
- Can use dice formula for random count
- Updates kingdom territory

**Handler should:**
- Show which hex(es) will be removed
- Handle dice formulas for count
- Return PreparedCommand with preview badge

---

#### 3. ReduceImprisonedHandler
**Current:** `reduceImprisoned(settlementId, amount)`  
**Location:** `src/services/commands/unrest/imprisonedUnrest.ts`  
**Used by:** Execute/Pardon Prisoners action

**What it does:**
- Reduces imprisoned count in a settlement
- Can use dice formula for amount

**Handler should:**
- Show settlement and amount to reduce
- Handle dice formulas
- Return PreparedCommand

---

#### 4. ReleaseImprisonedHandler  
**Current:** `releaseImprisoned(percentage)`  
**Location:** `src/services/commands/unrest/imprisonedUnrest.ts`  
**Used by:** Prison Breaks incident

**What it does:**
- Releases percentage of imprisoned population
- Increases unrest

**Handler should:**
- Show how many will be released
- Calculate unrest impact
- Return PreparedCommand

---

### Medium Priority (Complex Operations)

#### 5. DeployArmyHandler
**Current:** `deployArmy(armyId, path, outcome, conditions)`  
**Location:** Inline in GameCommandsResolver  
**Used by:** Deploy Army action

**What it does:**
- Moves army along path on map
- Applies conditions based on outcome
- Complex movement logic

**Handler should:**
- Show deployment path
- Show conditions to apply
- Return PreparedCommand

**Note:** This is complex and might need sub-handlers or helper services.

---

#### 6. ChooseAndGainResourceHandler
**Current:** `chooseAndGainResource(resources, amount)`  
**Location:** `src/services/commands/resources/resourceCommands.ts`  
**Used by:** Harvest Resources action

**What it does:**
- Presents dialog to choose resource
- Grants chosen resource

**Handler should:**
- Show resource options
- Store selection in metadata
- Return PreparedCommand

---

### Low Priority (Keep as Utilities)

These are simple getters and don't need handlers:
- `getKingdomTaxationTier()` - Just returns data
- `getPartyLevel()` - Just returns data
- `getBorderHexes()` - Just returns data

---

## Implementation Pattern

### Template for New Handlers

```typescript
/**
 * [Name] Command Handler
 * 
 * [Description of what it does]
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor } from '../../../stores/KingdomStore';

export class [Name]Handler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === '[commandType]';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    // 1. Extract parameters from command
    // 2. Get kingdom data
    // 3. Select/calculate what will happen
    // 4. Store selection in metadata (via closures or command object)
    // 5. Create preview badge
    // 6. Return PreparedCommand with badge and commit function
    
    return {
      outcomeBadge: {
        icon: 'fa-icon',
        template: 'Preview text',
        variant: 'negative'
      },
      commit: async () => {
        // Execute the actual changes
        // Use stored selections from prepare step
      }
    };
  }
}
```

### Steps for Each Handler

1. **Create handler file** in `src/services/gameCommands/handlers/`
2. **Implement canHandle and prepare methods**
3. **Register in GameCommandHandlerRegistry**
4. **Update incidents/actions** to use handler instead of resolver
5. **Test** with incident debug panel or action execution
6. **Mark as complete** in this document

---

## Testing Strategy

For each new handler:

1. **Unit Test** (optional): Test prepare() returns correct badges
2. **Integration Test**: Use incident debug panel to trigger
3. **Verify**:
   - Preview badge shows correct information
   - Commit executes correctly
   - No re-selection between preview and execute

---

## Incidents/Actions Using Old Pattern 🔧

### DamageStructure (Need DamageStructureHandler)

**Moderate Incidents:**
- ✅ `disease-outbreak` - **UPDATED** to use DamageStructureHandler
- 🔧 `settlement-crisis` - Line 65: `resolver.damageStructure(undefined, undefined, 1)`
- 🔧 `riot` - Line 56: `resolver.damageStructure(undefined, undefined, 1)`
- 🔧 `mass-exodus` - Line 60: `resolver.damageStructure(1)`
- 🔧 `infrastructure-damage` - Lines 67 & 74: `resolver.damageStructure(undefined, undefined, 1)` and random count

**Major Incidents:**
- 🔧 `settlement-collapse` - Line 65: `resolver.damageStructure(undefined, undefined, 2)`
- 🔧 `religious-schism` - Line 56: `resolver.damageStructure(undefined, undefined, 1)`
- 🔧 `mass-desertion-threat` - Line 53: `resolver.damageStructure(undefined, undefined, 1)`
- 🔧 `economic-crash` - Line 56: `resolver.damageStructure(undefined, undefined, 1)`

**Total:** 8 incidents need updating

---

### DestroyStructure (Need DestroyStructureHandler)

**Moderate Incidents:**
- 🔧 `riot` - Line 62: `resolver.destroyStructure(undefined, undefined, 1)`

**Major Incidents:**
- 🔧 `settlement-collapse` - Line 70: `resolver.destroyStructure(undefined, undefined, 1)`
- 🔧 `religious-schism` - Line 61: `resolver.destroyStructure('religion', 'highest', 1)` (with category filter!)
- 🔧 `mass-desertion-threat` - Line 56: `resolver.destroyStructure('military', 'highest', 1)` (with category filter!)
- 🔧 `economic-crash` - Line 61: `resolver.destroyStructure('commerce', 'highest', 1)` (with category filter!)

**Total:** 5 incidents need updating  
**Note:** Some use category filtering ('religion', 'military', 'commerce')

---

### ReleaseImprisoned (Need ReleaseImprisonedHandler)

**Major Incidents:**
- 🔧 `prison-breaks` - Lines 49 & 54: `resolver.releaseImprisoned(50)` and `resolver.releaseImprisoned('all')`

**Total:** 1 incident needs updating

---

### Other Resolver Methods

**Not found in incidents:**
- `removeBorderHexes` - Not currently used (prepare handler for future use)
- `reduceImprisoned` - Not currently used (prepare handler for future use)
- `deployArmy` - Used in actions, not incidents
- `chooseAndGainResource` - Used in actions, not incidents

---

## Migration Checklist

### Phase 1: High Priority (Incidents)

#### DestroyStructureHandler
- [ ] Create handler with category/tier filtering support
- [ ] Update `riot` (moderate)
- [ ] Update `settlement-collapse` (major)
- [ ] Update `religious-schism` (major) - needs 'religion' category filter
- [ ] Update `mass-desertion-threat` (major) - needs 'military' category filter
- [ ] Update `economic-crash` (major) - needs 'commerce' category filter

#### DamageStructureHandler  
- [x] Create handler ✅ (DONE!)
- [x] Update `disease-outbreak` (moderate) ✅ (DONE!)
- [ ] Update `settlement-crisis` (moderate)
- [ ] Update `riot` (moderate)
- [ ] Update `mass-exodus` (moderate)
- [ ] Update `infrastructure-damage` (moderate) - has random count (1d3)
- [ ] Update `settlement-collapse` (major)
- [ ] Update `religious-schism` (major)
- [ ] Update `mass-desertion-threat` (major)
- [ ] Update `economic-crash` (major)

#### ReleaseImprisonedHandler
- [ ] Create handler
- [ ] Update `prison-breaks` (major) - uses 50% and 'all'

#### RemoveBorderHexesHandler
- [ ] Create handler (no current users, but prepare for future)

#### ReduceImprisonedHandler
- [ ] Create handler (no current users, but prepare for future)

### Phase 2: Medium Priority (Actions)
- [ ] DeployArmyHandler
- [ ] ChooseAndGainResourceHandler

### Phase 3: Cleanup
- [ ] Remove old resolver methods (replace with handler calls in resolver)
- [ ] Verify all incidents working with new handlers
- [ ] Update documentation

---

## Summary

**Handlers to Create:** 5 (1 done, 4 remaining)
**Incidents to Update:** 14 (1 done, 13 remaining)

**Priority Order:**
1. **DestroyStructureHandler** - 5 incidents need it
2. **ReleaseImprisonedHandler** - 1 incident needs it
3. **RemoveBorderHexesHandler** - Prepare for future
4. **ReduceImprisonedHandler** - Prepare for future

---

## Benefits After Completion

1. **Consistency**: All game commands follow same pattern
2. **Preview Support**: All operations show what will happen
3. **No Re-rolls**: Selections made once during preview
4. **Testability**: Handlers are self-contained units
5. **Maintainability**: Clear separation of concerns
6. **Discoverability**: All handlers in one place

---

## References

- **Existing Handlers**: `src/services/gameCommands/handlers/`
- **Registry**: `src/services/gameCommands/GameCommandHandlerRegistry.ts`
- **Old Resolver**: `src/services/GameCommandsResolver.ts`
- **Example Usage**: `src/pipelines/incidents/moderate/disease-outbreak.ts`
- **Architecture Docs**: `docs/systems/core/pipeline-patterns.md`

