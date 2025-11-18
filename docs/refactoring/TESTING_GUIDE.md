# Action Testing Guide

**Purpose:** Systematically test and validate all 26 actions through the 9-step PipelineCoordinator

**Status:** 1/26 actions tested (4% complete)

---

## 🚨 Before You Start Testing

**⚠️ CRITICAL: Read DEBUGGING_GUIDE.md first!**

Common issues from real testing sessions:
- **Always full browser refresh** (Ctrl+Shift+R) before testing
- Check for stale instances in `pendingOutcomes`
- Verify correct naming: `pendingOutcomes`, `previewId`, `checkId`
- Watch console for all 9 pipeline steps

**📖 See DEBUGGING_GUIDE.md** for complete troubleshooting reference.

---

## Testing Prerequisites

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Foundry VTT
- Launch Foundry and load your kingdom world
- Navigate to the Kingdom Sheet → Actions Phase
- **Open browser console** (F12) to watch pipeline logs

### 3. Prepare Test Environment
- Ensure kingdom has sufficient resources (gold, lumber, ore, food)
- Have at least one settlement, faction, and army (for entity selection tests)
- Have claimed hexes for territory-based actions

### 4. Pre-Test Cleanup
```javascript
// Run in browser console to clear stale instances
const actor = game.actors.getName("Party");
await actor.updateKingdomData(kingdom => {
  kingdom.pendingOutcomes = [];
});
```

---

## Testing Workflow (For Each Action)

### Step 1: Execute Action
```
1. Expand action card in Kingdom Sheet
2. Select a skill from the available options
3. Click "Roll Check" button
```

**Expected:** PF2e roll dialog appears

### Step 2: Complete Roll
```
4. Roll the dice (or use debug outcome selector if GM)
5. Observe outcome in chat
```

**Expected:** Roll completes, outcome determined

### Step 3: Verify Outcome Display
```
6. Check that OutcomeDisplay component mounted
7. Verify outcome description matches roll result
8. Check preview shows correct resource/entity changes
```

**Expected:** 
- Outcome card appears in action card
- Preview shows what will change (resources, modifiers, etc.)
- No console errors

### Step 4: Apply Result
```
9. Click "Apply Result" button
```

**Expected (varies by action type):**
- **No interactions:** State changes immediately
- **Post-apply interactions:** Map/dialog appears for user input

### Step 5: Complete Post-Apply Interactions (if any)
```
10. Select hexes on map / configure options / etc.
11. Confirm selection
```

**Expected:** Interaction completes, returns to outcome display

### Step 6: Verify State Changes
```
12. Check kingdom resources updated correctly
13. Verify entities created/modified (settlements, armies, structures)
14. Check modifiers applied to kingdom state
15. Confirm action card resets to default state
```

**Expected:** All changes applied correctly, no stale data

### Step 7: Update Status
```
15. Edit src/constants/migratedActions.ts
16. Change action status from 'untested' to 'tested'
17. Save file
```

**Expected:** Badge turns green ✓ in UI (after rebuild)

---

## Action Test Checklist

### Phase 1: No Interactions (Priority 1)

#### #1 - deal-with-unrest ⚪ UNTESTED
**Type:** No interactions (simplest action)
**Test Steps:**
1. Ensure kingdom has Unrest > 0
2. Roll check → Verify outcome preview shows Unrest reduction
3. Apply Result → Verify Unrest decreased
**Success Criteria:** Unrest reduced by correct amount (-3/-2/-1 based on outcome)
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

---

### Phase 2: Post-Apply Map Interactions (Priority 2)

#### #2 - claim-hexes ⚪ UNTESTED
**Type:** Post-apply hex selection
**Test Steps:**
1. Roll check → Success shows outcome with hex count
2. Apply Result → Map activates hex selection mode
3. Click valid adjacent hexes (1 for success, 2-4 for crit success based on proficiency)
4. Confirm selection → Verify hexes claimed (border color changes)
**Success Criteria:** Selected hexes claimed, claimedBy = 1
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #3 - build-roads ⚪ UNTESTED
**Type:** Post-apply hex selection
**Test Steps:**
1. Ensure kingdom has lumber/ore
2. Roll check → Success shows outcome
3. Apply Result → Map activates hex selection mode
4. Select hex(es) to build roads in
5. Confirm selection → Verify roads built, resources deducted
**Success Criteria:** Roads appear in hexes, lumber/ore reduced
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #4 - fortify-hex ⚪ UNTESTED
**Type:** Post-apply hex selection
**Test Steps:**
1. Ensure kingdom has ore
2. Roll check → Success shows outcome
3. Apply Result → Map activates hex selection mode
4. Select hex to fortify
5. Confirm selection → Verify fortification added, ore deducted
**Success Criteria:** Hex fortified, ore reduced
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #5 - create-worksite ⚪ UNTESTED
**Type:** Post-apply hex selection
**Test Steps:**
1. Roll check → Success shows outcome
2. Apply Result → Map activates hex selection mode
3. Select hex for worksite
4. Confirm selection → Verify worksite created
**Success Criteria:** Worksite appears in hex
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #6 - harvest-resources ⚪ UNTESTED
**Type:** In-preview resource choice
**Test Steps:**
1. Ensure kingdom has worksites
2. Roll check → Success shows resource choice in preview
3. Select resource type (lumber/ore/food)
4. Apply Result → Verify correct resource gained
**Success Criteria:** Chosen resource increased by correct amount
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #7 - send-scouts ⚪ UNTESTED
**Type:** Post-apply hex selection + World Explorer integration
**Test Steps:**
1. Roll check → Success shows outcome
2. Apply Result → Map activates hex selection mode
3. Select unexplored hex(es)
4. Confirm selection → Verify hexes revealed (if World Explorer integration works)
**Success Criteria:** Hexes marked as explored OR graceful failure
**Known Issues:** World Explorer integration may not be complete
**Status:** [ ] PASS  [ ] FAIL

---

### Phase 3: Custom Components (Graceful Degradation) (Priority 3)

#### #8 - sell-surplus ⚪ UNTESTED
**Type:** Custom component (gracefully degrades)
**Test Steps:**
1. Ensure kingdom has commerce structure + resources
2. Roll check → Success shows resource selector (may not mount yet)
3. Apply Result → Verify resource sold (if component works) OR no-op (if degraded)
**Success Criteria:** Either sells resource OR fails gracefully without crash
**Known Issues:** Custom component not fully integrated (acceptable degradation)
**Status:** [ ] PASS  [ ] FAIL

#### #9 - purchase-resources ⚪ UNTESTED
**Type:** Custom component (gracefully degrades)
**Test Steps:**
1. Ensure kingdom has commerce structure + gold
2. Roll check → Success shows resource selector (may not mount yet)
3. Apply Result → Verify resource purchased (if component works) OR no-op (if degraded)
**Success Criteria:** Either purchases resource OR fails gracefully without crash
**Known Issues:** Custom component not fully integrated (acceptable degradation)
**Status:** [ ] PASS  [ ] FAIL

---

### Phase 2: Entity Selection Actions (Priority 2)

#### #10 - collect-stipend ⚪ UNTESTED
**Type:** Auto-selects highest settlement
**Test Steps:**
1. Ensure kingdom has settlements
2. Roll check → Preview shows gold from highest settlement
3. Apply Result → Verify gold gained
**Success Criteria:** Gold increased by settlement tier × proficiency
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #11 - execute-or-pardon-prisoners ⚪ UNTESTED
**Type:** Pre-roll settlement selection
**Test Steps:**
1. Dialog appears for settlement selection
2. Choose settlement → Roll check
3. Apply Result → Verify unrest/crime changes
**Success Criteria:** Unrest/crime modified based on choice
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #12 - establish-diplomatic-relations ⚪ UNTESTED
**Type:** Pre-roll faction selection
**Test Steps:**
1. Dialog appears for faction selection
2. Choose faction → Roll check
3. Apply Result → Verify diplomatic status updated
**Success Criteria:** Faction relationship level changes
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #13 - request-economic-aid ⚪ UNTESTED
**Type:** Pre-roll faction selection
**Test Steps:**
1. Dialog appears for faction selection
2. Choose faction → Roll check
3. Apply Result → Verify resources/gold gained
**Success Criteria:** Resources granted based on faction relationship
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #14 - request-military-aid ⚪ UNTESTED
**Type:** Pre-roll faction selection
**Test Steps:**
1. Dialog appears for faction selection
2. Choose faction → Roll check
3. Apply Result → Verify military aid granted
**Success Criteria:** Army or military bonus received
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #15 - train-army ⚪ UNTESTED
**Type:** Pre-roll army selection
**Test Steps:**
1. Dialog appears for army selection
2. Choose army → Roll check
3. Apply Result → Verify army XP/level increases
**Success Criteria:** Selected army gains experience
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

#### #16 - disband-army ⚪ UNTESTED
**Type:** Pre-roll army selection
**Test Steps:**
1. Dialog appears for army selection
2. Choose army → Roll check
3. Apply Result → Verify army removed, resources refunded
**Success Criteria:** Army deleted, partial resource refund
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

---

### Phase 3: Foundry Integration Actions (Priority 3)

#### #17 - recruit-unit ⚪ UNTESTED
**Type:** gameCommands - creates army actor
**Test Steps:**
1. Dialog for army name/type
2. Roll check → Apply Result
3. Verify new army actor created in Actors sidebar
**Success Criteria:** Army actor appears, resources deducted
**Known Issues:** gameCommands must be in action JSON
**Status:** [ ] PASS  [ ] FAIL

#### #18 - deploy-army ⚪ UNTESTED
**Type:** gameCommands - places army token
**Test Steps:**
1. Dialog for army selection + path plotting
2. Roll check → Apply Result
3. Verify army token placed on map
**Success Criteria:** Token appears, army location updated
**Known Issues:** gameCommands must be in action JSON
**Status:** [ ] PASS  [ ] FAIL

#### #19 - build-structure ⚪ UNTESTED
**Type:** gameCommands - creates structure item
**Test Steps:**
1. Dialog for structure selection + settlement
2. Roll check → Apply Result
3. Verify structure added to settlement
**Success Criteria:** Structure appears in settlement, resources deducted
**Known Issues:** gameCommands must be in action JSON
**Status:** [ ] PASS  [ ] FAIL

#### #20 - repair-structure ⚪ UNTESTED
**Type:** gameCommands - updates structure item
**Test Steps:**
1. Dialog for damaged structure selection
2. Roll check → Apply Result
3. Verify structure repaired
**Success Criteria:** Structure damage removed
**Known Issues:** gameCommands must be in action JSON
**Status:** [ ] PASS  [ ] FAIL

#### #21 - upgrade-settlement ⚪ UNTESTED
**Type:** gameCommands - modifies settlement
**Test Steps:**
1. Dialog for settlement selection
2. Roll check → Apply Result
3. Verify settlement tier increased
**Success Criteria:** Settlement tier changes (village → town → city)
**Known Issues:** gameCommands must be in action JSON
**Status:** [ ] PASS  [ ] FAIL

---

### Phase 4: Complex Custom Logic (Priority 4)

#### #22 - arrest-dissidents ⚪ UNTESTED
**Type:** Custom unrest reduction component
**Test Steps:**
1. Roll check → Success shows custom component (may not mount)
2. Apply Result → Verify unrest reduced OR graceful failure
**Success Criteria:** Unrest reduced OR no crash
**Known Issues:** Custom component pending
**Status:** [ ] PASS  [ ] FAIL

#### #23 - outfit-army ⚪ UNTESTED
**Type:** Custom army equipment logic
**Test Steps:**
1. Dialog for army selection
2. Roll check → Success shows equipment options (may not mount)
3. Apply Result → Verify army equipment updated OR graceful failure
**Success Criteria:** Army equipped OR no crash
**Known Issues:** Custom component pending
**Status:** [ ] PASS  [ ] FAIL

#### #24 - infiltration ⚪ UNTESTED
**Type:** Custom complex resolution
**Test Steps:**
1. Dialog for faction selection
2. Roll check → Success shows infiltration results (may not mount)
3. Apply Result → Verify infiltration effects OR graceful failure
**Success Criteria:** Infiltration tracked OR no crash
**Known Issues:** Custom component pending
**Status:** [ ] PASS  [ ] FAIL

#### #25 - establish-settlement ⚪ UNTESTED
**Type:** Compound (pre-roll + post-apply + gameCommands)
**Test Steps:**
1. Dialog for settlement name
2. Roll check → Apply Result
3. Map activates hex selection for settlement location
4. Select hex → Verify settlement created, actor appears
**Success Criteria:** Settlement actor + token appear, hex claimed
**Known Issues:** Most complex action, test last
**Status:** [ ] PASS  [ ] FAIL

#### #26 - recover-army ⚪ UNTESTED
**Type:** Custom healing calculation
**Test Steps:**
1. Dialog for damaged army selection
2. Roll check → Success shows healing preview
3. Apply Result → Verify army HP restored
**Success Criteria:** Army HP increases by correct amount
**Known Issues:** None
**Status:** [ ] PASS  [ ] FAIL

---

## Common Issues & Troubleshooting

**📖 FULL TROUBLESHOOTING:** See `DEBUGGING_GUIDE.md` for complete solutions

**Quick Reference (most common issues):**

### Issue: Outcome doesn't appear after roll
**Symptoms:** Roll completes, no outcome card shows  
**Most Common Causes:**
1. Using `activeCheckInstances` instead of `pendingOutcomes`
2. Looking up by `instanceId` instead of `previewId`  
**Fix:** Check `ActionsPhase.svelte` and `ActionCategorySection.svelte` for correct naming  
**Details:** DEBUGGING_GUIDE.md - Issue #1

### Issue: Old outcome appears when expanding action
**Symptoms:** See result from previous test session  
**Cause:** Stale instances persisting in Foundry flags  
**Fix:** Full browser refresh (Ctrl+Shift+R) before testing  
**Details:** DEBUGGING_GUIDE.md - Issue #2

### Issue: "No pending context" error
**Symptoms:** Can't apply old instance after page refresh  
**Cause:** Coordinator context is in-memory only (lost on refresh)  
**Fix:** Full browser refresh to clear stale instances  
**Details:** DEBUGGING_GUIDE.md - Issue #4

### Issue: State changes don't persist
**Symptoms:** Logs show "Success" but resources unchanged  
**Cause:** Missing `await` on `updateKingdom()` calls  
**Details:** DEBUGGING_GUIDE.md - Issue #3

### Issue: Action card doesn't reset after Apply
**Symptoms:** Card shows "Resolved" forever, can't re-use action  
**Cause:** Step 9 not deleting instance from `pendingOutcomes`  
**Fix:** Check `PipelineCoordinator.ts` Step 9 cleanup  
**Details:** DEBUGGING_GUIDE.md - Issue #5

---

### Legacy Issues (From Pre-Testing Phase)

These may still occur but are less common:

### Issue: "Cannot read property 'specialEffects' of undefined"
**Cause:** Preview calculation missing `specialEffects: []`
**Fix:** Update action pipeline preview to include empty array

### Issue: Post-apply interaction doesn't trigger
**Cause:** Condition function returns false
**Fix:** Check pipeline `postApplyInteractions[0].condition(ctx)`

### Issue: Resources not deducting
**Cause:** Execute step not applying modifiers
**Fix:** Verify pipeline calls `applyPipelineModifiers()` in execute function

### Issue: Console errors about missing metadata
**Cause:** Pre-roll dialog didn't store metadata
**Fix:** Check that dialog calls `dialogService.handleDialogComplete()`

---

## Progress Tracking

### Current Progress
- **Phase 1 (Basic):** 0/9 tested (0%)
- **Phase 2 (Entity):** 0/7 tested (0%)
- **Phase 3 (Foundry):** 0/5 tested (0%)
- **Phase 4 (Complex):** 0/5 tested (0%)
- **Overall:** 0/26 tested (0%)

### Update After Each Test Session
```bash
# Count tested actions
grep -c "'tested'" src/constants/migratedActions.ts

# List remaining untested
grep "'untested'" src/constants/migratedActions.ts | wc -l
```

---

## Quick Reference: Test Order

**Recommended sequence:**
1. deal-with-unrest (#2) - Simplest, validates core pipeline
2. claim-hexes (#1) - Tests post-apply interaction
3. sell-surplus (#3) - Tests custom component (graceful degradation)
4. collect-stipend (#10) - Tests entity auto-selection
5. build-roads (#6) - Tests resource deduction + hex selection
6. establish-diplomatic-relations (#12) - Tests pre-roll dialog
7. recruit-unit (#17) - Tests gameCommands (actor creation)
8. Continue with remaining actions...

**Skip until custom component work complete:**
- #22 arrest-dissidents
- #23 outfit-army  
- #24 infiltration

---

**Last Updated:** 2025-11-18  
**Next Action:** Test deal-with-unrest (#2) first to validate core pipeline
