# Action Migration Matrix

**Purpose:** Detailed migration guide for all 26 actions (Phase 3)

**Created:** 2025-11-14

---

## Overview

**Total Actions:** 26
**JSON-Only (simple):** 8 actions
**Pre-Roll Dialog:** 11 actions  
**Post-Roll Component:** 5 actions
**Game Commands:** 24 actions

---

## Migration Categories

### Category A: JSON-Only Actions (8 actions)
Simple conversions - read JSON, create pipeline config

### Category B: Pre-Roll Dialog Actions (11 actions)
Entity/map/configuration selection before roll

### Category C: Post-Roll Component Actions (5 actions)
Custom UI after roll (dice, choice, allocation, compound)

### Category D: Complex Hybrid Actions (2 actions)
Multiple interaction types + complex logic

---

## Complete Action Migration Matrix

| # | Action | Category | Pre-Roll | Post-Roll | Game Cmd | Complexity | Week |\n|---|--------|----------|----------|-----------|----------|------------|------|\n| 1 | deal-with-unrest | A | - | - | - | ⭐ Low | 5 |\n| 2 | sell-surplus | A | - | - | sellSurplus | ⭐ Low | 5 |\n| 3 | purchase-resources | A | - | - | purchaseResources | ⭐ Low | 5 |\n| 4 | send-scouts | A | - | Dice | scoutTerritory | ⭐ Low | 5 |\n| 5 | harvest-resources | A | - | Choice | chooseAndGainResource | ⭐⭐ Medium | 5 |\n| 6 | build-roads | A | Map | - | buildRoads | ⭐⭐ Medium | 5 |\n| 7 | claim-hexes | A | Map | - | claimHexes | ⭐⭐ Medium | 5 |\n| 8 | fortify-hex | A | Map | - | fortifyHex | ⭐⭐ Medium | 5 |\n| 9 | create-worksite | A | Map | - | createWorksite | ⭐⭐ Medium | 5 |\n| 10 | collect-stipend | B | Entity | - | giveActorGold | ⭐⭐ Medium | 6 |\n| 11 | execute-or-pardon-prisoners | B | Entity | Dice | reduceImprisoned | ⭐⭐ Medium | 6 |\n| 12 | establish-diplomatic-relations | B | Entity | - | establishRelations | ⭐⭐ Medium | 6 |\n| 13 | request-economic-aid | B | Entity | - | requestEconomicAid | ⭐⭐ Medium | 6 |\n| 14 | request-military-aid | B | Entity | - | requestMilitaryAid | ⭐⭐ Medium | 6 |\n| 15 | train-army | B | Entity | - | trainArmy | ⭐⭐ Medium | 6 |\n| 16 | disband-army | B | Entity | - | disbandArmy | ⭐⭐ Medium | 6 |\n| 17 | build-structure | B | Entity+Config | - | buildStructure | ⭐⭐⭐ High | 7 |\n| 18 | repair-structure | B | Entity | Choice | repairStructure | ⭐⭐⭐ High | 7 |\n| 19 | upgrade-settlement | B | Entity | - | upgradeSettlement | ⭐⭐⭐ High | 7 |\n| 20 | recruit-unit | C | - | Compound | recruitArmy | ⭐⭐⭐ High | 7 |\n| 21 | deploy-army | B+C | Entity+Map | - | deployArmy | ⭐⭐⭐⭐ Very High | 7 |\n| 22 | arrest-dissidents | C | - | Allocation | arrestDissidents | ⭐⭐⭐ High | 8 |\n| 23 | outfit-army | B+C | Entity | Allocation | outfitArmy | ⭐⭐⭐⭐ Very High | 8 |\n| 24 | infiltration | B | Entity | - | infiltrate | ⭐⭐⭐ High | 8 |\n| 25 | establish-settlement | D | - | Compound | foundSettlement | ⭐⭐⭐⭐ Very High | 8 |\n| 26 | recover-army | B | Entity | - | recoverArmy | ⭐⭐ Medium | 8 |\n\n---

## Week 5: Simple Actions (9 actions)

### Action 1: deal-with-unrest

**Current:** `data/player-actions/deal-with-unrest.json` (JSON-only)

**Migration:**
```typescript
// src/pipelines/actions/dealWithUnrest.ts
export const dealWithUnrestPipeline: CheckPipeline = {
  id: 'deal-with-unrest',
  name: 'Deal with Unrest',
  checkType: 'action',
  skills: [
    { skill: 'diplomacy', description: 'diplomatic engagement' },
    { skill: 'performance', description: 'public address' }
  ],
  outcomes: {
    criticalSuccess: {
      description: 'The People Rally',
      modifiers: [{ type: 'static', resource: 'unrest', value: -4, duration: 'immediate' }]
    },
    success: {
      description: 'The People Listen',
      modifiers: [{ type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }]
    },
    failure: {
      description: 'Ignored',
      modifiers: []
    },
    criticalFailure: {
      description: 'Angered the Mob',
      modifiers: [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }]
    }
  },
  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -4 :
                          ctx.outcome === 'success' ? -2 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;
      
      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects: []
      };
    }
  }
};
```

**Testing:**
1. Launch Foundry VTT
2. Actions phase → Click "Deal with Unrest"
3. Roll Diplomacy
4. Verify preview shows unrest change
5. Click "Apply Result"
6. Verify unrest changed correctly

---

### Action 5: harvest-resources

**Current:** `data/player-actions/harvest-resources.json` (JSON + choice-buttons)

**Migration:**
```typescript
// src/pipelines/actions/harvestResources.ts
export const harvestResourcesPipeline: CheckPipeline = {
  id: 'harvest-resources',
  name: 'Harvest Resources',
  checkType: 'action',
  skills: [{ skill: 'survival', description: 'gather natural resources' }],
  postRollInteractions: [{
    type: 'choice',
    presentation: 'buttons',
    options: [
      { id: 'food', label: 'Food', icon: 'fa-bread-slice' },
      { id: 'lumber', label: 'Lumber', icon: 'fa-tree' },
      { id: 'stone', label: 'Stone', icon: 'fa-mountain' },
      { id: 'ore', label: 'Ore', icon: 'fa-gem' }
    ]
  }],
  outcomes: {
    criticalSuccess: {
      description: 'Bountiful Harvest',
      modifiers: [{ type: 'choice', resource: ['food', 'lumber', 'stone', 'ore'], value: 4 }]
    },
    success: {
      description: 'Good Harvest',
      modifiers: [{ type: 'choice', resource: ['food', 'lumber', 'stone', 'ore'], value: 2 }]
    },
    failure: {
      description: 'Poor Harvest',
      modifiers: [{ type: 'choice', resource: ['food', 'lumber', 'stone', 'ore'], value: 1 }]
    }
  },
  preview: {
    calculate: (ctx) => {
      const selectedResource = ctx.resolutionData.selectedChoice;
      const amount = ctx.outcome === 'criticalSuccess' ? 4 :
                     ctx.outcome === 'success' ? 2 : 1;
      
      return {
        resources: [{ resource: selectedResource, value: amount }],
        specialEffects: []
      };
    }
  }
};
```

**Testing:**
1. Actions phase → Click "Harvest Resources"
2. Roll Survival
3. See 4 resource buttons
4. Click "Food" button
5. Verify preview shows "+2 Food" (success)
6. Apply → verify food increased

---

### Action 6: claim-hexes

**Current:** `src/actions/claim-hexes/` (custom action with map selection)

**Migration:**
```typescript
// src/pipelines/actions/claimHexes.ts
export const claimHexesPipeline: CheckPipeline = {
  id: 'claim-hexes',
  name: 'Claim Hexes',
  checkType: 'action',
  skills: [{ skill: 'exploration', description: 'survey and claim territory' }],
  preRollInteractions: [{
    type: 'map-selection',
    mode: 'hex-selection',
    count: (ctx) => ctx.outcome === 'criticalSuccess' ? 3 :
                    ctx.outcome === 'success' ? 2 : 1,
    validation: (hex, ctx) => isAdjacentToClaimed(hex, ctx.kingdom)
  }],
  outcomes: {
    criticalSuccess: { description: 'Claim 3 hexes', modifiers: [] },
    success: { description: 'Claim 2 hexes', modifiers: [] },
    failure: { description: 'Claim 1 hex', modifiers: [] }
  },
  preview: {
    providedByInteraction: true,  // Map shows selected hexes visually
    calculate: (ctx) => ({
      specialEffects: [{
        type: 'status',
        message: `Will claim ${ctx.metadata.selectedHexes.length} hex(es)`,
        icon: 'fa-map',
        variant: 'positive'
      }]
    })
  },
  execute: async (ctx) => {
    await claimHexesExecution(ctx.kingdom, ctx.metadata.selectedHexes);
  }
};

// src/execution/territory/claimHexes.ts
export async function claimHexesExecution(
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

---

## Week 6: Pre-Roll Dialog Actions (7 actions)

### Action 10: collect-stipend

**Current:** `src/actions/collect-stipend/` (has settlement selection)

**Migration:**
```typescript
// src/pipelines/actions/collectStipend.ts
export const collectStipendPipeline: CheckPipeline = {
  id: 'collect-stipend',
  name: 'Collect Stipend',
  checkType: 'action',
  skills: [{ skill: 'diplomacy', description: 'request funds from settlement' }],
  preRollInteractions: [{
    type: 'entity-selection',
    entityType: 'settlement',
    filter: (s) => s.level >= 1,
    sortBy: 'level',
    storeAs: 'settlementId'
  }],
  outcomes: {
    criticalSuccess: {
      description: 'Double Stipend',
      modifiers: [{ type: 'static', resource: 'gold', value: 0 }]  // Calculated
    },
    success: {
      description: 'Collect Stipend',
      modifiers: [{ type: 'static', resource: 'gold', value: 0 }]  // Calculated
    }
  },
  preview: {
    calculate: (ctx) => {
      const settlement = findSettlement(ctx.kingdom, ctx.metadata.settlementId);
      const baseGold = calculateStipend(settlement);
      const gold = ctx.outcome === 'criticalSuccess' ? baseGold * 2 : baseGold;
      
      return {
        resources: [{ resource: 'gold', value: -gold }],  // Negative = kingdom loses
        specialEffects: [{
          type: 'status',
          message: `Will transfer ${gold} gold to ${ctx.metadata.actorName}`,
          icon: 'fa-coins',
          variant: 'positive'
        }]
      };
    }
  },
  execute: async (ctx) => {
    const settlement = findSettlement(ctx.kingdom, ctx.metadata.settlementId);
    const gold = calculateStipend(settlement);
    const finalGold = ctx.outcome === 'criticalSuccess' ? gold * 2 : gold;
    
    await giveActorGoldExecution(ctx.kingdom, {
      actorId: ctx.metadata.actorId,
      gold: finalGold
    });
  }
};
```

**Global Variable Elimination:**
- ❌ `globalThis.__pendingStipendSettlement`
- ✅ `ctx.metadata.settlementId`

---

### Action 11: execute-or-pardon-prisoners

**Current:** `src/actions/execute-or-pardon-prisoners/` (settlement selection + dice)

**Migration:**
```typescript
// src/pipelines/actions/executeOrPardonPrisoners.ts
export const executeOrPardonPrisonersPipeline: CheckPipeline = {
  id: 'execute-or-pardon-prisoners',
  name: 'Execute or Pardon Prisoners',
  checkType: 'action',
  skills: [{ skill: 'diplomacy', description: 'pardon with ceremony' }],
  preRollInteractions: [{
    type: 'entity-selection',
    entityType: 'settlement',
    filter: (s) => s.imprisonedUnrest > 0,
    displayProperty: (s) => `${s.name} (${s.imprisonedUnrest} imprisoned)`,
    storeAs: 'settlementId'
  }],
  postRollInteractions: [{
    type: 'dice',
    formula: '1d4',
    label: 'Imprisoned Reduction',
    storeAs: 'imprisonedReduction'
  }],
  outcomes: {
    criticalSuccess: {
      description: 'Joyful Celebration',
      modifiers: [
        { type: 'dice', resource: 'imprisoned', formula: '1d4', operation: 'subtract' },
        { type: 'static', resource: 'unrest', value: -1 }
      ]
    },
    success: {
      description: 'Prisoners Released',
      modifiers: [
        { type: 'dice', resource: 'imprisoned', formula: '1d4', operation: 'subtract' }
      ]
    }
  },
  preview: {
    calculate: (ctx) => {
      const reduction = ctx.resolutionData.diceRolls.imprisonedReduction;
      const settlement = findSettlement(ctx.kingdom, ctx.metadata.settlementId);
      
      return {
        specialEffects: [{
          type: 'status',
          message: `Will reduce imprisoned unrest in ${settlement.name} by ${reduction}`,
          variant: 'positive'
        }],
        resources: ctx.outcome === 'criticalSuccess' ? 
          [{ resource: 'unrest', value: -1 }] : []
      };
    }
  },
  execute: async (ctx) => {
    const reduction = ctx.resolutionData.diceRolls.imprisonedReduction;
    await reduceImprisonedExecution(ctx.kingdom, ctx.metadata.settlementId, reduction);
    
    if (ctx.outcome === 'criticalSuccess') {
      await updateKingdom(k => k.unrest = Math.max(0, k.unrest - 1));
    }
  }
};
```

**Global Variable Elimination:**
- ❌ `globalThis.__pendingExecuteOrPardonSettlement`
- ✅ `ctx.metadata.settlementId`

---

## Week 7: Game Command Actions (5 actions)

### Action 17: build-structure

**Current:** `src/actions/build-structure/BuildStructureAction.ts` (complex custom logic)

**Features:**
- Pre-roll: Structure selection + settlement selection
- Critical success: 50% cost reduction
- Game command: buildStructure

**Migration:**
```typescript
// src/pipelines/actions/buildStructure.ts
export const buildStructurePipeline: CheckPipeline = {
  id: 'build-structure',
  name: 'Build Structure',
  checkType: 'action',
  skills: [{ skill: 'engineering', description: 'construction' }],
  preRollInteractions: [
    {
      type: 'entity-selection',
      entityType: 'structure',
      filter: (s) => !s.built && s.available,
      displayProperty: (s) => `${s.name} (${s.cost.gold}g, ${s.cost.lumber}l)`,
      storeAs: 'structureId'
    },
    {
      type: 'entity-selection',
      entityType: 'settlement',
      filter: (s) => hasCapacity(s),
      storeAs: 'settlementId'
    }
  ],
  outcomes: {
    criticalSuccess: {
      description: 'Swift Construction (50% cost)',
      modifiers: []  // Calculated based on structure
    },
    success: {
      description: 'Build Structure',
      modifiers: []  // Calculated
    },
    failure: {
      description: 'Construction Delays',
      modifiers: []  // Costs applied, no structure
    }
  },
  preview: {
    calculate: (ctx) => {
      const structure = findStructure(ctx.metadata.structureId);
      const costMultiplier = ctx.outcome === 'criticalSuccess' ? 0.5 : 1;
      
      const resources = Object.entries(structure.cost).map(([resource, value]) => ({
        resource,
        value: -(value * costMultiplier)
      }));
      
      const specialEffects = [];
      
      if (ctx.outcome !== 'failure') {
        specialEffects.push({
          type: 'entity',
          message: `Will build ${structure.name} in ${ctx.metadata.settlementName}`,
          icon: 'fa-hammer',
          variant: 'positive'
        });
      }
      
      if (ctx.outcome === 'criticalSuccess') {
        specialEffects.push({
          type: 'status',
          message: '50% cost reduction!',
          variant: 'positive'
        });
      }
      
      return { resources, specialEffects };
    }
  },
  execute: async (ctx) => {
    const structure = findStructure(ctx.metadata.structureId);
    const costMultiplier = ctx.outcome === 'criticalSuccess' ? 0.5 : 1;
    
    // Apply costs
    await updateKingdom(k => {
      Object.entries(structure.cost).forEach(([resource, value]) => {
        k.resources[resource] = (k.resources[resource] || 0) - (value * costMultiplier);
      });
    });
    
    // Build structure (if not failure)
    if (ctx.outcome !== 'failure') {
      await buildStructureExecution(ctx.kingdom, {
        structureId: ctx.metadata.structureId,
        settlementId: ctx.metadata.settlementId
      });
    }
  }
};
```

**Global Variable Elimination:**
- ❌ `globalThis.__pendingBuildAction`
- ✅ `ctx.metadata.{structureId, settlementId}`

---

### Action 20: recruit-unit

**Current:** `src/actions/recruit-unit/` (post-roll compound + game command)

**Features:**
- Post-roll: Text input (army name) + entity selection (settlement)
- Game command: recruitArmy

**Migration:**
```typescript
// src/pipelines/actions/recruitUnit.ts
export const recruitUnitPipeline: CheckPipeline = {
  id: 'recruit-unit',
  name: 'Recruit Unit',
  checkType: 'action',
  skills: [{ skill: 'warfare', description: 'military recruitment' }],
  postRollInteractions: [{
    type: 'compound',
    components: [
      {
        type: 'text-input',
        id: 'armyName',
        label: 'Army Name',
        placeholder: 'Iron Guard',
        required: true
      },
      {
        type: 'entity-selection',
        id: 'stationedAt',
        label: 'Station At',
        entityType: 'settlement',
        required: true
      }
    ]
  }],
  outcomes: {
    criticalSuccess: {
      description: 'Elite Recruitment',
      modifiers: [{ type: 'static', resource: 'gold', value: -50 }]
    },
    success: {
      description: 'Recruit Army',
      modifiers: [{ type: 'static', resource: 'gold', value: -50 }]
    }
  },
  preview: {
    calculate: (ctx) => {
      const level = ctx.kingdom.level;
      const cost = calculateRecruitmentCost(level);
      
      return {
        resources: [{ resource: 'gold', value: -cost }],
        entities: [{
          type: 'army',
          action: 'create',
          name: ctx.resolutionData.armyName,
          details: `Level ${level}, stationed at ${ctx.resolutionData.stationedAt}`
        }],
        specialEffects: []
      };
    }
  },
  execute: async (ctx) => {
    await recruitArmyExecution(ctx.kingdom, {
      name: ctx.resolutionData.armyName,
      level: ctx.kingdom.level,
      stationedAt: ctx.resolutionData.stationedAt
    });
  }
};
```

---

## Week 8: Custom Resolution Actions (5 actions)

### Action 22: arrest-dissidents

**Current:** `src/actions/arrest-dissidents/` (custom allocation component)

**Features:**
- Post-roll: Allocation UI (slider for amount to imprison)
- Calculates unrest reduction vs imprisoned increase

**Migration:**
```typescript
// src/pipelines/actions/arrestDissidents.ts
export const arrestDissidentsPipeline: CheckPipeline = {
  id: 'arrest-dissidents',
  name: 'Arrest Dissidents',
  checkType: 'action',
  skills: [{ skill: 'intimidation', description: 'round up troublemakers' }],
  postRollInteractions: [{
    type: 'allocation',
    id: 'imprisonAmount',
    label: 'Amount to Imprison',
    min: 0,
    max: (ctx) => ctx.outcome === 'criticalSuccess' ? 6 :
                   ctx.outcome === 'success' ? 4 : 2,
    default: (ctx) => Math.min(2, getMaxImprison(ctx)),
    description: 'Reduces unrest but increases imprisoned'
  }],
  outcomes: {
    criticalSuccess: { description: 'Imprison up to 6', modifiers: [] },
    success: { description: 'Imprison up to 4', modifiers: [] },
    failure: { description: 'Imprison up to 2', modifiers: [] }
  },
  preview: {
    calculate: (ctx) => {
      const amount = ctx.resolutionData.imprisonAmount;
      
      return {
        resources: [
          { resource: 'unrest', value: -amount },
          { resource: 'imprisoned', value: amount }
        ],
        specialEffects: [{
          type: 'status',
          message: `Will imprison ${amount} dissidents`,
          variant: 'neutral'
        }]
      };
    }
  },
  execute: async (ctx) => {
    const amount = ctx.resolutionData.imprisonAmount;
    
    await updateKingdom(k => {
      k.unrest = Math.max(0, k.unrest - amount);
      // imprisoned is settlement-specific, added to capital
      const capital = k.settlements.find(s => s.isCapital);
      if (capital) {
        capital.imprisonedUnrest = (capital.imprisonedUnrest || 0) + amount;
      }
    });
  }
};
```

---

### Action 25: establish-settlement

**Current:** `src/actions/establish-settlement/` (very complex compound)

**Features:**
- Post-roll: Text input (name) + map selection (location) + optional entity selection (grant free structure on crit)
- Game command: foundSettlement

**Migration:**
```typescript
// src/pipelines/actions/establishSettlement.ts
export const establishSettlementPipeline: CheckPipeline = {
  id: 'establish-settlement',
  name: 'Establish Settlement',
  checkType: 'action',
  skills: [{ skill: 'politics', description: 'found new settlement' }],
  postRollInteractions: [{
    type: 'compound',
    components: [
      {
        type: 'text-input',
        id: 'settlementName',
        label: 'Settlement Name',
        required: true
      },
      {
        type: 'map-selection',
        id: 'location',
        mode: 'placement',
        validation: (hex) => isClaimedByKingdom(hex) && !hasSettlement(hex)
      },
      {
        type: 'entity-selection',
        id: 'freeStructure',
        label: 'Free Structure (Critical Success)',
        entityType: 'structure',
        filter: (s) => s.tier === 1,
        condition: (ctx) => ctx.outcome === 'criticalSuccess',
        required: false
      }
    ]
  }],
  outcomes: {
    criticalSuccess: {
      description: 'Found Settlement + Free Structure',
      modifiers: [{ type: 'static', resource: 'gold', value: -20 }]
    },
    success: {
      description: 'Found Settlement',
      modifiers: [{ type: 'static', resource: 'gold', value: -20 }]
    }
  },
  preview: {
    providedByInteraction: true,  // Map shows placement
    calculate: (ctx) => {
      const specialEffects = [{
        type: 'entity',
        message: `Will found ${ctx.resolutionData.settlementName} at ${ctx.metadata.location}`,
        icon: 'fa-city',
        variant: 'positive'
      }];
      
      if (ctx.outcome === 'criticalSuccess' && ctx.resolutionData.freeStructure) {
        specialEffects.push({
          type: 'entity',
          message: `Will grant free ${ctx.resolutionData.freeStructure.name}`,
          variant: 'positive'
        });
      }
      
      return {
        resources: [{ resource: 'gold', value: -20 }],
        specialEffects
      };
    }
  },
  execute: async (ctx) => {
    await foundSettlementExecution(ctx.kingdom, {
      name: ctx.resolutionData.settlementName,
      location: ctx.metadata.location,
      grantFreeStructure: ctx.outcome === 'criticalSuccess',
      freeStructureId: ctx.resolutionData.freeStructure?.id
    });
  }
};
```

---

## Migration Checklist Template

For each action:

### Pre-Migration
- [ ] Read current JSON definition
- [ ] Identify custom code (if any)
- [ ] Document global variables used
- [ ] Note interaction types needed
- [ ] Identify game commands

### Migration
- [ ] Create pipeline config file
- [ ] Define skills
- [ ] Define pre-roll interactions (if any)
- [ ] Define post-roll interactions (if any)
- [ ] Define outcomes with modifiers
- [ ] Implement preview.calculate()
- [ ] Implement execute() (if custom logic)
- [ ] Register in pipeline index

### Testing
- [ ] Action card displays correctly
- [ ] Pre-roll interactions work
- [ ] Skill roll executes
- [ ] Post-roll interactions work
- [ ] Preview displays correctly
- [ ] Apply executes correctly
- [ ] State changes match old version
- [ ] No console errors
- [ ] Can be executed multiple times

### Cleanup
- [ ] Delete custom action files (if any)
- [ ] Delete dialog components (if any)
- [ ] Remove from implementations/index.ts
- [ ] Remove global variables
- [ ] Update documentation

---

## Summary Statistics

**By Week:**
- Week 5: 9 actions (simple)
- Week 6: 7 actions (pre-roll dialogs)
- Week 7: 5 actions (game commands)
- Week 8: 5 actions (custom resolution)

**By Complexity:**
- ⭐ Low: 4 actions
- ⭐⭐ Medium: 13 actions
- ⭐⭐⭐ High: 6 actions
- ⭐⭐⭐⭐ Very High: 3 actions

**Global Variables to Eliminate:** 11

**Custom Code to Delete:** ~1950 lines

**Pipeline Configs to Create:** 26 files (~1300 lines)

---

## Next Steps

1. ✅ Code inventory
2. ✅ Game commands classification
3. ✅ Action migration matrix
4. **Next:** Create Phase 1 implementation templates
5. **Next:** Begin Phase 1 (UnifiedCheckHandler)
