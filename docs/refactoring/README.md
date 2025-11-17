# Action Pipeline Refactoring

**Status:** Documentation and architecture finalized - Ready for action implementation

---

## 📁 Files in This Directory

- **README.md** (this file) - Quick reference and overview
- **ACTION_MIGRATION_CHECKLIST.md** - Complete 1-26 action list with testing status
- **CUSTOM_COMPONENTS_TODO.md** - Pending custom component implementation work

## 🏗️ Architecture

**Complete design documentation:** `docs/systems/pipeline-coordinator.md`

### Unified PipelineCoordinator (9-Step Architecture)

All actions, events, and incidents flow through the same single coordinator:

```
Step 1: Requirements Check          [optional]
Step 2: Pre-Roll Interactions       [optional]
Step 3: Execute Roll                [always runs]
Step 4: Display Outcome             [always runs]
Step 5: Outcome Interactions        [optional]
Step 6: Wait For Apply              [always runs]
Step 7: Post-Apply Interactions     [optional]
Step 8: Execute Action              [always runs]
Step 9: Cleanup                     [always runs]
```

**Key Principles:**
- Single `PipelineContext` object persists through all steps
- State persisted in `kingdom.pendingOutcomes` (survives page refresh)
- FIFO queue with lock prevents concurrent execution race conditions
- Roll-forward error handling (no rollback - optimistic progression)

## 📊 Current Status

- **Implementation:** Core architecture complete ✅
- **Testing:** 0/26 actions tested (0% complete)
- **Tracking:** `src/constants/migratedActions.ts`
- **UI Badges:** Gray (untested) → Green ✓ (tested)

## 🎯 Action Implementation Workflows

**Not all actions need the same steps!** Follow the workflow that matches your action type:

### Workflow A: Basic Actions (#1-9)
*No gameCommands needed - just kingdom state changes*

**Examples:** claim-hexes, deal-with-unrest, sell-surplus, harvest-resources, build-roads

**Steps:**
1. **Test in Foundry:**
   ```
   Click action → Roll → Apply Result
   ↓ (if post-apply interaction)
   Complete hex selection → Verify state changes
   ```

2. **Update Status:**
   ```typescript
   // In src/constants/migratedActions.ts
   ['deal-with-unrest', 'tested'],  // ✅ Changed from 'untested'
   ```

3. **Badge Turns Green** ✓ automatically in UI

**NO gameCommands needed** - modifiers update kingdom state directly

---

### Workflow B: Entity Selection (#10-16)
*Pre-roll dialog to select entity, no gameCommands*

**Examples:** execute-or-pardon-prisoners, establish-diplomatic-relations, train-army

**Steps:**
1. **Test in Foundry:**
   ```
   Click action → Select entity (settlement/faction/army)
   ↓
   Roll → Apply Result → Verify state changes
   ```

2. **Update Status** (same as Workflow A)

**NO gameCommands needed** - selected entity stored in metadata, modifiers update state

---

### Workflow C: Foundry Integration (#17-21 + #25)
*Requires gameCommands for Foundry actors/items*

**Examples:** recruit-unit, build-structure, establish-settlement

**Steps:**
1. **Add gameCommands to Action JSON:**
   ```json
   {
     "criticalSuccess": {
       "description": "...",
       "modifiers": [...],
       "gameCommands": [
         {
           "type": "foundSettlement",
           "name": "{{settlementName}}",
           "location": "{{selectedLocation}}"
         }
       ]
     }
   }
   ```

2. **Test in Foundry:**
   ```
   Click action → Roll → Apply Result
   ↓
   gameCommands execute → Verify Foundry integration
   (e.g., army actor created, settlement placed)
   ```

3. **Update Status** (same as Workflow A)

**gameCommands required** - creates/modifies Foundry actors, items, or tokens

---

### Quick Reference: Which Actions Need gameCommands?

**Actions with gameCommands:**
- #17: recruit-unit
- #18: deploy-army  
- #19: build-structure
- #20: repair-structure
- #21: upgrade-settlement
- #25: establish-settlement

**All other actions (#1-16, #22-24, #26):** NO gameCommands needed

## 📋 Implementation Order

See `ACTION_MIGRATION_CHECKLIST.md` for detailed action list.

**Recommended order:**
1. **#1-9:** Basic Kingdom Operations (no game commands)
2. **#10-16:** Entity Selection (pre-roll dialogs)
3. **#17-21:** Foundry Integration (game commands)
4. **#22-26:** Complex Custom Logic (custom components)

## 🔗 Key Files

**Documentation:**
- `docs/systems/pipeline-coordinator.md` - Complete architecture design
- `docs/systems/check-instance-system.md` - OutcomePreview system
- `docs/systems/game-commands-system.md` - Game command handlers

**Implementation:**
- `src/services/PipelineCoordinator.ts` - Main coordinator
- `src/types/PipelineContext.ts` - Context object
- `src/constants/migratedActions.ts` - Status tracking
- `src/pipelines/actions/*.ts` - Individual action pipelines

**UI:**
- `src/view/kingdom/turnPhases/components/ActionCategorySection.svelte` - Badge display
- `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Outcome interaction

## ⚡ Quick Start

**To implement next action:**
1. Pick from ACTION_MIGRATION_CHECKLIST.md (in order)
2. Add `gameCommands` to action JSON (if needed)
3. Test in Foundry
4. Update migratedActions.ts
5. Badge turns green ✓

**To run development server:**
```bash
npm run dev  # HMR enabled, auto-rebuild on save
```

## 📝 Notes

- All actions, events, and incidents use the same 9-step pipeline
- Optional steps are automatically skipped if not needed
- Context persists through all steps for debugging
- Centralized error handling with roll-forward philosophy (no rollback)
- State persistence ensures pipelines survive page refresh
- Concurrency control via FIFO queue prevents race conditions

---

**Last Updated:** 2025-11-17  
**Status:** 🚀 Ready for action implementation
