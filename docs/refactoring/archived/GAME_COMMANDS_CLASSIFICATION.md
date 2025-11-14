# Game Commands Classification Table

**Purpose:** Detailed classification of all game commands for Phase 2 migration

**Created:** 2025-11-14

---

## Overview

**Total Commands:** 14 in GameCommandsResolver + ~10 more scattered in actions
**Using prepare/commit:** 6 commands (43%)
**Immediate-execute:** 8 commands (57%)
**Global Variables:** 11+ usages across actions

---

## Commands in GameCommandsResolver.ts

| # | Command | Pattern | Lines | Global Vars? | Preview Logic? | Used By Actions | Migration Complexity |
|---|---------|---------|-------|--------------|----------------|-----------------|----------------------|
| 1 | recruitArmy | prepare/commit | 65-121 | No | Yes (in prepare) | recruit-unit | **Medium** - Extract commit closure |
| 2 | disbandArmy | prepare/commit | ~40 | No | Yes (in prepare) | disband-army | **Low** - Simple extraction |
| 3 | foundSettlement | prepare/commit | ~80 | No | Yes (in prepare) | establish-settlement | **Medium** - Has crit success bonus |
| 4 | giveActorGold | prepare/commit | ~70 | Yes (`__pendingStipendSettlement`) | Yes (in prepare) | collect-stipend | **High** - Global var + async actor |
| 5 | reduceImprisoned | immediate | ~30 | Yes (`__pendingExecuteOrPardon`) | No | execute-or-pardon-prisoners | **Medium** - Settlement-specific unrest |
| 6 | trainArmy | prepare/commit | ~60 | No | Yes (in prepare) | train-army | **Low** - Simple extraction |
| 7 | outfitArmy | mixed | ~200 | No | Partial | outfit-army | **Very High** - Has interactive dialogs |
| 8 | deployArmy | immediate | ~150 | No | No | deploy-army | **High** - Token animation + conditions |
| 9 | releaseImprisoned | immediate | ~25 | No | No | (events) | **Low** - Simple percentage calc |
| 10 | destroyStructure | immediate | ~50 | No | No | (events) | **Medium** - Structure selection logic |
| 11 | damageStructure | immediate | ~40 | No | No | (events) | **Medium** - Structure selection logic |
| 12 | removeBorderHexes | immediate | ~35 | No | No | (events) | **Medium** - Border calculation |
| 13 | adjustFactionAttitude | prepare/commit | ~45 | No | Yes (in prepare) | diplomatic actions | **Low** - Simple extraction |
| 14 | chooseAndGainResource | immediate | ~30 | No | No | harvest-resources | **Low** - User selection dialog |

---

## Detailed Command Analysis

### Command 1: recruitArmy

**Current Implementation:**
```typescript
// Location: src/services/commands/armies/armyCommands.ts (via import)
async recruitArmy(level: number, name?: string, exemptFromUpkeep?: boolean): Promise<PreparedCommand> {
  // PREPARE: Calculate cost, get actor, build preview
  const cost = calculateRecruitmentCost(level);
  const actor = getCurrentUserActor();
  
  return {
    specialEffect: {
      type: 'entity',
      message: `Will recruit Level ${level} army, costs ${cost} gold`,
      icon: 'fa-shield',
      variant: 'positive'
    },
    commit: async () => {
      // COMMIT: Actual execution
      await updateKingdom(k => {
        k.armies.push({ id: generateId(), name, level, stationed: settlementId });
        k.gold -= cost;
      });
    }
  };
}
```

**Migration Steps:**
1. Extract commit closure to execution function
2. Move cost calculation to pipeline preview
3. Remove prepare/commit structure

**Target Structure:**
```typescript
// src/execution/armies/recruitArmy.ts
export async function recruitArmyExecution(
  kingdom: KingdomData,
  armyData: { name: string; level: number; stationedAt: string; exemptFromUpkeep?: boolean }
): Promise<void> {
  await updateKingdom(k => {
    k.armies.push({
      id: generateId(),
      name: armyData.name,
      level: armyData.level,
      stationed: armyData.stationedAt,
      exemptFromUpkeep: armyData.exemptFromUpkeep || false
    });
    k.gold -= calculateRecruitmentCost(armyData.level);
  });
}

// In pipeline config
preview: {
  calculate: (ctx) => {
    const cost = calculateRecruitmentCost(ctx.kingdom.level);
    return {
      resources: [{ resource: 'gold', value: -cost }],
      entities: [{
        type: 'army',
        action: 'create',
        name: ctx.resolutionData.armyName,
        details: `Level ${ctx.kingdom.level}`
      }]
    };
  }
}
```

---

### Command 4: giveActorGold

**Current Implementation:**
```typescript
async giveActorGold(multiplier: number, settlementId: string): Promise<PreparedCommand> {
  // PREPARE: Uses global variable
  const settlementId = (globalThis as any).__pendingStipendSettlement; // ❌ Global var
  const settlement = findSettlement(settlementId);
  const gold = calculateStipend(settlement) * multiplier;
  
  return {
    specialEffect: { message: `Will transfer ${gold} gold to player`, ... },
    commit: async () => {
      await updateKingdom(k => k.gold -= gold);
      const actor = getCurrentUserActor();
      await actor.update({ "system.currency.gp": actor.system.currency.gp + gold });
    }
  };
}
```

**Issues:**
- ❌ Uses `globalThis.__pendingStipendSettlement`
- ❌ Async actor operations in commit
- ❌ Mixed kingdom + actor updates

**Migration Steps:**
1. **Eliminate global variable** - Use CheckContext.metadata.settlementId
2. **Extract actor gold transfer** to separate helper
3. **Move preview calculation** to pipeline

**Target Structure:**
```typescript
// src/execution/resources/giveActorGold.ts
export async function giveActorGoldExecution(
  kingdom: KingdomData,
  transfer: { actorId: string; gold: number }
): Promise<void> {
  // Update kingdom gold
  await updateKingdom(k => {
    k.gold -= transfer.gold;
  });
  
  // Transfer to actor
  const actor = game.actors.get(transfer.actorId);
  if (actor) {
    await actor.update({
      "system.currency.gp": actor.system.currency.gp + transfer.gold
    });
  }
}

// In pipeline config (collect-stipend)
preRollInteractions: [{
  type: 'entity-selection',
  entityType: 'settlement',
  storeAs: 'settlementId'  // ✅ Stored in CheckContext.metadata
}],
preview: {
  calculate: (ctx) => {
    const settlement = findSettlement(ctx.kingdom, ctx.metadata.settlementId);
    const gold = calculateStipend(settlement);
    return {
      resources: [{ resource: 'gold', value: -gold }],
      specialEffects: [{
        type: 'status',
        message: `Will transfer ${gold} gold to ${ctx.metadata.actorName}`,
        variant: 'positive'
      }]
    };
  }
},
execute: async (ctx) => {
  const settlement = findSettlement(ctx.kingdom, ctx.metadata.settlementId);
  const gold = calculateStipend(settlement);
  await giveActorGoldExecution(ctx.kingdom, {
    actorId: ctx.metadata.actorId,
    gold
  });
}
```

---

### Command 7: outfitArmy

**Current Implementation:**
```typescript
async outfitArmy(
  armyId: string | undefined,
  equipmentType: string | undefined,
  outcome: string,
  fallbackToGold?: boolean
): Promise<PreparedCommand | ResolveResult> {
  // COMPLEX: Has interactive dialogs for army selection AND equipment selection
  
  if (!armyId) {
    // ❌ Interactive dialog mid-command
    armyId = await showArmySelectionDialog();
  }
  
  if (!equipmentType) {
    // ❌ Interactive dialog mid-command
    equipmentType = await showEquipmentSelectionDialog();
  }
  
  // Apply equipment via PF2e effects
  await armyService.addItemToArmy(army.actorId, effectData);
  
  // Mark equipment as applied
  await updateKingdom(k => {
    const a = k.armies.find(army => army.id === armyId);
    if (a) {
      if (!a.equipment) a.equipment = {};
      a.equipment[equipmentType] = true;
    }
  });
}
```

**Issues:**
- ❌ Interactive dialogs embedded in command
- ❌ Mixed prepare/commit with dialogs
- ❌ Complex fallback logic (grant gold if no armies)

**Migration Strategy:**
This is the most complex command. Options:

**Option A: Keep hybrid pattern (recommended for Phase 2)**
```typescript
// Still has dialogs, but extract execution logic
export async function outfitArmyExecution(
  kingdom: KingdomData,
  outfit: { armyId: string; equipmentType: string; bonus: number }
): Promise<void> {
  const army = kingdom.armies.find(a => a.id === outfit.armyId);
  
  // Apply PF2e effect
  const effectData = createEquipmentEffect(outfit.equipmentType, outfit.bonus);
  await armyService.addItemToArmy(army.actorId, effectData);
  
  // Mark as equipped
  await updateKingdom(k => {
    const a = k.armies.find(a => a.id === outfit.armyId);
    if (a) {
      if (!a.equipment) a.equipment = {};
      a.equipment[outfit.equipmentType] = true;
    }
  });
}
```

**Option B: Full refactor (Phase 3+)**
- Move dialogs to post-roll interaction (allocation component)
- Pipeline handles selection UI
- Execution function just applies equipment

**Decision:** Use Option A for Phase 2 (extract execution), defer full refactor to Phase 3

---

### Command 8: deployArmy

**Current Implementation:**
```typescript
async deployArmy(
  armyId: string,
  path: string[],
  outcome: string,
  conditionsToApply: string[]
): Promise<ResolveResult> {
  // Immediate execution (no prepare/commit)
  
  // Calculate random hex on critical failure
  if (outcome === 'criticalFailure') {
    path = [...path.slice(0, -1), calculateRandomNearbyHex(destination, 2)];
  }
  
  // Animate token along path
  await animateTokenAlongPath(tokenDoc, path, 100);
  
  // Apply conditions to army actor
  for (const condition of conditionsToApply) {
    await applyConditionToActor(armyActor, condition);
  }
  
  // Mark as deployed this turn
  await updateKingdom(k => {
    k.turnState.actionsPhase.deployedArmyIds.push(armyId);
  });
}
```

**Issues:**
- ❌ Immediate execution (no preview)
- ⚠️ Token animation (async, visual effect)
- ⚠️ Condition application (PF2e integration)

**Migration Steps:**
1. **Preview:** Calculate path, conditions, final hex
2. **Execution:** Apply deployment (animation + conditions + state)

**Target Structure:**
```typescript
// src/execution/armies/deployArmy.ts
export async function deployArmyExecution(
  kingdom: KingdomData,
  deployment: {
    armyId: string;
    path: string[];
    conditionsToApply: string[];
    animationSpeed?: number;
  }
): Promise<void> {
  const army = kingdom.armies.find(a => a.id === deployment.armyId);
  
  // Animate token
  const { getArmyToken, animateTokenAlongPath } = await import('../services/army/tokenAnimation');
  const tokenDoc = await getArmyToken(deployment.armyId);
  if (tokenDoc) {
    await animateTokenAlongPath(tokenDoc, deployment.path, deployment.animationSpeed || 100);
  }
  
  // Apply conditions
  const armyActor = game.actors.get(army.actorId);
  if (armyActor) {
    for (const condition of deployment.conditionsToApply) {
      await applyConditionToActor(armyActor, condition);
    }
  }
  
  // Mark as deployed
  await updateKingdom(k => {
    if (!k.turnState.actionsPhase.deployedArmyIds) {
      k.turnState.actionsPhase.deployedArmyIds = [];
    }
    k.turnState.actionsPhase.deployedArmyIds.push(deployment.armyId);
  });
}

// In pipeline config (deploy-army)
preview: {
  calculate: (ctx) => {
    let finalPath = ctx.metadata.path;
    let message = `Will deploy ${ctx.metadata.armyName} to ${finalPath[finalPath.length - 1]}`;
    
    // Critical failure: Random hex near destination
    if (ctx.outcome === 'criticalFailure') {
      const destination = finalPath[finalPath.length - 1];
      const randomHex = calculateRandomNearbyHex(destination, 2);
      finalPath = [...finalPath.slice(0, -1), randomHex];
      message += ` (got lost, arriving at ${randomHex} instead)`;
    }
    
    return {
      specialEffects: [{
        type: 'status',
        message,
        icon: 'fa-route',
        variant: ctx.outcome === 'criticalFailure' ? 'negative' : 'positive'
      }]
    };
  },
  providedByInteraction: true  // Map path provides visual preview
},
execute: async (ctx) => {
  await deployArmyExecution(ctx.kingdom, {
    armyId: ctx.metadata.armyId,
    path: ctx.metadata.path,
    conditionsToApply: ctx.metadata.conditions || []
  });
}
```

---

## Global Variables Audit

### Pattern: `globalThis.__pending*`

| Variable | Used By | Purpose | Replacement |
|----------|---------|---------|-------------|
| `__pendingStipendSettlement` | collect-stipend | Store settlement selection | `ctx.metadata.settlementId` |
| `__pendingExecuteOrPardonSettlement` | execute-or-pardon-prisoners | Store settlement selection | `ctx.metadata.settlementId` |
| `__pendingBuildAction` | build-structure | Store structure + settlement | `ctx.metadata.{structureId, settlementId}` |
| `__pendingRepairAction` | repair-structure | Store structure selection | `ctx.metadata.structureId` |
| `__pendingUpgradeSettlement` | upgrade-settlement | Store settlement selection | `ctx.metadata.settlementId` |
| `__pendingDiplomaticFaction` | establish-diplomatic-relations | Store faction selection | `ctx.metadata.factionId` |
| `__pendingEconomicAidFaction` | request-economic-aid | Store faction selection | `ctx.metadata.factionId` |
| `__pendingMilitaryAidFaction` | request-military-aid | Store faction selection | `ctx.metadata.factionId` |
| `__pendingInfiltrationTarget` | infiltration | Store target selection | `ctx.metadata.targetId` |
| `__pendingOutfitArmy` | outfit-army | Store army selection | `ctx.metadata.armyId` |
| `__pendingDeployArmy` | deploy-army | Store army + path | `ctx.metadata.{armyId, path}` |

**Migration Rule:** All global variables → `CheckContext.metadata.*`

---

## Commands Not in GameCommandsResolver

### Found in Action Implementations

| Command | Location | Used By | Status |
|---------|----------|---------|--------|
| buildStructure | build-structure/BuildStructureAction.ts | build-structure | Custom implementation |
| repairStructure | repair-structure/RepairStructureAction.ts | repair-structure | Custom implementation |
| upgradeSettlement | upgrade-settlement/UpgradeSettlementAction.ts | upgrade-settlement | Custom implementation |
| claimHexes | ActionPhaseController.ts | claim-hexes | Inline in controller |
| buildRoads | ActionPhaseController.ts | build-roads | Inline in controller |
| fortifyHex | ActionPhaseController.ts | fortify-hex | Inline in controller |
| createWorksite | ActionPhaseController.ts | create-worksite | Inline in controller |
| arrestDissidents | arrest-dissidents/ArrestDissidentsAction.ts | arrest-dissidents | Custom implementation |
| establishRelations | establish-diplomatic-relations/...Action.ts | establish-diplomatic-relations | Custom implementation |
| infiltrate | infiltration/InfiltrationAction.ts | infiltration | Custom implementation |

**These need extraction to execution functions as well.**

---

## Migration Priority Order

### Phase 2 Week 3: Extract Prepare/Commit Commands (6 commands)

**Priority 1 (Simple):**
1. disbandArmy - Straightforward extraction
2. trainArmy - Straightforward extraction
3. adjustFactionAttitude - Straightforward extraction

**Priority 2 (Medium):**
4. recruitArmy - Has level calculations
5. foundSettlement - Has crit success bonus
6. giveActorGold - Has global var + actor async

### Phase 2 Week 4: Refactor Immediate-Execute Commands (8 commands)

**Priority 1 (Simple):**
1. releaseImprisoned - Simple percentage calculation
2. chooseAndGainResource - User selection dialog

**Priority 2 (Medium):**
3. reduceImprisoned - Settlement-specific unrest
4. damageStructure - Structure selection logic
5. destroyStructure - Structure selection logic
6. removeBorderHexes - Border calculation

**Priority 3 (Complex):**
7. deployArmy - Token animation + conditions
8. outfitArmy - Interactive dialogs (partial refactor only)

---

## Validation Checklist

For each command extraction:
- [ ] Execution function takes structured parameters (no context objects)
- [ ] No global variables used
- [ ] Preview logic moved to pipeline config
- [ ] Execution logic identical to original
- [ ] Testable in isolation
- [ ] All usages updated

---

## Next Steps

1. ✅ **Completed:** Code inventory
2. ✅ **Completed:** Game commands classification
3. **Next:** Action migration matrix
4. **Then:** Begin Phase 2 extraction (start with simple commands)
