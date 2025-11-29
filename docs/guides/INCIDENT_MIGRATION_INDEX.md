# Incident Migration Documentation Index

**Your complete guide to migrating all 30 incidents to the unified pipeline system.**

**Status:** 📚 Documentation Complete | 🚧 Implementation Not Started  
**Last Updated:** 2025-11-29

---

## 🎯 Quick Start

**New to incident migration?** Start here:

1. **Read:** [Incident Migration Guide](./INCIDENT_MIGRATION_GUIDE.md) - Full guide with patterns and examples
2. **Reference:** [Quick Reference Card](./INCIDENT_QUICK_REFERENCE.md) - Templates and snippets
3. **Plan:** [Migration Roadmap](./INCIDENT_MIGRATION_ROADMAP.md) - 4-week implementation plan

**Ready to implement?** Jump to [Getting Started](#getting-started) below.

---

## 📚 Documentation Structure

### Core Guides

**[Incident Migration Guide](./INCIDENT_MIGRATION_GUIDE.md)** - 1,277 lines  
*Complete reference for migrating incidents to pipelines*

**What's inside:**
- ✅ Overview and prerequisites
- ✅ 5 migration patterns (simple to complex)
- ✅ Step-by-step implementation examples
- ✅ Testing strategy and automation
- ✅ Common pitfalls and fixes
- ✅ 27 action implementations as reference

**When to use:** First-time reading, understanding patterns, debugging issues

---

**[Quick Reference Card](./INCIDENT_QUICK_REFERENCE.md)** - 375 lines  
*Fast lookup for common patterns and snippets*

**What's inside:**
- ✅ Pattern decision tree
- ✅ 5 ready-to-use templates
- ✅ Common code snippets
- ✅ Error fixes cheatsheet
- ✅ Import and icon references

**When to use:** During implementation, quick lookups, copy-paste templates

---

**[Migration Roadmap](./INCIDENT_MIGRATION_ROADMAP.md)** - 624 lines  
*4-week structured implementation plan*

**What's inside:**
- ✅ Phase-by-phase breakdown
- ✅ Time estimates per incident
- ✅ Dependency tracking
- ✅ Progress checklist
- ✅ Risk assessment
- ✅ Weekly deliverables

**When to use:** Planning sprints, tracking progress, estimating effort

---

### Supporting Documentation

**System Architecture:**
- [Pipeline Coordinator](../systems/pipeline-coordinator.md) - 9-step pipeline architecture
- [Game Commands System](../systems/game-commands-system.md) - Game command reference
- [Outcome Display System](../systems/outcome-display-system.md) - UI component system
- [Events and Incidents System](../systems/events-and-incidents-system.md) - Current incident system

**Implementation Patterns:**
- [Custom UI Action Guide](./CUSTOM_UI_ACTION_GUIDE.md) - Custom component patterns
- [Inline Component Pattern](./INLINE_COMPONENT_PATTERN.md) - Timing of interactions
- [Validation Patterns](./VALIDATION_PATTERNS.md) - Hex/entity validation

**Data Reference:**
- [Incident Event Outcome Notes](../data/incident-event-outcome-notes.md) - Implementation notes for all 30 incidents

---

## 🚀 Getting Started

### Prerequisites

Before starting migration, ensure you understand:

1. **Pipeline Architecture** (30 min read)
   - Read: [Pipeline Coordinator](../systems/pipeline-coordinator.md)
   - Understand: 9-step execution flow
   - Key concept: Context object persists through all steps

2. **Game Commands** (20 min read)
   - Read: [Game Commands System](../systems/game-commands-system.md)
   - Understand: Dual-effect architecture (modifiers vs commands)
   - Key concept: Game commands execute at Step 8

3. **Outcome Display** (15 min read)
   - Read: [Outcome Display System](../systems/outcome-display-system.md)
   - Understand: Automatic component inference
   - Key concept: Dice modifiers auto-convert to badges

4. **Review Action Examples** (30 min)
   - Study: `src/pipelines/actions/claimHexes.ts` (simple)
   - Study: `src/pipelines/actions/arrestDissidents.ts` (custom component)
   - Study: `src/pipelines/actions/fortifyHex.ts` (map interaction)

**Total time:** ~2 hours of reading/review

---

### First Implementation

**Start with the simplest incident to validate the pattern:**

**Incident:** `crime-wave` (minor, modifier-only)

**Steps:**
1. Create directory: `src/pipelines/incidents/minor/`
2. Create file: `crimeWave.ts`
3. Copy Pattern 1 template from [Quick Reference](./INCIDENT_QUICK_REFERENCE.md#-template-pattern-1-simple)
4. Implement preview and execute functions
5. Register in `src/pipelines/incidents/index.ts`
6. Test all 4 outcomes

**Estimated time:** 15-20 minutes

**Validation:**
```javascript
// Test in browser console
const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
const handler = new UnifiedCheckHandler();
await handler.executeCheck('crime-wave', 'incident', { outcome: 'criticalFailure' });
```

**Success indicators:**
- ✅ No console errors
- ✅ OutcomeDisplay shows correct modifiers
- ✅ Unrest increases by expected amount
- ✅ All 4 outcomes work correctly

---

## 📊 Migration Overview

### Scope

**30 Total Incidents:**
- 8 Minor (simple, mostly modifiers)
- 10 Moderate (dice rolls, basic game commands)
- 12 Major (complex, multiple game commands)

**Estimated Effort:**
- Simple incidents: ~15 minutes each (2 hours total)
- Moderate incidents: ~30-45 minutes each (6-8 hours total)
- Complex incidents: ~1-3 hours each (12-20 hours total)
- Testing & polish: ~8-12 hours

**Total:** 28-42 hours over 4 weeks

### Patterns

**Pattern 1: Simple** (8 incidents, 15 min each)
- Only static modifiers
- No game commands
- Minimal preview logic

**Pattern 2: Dice** (2 incidents, 30 min each)
- Dice modifiers
- Manual effects (temporary)
- Badge display

**Pattern 3: Game Commands** (10 incidents, 30-45 min each)
- Existing game commands
- Basic automation
- No custom UI

**Pattern 4: Custom Component** (2 incidents, 1-2 hrs each)
- Player choices
- Custom Svelte components
- Resource selection

**Pattern 5: Complex** (8 incidents, 2-3 hrs each)
- Multiple game commands
- Complex business logic
- New command implementations

### Dependencies

**Game Commands Already Exist:**
- ✅ `damageStructure`
- ✅ `destroyStructure`
- ✅ `adjustFactionAttitude`
- ✅ `removeBorderHexes`

**Game Commands Needed:**
- ⚠️ `consumePlayerAction` (Week 2)
- ⚠️ `destroyWorksite` (Week 2)
- ⚠️ `downgradeSettlement` (Week 3)
- ⚠️ `performMoraleCheck` (Week 3)
- ⚠️ `releaseImprisonedUnrest` (Week 3)
- ⚠️ `modifyFactionAttitude` (Week 3)
- ⚠️ `transferHexesToFaction` (Week 3)
- ⚠️ `spawnFactionArmy` (Week 3)
- ⚠️ `transferSettlementToFaction` (Week 3)

---

## 📅 Implementation Plan

### Week 1: Foundation
**Goal:** Set up infrastructure + migrate 8 simple incidents

**Deliverables:**
- Directory structure created
- Helper functions in place
- 8 minor incidents migrated
- Basic tests passing

**Key incidents:** crime-wave, protests, rising-tensions, work-stoppage

---

### Week 2: Moderate Complexity
**Goal:** Add basic game commands + migrate 12 moderate incidents

**Deliverables:**
- `consumePlayerAction` implemented
- `destroyWorksite` implemented
- 12 moderate incidents migrated
- Game command tests passing

**Key incidents:** disease-outbreak, border-raid, assassination-attempt

---

### Week 3: Advanced Features
**Goal:** Complex game commands + migrate 10 complex incidents

**Deliverables:**
- 7 new game commands implemented
- Custom components created
- 10 major incidents migrated
- Integration tests passing

**Key incidents:** secession-crisis, guerrilla-movement, production-strike

---

### Week 4: Polish
**Goal:** Testing, bug fixes, documentation

**Deliverables:**
- Automated test suite (120 tests)
- All bugs fixed
- Documentation updated
- Production-ready

---

## 🎓 Learning Path

### Level 1: Beginner
**Goal:** Understand the system

**Read (2-3 hours):**
1. Pipeline Coordinator overview
2. Migration Guide sections 1-3
3. Quick Reference templates

**Practice:**
- Study action examples
- Trace execution flow in debugger
- Review OutcomeDisplay component

---

### Level 2: Implementer
**Goal:** Migrate simple incidents

**Read (1 hour):**
1. Pattern 1-2 implementation details
2. Testing strategy
3. Common pitfalls

**Practice:**
- Migrate crime-wave (Pattern 1)
- Migrate bandit-activity (Pattern 2)
- Write tests for both

---

### Level 3: Advanced
**Goal:** Handle complex incidents

**Read (2 hours):**
1. Custom UI Action Guide
2. Pattern 4-5 implementation
3. Game Commands System

**Practice:**
- Implement custom component
- Create new game command
- Migrate secession-crisis

---

## 🔍 Finding Information

### "How do I...?"

**...migrate a simple incident?**
→ [Quick Reference - Pattern 1](./INCIDENT_QUICK_REFERENCE.md#-template-pattern-1-simple)

**...create a custom component?**
→ [Custom UI Action Guide](./CUSTOM_UI_ACTION_GUIDE.md)

**...implement a game command?**
→ [Game Commands System - Implementation Pattern](../systems/game-commands-system.md#implementation-pattern)

**...handle dice modifiers?**
→ [Quick Reference - Pattern 2](./INCIDENT_QUICK_REFERENCE.md#-template-pattern-2-dice)

**...validate hex selection?**
→ [Validation Patterns Guide](./VALIDATION_PATTERNS.md)

**...debug a failed test?**
→ [Migration Guide - Debugging Checklist](./INCIDENT_MIGRATION_GUIDE.md#debugging-checklist)

**...estimate time for an incident?**
→ [Migration Roadmap - Phase Breakdown](./INCIDENT_MIGRATION_ROADMAP.md#phase-1-foundation--simple-incidents-week-1)

---

## 📋 Checklists

### Before Starting Migration

- [ ] Read Pipeline Coordinator docs
- [ ] Review 3-5 action examples
- [ ] Understand OutcomeDisplay system
- [ ] Set up testing environment
- [ ] Create directory structure
- [ ] Test first simple incident

### For Each Incident

- [ ] Read incident JSON
- [ ] Identify complexity pattern
- [ ] List game commands needed
- [ ] Check if commands exist
- [ ] Create pipeline file
- [ ] Implement preview
- [ ] Implement execute
- [ ] Register in index
- [ ] Test all 4 outcomes
- [ ] Update tracking

### After All Incidents

- [ ] Run automated test suite
- [ ] Manual integration testing
- [ ] Fix all bugs
- [ ] Update documentation
- [ ] Code review
- [ ] Deploy to production

---

## 🛠️ Tools & Resources

### Testing Tools

**Browser Console:**
```javascript
// Quick test
const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
const handler = new UnifiedCheckHandler();
await handler.executeCheck('incident-id', 'incident', { outcome: 'success' });
```

**Automated Testing:**
```bash
# Run test script
node buildscripts/test-incidents.js

# Test specific incident
node buildscripts/test-incidents.js crime-wave
```

### Development Workflow

1. **Create branch:** `git checkout -b incident-migration-phase-1`
2. **Implement incidents:** Follow pattern templates
3. **Test locally:** Use browser console
4. **Run automated tests:** Verify all outcomes
5. **Commit:** `git commit -m "feat: migrate crime-wave incident to pipeline"`
6. **Repeat:** Next incident

### Code Templates

**Find templates in:**
- [Quick Reference Card](./INCIDENT_QUICK_REFERENCE.md)
- `src/pipelines/actions/` (working examples)

**Copy-paste ready snippets for:**
- Simple preview functions
- Dice badge creation
- Game command execution
- Custom component events
- Test functions

---

## 📈 Progress Tracking

### Current Status

**Incidents Migrated:** 0/30 (0%)

**By Complexity:**
- Simple (Pattern 1-2): 0/10
- Moderate (Pattern 3): 0/10
- Complex (Pattern 4-5): 0/10

**Game Commands:**
- Existing: 4/13 (31%)
- Implemented: 0/9 (0%)

**Testing:**
- Outcomes tested: 0/120 (0%)
- Tests passing: 0/120 (0%)

### Update This Section Weekly

Track your progress here or in the [Migration Roadmap](./INCIDENT_MIGRATION_ROADMAP.md).

---

## 🆘 Getting Help

### Debugging

**Problem:** TypeError about specialEffects  
**Solution:** [Common Pitfalls #1](./INCIDENT_MIGRATION_GUIDE.md#-pitfall-1-forgetting-specialeffects-array)

**Problem:** Apply button won't enable  
**Solution:** [Common Pitfalls #4](./INCIDENT_MIGRATION_GUIDE.md#-pitfall-4-incorrect-custom-component-event)

**Problem:** Resources changing twice  
**Solution:** [Common Pitfalls #2](./INCIDENT_MIGRATION_GUIDE.md#-pitfall-2-applying-modifiers-twice)

**Full list:** [Migration Guide - Common Pitfalls](./INCIDENT_MIGRATION_GUIDE.md#common-pitfalls)

### Examples

**Need a working example?**
- Simple: `src/pipelines/actions/dealWithUnrest.ts`
- Dice: `src/pipelines/actions/infiltration.ts`
- Commands: `src/pipelines/actions/claimHexes.ts`
- Custom UI: `src/pipelines/actions/arrestDissidents.ts`
- Complex: `src/pipelines/actions/trainArmy.ts`

**Full list:** [Migration Guide - Reference Materials](./INCIDENT_MIGRATION_GUIDE.md#reference-materials)

---

## 🎯 Success Criteria

**Technical:**
- ✅ All 30 incidents use pipeline system
- ✅ No duplicate resolution logic
- ✅ Type-safe implementations
- ✅ 100% test coverage

**User Experience:**
- ✅ Consistent UI across all incidents
- ✅ Clear outcome feedback
- ✅ No confusing errors
- ✅ Smooth interactions

**Maintainability:**
- ✅ Well-documented code
- ✅ Easy to add new incidents
- ✅ Clear patterns
- ✅ No technical debt

---

## 📝 Summary

You now have everything you need to successfully migrate all 30 incidents:

**Documentation:**
1. ✅ Comprehensive migration guide with 5 patterns
2. ✅ Quick reference card with templates
3. ✅ Structured 4-week roadmap
4. ✅ 27 working action examples
5. ✅ Supporting system documentation

**Tools:**
- ✅ Testing scripts
- ✅ Code templates
- ✅ Debugging checklists
- ✅ Progress tracking

**Knowledge:**
- ✅ Clear patterns to follow
- ✅ Step-by-step instructions
- ✅ Common pitfalls documented
- ✅ Time estimates per incident

**Next Action:** Read the [Migration Guide](./INCIDENT_MIGRATION_GUIDE.md), then implement your first incident (crime-wave) using [Pattern 1 template](./INCIDENT_QUICK_REFERENCE.md#-template-pattern-1-simple).

---

**Good luck with the migration!** 🚀

**Questions?** Refer to the documentation or check existing action implementations for examples.

**Last Updated:** 2025-11-29

