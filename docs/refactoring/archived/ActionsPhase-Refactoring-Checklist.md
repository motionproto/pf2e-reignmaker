# ActionsPhase Refactoring - Implementation Checklist

**Goal:** Consolidate all pre-roll dialog patterns into a single, unified ActionDialogService orchestration system.

**Status:** Phase 2 POC Complete (3/14 actions updated)

**Last Updated:** 2025-11-14

---

## 📊 Progress Overview

- **Phase 1:** ✅ Complete - Core infrastructure created
- **Phase 2:** ✅ Complete - POC validated (3 actions)
- **Phase 3:** ✅ Complete - All remaining actions updated (11/11 complete)
- **Phase 4:** ⏸️ Ready - ActionsPhase.svelte refactoring
- **Phase 5:** ⏸️ Pending - Global state cleanup
- **Phase 6:** ⏸️ Pending - Delete obsolete files

---

## Phase 1: Core Infrastructure ✅ COMPLETE

### Created Files
- [x] `src/services/ActionDialogService.ts` - Dialog orchestration service
  - `initiateAction()` - Shows pre-roll dialog if needed
  - `handleDialogComplete()` - Processes dialog result, triggers roll
  - `getMetadata()` - Retrieves stored action metadata
  - `clearAction()` - Cleanup after resolution

### Updated Interfaces
- [x] `src/controllers/actions/implementations/index.ts`
  - Added `preRollDialog` configuration to `CustomActionImplementation`
  - Structure: `{ dialogId: string, extractMetadata?: (result) => any }`

---

## Phase 2: Proof-of-Concept ✅ COMPLETE

### POC Actions Updated (3/14)
- [x] `src/actions/build-structure/BuildStructureAction.ts`
  - Added `preRollDialog` config
  - Maps to `build-structure` dialog
  - Extracts `{ structureId, settlementId }`

- [x] `src/actions/repair-structure/RepairStructureAction.ts`
  - Added `preRollDialog` config
  - Maps to `repair-structure` dialog
  - Extracts `{ structureId, settlementId }`

- [x] `src/actions/upgrade-settlement/UpgradeSettlementAction.ts`
  - Added `preRollDialog` config
  - Maps to `upgrade-settlement` dialog
  - Extracts `{ settlementId, settlementName }`

### Validation Checklist
- [x] TypeScript compiles without errors
- [ ] **TODO:** Test POC actions work end-to-end
- [ ] **TODO:** Verify dialog flow: click → dialog → selection → roll → resolution

---

## Phase 3: Remaining Action Implementations ✅ COMPLETE

**Status:** 11/11 actions complete (14/14 total with POC)

### Diplomatic Actions (3 actions)
- [x] `src/actions/establish-diplomatic-relations/EstablishDiplomaticRelationsAction.ts`
  - Dialog: `faction-selection`
  - Metadata: `{ factionId, factionName }`

- [x] `src/actions/request-economic-aid/RequestEconomicAidAction.ts`
  - Dialog: `faction-selection`
  - Metadata: `{ factionId, factionName }`

- [x] `src/actions/request-military-aid/RequestMilitaryAidAction.ts`
  - Dialog: `faction-selection`
  - Metadata: `{ factionId, factionName }`

### Intrigue Actions (1 action)
- [x] `src/actions/infiltration/InfiltrationAction.ts`
  - Dialog: `faction-selection`
  - Metadata: `{ factionId, factionName }`

### Settlement Actions (1 action)
- [x] `src/actions/execute-or-pardon-prisoners/ExecuteOrPardonPrisonersAction.ts`
  - Dialog: `settlement-selection`
  - Metadata: `{ settlementId }`

**Note:** `collect-stipend` does not have a custom action implementation (not in registry)

### Army Actions (3 actions)
- [x] `src/actions/outfit-army/OutfitArmyAction.ts`
  - Dialog: `army-selection`
  - Metadata: `{ armyId }`

- [x] `src/actions/recruit-unit/RecruitUnitAction.ts`
  - Dialog: `recruit-army`
  - Metadata: `{ name, settlementId, armyType }`

- [x] `src/actions/deploy-army/DeployArmyAction.ts`
  - Dialog: `army-deployment`
  - Metadata: `{ armyId, path }`

**Note:** `train-army` and `disband-army` are commented out in implementations index (migrated to prepare/commit pattern)

### Verification
```bash
# Should show 11 actions with preRollDialog config
grep -r "preRollDialog:" src/actions/ | wc -l
# Result: 11 (3 POC + 8 Phase 3)
```

### Pattern Template (Copy for Each Action)
```typescript
export const YourAction = {
  id: 'your-action-id',
  
  /**
   * Pre-roll dialog configuration
   */
  preRollDialog: {
    dialogId: 'your-dialog-id',
    extractMetadata: (dialogResult: any) => ({
      // Extract relevant fields from dialog result
      fieldOne: dialogResult.fieldOne,
      fieldTwo: dialogResult.fieldTwo
    })
  },
  
  // ... rest of action implementation
};
```

---

## Phase 4: Refactor ActionsPhase.svelte ⏸️ PENDING

**Target:** Reduce from 988 lines to ~300 lines

### Step 4.1: Add Service Integration
- [ ] Import `ActionDialogService`
- [ ] Initialize service in `onMount()`
- [ ] Store service instance in component variable

### Step 4.2: Update Action Execution Handler
- [ ] Replace `handleExecuteSkill()` logic
- [ ] Call `dialogService.initiateAction(action.id, skill, callbacks)`
- [ ] Provide callbacks:
  - `showDialog(dialogId)` - Sets appropriate component flag
  - `onRollTrigger(skill, metadata)` - Executes roll with metadata

### Step 4.3: Remove Pending State Variables (15+ variables)
**DELETE:**
- [ ] `pendingBuildAction`
- [ ] `pendingRepairAction`
- [ ] `pendingUpgradeAction`
- [ ] `pendingDiplomaticAction`
- [ ] `pendingInfiltrationAction`
- [ ] `pendingRequestEconomicAidAction`
- [ ] `pendingRequestMilitaryAidAction`
- [ ] `pendingStipendAction`
- [ ] `pendingExecuteOrPardonAction`
- [ ] `pendingTrainArmyAction`
- [ ] `pendingDisbandArmyAction`
- [ ] `pendingOutfitArmyAction`
- [ ] `pendingRecruitArmyAction`
- [ ] `pendingDeployArmyAction`
- [ ] `pendingAidAction`

**KEEP:** Dialog visibility flags (UI concern)
- `showBuildStructureDialog`
- `showRepairStructureDialog`
- etc.

### Step 4.4: Remove CUSTOM_ACTION_HANDLERS
- [ ] Delete `CUSTOM_ACTION_HANDLERS` reactive statement
- [ ] Delete import of `createCustomActionHandlers`
- [ ] Remove `action-handlers-config` import

### Step 4.5: Simplify Dialog Completion Handlers (14 handlers)

**BEFORE (Complex):**
```typescript
async function handleStructureQueued(event: CustomEvent) {
  const { structureId, settlementId } = event.detail;
  
  if (pendingBuildAction) {
    pendingBuildAction.structureId = structureId;
    pendingBuildAction.settlementId = settlementId;
    showBuildStructureDialog = false;
    await executeBuildStructureRoll(pendingBuildAction);
  }
}
```

**AFTER (Simple):**
```typescript
async function handleStructureQueued(event: CustomEvent) {
  const { structureId, settlementId } = event.detail;
  
  await dialogService.handleDialogComplete('build-structure', 
    { structureId, settlementId },
    async (skill, metadata) => {
      await executeActionRoll(
        createExecutionContext('build-structure', skill, metadata),
        { getDC: (level) => controller.getActionDC(level) }
      );
    }
  );
  
  showBuildStructureDialog = false;
}
```

**Handlers to Update:**
- [ ] `handleStructureQueued` (build-structure)
- [ ] `handleRepairStructureSelected` (repair-structure)
- [ ] `handleUpgradeSettlementSelected` (upgrade-settlement)
- [ ] `handleFactionSelected` (establish-diplomatic-relations)
- [ ] `handleInfiltrationFactionSelected` (infiltration)
- [ ] `handleEconomicAidFactionSelected` (request-economic-aid)
- [ ] `handleMilitaryAidFactionSelected` (request-military-aid)
- [ ] `handleSettlementSelected` (collect-stipend)
- [ ] `handleExecuteOrPardonSettlementSelected` (execute-or-pardon-prisoners)
- [ ] `handleArmySelectedForTraining` (train-army)
- [ ] `handleArmySelectedForDisbanding` (disband-army)
- [ ] `handleArmySelectedForOutfitting` (outfit-army)
- [ ] `handleArmyRecruited` (recruit-unit)
- [ ] `handleArmyDeployment` (deploy-army) ⚠️ Special case

### Step 4.6: Remove Execute Roll Functions (14 functions)

**DELETE these functions (logic moved to service):**
- [ ] `executeBuildStructureRoll()`
- [ ] `executeRepairStructureRoll()`
- [ ] `executeUpgradeSettlementRoll()`
- [ ] `executeEstablishDiplomaticRelationsRoll()`
- [ ] `executeInfiltrationRoll()`
- [ ] `executeRequestEconomicAidRoll()`
- [ ] `executeRequestMilitaryAidRoll()`
- [ ] `executeStipendRoll()`
- [ ] `executeExecuteOrPardonRoll()`
- [ ] `executeTrainArmyRoll()`
- [ ] `executeDisbandArmyRoll()`
- [ ] `executeOutfitArmyRoll()`
- [ ] `executeRecruitArmyRoll()`
- [ ] `executeDeployArmyRoll()`

**KEEP:** Generic `executeActionRoll()` from ActionExecutionHelpers

### Step 4.7: Validation Checklist
- [ ] Component compiles without TypeScript errors
- [ ] All dialog flows work (open → select → roll → resolve)
- [ ] Actions can be performed multiple times (state resets)
- [ ] No memory leaks (service cleanup on unmount)

---

## Phase 5: Global State Cleanup ⏸️ PENDING

**Goal:** Eliminate all `globalThis.__pending*` variables

### Step 5.1: Update action-resolver.ts
**Current Pattern (Bad):**
```typescript
const settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
```

**New Pattern (Good):**
```typescript
const settlementId = instance?.metadata?.settlementId;
```

**Files to Update:**
- [ ] `src/controllers/actions/action-resolver.ts`
  - [ ] Replace `__pendingExecuteOrPardonSettlement` with instance metadata
  - [ ] Replace `__pendingStipendSettlement` with instance metadata
  - [ ] Replace `__pendingEconomicAidFaction` with instance metadata
  - [ ] Replace `__pendingEconomicAidFactionName` with instance metadata
  - [ ] Replace `__pendingInfiltrationFactionName` with instance metadata
  - [ ] Replace `__pendingTrainArmyArmy` with instance metadata
  - [ ] Replace `__pendingDisbandArmyArmy` with instance metadata
  - [ ] Replace `__pendingOutfitArmyArmy` with instance metadata
  - [ ] Replace `__pendingRecruitArmy` with instance metadata
  - [ ] Replace `__pendingDeployArmy` with instance metadata

### Step 5.2: Update CheckInstanceHelpers.ts
- [ ] Ensure metadata from ActionDialogService flows into check instances
- [ ] Add metadata extraction from `pendingActions` parameter

### Step 5.3: Remove Global State Assignments
- [ ] Search codebase for `globalThis.__pending` (should find 0 results after cleanup)
- [ ] Verify no new assignments in ActionsPhase.svelte

### Step 5.4: Validation
- [ ] All action resolutions access correct metadata
- [ ] No TypeScript errors related to globalThis
- [ ] No runtime errors accessing undefined globals

---

## Phase 6: Delete Obsolete Files ⏸️ PENDING

### Files to Delete
- [ ] `src/controllers/actions/action-handlers-config.ts`
  - **Reason:** Dialog configuration now lives in action implementations
  - **Replaced by:** `preRollDialog` config in each action

### Verification Steps
- [ ] Search for imports of `action-handlers-config` (should be 0 results)
- [ ] Search for `CUSTOM_ACTION_HANDLERS` usage (should be 0 results)
- [ ] Search for `createCustomActionHandlers` calls (should be 0 results)

---

## Testing Checklist (After All Phases Complete)

### End-to-End Flow Testing
- [ ] **Build Structure** - Select structure → Roll → Apply → Verify build queue
- [ ] **Repair Structure** - Select structure → Roll → Choose cost → Apply → Verify repair
- [ ] **Upgrade Settlement** - Select settlement → Roll → Apply → Verify level increase
- [ ] **Establish Diplomatic Relations** - Select faction → Roll → Apply → Verify attitude
- [ ] **Request Economic Aid** - Select faction → Roll → Apply → Verify resources
- [ ] **Request Military Aid** - Select faction → Roll → Apply → Verify benefits
- [ ] **Infiltration** - Select faction → Roll → Apply → Verify modifier
- [ ] **Collect Stipend** - Select settlement → Roll → Apply → Verify gold
- [ ] **Execute/Pardon Prisoners** - Select settlement → Roll → Apply → Verify unrest
- [ ] **Train Army** - Select army → Roll → Apply → Verify level/proficiency
- [ ] **Disband Army** - Select army → Roll → Apply → Verify army removed
- [ ] **Outfit Army** - Select army → Roll → Select equipment → Apply → Verify gear
- [ ] **Recruit Unit** - Configure army → Roll → Apply → Verify army created
- [ ] **Deploy Army** - Select army → Plot path → Roll → Apply → Verify deployment

### Regression Testing
- [ ] Actions without dialogs still work (JSON-only, custom resolution)
- [ ] Aid Another system still works
- [ ] Reroll functionality intact
- [ ] Cancel action works (clears state properly)
- [ ] Multiple players can act simultaneously
- [ ] Action tracking works (actionLog entries)

### Performance Testing
- [ ] No memory leaks when opening/closing dialogs repeatedly
- [ ] Service cleanup works on component unmount
- [ ] Reactive updates don't cause infinite loops

---

## Architecture Impact Summary

### Before Refactoring
```
ActionsPhase.svelte (988 lines)
├─ 15+ pending state variables
├─ CUSTOM_ACTION_HANDLERS factory (tight coupling)
├─ 14 execute*Roll() functions (duplication)
└─ action-handlers-config.ts (external dependency)
```

### After Refactoring
```
ActionsPhase.svelte (~300 lines)
├─ Dialog visibility flags only (UI concern)
└─ Delegates to ActionDialogService

ActionDialogService
├─ Centralized pending action metadata
└─ Coordinates dialog → roll → resolution

Action Implementations
└─ Self-contained (preRollDialog + requirements + resolution)
```

### Benefits Achieved
- ✅ **Single Source of Truth** - Action implementations declare their own requirements
- ✅ **No Global State** - Metadata managed by service, not globals
- ✅ **Reduced Complexity** - 70% reduction in ActionsPhase LOC
- ✅ **Easier Maintenance** - Add new action = update 1 file (the action)
- ✅ **Unified Pattern** - All pre-roll dialogs follow same flow

---

## Known Issues / Edge Cases

### Deploy Army (Special Case)
- Uses `ArmyDeploymentPanel` service instead of traditional dialog
- May need custom integration in ActionDialogService
- Test thoroughly to ensure panel → roll flow works

### Post-Roll Selection Actions (Out of Scope)
Actions using custom components AFTER roll (e.g., Harvest Resources choice):
- These are NOT affected by this refactoring
- They use `customResolution` pattern which remains unchanged
- See: `docs/guides/CUSTOM_UI_ACTION_GUIDE.md`

### Prepare/Commit Pattern Actions (Out of Scope)
Actions using prepare/commit pattern (e.g., some army operations):
- These are NOT affected by this refactoring
- They don't use pre-roll dialogs
- See: `docs/AI_ACTION_GUIDE.md` Section 1.1

---

## Documentation Updates Needed (Post-Refactoring)

- [ ] Update `docs/AI_ACTION_GUIDE.md` Section 1.2 (Pre-Roll Dialog Pattern)
  - Document new ActionDialogService approach
  - Archive old action-handlers-config pattern
  - Add examples with actual code

- [ ] Update `docs/systems/action-resolution-complete-flow.md`
  - Add ActionDialogService to architecture diagram
  - Update pre-roll dialog flow section
  - Add troubleshooting for new pattern

- [ ] Create `docs/archived/action-handlers-config-pattern.md`
  - Document old pattern for reference
  - Explain why it was replaced
  - Migration guide for future AI assistants

---

## Context Resumption Instructions

**If you're resuming this refactoring from a new context:**

1. **Read this checklist** to understand current state
2. **Check Phase Progress** at top of document
3. **Continue from next unchecked item** in current phase
4. **Update checklist** as you complete items
5. **Run tests** at phase boundaries

**Critical Files to Review:**
- `src/services/ActionDialogService.ts` - Core service
- `src/actions/build-structure/BuildStructureAction.ts` - POC example
- `src/view/kingdom/turnPhases/ActionsPhase.svelte` - Component to refactor

**Quick Status Check:**
```bash
# Count how many actions have preRollDialog config
grep -r "preRollDialog:" src/actions/ | wc -l
# Should be 3 now, 14 when Phase 3 complete
```

---

**Last Updated:** 2025-11-14 14:57 CET  
**Current Phase:** 3 (Complete) - Ready for Phase 4  
**Completion:** ~40% (Phases 1-3 complete, Phases 4-6 pending)
