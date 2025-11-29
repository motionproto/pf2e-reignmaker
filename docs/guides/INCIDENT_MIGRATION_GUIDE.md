# Incident Migration Guide: From JSON to Pipeline System

**Purpose:** Step-by-step guide for migrating incidents from JSON-based resolution to the unified pipeline system.

**Status:** 🚧 In Progress (Actions: ✅ Complete | Events: ⏳ Pending | Incidents: 📍 Next)

**Last Updated:** 2025-11-29

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Incident vs Action Differences](#incident-vs-action-differences)
4. [Migration Patterns](#migration-patterns)
5. [Implementation Examples](#implementation-examples)
6. [Testing Strategy](#testing-strategy)
7. [Common Pitfalls](#common-pitfalls)
8. [Reference Materials](#reference-materials)

---

## Overview

### What is Migrating?

**From:** JSON-only incident definitions with manual resolution  
**To:** TypeScript pipeline implementations with automatic resolution

**Goals:**
- ✅ Use unified pipeline system (same as actions)
- ✅ Type-safe incident definitions
- ✅ Automated game command execution
- ✅ Consistent UX across all check types
- ✅ Easier testing and debugging

### Migration Scope

**30 Total Incidents:**
- 8 Minor incidents
- 10 Moderate incidents
- 12 Major incidents

**Estimated Effort:**
- Simple incidents (no game commands): ~15 minutes each
- Moderate incidents (1-2 game commands): ~30-45 minutes each
- Complex incidents (3+ game commands, custom UI): ~1-2 hours each

---

## Prerequisites

### Required Reading

Before migrating incidents, review these documents:

1. **[Pipeline Coordinator](../systems/pipeline-coordinator.md)** - Understand the 9-step pipeline
2. **[Game Commands System](../systems/game-commands-system.md)** - Learn about game commands
3. **[Outcome Display System](../systems/outcome-display-system.md)** - Component rendering
4. **[Custom UI Action Guide](./CUSTOM_UI_ACTION_GUIDE.md)** - Custom components
5. **[Inline Component Pattern](./INLINE_COMPONENT_PATTERN.md)** - Timing of interactions
6. **[Validation Patterns](./VALIDATION_PATTERNS.md)** - Hex/entity validation

### System Architecture Refresher

**9-Step Pipeline (All Check Types):**
```
1. Requirements Check       [optional]
2. Pre-Roll Interactions    [optional]
3. Execute Roll            [always]
4. Display Outcome         [always]
5. Outcome Interactions    [optional]
6. Wait For Apply          [always]
7. Post-Apply Interactions [optional]
8. Execute Action          [always]
9. Cleanup                 [always]
```

**Key Differences from Actions:**
- **Actions:** Player-initiated, available in Actions tab
- **Incidents:** System-triggered, appear during Status/Upkeep phases
- **Events:** Random checks, appear during Event phase

---

## Incident vs Action Differences

### Structural Similarities

✅ Both use same pipeline architecture  
✅ Both support modifiers and game commands  
✅ Both use OutcomeDisplay component  
✅ Both support custom components  
✅ Both have 4 outcomes (crit success/success/failure/crit failure)

### Key Differences

| Aspect | Actions | Incidents |
|--------|---------|-----------|
| **Trigger** | Player chooses | System generates |
| **Frequency** | On-demand | Based on unrest threshold |
| **Cost** | May require resources | Never costs resources |
| **Requirements** | Can have prerequisites | No requirements (always applies) |
| **Pre-Roll Interactions** | Common (settlement selection, etc.) | Rare (most are immediate) |
| **Post-Apply Interactions** | Common (hex selection, etc.) | Common (random selections) |
| **Traits** | Usually none | Often "dangerous" or "beneficial" |

### Migration Implications

**What Changes:**
- Create TypeScript pipeline file (`.ts`)
- Implement execute function with game commands
- Add custom components for complex interactions

**What Stays the Same:**
- JSON structure (data source)
- Modifier definitions
- Skill options
- Outcome descriptions

---

## Migration Patterns

### Pattern 1: Simple Modifier-Only Incident

**Example:** `rising-tensions` (minor incident)

**Current JSON:**
```json
{
  "id": "rising-tensions",
  "outcomes": {
    "success": {
      "msg": "Tensions are eased.",
      "modifiers": []
    },
    "failure": {
      "msg": "Tensions rise further.",
      "modifiers": [
        { "type": "static", "resource": "unrest", "value": 1 }
      ]
    }
  }
}
```

**Pipeline Implementation:**
```typescript
// src/pipelines/incidents/risingTensions.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const risingTensionsPipeline = createIncidentPipeline('rising-tensions', {
  // No requirements (incidents always apply)
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      // Simple resource display based on outcome
      const resources = [];
      if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }
      return {
        resources,
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from JSON automatically
    await applyPipelineModifiers(risingTensionsPipeline, ctx.outcome);
    return { success: true };
  }
});
```

**Complexity:** ⭐ Low (15 minutes)

---

### Pattern 2: Dice Modifiers with Manual Effects

**Example:** `bandit-activity` (minor incident)

**Current JSON:**
```json
{
  "id": "bandit-activity",
  "outcomes": {
    "criticalFailure": {
      "msg": "Major bandit raids devastate the area.",
      "modifiers": [
        { "type": "dice", "resource": "gold", "formula": "2d4", "negative": true }
      ],
      "manualEffects": [
        "Choose or roll for one random ongoing worksite. That worksite is destroyed"
      ]
    }
  }
}
```

**Pipeline Implementation:**
```typescript
// src/pipelines/incidents/banditActivity.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const banditActivityPipeline = createIncidentPipeline('bandit-activity', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      // Dice modifiers are auto-converted to badges by OutcomeDisplay
      // Just return empty arrays - the system will handle it
      return {
        resources: [],
        outcomeBadges: [],
        warnings: ctx.outcome === 'criticalFailure' 
          ? ['One random worksite will be destroyed'] 
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply dice modifiers
    await applyPipelineModifiers(banditActivityPipeline, ctx.outcome);
    
    // Handle manual effect (future: replace with destroyWorksite game command)
    if (ctx.outcome === 'criticalFailure') {
      // TODO: Implement destroyWorksite game command
      console.warn('⚠️ Manual effect: Destroy one random worksite');
    }
    
    return { success: true };
  }
});
```

**Complexity:** ⭐⭐ Medium (30 minutes)

**Note:** Manual effects are temporary placeholders. They will be replaced with game commands during full migration.

---

### Pattern 3: Game Commands Only

**Example:** `border-raid` (major incident)

**Current JSON:**
```json
{
  "id": "border-raid",
  "outcomes": {
    "failure": {
      "gameCommands": [
        { "type": "removeBorderHexes", "count": 1 }
      ]
    },
    "criticalFailure": {
      "gameCommands": [
        { "type": "removeBorderHexes", "count": "dice", "dice": "1d3" }
      ]
    }
  }
}
```

**Pipeline Implementation:**
```typescript
// src/pipelines/incidents/borderRaid.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { executeGameCommands } from '../shared/GameCommandHelpers';

export const borderRaidPipeline = createIncidentPipeline('border-raid', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const outcomeBadges = [];
      
      // Show hex loss preview
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-map',
          prefix: 'Lose',
          value: { type: 'static', amount: 1 },
          suffix: 'border hex',
          variant: 'negative'
        });
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-map',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d3' },
          suffix: 'border hexes',
          variant: 'negative'
        });
      }
      
      return {
        resources: [],
        outcomeBadges,
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers first
    await applyPipelineModifiers(borderRaidPipeline, ctx.outcome);
    
    // Execute game commands
    const outcome = ctx.outcomeLookup?.[ctx.outcome];
    if (outcome?.gameCommands) {
      await executeGameCommands(outcome.gameCommands);
    }
    
    return { success: true };
  }
});
```

**Complexity:** ⭐⭐ Medium (30-45 minutes)

**Dependencies:** `removeBorderHexes` game command must exist

---

### Pattern 4: Player Choice with Custom Component

**Example:** `production-strike` (moderate incident)

**Current JSON:**
```json
{
  "id": "production-strike",
  "outcomes": {
    "failure": {
      "msg": "Workers strike - lose 1d4 of a resource (choose which)",
      "modifiers": [
        { "type": "dice", "resource": "variable", "formula": "1d4", "negative": true }
      ]
    }
  }
}
```

**Pipeline Implementation:**
```typescript
// src/pipelines/incidents/productionStrike.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyResourceChanges } from '../shared/InlineActionHelpers';

export const productionStrikePipeline = createIncidentPipeline('production-strike', {
  requirements: () => ({ met: true }),

  // Custom component for resource selection (BEFORE "Apply Result")
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceLoss',
      component: 'ProductionStrikeSelector',
      condition: (ctx) => ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
    }
  ],

  preview: {
    calculate: (ctx) => {
      // Component will show options, no preview needed
      return {
        resources: [],
        outcomeBadges: [],
        warnings: ['Choose which resource to lose']
      };
    }
  },

  execute: async (ctx) => {
    // Read user selection from custom component
    const customData = ctx.resolutionData?.customComponentData;
    const { selectedResource, amount } = customData || {};
    
    if (!selectedResource) {
      return { success: false, error: 'No resource selected' };
    }
    
    // Apply resource loss
    await applyResourceChanges([
      { resource: selectedResource, amount: -amount }
    ], 'production-strike');
    
    return { success: true };
  }
});
```

**Component File:**
```svelte
<!-- src/view/kingdom/components/OutcomeDisplay/components/ProductionStrikeSelector.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let instance: any = null;
  export let outcome: string;
  
  const dispatch = createEventDispatcher();
  
  // Determine amount based on outcome
  const formula = outcome === 'criticalFailure' ? '2d4' : '1d4';
  let rolledAmount = 0;
  let selectedResource = '';
  
  async function rollDice() {
    const roll = new Roll(formula);
    await roll.evaluate();
    rolledAmount = roll.total;
    
    // Show roll in chat
    await roll.toMessage({ flavor: 'Production Strike Loss' });
  }
  
  function selectResource(resource: string) {
    selectedResource = resource;
    
    // Emit selection
    dispatch('resolution', {
      isResolved: true,
      metadata: { selectedResource, amount: rolledAmount },
      modifiers: [
        { type: 'static', resource, value: -rolledAmount }
      ]
    });
  }
  
  // Auto-roll on mount
  onMount(async () => {
    await rollDice();
  });
</script>

<div class="production-strike">
  <p>Roll {formula}: <strong>{rolledAmount}</strong></p>
  <p>Choose which resource to lose:</p>
  
  <div class="resource-grid">
    <button on:click={() => selectResource('food')}>Food</button>
    <button on:click={() => selectResource('lumber')}>Lumber</button>
    <button on:click={() => selectResource('stone')}>Stone</button>
    <button on:click={() => selectResource('ore')}>Ore</button>
  </div>
</div>
```

**Complexity:** ⭐⭐⭐ High (1-2 hours)

**Components Required:**
1. Create Svelte component
2. Register in ComponentRegistry
3. Implement custom resolution logic

---

### Pattern 5: Complex Multi-Step Incident

**Example:** `secession-crisis` (major incident)

**Current JSON:**
```json
{
  "id": "secession-crisis",
  "outcomes": {
    "criticalFailure": {
      "msg": "A settlement secedes and forms a rebel kingdom!",
      "manualEffects": [
        "Select one non-capital settlement",
        "Transfer settlement and adjacent hexes to Rebels faction",
        "Settlement becomes rebel stronghold"
      ]
    }
  }
}
```

**Pipeline Implementation:**
```typescript
// src/pipelines/incidents/secessionCrisis.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { executeGameCommands } from '../shared/GameCommandHelpers';

export const secessionCrisisPipeline = createIncidentPipeline('secession-crisis', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      if (ctx.outcome === 'criticalFailure') {
        return {
          resources: [],
          outcomeBadges: [],
          warnings: [
            '⚠️ A settlement will secede from your kingdom!',
            'Settlement and adjacent hexes transferred to Rebels faction'
          ]
        };
      }
      
      return {
        resources: ctx.outcome === 'failure' 
          ? [{ resource: 'unrest', value: 1 }] 
          : [],
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers first
    await applyPipelineModifiers(secessionCrisisPipeline, ctx.outcome);
    
    if (ctx.outcome === 'criticalFailure') {
      // Game commands for settlement transfer
      await executeGameCommands([
        {
          type: 'transferSettlementToFaction',
          settlementSelection: 'random-non-capital',
          factionId: 'rebels',
          includeAdjacentHexes: true
        }
      ]);
    }
    
    if (ctx.outcome === 'failure') {
      // Game commands for settlement damage
      await executeGameCommands([
        {
          type: 'destroyStructure',
          count: 1,
          settlement: 'random-non-capital'
        },
        {
          type: 'downgradeSettlement',
          count: 1,
          settlement: 'random-non-capital'
        }
      ]);
    }
    
    return { success: true };
  }
});
```

**Complexity:** ⭐⭐⭐⭐ Very High (2-3 hours)

**Dependencies:**
- `transferSettlementToFaction` game command
- `downgradeSettlement` game command
- `destroyStructure` game command (already exists)
- Rebels faction must exist or be created

---

## Implementation Examples

### Step-by-Step: Migrating "Crime Wave" (Simple)

**1. Review Current JSON**

```json
{
  "id": "crime-wave",
  "name": "Crime Wave",
  "tier": "minor",
  "outcomes": {
    "success": {
      "msg": "Law enforcement contains the crime wave.",
      "modifiers": []
    },
    "failure": {
      "msg": "Crime spreads through settlements.",
      "modifiers": [
        { "type": "static", "resource": "unrest", "value": 1 }
      ]
    },
    "criticalFailure": {
      "msg": "Crime overwhelms authorities.",
      "modifiers": [
        { "type": "static", "resource": "unrest", "value": 2 }
      ]
    }
  }
}
```

**2. Create Pipeline File**

```bash
# Create file
touch src/pipelines/incidents/crimeWave.ts
```

**3. Implement Pipeline**

```typescript
// src/pipelines/incidents/crimeWave.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

export const crimeWavePipeline = createIncidentPipeline('crime-wave', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const resources = [];
      
      // Map outcome to unrest changes
      if (ctx.outcome === 'failure') {
        resources.push({ resource: 'unrest', value: 1 });
      } else if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 2 });
      }
      
      return {
        resources,
        outcomeBadges: [],
        warnings: []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers from JSON
    await applyPipelineModifiers(crimeWavePipeline, ctx.outcome);
    return { success: true };
  }
});
```

**4. Register Pipeline**

```typescript
// src/pipelines/incidents/index.ts
import { crimeWavePipeline } from './crimeWave';

export const INCIDENT_PIPELINES = new Map([
  ['crime-wave', crimeWavePipeline],
  // ... other incidents
]);
```

**5. Test in Foundry**

```javascript
// In browser console
const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
const handler = new UnifiedCheckHandler();

// Trigger incident
await handler.executeCheck('crime-wave', 'incident', {
  outcome: 'criticalFailure'
});
```

**6. Verify**
- ✅ OutcomeDisplay shows correct modifiers
- ✅ Unrest increases by 2
- ✅ Message displays correctly
- ✅ No console errors

---

### Step-by-Step: Migrating "Disease Outbreak" (With Game Command)

**1. Review Current JSON**

```json
{
  "id": "disease-outbreak",
  "outcomes": {
    "criticalFailure": {
      "msg": "The disease devastates your kingdom.",
      "modifiers": [
        { "type": "dice", "resource": "food", "formula": "2d4", "negative": true },
        { "type": "static", "resource": "unrest", "value": 1 }
      ],
      "manualEffects": [
        "Choose or roll for one Medicine or Faith structure. Mark that structure as damaged"
      ]
    }
  }
}
```

**2. Identify Game Command Needs**

Manual effect → `damageStructure` game command with category filter

**3. Implement Pipeline**

```typescript
// src/pipelines/incidents/diseaseOutbreak.ts
import { createIncidentPipeline } from '../shared/createIncidentPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';
import { executeGameCommands } from '../shared/GameCommandHelpers';

export const diseaseOutbreakPipeline = createIncidentPipeline('disease-outbreak', {
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const resources = [];
      const outcomeBadges = [];
      
      if (ctx.outcome === 'failure') {
        outcomeBadges.push({
          icon: 'fa-apple-alt',
          prefix: 'Lose',
          value: { type: 'dice', formula: '1d4' },
          suffix: 'Food',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
      } else if (ctx.outcome === 'criticalFailure') {
        outcomeBadges.push({
          icon: 'fa-apple-alt',
          prefix: 'Lose',
          value: { type: 'dice', formula: '2d4' },
          suffix: 'Food',
          variant: 'negative'
        });
        resources.push({ resource: 'unrest', value: 1 });
      }
      
      return {
        resources,
        outcomeBadges,
        warnings: ctx.outcome === 'criticalFailure' 
          ? ['One Medicine or Faith structure will be damaged'] 
          : []
      };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers (includes dice roll)
    await applyPipelineModifiers(diseaseOutbreakPipeline, ctx.outcome);
    
    // Apply structure damage
    if (ctx.outcome === 'criticalFailure') {
      await executeGameCommands([
        {
          type: 'damageStructure',
          count: 1,
          categoryFilter: ['medicine', 'faith'],
          selection: 'random'
        }
      ]);
    }
    
    return { success: true };
  }
});
```

**4. Verify Game Command Exists**

```typescript
// Check in GameCommandsResolver.ts
async damageStructure(count: number, options?: {
  categoryFilter?: string[];
  selection?: 'random' | 'player-choice';
  settlement?: string;
}): Promise<ResolveResult>
```

If not, implement it following existing patterns.

**5. Test**
- ✅ Dice roll appears in OutcomeDisplay
- ✅ User clicks dice → rolls 2d4
- ✅ Food decreases by rolled amount
- ✅ Unrest increases by 1
- ✅ Random Medicine/Faith structure marked as damaged
- ✅ Chat message confirms structure damage

---

## Testing Strategy

### Testing Levels

**Level 1: Smoke Test (Quick)**
- Pipeline loads without errors
- Execute function runs without crashing
- Modifiers apply correctly

**Level 2: Outcome Test (Thorough)**
- Test all 4 outcomes independently
- Verify resource changes match JSON
- Check game commands execute properly

**Level 3: Integration Test (Complete)**
- Trigger incident naturally in-game
- Verify full player experience
- Check multi-client synchronization

### Testing Template

```javascript
// Browser console test script
async function testIncident(incidentId, outcome) {
  console.log(`🧪 Testing ${incidentId} - ${outcome}`);
  
  const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
  const handler = new UnifiedCheckHandler();
  
  try {
    await handler.executeCheck(incidentId, 'incident', {
      outcome: outcome,
      skipRoll: true  // Skip actual roll for testing
    });
    console.log(`✅ ${incidentId} - ${outcome} PASSED`);
  } catch (error) {
    console.error(`❌ ${incidentId} - ${outcome} FAILED:`, error);
  }
}

// Test all outcomes
await testIncident('crime-wave', 'criticalSuccess');
await testIncident('crime-wave', 'success');
await testIncident('crime-wave', 'failure');
await testIncident('crime-wave', 'criticalFailure');
```

### Automated Testing Script

Create a comprehensive test for all incidents:

```javascript
// buildscripts/test-all-incidents.js
const INCIDENTS = [
  'crime-wave',
  'bandit-activity',
  'disease-outbreak',
  // ... all 30 incidents
];

const OUTCOMES = ['criticalSuccess', 'success', 'failure', 'criticalFailure'];

async function testAllIncidents() {
  const results = [];
  
  for (const incidentId of INCIDENTS) {
    for (const outcome of OUTCOMES) {
      const result = await testIncident(incidentId, outcome);
      results.push({ incidentId, outcome, ...result });
    }
  }
  
  // Print summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.table(results.filter(r => r.status === 'FAIL'));
}

await testAllIncidents();
```

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting specialEffects Array

**Symptom:** "TypeError: preview.specialEffects is not iterable"

**Cause:**
```typescript
// ❌ WRONG
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: 1 }]
    // Missing specialEffects!
  })
}
```

**Fix:**
```typescript
// ✅ CORRECT
preview: {
  calculate: (ctx) => ({
    resources: [{ resource: 'unrest', value: 1 }],
    outcomeBadges: [],  // Always include!
    warnings: []
  })
}
```

---

### ❌ Pitfall 2: Applying Modifiers Twice

**Symptom:** Resources change by double the expected amount

**Cause:**
```typescript
// ❌ WRONG - applying modifiers twice
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);  // ← Applied once
  
  // ... then manually applying again
  await updateKingdom(k => {
    k.unrest += 1;  // ← Applied twice!
  });
}
```

**Fix:**
```typescript
// ✅ CORRECT - only apply once
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);
  // That's it! Don't manually apply modifiers
  return { success: true };
}
```

---

### ❌ Pitfall 3: Using Wrong Interaction Timing

**Symptom:** Custom component appears as dialog instead of inline

**Cause:**
```typescript
// ❌ WRONG timing
postApplyInteractions: [  // Shows AFTER "Apply Result"
  { type: 'configuration', component: 'MySelector' }
]
```

**Fix:**
```typescript
// ✅ CORRECT timing
postRollInteractions: [  // Shows BEFORE "Apply Result"
  { type: 'configuration', component: 'MySelector' }
]
```

**Reference:** [Inline Component Pattern](./INLINE_COMPONENT_PATTERN.md)

---

### ❌ Pitfall 4: Incorrect Custom Component Event

**Symptom:** Apply button never enables

**Cause:**
```typescript
// ❌ WRONG event name
dispatch('selection', {  // Wrong!
  selectedResource: 'food'
});
```

**Fix:**
```typescript
// ✅ CORRECT event structure
dispatch('resolution', {
  isResolved: true,  // ← Enables Apply button
  metadata: { selectedResource: 'food' },
  modifiers: [...]
});
```

**Reference:** [Custom UI Action Guide](./CUSTOM_UI_ACTION_GUIDE.md)

---

### ❌ Pitfall 5: Missing Game Command Implementation

**Symptom:** "Game command 'destroyWorksite' not found"

**Cause:** Incident references game command that doesn't exist yet

**Fix:**
1. Check if command exists in `GameCommandsResolver.ts`
2. If not, add to backlog for game command implementation
3. Use manual effect temporarily:
```typescript
if (ctx.outcome === 'criticalFailure') {
  // TODO: Implement destroyWorksite game command
  console.warn('⚠️ Manual effect: Destroy one random worksite');
}
```

---

### ❌ Pitfall 6: Not Handling Dice in Preview

**Symptom:** Dice badge doesn't show up

**Cause:**
```typescript
// ❌ WRONG - treating dice as static
preview: {
  calculate: (ctx) => ({
    resources: [
      { resource: 'gold', value: -4 }  // Should be dice!
    ]
  })
}
```

**Fix:**
```typescript
// ✅ CORRECT - use outcomeBadges for dice
preview: {
  calculate: (ctx) => ({
    resources: [],
    outcomeBadges: [{
      icon: 'fa-coins',
      prefix: 'Lose',
      value: { type: 'dice', formula: '2d4' },
      suffix: 'Gold',
      variant: 'negative'
    }],
    warnings: []
  })
}
```

---

## Reference Materials

### Action Examples by Pattern

**Simple Modifier-Only:**
- `deal-with-unrest.ts` - Static unrest reduction
- `claim-hexes.ts` - No modifiers, just game command

**Dice Modifiers:**
- `infiltration.ts` - Dice-based gold loss
- `collect-stipend.ts` - Dice-based gold gain

**Custom Components:**
- `arrestDissidents.ts` - Settlement allocation selector
- `harvestResources.ts` - Resource choice selector
- `executeOrPardonPrisoners.ts` - Settlement target selector

**Map Interactions:**
- `claimHexes.ts` - Hex selection with validation
- `fortifyHex.ts` - Hex selection with cost display
- `buildRoads.ts` - Multiple hex selection with chaining

**Game Commands:**
- `recruitUnit.ts` - Create army entity
- `disbandArmy.ts` - Remove army entity
- `establishSettlement.ts` - Create settlement entity

**Complex Multi-Step:**
- `trainArmy.ts` - Army selection + level-up + outcome effects
- `diplomaticMission.ts` - Faction selection + relationship change

### Helper Functions

**Resource Changes:**
```typescript
import { applyResourceChanges } from '../shared/InlineActionHelpers';

await applyResourceChanges([
  { resource: 'gold', amount: -50 },
  { resource: 'unrest', amount: 1 }
], 'incident-id');
```

**Game Commands:**
```typescript
import { executeGameCommands } from '../shared/GameCommandHelpers';

await executeGameCommands([
  { type: 'damageStructure', count: 1 },
  { type: 'removeBorderHexes', count: 2 }
]);
```

**Pipeline Modifiers:**
```typescript
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

// Applies modifiers from JSON for given outcome
await applyPipelineModifiers(pipeline, ctx.outcome);
```

### File Structure

```
src/
├── pipelines/
│   ├── incidents/
│   │   ├── minor/
│   │   │   ├── crimeWave.ts
│   │   │   ├── banditActivity.ts
│   │   │   └── ...
│   │   ├── moderate/
│   │   │   ├── diseaseOutbreak.ts
│   │   │   ├── infrastructureDamage.ts
│   │   │   └── ...
│   │   ├── major/
│   │   │   ├── borderRaid.ts
│   │   │   ├── secessionCrisis.ts
│   │   │   └── ...
│   │   └── index.ts  (registry)
│   └── shared/
│       ├── createIncidentPipeline.ts
│       ├── applyPipelineModifiers.ts
│       ├── GameCommandHelpers.ts
│       └── InlineActionHelpers.ts
├── view/
│   └── kingdom/
│       └── components/
│           └── OutcomeDisplay/
│               └── components/
│                   ├── ProductionStrikeSelector.svelte
│                   └── ... (custom components)
└── data/
    └── incidents/
        ├── minor/
        ├── moderate/
        └── major/
```

---

## Migration Checklist

Use this checklist for each incident:

### Pre-Implementation
- [ ] Read incident JSON data
- [ ] Identify complexity pattern (1-5)
- [ ] List required game commands
- [ ] Check if game commands exist
- [ ] Identify if custom component needed

### Implementation
- [ ] Create pipeline file in correct directory
- [ ] Implement `requirements` function
- [ ] Implement `preview.calculate` function
- [ ] Add `postRollInteractions` (if needed)
- [ ] Add `postApplyInteractions` (if needed)
- [ ] Implement `execute` function
- [ ] Register pipeline in index.ts

### Testing
- [ ] Test critical success outcome
- [ ] Test success outcome
- [ ] Test failure outcome
- [ ] Test critical failure outcome
- [ ] Verify modifiers apply correctly
- [ ] Verify game commands execute
- [ ] Check OutcomeDisplay rendering
- [ ] Test in multi-client scenario

### Documentation
- [ ] Add comments explaining complex logic
- [ ] Update migration tracking document
- [ ] Note any manual effects still pending
- [ ] Document any new game commands needed

---

## Next Steps

### Phase 1: Simple Incidents (Week 1)
**Target:** 8 minor incidents without game commands

**Estimated Time:** ~2-3 hours total

**Incidents:**
- crime-wave
- corruption-scandal
- protests
- rising-tensions
- work-stoppage
- tax-revolt
- diplomatic-incident (after wording fix)
- international-crisis

### Phase 2: Moderate Incidents (Week 2)
**Target:** 10 moderate incidents with basic game commands

**Estimated Time:** ~5-8 hours total

**Incidents:**
- disease-outbreak
- infrastructure-damage
- mass-exodus
- production-strike
- riot
- settlement-crisis
- trade-embargo
- assassination-attempt
- diplomatic-crisis

### Phase 3: Complex Incidents (Week 3)
**Target:** 12 major incidents with complex game commands

**Estimated Time:** ~12-20 hours total

**Incidents:**
- border-raid
- economic-crash
- guerrilla-movement
- international-scandal
- mass-desertion-threat
- noble-conspiracy
- prison-breaks
- religious-schism
- secession-crisis
- settlement-collapse
- trade-war
- bandit-activity (with destroyWorksite)
- emigration-threat (with destroyWorksite)

### Phase 4: Testing & Polish (Week 4)
- Run automated test suite on all incidents
- Manual testing of complex scenarios
- Fix any edge cases
- Update documentation
- Code review

---

## Summary

**Key Principles:**
1. ✅ Follow existing action patterns - don't reinvent
2. ✅ Use helper functions - DRY code
3. ✅ Test thoroughly - all 4 outcomes
4. ✅ Document complex logic - help future developers
5. ✅ Ask for help - reference this guide and action examples

**Success Criteria:**
- All 30 incidents use pipeline system
- No manual resolution required
- Consistent UX with actions
- Full test coverage
- Zero regression bugs

**Resources:**
- [Pipeline Coordinator](../systems/pipeline-coordinator.md)
- [Game Commands System](../systems/game-commands-system.md)
- [Custom UI Guide](./CUSTOM_UI_ACTION_GUIDE.md)
- [Inline Component Pattern](./INLINE_COMPONENT_PATTERN.md)
- [Validation Patterns](./VALIDATION_PATTERNS.md)

---

**Questions?** Check the action implementations in `src/pipelines/actions/` for real-world examples, or consult the debugging checklist in the Custom UI Guide.

**Good luck!** 🚀

