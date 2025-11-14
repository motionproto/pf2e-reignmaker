# Unified Check Resolution System: Migration Guide

**Purpose:** Step-by-step implementation plan for unifying Actions, Events, and Incidents

**Last Updated:** 2025-11-14

---

## Overview

This guide details the migration from three separate check systems (Actions, Events, Incidents) to a single unified pipeline. The migration is structured in 6 phases over 12 weeks.

**Architecture Reference:** `docs/UNIFIED_CHECK_ARCHITECTURE.md`

---

## Migration Timeline

```
Weeks 1-2:  Phase 1 - Foundation (UnifiedCheckHandler core)
Weeks 3-4:  Phase 2 - Game Commands (prepare/commit pattern)
Weeks 5-8:  Phase 3 - Actions (26 actions to pipeline configs)
Weeks 9-10: Phase 4 - Events (37 events to pipeline configs)
Week 11:    Phase 5 - Incidents (30 incidents to pipeline configs)
Week 12:    Phase 6 - Cleanup (remove old code, update docs)

Total: 12 weeks
```

---

## Why This Order?

### Game Commands Must Come First

**Dependency Chain:**
```
Actions/Events/Incidents
    ↓ (depend on)
Game Commands
    ↓ (depend on)
UnifiedCheckHandler
```

**Critical Reasons:**

1. **Preview Support:** All 93 checks need preview, which requires game commands using prepare/commit pattern
2. **Actions Dependency:** 15/26 actions use game commands—can't migrate actions until commands support preview
3. **Events/Incidents:** Special resources (damage_structure, etc.) become game commands
4. **Foundation:** Game commands are the integration layer between checks and state changes

**Wrong Order (Actions First):**
```
Week 1-4: Actions ❌
  Problem: Can't show full preview without prepare/commit commands
  Result: Actions show partial preview, need rework later
```

**Correct Order (Game Commands First):**
```
Week 3-4: Game Commands ✅
  Result: Preview infrastructure ready
Week 5-8: Actions ✅
  Result: Full preview support from day 1
```

---

## Phase 0: Prerequisites

### Before Starting Any Migration

**Required:**
- [x] Architecture document reviewed and approved
- [x] Team buy-in on 12-week timeline
- [x] Staging/testing environment ready
- [x] Backup plan established

**Recommended:**
- [ ] Create feature branch: `feature/unified-check-system`
- [ ] Set up automated testing for check resolution
- [ ] Document current behavior for regression testing
- [ ] Communicate plan to users/stakeholders

**Safety Nets:**
- All changes behind feature flag (optional toggle)
- Old code remains until Phase 6 (parallel systems)
- Rollback possible at any phase boundary

---

## Phase 1: Foundation (Weeks 1-2)

### Goal: Build UnifiedCheckHandler core without breaking existing systems

### Week 1: Core Handler Structure

**Create:**
- `src/services/UnifiedCheckHandler.ts` - Main handler class
- `src/types/CheckPipeline.ts` - Type definitions
- `src/types/CheckContext.ts` - Shared context structure
- `src/types/PreviewData.ts` - Preview data structures

**Implement:**
```typescript
// UnifiedCheckHandler.ts
export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  
  registerCheck(id: string, pipeline: CheckPipeline): void {
    this.pipelines.set(id, pipeline);
  }
  
  getCheck(id: string): CheckPipeline | undefined {
    return this.pipelines.get(id);
  }
  
  async executeSkillCheck(
    checkId: string, 
    skill: string, 
    metadata?: Metadata
  ): Promise<CheckInstance> {
    // Delegate to existing ActionExecutionHelpers
    // This phase: pass-through only
  }
}
```

**Testing:**
- [ ] Handler instantiates correctly
- [ ] Registration works
- [ ] Retrieval works
- [ ] No impact on existing systems

### Week 2: Preview Infrastructure

**Implement:**
```typescript
// UnifiedCheckHandler.ts (continued)
async calculatePreview(
  instanceId: string,
  resolutionData: ResolutionData
): Promise<PreviewData> {
  const instance = await getCheckInstance(instanceId);
  const pipeline = this.getCheck(instance.checkId);
  
  if (pipeline.preview.providedByInteraction) {
    // Mode B: Map interaction provides preview
    return { specialEffects: [], resources: [] };
  }
  
  // Mode A: Calculate preview
  const context = buildContext(instance, resolutionData);
  return pipeline.preview.calculate(context);
}

formatPreview(preview: PreviewData): SpecialEffect[] {
  return [
    ...formatResourceBadges(preview.resources),
    ...formatEntityBadges(preview.entities),
    ...preview.specialEffects
  ];
}
```

**Testing:**
- [ ] Preview calculation works
- [ ] Preview formatting works
- [ ] No impact on existing systems

**Deliverables:**
- UnifiedCheckHandler service (functional skeleton)
- Type definitions for pipeline configs
- Preview infrastructure ready
- Zero breaking changes

---

## Phase 2: Game Commands (Weeks 3-4)

### Goal: Extract execution logic from game commands, move preview/pre-roll logic to pipeline

**Why Critical:** Actions need clean execution functions; preview must move to pipeline level.

### Current State: Mixed Concerns

**Problem:** Commands mix different concerns:
- **Prepare/commit pattern (~5 commands):** `prepare()` mixes pre-roll data gathering + preview calculation; `commit()` has execution
- **Immediate-execute (~20 commands):** Execute directly with no preview support
- **Global variables:** Use `globalThis.__pending*` for state
- **Inconsistent patterns:** Each command structured differently

**This mess needs cleaning up.**

### Week 3: Extract Core Execution Logic

**For prepare/commit commands:**

**Example - recruitArmy:**

**Current (prepare/commit):**
```typescript
// GameCommandsResolver.ts
async recruitArmy(level): Promise<PreparedCommand> {
  // PREPARE: Mixed concerns (pre-roll + preview)
  const cost = calculateRecruitmentCost(level);
  const actor = getCurrentUserActor();
  
  return {
    specialEffect: { message: `Will recruit Level ${level} army...` },
    commit: async () => {
      // COMMIT: Actual execution logic
      await updateKingdom(k => {
        k.armies.push({ level, stationed: settlementId });
        k.gold -= cost;
      });
    }
  };
}
```

**Extract to simple execution function:**
```typescript
// execution/recruitArmy.ts
async function recruitArmyExecution(
  kingdom: KingdomData,
  armyData: { name: string; level: number; stationedAt: string }
): Promise<void> {
  // Pure execution - no preview, no pre-roll
  await updateKingdom(k => {
    k.armies.push({
      id: generateId(),
      name: armyData.name,
      level: armyData.level,
      stationed: armyData.stationedAt
    });
    k.gold -= calculateRecruitmentCost(armyData.level);
  });
}
```

### Week 4: Refactor All Commands

**Commands to refactor (25+):**

**Territory:** claimHexes, buildRoads, fortifyHex, removeBorderHexes
**Settlement:** foundSettlement, buildStructure, repairStructure, upgradeSettlement, damageStructure, destroyStructure
**Diplomatic:** establishDiplomaticRelations, adjustFactionAttitude, requestEconomicAid, requestMilitaryAid
**Unrest:** arrestDissidents, reduceImprisoned, executeOrPardonPrisoners
**Army:** deployArmy, recoverArmy, outfitArmy

**Pattern:**
```typescript
// Simple execution function (no prepare/commit)
async function claimHexesExecution(
  kingdom: KingdomData,
  hexIds: string[]
): Promise<void> {
  await updateKingdom(k => {
    hexIds.forEach(hexId => {
      const hex = k.hexes.find(h => h.id === hexId);
      if (hex) hex.claimedBy = 1;
    });
  });
}
```

**Preview moves to pipeline:**
```typescript
// In action pipeline config
{
  preRollInteractions: [{
    type: 'map-selection',
    mode: 'hex-selection',
    count: 3,
    validation: (hex) => isAdjacentToClaimed(hex)
  }],
  preview: {
    calculate: (ctx) => ({
      specialEffects: [{
        type: 'status',
        message: `Will claim ${ctx.metadata.selectedHexes.length} hexes`,
        variant: 'positive'
      }]
    }),
    providedByInteraction: true  // Map shows preview visually
  },
  execute: async (ctx) => {
    await claimHexesExecution(ctx.kingdom, ctx.metadata.selectedHexes);
  }
}
```

### Eliminate Global Variables

**Current problem:**
```typescript
// In action handler
(globalThis as any).__pendingStipendSettlement = settlementId;

// In game command
const settlementId = (globalThis as any).__pendingStipendSettlement;
```

**New approach - use CheckContext:**
```typescript
// In pre-roll interaction
ctx.metadata.settlementId = settlementId;

// In execution function
async function giveActorGoldExecution(
  kingdom: KingdomData,
  actorId: string,
  gold: number
): Promise<void> {
  await updateKingdom(k => k.gold -= gold);
  const actor = game.actors.get(actorId);
  await actor.update({ "system.currency.gp": actor.system.currency.gp + gold });
}

// In pipeline
execute: async (ctx) => {
  const gold = calculateStipend(findSettlement(ctx.kingdom, ctx.metadata.settlementId));
  await giveActorGoldExecution(ctx.kingdom, ctx.metadata.actorId, gold);
}
```

### Special Resources → Regular Game Commands

**Events/incidents currently use "special resources":**
- `damage_structure`
- `destroy_structure`
- `imprisoned_unrest`

**These become simple execution functions:**

```typescript
// execution/damageStructure.ts
async function damageStructureExecution(
  kingdom: KingdomData,
  structureId: string
): Promise<void> {
  await updateKingdom(k => {
    const structure = findStructure(k, structureId);
    if (structure) structure.damaged = true;
  });
}

// In event pipeline config
{
  preview: {
    calculate: (ctx) => {
      const structure = selectStructureTarget('category-filtered', ctx.kingdom);
      return {
        entities: [{
          type: 'structure',
          action: 'modify',
          name: structure.name,
          details: 'Will be damaged'
        }]
      };
    }
  },
  execute: async (ctx) => {
    const structure = selectStructureTarget('category-filtered', ctx.kingdom);
    await damageStructureExecution(ctx.kingdom, structure.id);
  }
}
```

### Testing Checklist

**For each refactored command:**
- [ ] Execution function takes structured data (no context mixing)
- [ ] No global variables used
- [ ] Preview logic moved to pipeline
- [ ] Pre-roll interactions moved to pipeline
- [ ] State changes identical to old version
- [ ] Testable in isolation

**Integration:**
- [ ] All 25+ commands are simple execution functions
- [ ] No prepare/commit pattern remains
- [ ] Preview logic in action pipeline configs
- [ ] Special resources eliminated
- [ ] Global variables eliminated

**Deliverables:**
- ~25 simple execution functions (no prepare/commit)
- Preview logic moved to pipeline level
- No global variables
- Clean separation of concerns
- Zero functional regressions

---

## Phase 3: Actions (Weeks 5-8)

### Goal: Convert 26 actions to pipeline configs

**Prerequisites:**
- Phase 1 complete (UnifiedCheckHandler exists)
- Phase 2 complete (game commands support preview)

### Week 5: Simple Actions (No Custom Logic)

**Convert (9 actions):**
- deal-with-unrest
- sell-surplus
- purchase-resources
- harvest-resources (has choice-buttons)
- build-roads (has hex selection)
- claim-hexes (has hex selection)
- fortify-hex (has hex selection)
- create-worksite (has hex selection)
- send-scouts (has dice)

**Pattern:**
```typescript
// Action pipeline config
{
  id: 'deal-with-unrest',
  checkType: 'action',
  skills: [{ skill: 'diplomacy', description: 'diplomatic engagement' }],
  outcomes: {
    success: {
      description: 'The People Listen',
      modifiers: [{ type: 'static', resource: 'unrest', value: -2 }]
    }
  },
  preview: {
    calculate: (ctx) => ({
      resources: [{ resource: 'unrest', value: -2 }]
    }),
    format: (prev) => [{
      type: 'resource',
      message: 'Will reduce unrest by 2',
      variant: 'positive'
    }]
  }
}
```

**Testing:**
- [ ] Action card displays correctly
- [ ] Skill button triggers roll
- [ ] Preview shows before apply
- [ ] Apply executes correctly
- [ ] State changes match old version

### Week 6: Pre-Roll Dialog Actions

**Convert (7 actions):**
- collect-stipend (settlement selection)
- execute-or-pardon-prisoners (settlement selection)
- establish-diplomatic-relations (faction selection)
- request-economic-aid (faction selection)
- request-military-aid (faction selection)
- train-army (army selection)
- disband-army (army selection)

**Pattern:**
```typescript
{
  id: 'collect-stipend',
  checkType: 'action',
  preRollInteractions: [{
    type: 'entity-selection',
    entityType: 'settlement',
    filter: (s) => s.level >= 1
  }],
  gameCommands: [{
    type: 'giveActorGold',
    multiplier: 1
  }],
  preview: {
    calculate: async (ctx) => {
      const settlement = findSettlement(ctx.metadata.settlementId);
      const gold = calculateStipend(settlement);
      const cmd = await GAME_COMMANDS.giveActorGold.prepare(ctx);
      return {
        resources: [{ resource: 'gold', value: -gold }],
        specialEffects: [cmd.specialEffect]
      };
    }
  }
}
```

### Week 7: Game Command Actions

**Convert (5 actions):**
- recruit-unit (has post-roll compound + game command)
- deploy-army (has pre-roll entity + map + game command)
- build-structure (has pre-roll entity + game command)
- repair-structure (has pre-roll entity + post-roll choice + game command)
- upgrade-settlement (has pre-roll entity + game command)

**Pattern:**
```typescript
{
  id: 'recruit-unit',
  checkType: 'action',
  postRollInteractions: [{
    type: 'compound',
    components: [
      { type: 'text-input', label: 'Army Name' },
      { type: 'entity-selection', label: 'Station At', entityType: 'settlement' }
    ]
  }],
  gameCommands: [{
    type: 'recruitArmy',
    level: 'kingdom-level'
  }],
  preview: {
    calculate: async (ctx) => {
      const cmd = await GAME_COMMANDS.recruitArmy.prepare(ctx);
      return {
        resources: [{ resource: 'gold', value: -50 }],
        specialEffects: [cmd.specialEffect]
      };
    }
  }
}
```

### Week 8: Custom Resolution Actions

**Convert (5 actions):**
- arrest-dissidents (custom component)
- outfit-army (custom component)
- infiltration (custom logic)
- establish-settlement (complex compound)
- recover-army (healing calculation)

**These may need custom preview functions but still use pipeline config.**

### Testing After Each Week

- [ ] All converted actions work identically to before
- [ ] Preview shows for all actions
- [ ] No regressions in existing actions
- [ ] Controllers delegate to UnifiedCheckHandler

**Deliverables:**
- 26 actions use pipeline configs
- ActionPhaseController simplified (~50 lines)
- Custom action files removed
- Preview support for all actions

---

## Phase 4: Events (Weeks 9-10)

### Goal: Convert 37 events to pipeline configs

**Prerequisites:**
- Phase 2 complete (game commands ready for special resources)

### Week 9: Simple Events (No Dice/Choice)

**Convert (~15 events):**
- good-weather
- economic-surge
- immigration
- etc.

**Pattern:**
```typescript
{
  id: 'good-weather',
  checkType: 'event',
  traits: [],
  skills: [{ skill: 'agriculture', description: 'maximize farming benefits' }],
  outcomes: {
    criticalSuccess: {
      description: 'Exceptional harvest',
      modifiers: [{ type: 'static', resource: 'food', value: 4 }],
      endsCheck: true
    }
  },
  preview: {
    calculate: (ctx) => ({
      resources: [{ resource: 'food', value: 4 }]
    }),
    format: (prev) => [{
      type: 'resource',
      message: `Will gain ${prev.resources[0].value} food`,
      variant: 'positive'
    }]
  }
}
```

### Week 10: Complex Events (Dice/Choice/Game Commands)

**Convert (~22 events):**
- archaeological-find (has choice-dropdown)
- plague (ongoing trait)
- monster-attack (has damageStructure game command)
- etc.

**With game commands:**
```typescript
{
  id: 'monster-attack',
  checkType: 'event',
  gameCommands: [{
    type: 'damageStructure',
    targetStrategy: 'random'
  }],
  preview: {
    calculate: async (ctx) => {
      const cmd = await GAME_COMMANDS.damageStructure.prepare(ctx);
      return {
        specialEffects: [cmd.specialEffect]
      };
    }
  }
}
```

**Testing:**
- [ ] Events trigger correctly
- [ ] Preview shows for all events
- [ ] Ongoing events persist correctly
- [ ] Game commands execute from events

**Deliverables:**
- 37 events use pipeline configs
- EventPhaseController simplified (~50 lines)
- Special resources migrated to game commands
- Preview support for all events

---

## Phase 5: Incidents (Week 11)

### Goal: Convert 30 incidents to pipeline configs

**Prerequisites:** Same as Phase 4 (events)

### Pattern (Same as Events)

**Incidents identical to events structurally, just:**
- Different trigger (unrest % vs random)
- Different tier (minor/moderate/major vs 1-20)

**Example:**
```typescript
{
  id: 'bandit-activity',
  checkType: 'incident',
  severity: 'minor',
  traits: ['dangerous'],
  skills: [
    { skill: 'intimidation', description: 'show force' },
    { skill: 'stealth', description: 'infiltrate bandits' }
  ],
  outcomes: {
    failure: {
      description: 'Bandits raid',
      modifiers: [{ type: 'dice', resource: 'gold', formula: '1d4', negative: true }],
      endsCheck: true
    }
  },
  postRollInteractions: [{ type: 'dice', resource: 'gold', formula: '1d4' }],
  preview: {
    calculate: (ctx) => ({
      resources: [{ resource: 'gold', value: -(ctx.resolutionData.diceRolls.gold || 0) }]
    }),
    format: (prev) => [{
      type: 'resource',
      message: `Will lose ${-prev.resources[0].value} gold`,
      variant: 'negative'
    }]
  }
}
```

**Testing:**
- [ ] Incidents trigger on unrest
- [ ] Preview shows for all incidents
- [ ] Ongoing incidents persist
- [ ] Severity levels work correctly

**Deliverables:**
- 30 incidents use pipeline configs
- UnrestPhaseController simplified (~50 lines)
- Preview support for all incidents

---

## Phase 6: Cleanup (Week 12)

### Goal: Remove old code, archive docs, finalize

### Remove Old Code

**Files to delete:**
- `src/actions/*/Action.ts` (12 files, ~1000 lines)
- `src/controllers/actions/implementations/index.ts` (~100 lines)
- `src/services/GameCommandsResolver.ts` (~800 lines, replaced by Registry)
- Custom action dialog files (~800 lines total)

**Files to simplify:**
- ActionPhaseController (~200 → ~50 lines)
- EventPhaseController (~150 → ~50 lines)
- UnrestPhaseController (~180 → ~50 lines)

### Update Documentation

**Archive (move to docs/archived/):**
- `docs/refactoring/unified-action-handler-architecture.md` (interim doc)
- `docs/refactoring/unified-check-resolution-system.md` (interim doc)
- Old action implementation guides

**Update:**
- `docs/AI_ACTION_GUIDE.md` - Reference new pipeline system
- `docs/ARCHITECTURE.md` - Update with unified system
- `docs/systems/game-commands-system.md` - Document prepare/commit pattern

**Create:**
- `docs/guides/CREATING_CHECKS.md` - How to add new actions/events/incidents

### Final Testing

**Regression Suite:**
- [ ] All 26 actions work identically
- [ ] All 37 events work identically
- [ ] All 30 incidents work identically
- [ ] Preview shows for all 93 checks
- [ ] No performance regressions
- [ ] All game commands work correctly

**User Acceptance:**
- [ ] Beta test with users
- [ ] Collect feedback
- [ ] Address any issues
- [ ] Document known limitations

**Deliverables:**
- Old code removed
- Documentation updated
- Clean codebase
- Production-ready system

---

## Rollback Plan

**At any phase boundary:**

1. **Feature Flag:** Toggle old system back on
2. **Git:** Revert to pre-phase commit
3. **Communication:** Notify users of rollback
4. **Analysis:** Identify blocking issues
5. **Fix:** Address issues in separate branch
6. **Retry:** Restart phase when ready

**Critical Rollback Points:**
- End of Phase 2 (game commands)
- End of Phase 3 (actions)
- End of Phase 4 (events)
- End of Phase 5 (incidents)

---

## Success Criteria

### Phase Completion

Each phase complete when:
- [ ] All conversions done
- [ ] All tests pass
- [ ] No regressions
- [ ] Documentation updated
- [ ] Team review approved

### Overall Success

Migration successful when:
- [ ] 93/93 checks use pipeline configs
- [ ] 93/93 checks show preview
- [ ] ~2500 lines of code removed
- [ ] Controllers simplified to ~50 lines each
- [ ] Zero functional regressions
- [ ] User feedback positive

---

## Summary

**12-Week Timeline:**
- Weeks 1-2: Foundation
- **Weeks 3-4: Game Commands (CRITICAL)**
- Weeks 5-8: Actions
- Weeks 9-10: Events
- Week 11: Incidents
- Week 12: Cleanup

**Key Insight:** Game commands must be migrated BEFORE actions/events/incidents because they are the foundation for preview support across all check types.

**Result:** Single, unified system serving all 93 kingdom challenges with consistent UX and minimal code.
