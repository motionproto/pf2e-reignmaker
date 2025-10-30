# Known Bugs

## Reroll Skill Proficiency Bonus Doubled (Reported: 2025-10-30)

**Status:** Documented, Not Fixed  
**Severity:** Medium  
**Affected Feature:** Fame-based rerolls in Actions Phase  

### Description
When a player uses fame to reroll a skill check in the Actions Phase, the skill proficiency bonus is incorrectly added twice on the rerolled check.

### Expected Behavior
The rerolled check should calculate modifiers the same way as the initial roll, with the skill proficiency bonus added only once.

### Actual Behavior
The skill proficiency bonus is being applied twice during rerolls, resulting in inflated roll totals.

### Reproduction Steps
1. Perform an action skill check that fails/succeeds
2. Use fame to reroll the check
3. Observe the roll breakdown - skill proficiency bonus appears twice

### Investigation Notes
- Bug reported after Phase 2 refactoring (dialog management extraction)
- The `handlePerformReroll()` function (lines ~774-817 in ActionsPhase.svelte) was NOT modified during Phase 2
- Likely causes:
  - Pre-existing bug from before Phase 2
  - Introduced during Phase 1 business logic extraction
  - Issue in `performKingdomActionRoll()` service
  - Modifier calculation in roll system

### Related Files
- `src/view/kingdom/turnPhases/ActionsPhase.svelte` - Contains `handlePerformReroll()` function
- `src/services/pf2e/index.ts` - Contains `performKingdomActionRoll()`
- `src/controllers/shared/RerollHelpers.ts` - Fame management helpers

### Fix Priority
Should be addressed in a dedicated bug-fix session after refactoring work is complete.

---

## Bug Reporting
To report additional bugs, add them to this file following the same format.
