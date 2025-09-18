# Reignmaker-lite Migration - Final TODO List

## Current Status
- **Conceptual Migration**: ✅ COMPLETE (All 5 phases)
- **Build Status**: ❌ FAILED (89 compilation errors)
- **Integration Status**: ⚠️ INCOMPLETE

## Critical Path to Completion

### 🔴 Priority 1: Fix Build-Breaking Issues (Day 1)

#### 1.1 Manager Implementations
**Location**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/managers/`

- [ ] Convert `FameManager` interface to concrete class
  - File: `TurnManager.kt` (lines 487-492)
  - Implement: `gainFame()`, `spendFame()`, `endTurn()`

- [ ] Convert `UnrestIncidentManager` interface to concrete class
  - File: `TurnManager.kt` (lines 497-502)  
  - Implement: `calculatePassiveUnrest()`, `applyPassiveUnrest()`, `checkForIncident()`

- [ ] Create `ResourceManager` class
  - Methods needed: `collectFromWorksites()`, `addResources()`, `calculateConsumption()`
  - Properties needed: `resources`, `amount`

- [ ] Create `KingdomEventsManager` class
  - Method needed: `selectRandomEvent()`
  - Import proper event data types

#### 1.2 Data Model Updates
**Location**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/`

- [ ] Add to `KingdomData`:
  ```kotlin
  var gold: RawGold
  var worksites: Array<RawWorksite>
  var storageCapacity: RawStorage
  var storageBuildings: Array<StorageBuilding>
  var resourcePoints: RawResourcePoints
  var resourceDice: RawResourceDice
  var workSites: RawWorkSites
  var supernaturalSolutions: Int
  var creativeSolutions: Int
  var ruin: RawRuin
  var constructionQueue: RawConstructionProject?
  var currentTurnPhase: String?
  ```

- [ ] Update `RawCommodities`:
  - Add back `luxuries: Int` field (for backward compatibility)

### 🟡 Priority 2: Handler Integration (Day 1-2)

#### 2.1 Fix Handler References
**Location**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/actions/handlers/`

- [ ] `CollectResourcesHandler.kt`
  - Fix line 53: Implement `collectFromWorksites()`
  - Fix line 56: Implement `addResources()`

- [ ] `PayConsumptionHandler.kt`  
  - Fix line 37: Implement `calculateConsumption()`
  - Fix lines 40, 47, 53, 56: Add resource properties

- [ ] `EndTurnHandler.kt`
  - Fix line 40: Change to `turnManager.endTurn()` 
  - Update constructor parameters

- [ ] `CheckUnrestIncidentHandler.kt`
  - Fix line 61: Align UnrestIncident types

- [ ] `CreateWorksiteHandler.kt`
  - Fix lines 49, 54: Update Map access syntax

#### 2.2 Remove Deleted Handlers
**Location**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/sheet/KingdomSheet.kt`

Remove references to (lines 230-272):
- [ ] GainFameHandler
- [ ] GainFameCriticalHandler  
- [ ] UseFameRerollHandler
- [ ] RollSkillCheckHandler
- [ ] CreateCapitalHandler
- [ ] DeleteSettlementHandler
- [ ] RollEventHandler
- [ ] DeleteEventHandler
- [ ] ToggleContinuousHandler
- [ ] ChangeEventStageHandler
- [ ] AddEventHandler
- [ ] AddGroupHandler
- [ ] DeleteGroupHandler
- [ ] ConfigureActivitiesHandler
- [ ] ConfigureEventsHandler
- [ ] PerformActivityHandler
- [ ] StructuresImportHandler

### 🟢 Priority 3: Type Fixes (Day 2)

#### 3.1 Fix Enum Conflicts
- [ ] Consolidate `SettlementType` enums
  - Keep only: `at.posselt.pfrpg2e.data.kingdom.settlements.SettlementType`
  - Remove duplicate in `TurnManager.kt`

- [ ] Fix `UnrestIncident` type conflicts
  - Use consistent type throughout

#### 3.2 Fix UI Type Issues
**Location**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/sheet/renderers/`

- [ ] `ActionCategoryRenderer.kt`
  - Lines 233, 260: Change `Map<String, X>` to `recordOf()`
  - Lines 70-72: Add missing properties to handlers

- [ ] `ConstructionQueueRenderer.kt`
  - Lines 173, 175: Change `Map<String, Int>` to `recordOf()`

### 🔵 Priority 4: Integration & Testing (Day 2-3)

#### 4.1 Wire UI Components
**Location**: `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/sheet/KingdomSheet.kt`

- [ ] Import new renderers:
  ```kotlin
  import at.posselt.pfrpg2e.kingdom.sheet.renderers.ConstructionQueueRenderer
  import at.posselt.pfrpg2e.kingdom.sheet.renderers.ActionCategoryRenderer
  ```

- [ ] Add to sheet initialization:
  ```kotlin
  private val constructionRenderer = ConstructionQueueRenderer()
  private val actionRenderer = ActionCategoryRenderer()
  ```

- [ ] Update `_preparePartContext()` to use new renderers

#### 4.2 Validation & Testing
- [ ] Fix `data/player-actions/create-worksite.json` schema validation
- [ ] Run `./gradlew build` successfully
- [ ] Test resource display
- [ ] Test construction queue
- [ ] Test action categories
- [ ] Test PC skill checks

### ⚫ Priority 5: Documentation & Cleanup (Day 3)

- [ ] Update user documentation
- [ ] Add CSS styles for new components
- [ ] Update localization files
- [ ] Remove old/deprecated code
- [ ] Create migration guide for existing games

## Success Criteria

✅ **Build Success**: `./gradlew build` completes without errors
✅ **UI Functional**: All new components display correctly
✅ **Actions Work**: PC skill-based actions execute properly
✅ **Resources Track**: Gold and 5 resources update correctly
✅ **Construction Works**: Queue processes projects over turns
✅ **Tests Pass**: All unit tests succeed

## Estimated Timeline

| Day | Tasks | Goal |
|-----|-------|------|
| Day 1 | Priority 1-2 | Fix compilation errors |
| Day 2 | Priority 3-4 | Complete integration |
| Day 3 | Priority 4-5 | Testing & polish |

**Total Estimated Time**: 3 days (24 hours of work)

## Files to Modify

### Must Edit (17 files)
1. `TurnManager.kt` - Convert interfaces to classes
2. `KingdomData.kt` - Add missing properties
3. `RawCommodities.kt` - Add luxuries field
4. `KingdomSheet.kt` - Remove deleted handlers, add new renderers
5. `CollectResourcesHandler.kt` - Fix methods
6. `PayConsumptionHandler.kt` - Fix methods
7. `EndTurnHandler.kt` - Fix methods
8. `CheckUnrestIncidentHandler.kt` - Fix types
9. `CreateWorksiteHandler.kt` - Fix syntax
10. `ActionCategoryRenderer.kt` - Fix types
11. `ConstructionQueueRenderer.kt` - Fix types
12. `Defaults.kt` - Add missing parameters
13. `ResourceManager.kt` - Create/fix class
14. `FameManager.kt` - Create class
15. `UnrestIncidentManager.kt` - Create class
16. `KingdomEventsManager.kt` - Create class
17. `create-worksite.json` - Fix validation

### May Need Minor Updates (5+ files)
- Handler imports
- Type definitions
- CSS files
- Localization files
- Test files

## Notes

- **No Data Loss**: All changes are additive or corrective
- **Backward Compatible**: Maintain existing save compatibility
- **Feature Flag**: Consider adding toggle for new system during testing
- **Rollback Plan**: Keep backup of current working version

## Commands

```bash
# Build project
./gradlew build

# Run tests
./gradlew test

# Check specific compilation
./gradlew compileKotlinJs

# Validate JSON
./gradlew validatePlayerActions
```

---

**Last Updated**: September 18, 2025
**Status**: Ready for implementation
**Owner**: Development team
**Priority**: HIGH - System non-functional until complete
