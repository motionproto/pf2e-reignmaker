# Phase 5: Events & Incidents - Preparation Guide

**Status:** 📋 PLANNED (Not Started)
**Prerequisites:** ✅ Phase 4 Complete

---

## Overview

Phase 5 will convert the remaining 80+ checks from the old JSON/handler system to the unified pipeline architecture:
- **50+ Kingdom Events** (random/continuous events)
- **30+ Incidents** (unrest phase events)

---

## What Phase 5 Will Do

### 1. Event Conversion (~50 events)

**Current System:**
- Events defined in JSON files
- Handled by event-specific resolvers
- Mixed preview/execution logic
- Inconsistent UI patterns

**Target System:**
- Event pipeline configs in `src/pipelines/events/`
- Unified execution through UnifiedCheckHandler
- Consistent preview calculations
- Reusable interaction system (from Phase 4)

**Scope:**
- Convert all kingdom events to CheckPipeline format
- Create execution functions where needed
- Register with pipelineRegistry
- Test event flow end-to-end

### 2. Incident Conversion (~30 incidents)

**Current System:**
- Incidents triggered during Unrest phase
- Separate resolution flow
- Limited preview support

**Target System:**
- Incident pipeline configs in `src/pipelines/incidents/`
- Same unified architecture as actions/events
- Full preview and interaction support

**Scope:**
- Convert all incidents to CheckPipeline format
- Integrate with UnrestPhaseController
- Ensure proper sequencing with continuous events

### 3. Registry Extension

Update `PipelineRegistry` to support all check types:

```typescript
const EVENT_PIPELINES: CheckPipeline[] = [
  // 50+ event pipelines
];

const INCIDENT_PIPELINES: CheckPipeline[] = [
  // 30+ incident pipelines
];
```

---

## Estimated Effort

### Time Estimate
- **Week 1-2:** Event conversion (25 events)
- **Week 3-4:** Event conversion (25 events)
- **Week 5:** Incident conversion (30 incidents)
- **Week 6:** Integration testing & bug fixes

**Total:** ~6 weeks for complete conversion

### Complexity Levels

**Simple Events (~30):**
- Basic resource modifiers
- No special interactions
- Standard outcomes
- **Effort:** ~20 minutes each

**Medium Events (~15):**
- Entity selection interactions
- Conditional outcomes
- Custom preview logic
- **Effort:** ~1 hour each

**Complex Events (~5):**
- Multi-step interactions
- Custom execution logic
- Special UI requirements
- **Effort:** 2-4 hours each

**Incidents (~30):**
- Similar to simple/medium events
- Integration with unrest system
- **Effort:** ~30 minutes each

---

## Technical Approach

### Pattern from Phase 3 (Actions)

The successful pattern from action conversion:

1. **Read original JSON** - Understand current behavior
2. **Create pipeline config** - Convert to CheckPipeline format
3. **Extract execution logic** - If needed, create execution function
4. **Test conversion** - Verify behavior matches original
5. **Document differences** - Note any changes

### Event-Specific Considerations

**Events vs Actions:**
- Events can be **ongoing** (multiple turns)
- Events can have **continuous effects** (per-turn modifiers)
- Events may **auto-resolve** without player input
- Events have **trait system** (dangerous, beneficial)

**Pipeline Extensions Needed:**
```typescript
interface CheckPipeline {
  // ... existing fields

  // Event-specific (Phase 5)
  traits?: Trait[];  // 'ongoing' | 'dangerous' | 'beneficial'
  endsCheck?: boolean;  // Default: true
  continuousEffects?: ContinuousEffect[];  // Per-turn modifiers
}
```

---

## Dependencies

### From Phase 4 (Complete ✅)
- ✅ UnifiedCheckHandler with interaction system
- ✅ PipelineRegistry infrastructure
- ✅ Pre/post-roll interactions
- ✅ Entity selection dialogs
- ✅ Map selection integration

### New Requirements (Phase 5)
- [ ] EventPhaseController integration
- [ ] UnrestPhaseController integration
- [ ] Ongoing event lifecycle management
- [ ] Continuous effect application
- [ ] Event trait handling

---

## Migration Strategy

### Option A: Big Bang (Not Recommended)
- Convert all events at once
- High risk, difficult to test
- Hard to rollback

### Option B: Incremental (Recommended)
- Convert events by category/type
- Test each batch before moving on
- Can rollback individual events
- Lower risk

**Recommended Batches:**
1. **Batch 1:** Simple resource events (no interactions)
2. **Batch 2:** Entity selection events
3. **Batch 3:** Map interaction events
4. **Batch 4:** Complex/special events
5. **Batch 5:** All incidents

---

## Success Criteria

### Code Metrics
- [ ] 50+ event pipeline configs created
- [ ] 30+ incident pipeline configs created
- [ ] 10-15 new execution functions (estimate)
- [ ] 0 TypeScript compilation errors
- [ ] All events/incidents registered

### Functional Metrics
- [ ] All events trigger correctly
- [ ] Ongoing events track state properly
- [ ] Continuous effects apply each turn
- [ ] Event preview shows accurate changes
- [ ] Incident resolution works in Unrest phase

### Quality Metrics
- [ ] Consistent UX across all checks
- [ ] No regression in existing behavior
- [ ] Preview accuracy: 100%
- [ ] All interactions work properly

---

## Risks & Mitigation

### Risk 1: Ongoing Event Complexity
**Risk:** Ongoing events have complex lifecycle management
**Mitigation:**
- Study existing ongoing event system first
- Create helper utilities for common patterns
- Test thoroughly with real multi-turn scenarios

### Risk 2: Continuous Effects
**Risk:** Per-turn modifiers need special handling
**Mitigation:**
- Extend CheckContext to support continuous effects
- Create dedicated application logic
- Document edge cases clearly

### Risk 3: Backward Compatibility
**Risk:** Breaking changes to event system
**Mitigation:**
- Use same dual-path architecture as actions
- Feature flags for gradual rollout
- Keep legacy system until all events converted

---

## Files to Create (Estimated)

```
src/pipelines/events/
├── simple-events/           (30 files)
│   ├── famine.ts
│   ├── festival.ts
│   └── ...
├── interaction-events/      (15 files)
│   ├── monster-attack.ts
│   ├── diplomatic-missive.ts
│   └── ...
└── complex-events/          (5 files)
    ├── plague.ts
    ├── rebellion.ts
    └── ...

src/pipelines/incidents/     (30 files)
├── minor-incidents/         (15 files)
├── moderate-incidents/      (10 files)
└── major-incidents/         (5 files)

src/execution/events/        (10-15 files)
├── applyPlague.ts
├── triggerRebellion.ts
└── ...
```

**Total New Files:** ~90-95 files
**Total New Lines:** ~3,500-4,000 lines

---

## Phase 5 Deliverables

### Documentation
- [ ] PHASE_5_PROGRESS.md (tracking document)
- [ ] EVENT_MIGRATION_GUIDE.md (conversion procedures)
- [ ] INCIDENT_MIGRATION_GUIDE.md (incident specifics)
- [ ] PHASE_5_COMPLETE.md (summary on completion)

### Code
- [ ] 50+ event pipeline configs
- [ ] 30+ incident pipeline configs
- [ ] 10-15 execution functions
- [ ] EventPhaseController integration
- [ ] UnrestPhaseController integration
- [ ] Registry updates

### Testing
- [ ] Event conversion testing
- [ ] Ongoing event lifecycle testing
- [ ] Continuous effect testing
- [ ] Incident trigger testing
- [ ] Integration testing with actions

---

## Ready to Start Phase 5?

### Prerequisites Checklist
- [x] Phase 4 complete
- [x] Interaction system working
- [x] All 26 actions converted
- [x] Integration tested
- [ ] User approval to proceed
- [ ] EventPhaseController code reviewed
- [ ] UnrestPhaseController code reviewed

### Next Steps (When Ready)
1. Review existing event JSON files
2. Analyze EventPhaseController
3. Analyze UnrestPhaseController
4. Create EVENT_MIGRATION_GUIDE.md
5. Start with Batch 1 (simple events)

---

## Notes

**Phase 5 is OPTIONAL** for the core action system to work. All 26 player actions are functional with the unified pipeline system. Events and incidents can continue using the legacy system until ready to migrate.

**Recommendation:** Test Phase 4 thoroughly with real gameplay before starting Phase 5. Identify any issues or improvements needed in the pipeline architecture before scaling to 80+ more checks.

**Status:** 📋 Documented and ready for future execution
