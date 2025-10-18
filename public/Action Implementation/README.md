# Player Actions Implementation Tracker

**Total Actions:** 27  
**Status:** Based on actual data files in `data/player-actions/`

Mark each markdown file as done as you complete its implementation.

---

## Implementation Categories

Actions are grouped by complexity to guide implementation order:

### 🟢 Category 1: Simple Resource Actions
**What:** Actions that only apply resource modifiers (gold, food, unrest, etc.)  
**Implementation:** Fully supported by current typed modifier system  
**Needs:** Only proper JSON with typed modifiers (static, dice, or choice)  
**Example:** `deal-with-unrest` - rolls skill, applies -1 to -3 unrest based on outcome

### 🟡 Category 2: Selection + Resource Actions  
**What:** Actions requiring player selection (hex, settlement, etc.) before/after roll  
**Implementation:** Needs pre-roll selection UI + post-roll game effects  
**Needs:** 
- Pre-roll selection dialog (hex picker, settlement selector, etc.)
- Post-roll game effects handler (via `complexActions` in `ResolutionData`)
- Availability validation (e.g., "adjacent hexes only")  
**Example:** `claim-hexes` - select hexes, roll skill, claim selected hexes on success

### 🔴 Category 3: Complex Entity Management
**What:** Actions that create/modify/destroy entities (armies, structures, factions)  
**Implementation:** Needs custom dialogs + specialized game effects  
**Needs:**
- Custom selection dialogs (like `BuildStructureDialog`)
- Entity creation/modification logic
- Complex availability rules (e.g., "settlement with available slots")  
**Example:** `recruit-unit` - select unit type and settlement, create army entity on success

---

## Uphold Stability (3)

- [x] 🔴 [arrest-dissidents.md](uphold-stability/arrest-dissidents.md)
- [x] 🟢 [deal-with-unrest.md](uphold-stability/deal-with-unrest.md)
- [ ] 🔴 [execute-or-pardon-prisoners.md](uphold-stability/execute-or-pardon-prisoners.md)

## Military Operations (6)

- [ ] 🔴 [deploy-army.md](military-operations/deploy-army.md)
- [ ] 🔴 [disband-army.md](military-operations/disband-army.md)
- [ ] 🔴 [outfit-army.md](military-operations/outfit-army.md)
- [ ] 🔴 [recover-army.md](military-operations/recover-army.md)
- [ ] 🔴 [recruit-unit.md](military-operations/recruit-unit.md) 
- [ ] 🔴 [train-army.md](military-operations/train-army.md)Before we proceed with more custom actions, I'd like to organize the actions because I'm having trouble finding the custom code and the UI that relates to these. 

## Expand the Borders (5)

- [ ] 🟡 [build-roads.md](expand-borders/build-roads.md)
- [ ] 🟡 [claim-hexes.md](expand-borders/claim-hexes.md)
- [ ] 🟡 [fortify-hex.md](expand-borders/fortify-hex.md)
- [ ] 🟡 [harvest-resources.md](expand-borders/harvest-resources.md)
- [ ] 🟡 [send-scouts.md](expand-borders/send-scouts.md)

## Urban Planning (4)

- [x] 🔴 [build-structure.md](urban-planning/build-structure.md)
- [x] 🟡 [establish-settlement.md](urban-planning/establish-settlement.md)
- [x] 🟡 [repair-structure.md](urban-planning/repair-structure.md)
- [x] 🟡 [upgrade-settlement.md](urban-planning/upgrade-settlement.md)

## Foreign Affairs (5)

- [ ] 🔴 [establish-diplomatic-relations.md](foreign-affairs/establish-diplomatic-relations.md)
- [ ] 🔴 [hire-adventurers.md](foreign-affairs/hire-adventurers.md)
- [ ] 🔴 [infiltration.md](foreign-affairs/infiltration.md)
- [ ] 🟢 [request-economic-aid.md](foreign-affairs/request-economic-aid.md)
- [ ] 🔴 [request-military-aid.md](foreign-affairs/request-military-aid.md)

## Economic & Resource Actions (4)

- [ ] 🟢 [collect-stipend.md](economic-resources/collect-stipend.md)
- [ ] 🟡 [create-worksite.md](economic-resources/create-worksite.md)
- [ ] 🟢 [purchase-resources.md](economic-resources/purchase-resources.md)
- [ ] 🟢 [sell-surplus.md](economic-resources/sell-surplus.md)

---

## Implementation Progress

**By Category:**
- 🟢 Category 1 (Simple): 1/5 complete (20%)
- 🟡 Category 2 (Selection): 0/9 complete (0%)
- 🔴 Category 3 (Complex): 1/13 complete (8%)

**Overall:** 2/27 complete (7%)

---

## Recommended Implementation Order

1. **Phase 1: Foundation** - Create `ActionEffectsService` and `ComplexAction` types
2. **Phase 2: Quick Wins** - Complete Category 1 actions (4 remaining, easy)
3. **Phase 3: Selection Pattern** - Implement Category 2 actions (establish patterns)
4. **Phase 4: Complex Systems** - Tackle Category 3 actions (one system at a time)

---

## Quick Reference

**Data Location:** `data/player-actions/*.json`  
**Build Command:** `npm run build` (generates `dist/player-actions.json`)  
**Architecture:** See root `ARCHITECTURE_SUMMARY.md`  
**Check Card System:** `BaseCheckCard.svelte` + `OutcomeDisplay.svelte`  
**Game Effects:** `GameEffectsService.ts` (resource changes)  
**Action Effects:** `ActionEffectsService.ts` (complex game state changes - TBD)
