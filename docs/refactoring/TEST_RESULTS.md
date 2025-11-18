# Action Testing Results Log

**Purpose:** Record detailed test results, issues found, and resolutions

**Started:** 2025-11-18

---

## Test Session Template

```markdown
### Session [Date] - [Actions Tested]

**Actions:** #X, #Y, #Z
**Tester:** [Name]
**Environment:** Foundry v[version], Module v[version]

#### Results:
- [ ] Action #X - [PASS/FAIL] - [Notes]
- [ ] Action #Y - [PASS/FAIL] - [Notes]
- [ ] Action #Z - [PASS/FAIL] - [Notes]

#### Issues Found:
1. [Issue description]
   - **Severity:** [Critical/Major/Minor]
   - **Resolution:** [How it was fixed]

#### Status Updates:
- Changed [action-name] from 'untested' to 'tested' in migratedActions.ts
```

---

## Test Sessions

### Session 1 - [Pending] - Core Pipeline Validation

**Actions:** #2 deal-with-unrest
**Tester:** TBD
**Purpose:** Validate core 9-step pipeline with simplest action

#### Test Plan:
1. Start with Unrest > 0
2. Execute action with various outcomes (crit success, success, failure, crit fail)
3. Verify Unrest changes correctly for each outcome
4. Check for console errors
5. Verify action card resets properly

#### Expected Results:
- ✅ Critical Success: Unrest -3
- ✅ Success: Unrest -2
- ✅ Failure: Unrest -1
- ✅ Critical Failure: Unrest unchanged
- ✅ No console errors
- ✅ Action card resets after Apply

#### Results:
- [ ] PASS
- [ ] FAIL - [Notes]

---

### Session 2 - [Pending] - Post-Apply Hex Selection

**Actions:** #1 claim-hexes
**Tester:** TBD
**Purpose:** Validate post-apply map interaction pattern

#### Test Plan:
1. Roll action (test both success and critical success)
2. Apply Result → Map should activate hex selection
3. Select valid adjacent hexes
4. Verify hexes claimed (claimedBy = 1)
5. Check hex count matches outcome (1 for success, 2-4 for crit success based on proficiency)

#### Expected Results:
- ✅ Success: Can claim 1 hex
- ✅ Crit Success: Can claim 2-4 hexes (based on proficiency)
- ✅ Hexes turn claimed color after confirmation
- ✅ Non-adjacent hexes rejected by validation
- ✅ Action card resets after completion

#### Results:
- [ ] PASS
- [ ] FAIL - [Notes]

---

### Session 3 - [Pending] - Custom Component Graceful Degradation

**Actions:** #3 sell-surplus, #4 purchase-resources
**Tester:** TBD
**Purpose:** Verify actions gracefully handle missing custom components

#### Test Plan:
1. Roll successful check
2. Check if resource selector appears (may not mount)
3. Apply Result
4. Verify no crash/error even if component doesn't work
5. Check console for warnings (acceptable) vs errors (not acceptable)

#### Expected Results:
- ✅ Action completes without crash
- ✅ Either sells/purchases resource OR no-op (both acceptable)
- ⚠️ Warning about missing component (OK)
- ❌ NO hard errors or crashes (NOT OK)

#### Results:
- [ ] PASS - Degrades gracefully
- [ ] FAIL - Crashes

---

### Session 4 - [Pending] - Pre-Roll Entity Selection

**Actions:** #10 collect-stipend, #11 execute-or-pardon-prisoners, #12 establish-diplomatic-relations
**Tester:** TBD
**Purpose:** Validate pre-roll dialog pattern

#### Test Plan:
For each action:
1. Click action → Dialog appears for entity selection
2. Select entity (settlement/faction) → Dialog closes
3. Roll proceeds with selected entity
4. Verify preview shows correct entity name/data
5. Apply Result → Verify changes applied to selected entity

#### Expected Results:
- ✅ Dialog appears before roll
- ✅ Selected entity stored in metadata
- ✅ Preview shows entity-specific data
- ✅ Changes apply to correct entity
- ✅ Action card resets after completion

#### Results:
- [ ] #10 collect-stipend - [PASS/FAIL]
- [ ] #11 execute-or-pardon-prisoners - [PASS/FAIL]
- [ ] #12 establish-diplomatic-relations - [PASS/FAIL]

---

### Session 5 - [Pending] - Foundry gameCommands

**Actions:** #17 recruit-unit, #19 build-structure
**Tester:** TBD
**Purpose:** Validate gameCommands execution (creates Foundry actors/items)

#### Test Plan:
1. Roll action successfully
2. Apply Result
3. Check Actors sidebar for new army actor (#17) or settlement structure (#19)
4. Verify actor has correct properties (name, level, stats)
5. Verify resources deducted

#### Expected Results:
- ✅ New actor/item appears in Foundry
- ✅ Properties correctly set from metadata
- ✅ Resources deducted from kingdom
- ✅ No duplicate creations on refresh

#### Results:
- [ ] #17 recruit-unit - [PASS/FAIL]
- [ ] #19 build-structure - [PASS/FAIL]

---

### Session 6 - [Pending] - Complex Compound Actions

**Actions:** #25 establish-settlement
**Tester:** TBD
**Purpose:** Validate most complex action (pre-roll + post-apply + gameCommands)

#### Test Plan:
1. Dialog for settlement name
2. Roll check successfully
3. Apply Result → Map activates for hex selection
4. Select hex for settlement
5. Verify:
   - Settlement actor created
   - Settlement token placed on map
   - Hex claimed
   - Resources deducted

#### Expected Results:
- ✅ All 3 interaction types work together
- ✅ Settlement appears in kingdom data
- ✅ Token placed at selected location
- ✅ Hex marked as settlement location

#### Results:
- [ ] PASS
- [ ] FAIL - [Notes]

---

## Issue Tracker

### Issue #1 - [Title]
**Severity:** [Critical/Major/Minor]  
**Action(s) Affected:** #X, #Y  
**Description:** [What went wrong]  
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Observed behavior

**Expected Behavior:** [What should happen]  
**Actual Behavior:** [What actually happened]  
**Console Error:** 
```
[Paste error message]
```

**Resolution:** [How it was fixed]  
**Status:** [Open/Fixed/Wont-Fix]

---

## Summary Statistics

### By Phase
- **Phase 1 (Basic):** 0/9 tested
- **Phase 2 (Entity):** 0/7 tested
- **Phase 3 (Foundry):** 0/5 tested
- **Phase 4 (Complex):** 0/5 tested

### By Outcome
- **PASS:** 0 actions
- **PASS (Degraded):** 0 actions (custom component not fully functional but no crash)
- **FAIL:** 0 actions
- **BLOCKED:** 0 actions (awaiting fixes/dependencies)

### Issues Summary
- **Critical:** 0
- **Major:** 0
- **Minor:** 0

---

**Last Updated:** 2025-11-18  
**Next Test Session:** TBD
