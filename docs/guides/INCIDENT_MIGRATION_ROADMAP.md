# Incident Migration Roadmap

**Structured plan for migrating all 30 incidents to the pipeline system.**

**Status:** 📋 Planning Phase  
**Last Updated:** 2025-11-29

---

## Overview

**Goal:** Migrate all 30 incidents from JSON-only to TypeScript pipeline implementations.

**Timeline:** 4 weeks (flexible based on complexity)

**Effort Estimation:**
- Simple incidents (Pattern 1-2): ~15-30 minutes each
- Moderate incidents (Pattern 3): ~30-45 minutes each
- Complex incidents (Pattern 4-5): ~1-3 hours each

---

## Phase 1: Foundation & Simple Incidents (Week 1)

**Goal:** Set up infrastructure and migrate simplest incidents.

**Estimated Time:** 6-8 hours

### Setup Tasks (1-2 hours)

- [x] ✅ Create migration guide documentation
- [x] ✅ Create quick reference card
- [ ] Create `src/pipelines/incidents/` directory structure
- [ ] Create `createIncidentPipeline.ts` helper (copy from actions)
- [ ] Create `src/pipelines/incidents/index.ts` registry file
- [ ] Set up testing script for incidents
- [ ] Update incident loader to support pipelines

**Directory Structure:**
```
src/pipelines/incidents/
├── minor/
├── moderate/
├── major/
└── index.ts
```

### Simple Minor Incidents (4-6 hours)

**8 incidents | Pattern 1 (modifier-only) | 15 min each**

| ID | Name | Complexity | Estimated Time | Status |
|----|------|------------|----------------|--------|
| `crime-wave` | Crime Wave | ⭐ Simple | 15 min | ⏳ |
| `corruption-scandal` | Corruption Scandal | ⭐ Simple | 15 min | ⏳ |
| `protests` | Protests | ⭐ Simple | 15 min | ⏳ |
| `rising-tensions` | Rising Tensions | ⭐ Simple | 15 min | ⏳ |
| `work-stoppage` | Work Stoppage | ⭐ Simple | 15 min | ⏳ |
| `tax-revolt` | Tax Revolt | ⭐ Simple | 15 min | ⏳ |
| `diplomatic-incident` | Diplomatic Incident | ⭐ Simple | 15 min | ⏳ |
| `international-crisis` | International Crisis | ⭐ Simple | 15 min | ⏳ |

**Implementation Notes:**
- All use static modifiers only (unrest, gold)
- No game commands or custom components
- Follow Pattern 1 template exactly
- Test all 4 outcomes for each

**Success Criteria:**
- ✅ All 8 incidents migrated
- ✅ All tests pass (32 outcomes total)
- ✅ No console errors
- ✅ Modifiers apply correctly

---

## Phase 2: Moderate Incidents with Basic Commands (Week 2)

**Goal:** Migrate incidents with existing game commands.

**Estimated Time:** 8-12 hours

### Dice Modifier Incidents (2-3 hours)

**2 incidents | Pattern 2 (dice + manual effects) | 30 min each**

| ID | Name | Manual Effect | Estimated Time | Status |
|----|------|---------------|----------------|--------|
| `bandit-activity` | Bandit Activity | Destroy worksite | 30 min | ⏳ |
| `emigration-threat` | Emigration Threat | Destroy worksite(s) | 30 min | ⏳ |

**Implementation Notes:**
- Use dice badges in preview
- Manual effects noted in warnings
- TODO comments for future destroyWorksite command

### Existing Game Command Incidents (5-9 hours)

**10 incidents | Pattern 3 (game commands) | 30-45 min each**

| ID | Name | Game Commands | Estimated Time | Status |
|----|------|---------------|----------------|--------|
| `disease-outbreak` | Disease Outbreak | damageStructure (category filter) | 45 min | ⏳ |
| `infrastructure-damage` | Infrastructure Damage | damageStructure (count: 1d3) | 30 min | ⏳ |
| `mass-exodus` | Mass Exodus | destroyWorksite + damageStructure | 45 min | ⏳ |
| `riot` | Riot | damageStructure OR destroyStructure | 30 min | ⏳ |
| `settlement-crisis` | Settlement Crisis | damageStructure (random) | 30 min | ⏳ |
| `assassination-attempt` | Assassination Attempt | consumePlayerAction (new) | 60 min | ⏳ |
| `diplomatic-crisis` | Diplomatic Crisis | adjustFactionAttitude (multiple) | 45 min | ⏳ |
| `trade-embargo` | Trade Embargo | Player choice component | 90 min | ⏳ |
| `border-raid` | Border Raid | removeBorderHexes | 30 min | ⏳ |
| `economic-crash` | Economic Crash | destroyStructure (highest tier) | 45 min | ⏳ |

**Game Command Dependencies:**

**Already Exist:**
- ✅ `damageStructure` - Damage random/specific structure
- ✅ `destroyStructure` - Destroy structure completely
- ✅ `adjustFactionAttitude` - Change faction relations
- ✅ `removeBorderHexes` - Remove border territory

**Need Implementation:**
- ⚠️ `consumePlayerAction` - Mark action as used (assassination-attempt, noble-conspiracy)
- ⚠️ `destroyWorksite` - Remove worksite progress (bandit-activity, emigration-threat)

**Success Criteria:**
- ✅ All 12 incidents migrated
- ✅ Game commands execute correctly
- ✅ Manual effects documented for future implementation
- ✅ All tests pass

---

## Phase 3: Complex Incidents with Custom UI (Week 3)

**Goal:** Migrate incidents requiring custom components or complex logic.

**Estimated Time:** 12-20 hours

### Player Choice Incidents (4-6 hours)

**2 incidents | Pattern 4 (custom components) | 2 hours each**

| ID | Name | Custom Component | Estimated Time | Status |
|----|------|------------------|----------------|--------|
| `production-strike` | Production Strike | ResourceLossSelector | 2 hrs | ⏳ |
| `trade-war` | Trade War | ResourceLossSelector (reuse) | 1 hr | ⏳ |

**Component:** `ResourceLossSelector.svelte`
- Displays dice roll result
- Player chooses which resource to lose
- Emits resolution event with selection

**Implementation Notes:**
- Create single component, reuse for both
- Roll dice on mount, display result
- Grid of 4 resource buttons (food, lumber, stone, ore)

### Multi-Step Complex Incidents (8-14 hours)

**10 incidents | Pattern 5 (complex) | 1-2 hours each**

| ID | Name | Complexity | New Commands Needed | Estimated Time | Status |
|----|------|------------|---------------------|----------------|--------|
| `guerrilla-movement` | Guerrilla Movement | ⭐⭐⭐⭐ | transferHexesToFaction, spawnFactionArmy | 2 hrs | ⏳ |
| `international-scandal` | International Scandal | ⭐⭐⭐ | modifyFactionAttitude (multiple) | 1 hr | ⏳ |
| `mass-desertion-threat` | Mass Desertion | ⭐⭐⭐ | performMoraleCheck | 1.5 hrs | ⏳ |
| `noble-conspiracy` | Noble Conspiracy | ⭐⭐⭐ | consumePlayerAction | 1 hr | ⏳ |
| `prison-breaks` | Prison Breaks | ⭐⭐⭐ | releaseImprisonedUnrest | 1.5 hrs | ⏳ |
| `religious-schism` | Religious Schism | ⭐⭐ | destroyStructure (category filter) | 45 min | ⏳ |
| `secession-crisis` | Secession Crisis | ⭐⭐⭐⭐ | transferSettlementToFaction, downgradeSettlement | 2.5 hrs | ⏳ |
| `settlement-collapse` | Settlement Collapse | ⭐⭐⭐ | downgradeSettlement + destroyStructure | 1.5 hrs | ⏳ |

**New Game Commands Needed:**

**High Priority (Week 3):**
- `downgradeSettlement` - Reduce settlement level by 1
- `performMoraleCheck` - Trigger army morale checks
- `releaseImprisonedUnrest` - Convert imprisoned → normal unrest
- `modifyFactionAttitude` - Batch attitude changes

**Medium Priority (Week 3-4):**
- `transferHexesToFaction` - Give hexes to faction
- `spawnFactionArmy` - Create army for faction
- `transferSettlementToFaction` - Full secession mechanic

**Success Criteria:**
- ✅ All 10 complex incidents migrated
- ✅ New game commands implemented
- ✅ Custom components work correctly
- ✅ Full integration testing passes

---

## Phase 4: Testing, Polish & Documentation (Week 4)

**Goal:** Comprehensive testing and finalization.

**Estimated Time:** 8-12 hours

### Automated Testing (2-3 hours)

**Tasks:**
- [ ] Write automated test suite for all 30 incidents
- [ ] Test all 120 outcomes (30 incidents × 4 outcomes each)
- [ ] Verify resource changes match expected
- [ ] Check game command execution
- [ ] Test OutcomeDisplay rendering

**Test Script:**
```javascript
// buildscripts/test-all-incidents.js
const INCIDENTS = [/* all 30 incident IDs */];
const OUTCOMES = ['criticalSuccess', 'success', 'failure', 'criticalFailure'];

async function testAll() {
  for (const id of INCIDENTS) {
    for (const outcome of OUTCOMES) {
      await testIncident(id, outcome);
    }
  }
}
```

### Manual Integration Testing (3-4 hours)

**Scenarios:**
1. Trigger incident naturally during Upkeep
2. Test dangerous trait incidents (ignore flow)
3. Verify multi-client synchronization
4. Test edge cases (no resources, no settlements, etc.)
5. Verify chat messages display correctly
6. Check modifier badges render properly
7. Test dice rolling interactions
8. Verify custom components work

### Polish & Bug Fixes (2-3 hours)

**Tasks:**
- [ ] Fix any bugs found during testing
- [ ] Improve error messages
- [ ] Add helpful console logs
- [ ] Clean up debug code
- [ ] Verify all TODOs documented

### Documentation Updates (1-2 hours)

**Tasks:**
- [ ] Update `docs/systems/check-type-differences.md` with incident examples
- [ ] Update `CHANGELOG.md` with migration summary
- [ ] Add JSDoc comments to complex functions
- [ ] Update `README.md` if needed
- [ ] Create video walkthrough (optional)

**Success Criteria:**
- ✅ 100% test pass rate
- ✅ Zero console errors in production
- ✅ All documentation up to date
- ✅ Code review completed
- ✅ Ready for production

---

## Dependency Map

### Game Commands Implementation Order

**Already Complete:**
1. ✅ `damageStructure` - Core structure damage
2. ✅ `destroyStructure` - Full structure destruction
3. ✅ `adjustFactionAttitude` - Single faction adjustment
4. ✅ `removeBorderHexes` - Territory loss

**Week 2 (Phase 2):**
5. `consumePlayerAction` - Mark action as used
6. `destroyWorksite` - Remove worksite progress

**Week 3 (Phase 3):**
7. `downgradeSettlement` - Reduce settlement level
8. `performMoraleCheck` - Army morale system
9. `releaseImprisonedUnrest` - Prison release mechanic
10. `modifyFactionAttitude` - Batch faction changes
11. `transferHexesToFaction` - Give territory to faction
12. `spawnFactionArmy` - Create faction army
13. `transferSettlementToFaction` - Settlement secession

### Custom Components

**Week 3 (Phase 3):**
1. `ResourceLossSelector.svelte` - Choose resource to lose (production-strike, trade-war)

**Optional (if needed):**
2. `SettlementSelectorDialog.svelte` - Choose settlement target
3. `FactionSelectorDialog.svelte` - Choose faction target

---

## Risk Assessment

### Low Risk (Week 1-2)

**Simple incidents with existing patterns:**
- ✅ Pattern well-established from actions
- ✅ No new game commands needed
- ✅ Clear examples to follow

**Mitigation:** Follow templates exactly, test thoroughly

### Medium Risk (Week 3)

**Custom components and new commands:**
- ⚠️ New game commands may have edge cases
- ⚠️ Custom components need testing across outcomes
- ⚠️ Integration complexity increases

**Mitigation:**
- Implement game commands incrementally
- Test each command independently first
- Use existing component patterns
- Create comprehensive test cases

### High Risk (Week 4)

**Complex multi-faction incidents:**
- ⚠️ Secession Crisis is very complex
- ⚠️ Faction system interactions untested at scale
- ⚠️ Edge cases with no settlements/factions

**Mitigation:**
- Tackle Secession Crisis last
- Add extensive error handling
- Create backup/rollback plan
- Test in isolated save file first

---

## Tracking Progress

### Completion Checklist

**Phase 1: Foundation (Week 1)**
- [ ] Infrastructure setup complete
- [ ] 8 simple incidents migrated
- [ ] Basic testing passing

**Phase 2: Moderate (Week 2)**
- [ ] 2 game commands implemented
- [ ] 12 moderate incidents migrated
- [ ] Game command testing complete

**Phase 3: Complex (Week 3)**
- [ ] 7 game commands implemented
- [ ] 10 complex incidents migrated
- [ ] Custom components working

**Phase 4: Polish (Week 4)**
- [ ] All 30 incidents tested
- [ ] Bug fixes complete
- [ ] Documentation updated
- [ ] Code review approved

### Metrics

**Target Metrics:**
- 100% incident migration (30/30)
- 100% test pass rate (120/120 outcomes)
- 0 critical bugs
- < 5 minor bugs
- < 10 TODOs remaining

**Actual Progress:** (Update weekly)
- Incidents migrated: 0/30 (0%)
- Tests passing: 0/120 (0%)
- Game commands: 4/13 (31%)
- Bugs found: 0
- Bugs fixed: 0

---

## Weekly Goals

### Week 1 Deliverables
✅ Migration guide documentation  
✅ Quick reference card  
⏳ Infrastructure setup  
⏳ 8 simple incidents migrated  
⏳ Basic testing passing

### Week 2 Deliverables
- [ ] `consumePlayerAction` command
- [ ] `destroyWorksite` command
- [ ] 12 moderate incidents migrated
- [ ] Game command tests passing

### Week 3 Deliverables
- [ ] 7 new game commands
- [ ] `ResourceLossSelector` component
- [ ] 10 complex incidents migrated
- [ ] Integration tests passing

### Week 4 Deliverables
- [ ] Automated test suite (120 tests)
- [ ] All bugs fixed
- [ ] Documentation complete
- [ ] Production-ready

---

## Success Indicators

**Technical Success:**
- ✅ All incidents use unified pipeline
- ✅ No duplicate resolution logic
- ✅ Type-safe implementations
- ✅ Full test coverage

**User Experience Success:**
- ✅ Consistent UI/UX across incidents
- ✅ Clear feedback on outcomes
- ✅ Smooth interactions
- ✅ No confusing errors

**Maintainability Success:**
- ✅ Well-documented code
- ✅ Easy to add new incidents
- ✅ Clear patterns established
- ✅ No technical debt

---

## Next Steps

### Immediate Actions (This Week)

1. **Review and approve roadmap** ✅
2. **Create directory structure**
   ```bash
   mkdir -p src/pipelines/incidents/{minor,moderate,major}
   touch src/pipelines/incidents/index.ts
   ```
3. **Set up testing infrastructure**
   ```bash
   touch buildscripts/test-incidents.js
   ```
4. **Start with first simple incident** (crime-wave)
5. **Validate pattern works end-to-end**

### Long-Term Vision

**After Incident Migration:**
- Migrate Events (37 events) using same patterns
- Unified system for all check types (Actions ✅, Incidents 🚧, Events ⏳)
- Comprehensive testing framework
- Easy addition of new content

---

## Questions & Decisions

**Open Questions:**
- [ ] Should we batch-implement game commands or as-needed?
- [ ] Do we need automated visual regression testing?
- [ ] Should custom components be shared between incidents/events?

**Decisions Made:**
- ✅ Use same pipeline architecture as actions
- ✅ Migrate in phases by complexity
- ✅ Create comprehensive documentation first
- ✅ Test thoroughly before moving to next phase

---

## Resources

**Documentation:**
- [Incident Migration Guide](./INCIDENT_MIGRATION_GUIDE.md) - Complete guide
- [Quick Reference Card](./INCIDENT_QUICK_REFERENCE.md) - Pattern templates
- [Custom UI Guide](./CUSTOM_UI_ACTION_GUIDE.md) - Component patterns
- [Pipeline Coordinator](../systems/pipeline-coordinator.md) - Architecture
- [Game Commands System](../systems/game-commands-system.md) - Command reference

**Examples:**
- `src/pipelines/actions/` - 27 working action implementations
- `src/view/kingdom/components/OutcomeDisplay/components/` - Component examples

**Tools:**
- Browser console - Quick testing
- `buildscripts/test-incidents.js` - Automated testing
- `docs/data/incident-event-outcome-notes.md` - Implementation notes

---

**Estimated Total Time:** 34-52 hours (4-6 weeks at 8-10 hrs/week)

**Status:** 📋 Ready to Begin Phase 1

**Owner:** Mark (with AI assistance)

**Last Updated:** 2025-11-29

