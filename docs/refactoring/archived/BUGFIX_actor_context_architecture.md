# Actor Context Architecture Fix

**Date:** 2025-11-14  
**Issue:** Proficiency-based hex count limitation in claim-hexes action  
**Root Cause:** Missing actor context in CheckContext - no access to proficiency rank or character level during pipeline execution  
**Status:** ✅ IMPLEMENTED

---

## Problem Statement

The claim-hexes action needs to determine how many hexes can be claimed on critical success based on the character's proficiency rank:

- **Untrained/Trained:** 2 hexes
- **Expert:** 3 hexes
- **Master/Legendary:** 4 hexes

However, the pipeline system had no way to access this information because:

1. `CheckContext` didn't include actor data
2. Interaction `count` parameters were static numbers, not dynamic functions
3. Check instances only stored `actorName` but not `proficiencyRank` or `level`

---

## Data Flow Analysis

### Current Data Capture (Working)

```typescript
// 1. PF2eSkillService captures actor data when roll starts
await game.user?.setFlag('pf2e-reignmaker', 'pendingCheck', {
  checkId,
  checkType,
  actorId: actor.id,
  actorName: actor.name,
  proficiencyRank: skill?.rank || 0,  // ✅ Already captured!
  // Missing: actor.level
});

// 2. PF2eRollService dispatches event when roll completes
window.dispatchEvent(new CustomEvent('kingdomRollComplete', {
  detail: {
    proficiencyRank: pendingCheck.proficiencyRank,  // ✅ Already available!
    // Missing: actor.level
  }
}));

// 3. ActionsPhase receives event
async function handleRollComplete(event: CustomEvent) {
  const { proficiencyRank } = event.detail;  // ✅ Available but not used!
}
```

### The Gap

The `proficiencyRank` is already captured and dispatched but:
- ❌ Not stored in check instance
- ❌ Not passed to UnifiedCheckHandler
- ❌ Not available in CheckContext
- ❌ Can't be used by interaction count functions

---

## Solution Architecture

### 1. Add ActorContext to CheckContext

```typescript
// src/types/CheckContext.ts

export interface ActorContext {
  // Basic info
  actorId: string;
  actorName: string;
  level: number;
  
  // Skill info
  selectedSkill: string;
  proficiencyRank: number;  // 0 = untrained, 1 = trained, 2 = expert, 3 = master, 4 = legendary
  
  // Full skill data (for future use)
  skillData?: {
    rank: number;
    modifier?: number;
    breakdown?: string;
    [key: string]: any;
  };
  
  // Full actor object (for future use)
  fullActor?: any;
}

export interface CheckContext {
  // ... existing fields
  actor?: ActorContext;  // ✅ NEW
}
```

### 2. Update CheckPipeline for Dynamic Counts

```typescript
// src/types/CheckPipeline.ts

export interface Interaction {
  // ... existing fields
  
  // Map selection specific (outcome-based adjustments)
  outcomeAdjustment?: {
    criticalSuccess?: {
      count?: number | ((ctx: any) => number);  // ✅ Can be static or dynamic
      title?: string;
    };
    // ... other outcomes
  };
}
```

### 3. Update Check Instance Creation

```typescript
// src/controllers/actions/CheckInstanceHelpers.ts

export async function createActionCheckInstance(context: {
  // ... existing fields
  proficiencyRank?: number;  // ✅ NEW
  actorLevel?: number;        // ✅ NEW
}): Promise<string> {
  // Create metadata with actor context
  const metadata = {
    ...createActionMetadata(actionId, pendingActions),
    actor: {
      actorId: /* from pendingCheck */,
      actorName: /* from pendingCheck */,
      level: actorLevel || 1,
      selectedSkill: skillName,
      proficiencyRank: proficiencyRank || 0
    }
  };
  
  // Store in instance
  const instanceId = await checkInstanceService.createInstance(
    'action',
    actionId,
    action,
    currentTurn,
    metadata  // ✅ Now includes actor context
  );
}
```

### 4. Update UnifiedCheckHandler

```typescript
// src/services/UnifiedCheckHandler.ts

async executePostRollInteractions(
  instanceId: string,
  outcome: OutcomeType
): Promise<ResolutionData> {
  // Get instance
  const instance = this.checkInstanceService.getInstance(instanceId, kingdom);
  
  // Build context with actor data
  const context: CheckContext = {
    check: instance.checkData,
    outcome,
    kingdom,
    actor: instance.metadata?.actor,  // ✅ Actor context from instance
    resolutionData: createEmptyResolutionData(),
    metadata: instance.metadata || {},
    instanceId
  };
  
  // Execute interactions with context
  for (const interaction of pipeline.postRollInteractions) {
    // Adjust parameters based on outcome
    const adjusted = this.adjustInteractionForOutcome(
      interaction, 
      outcome, 
      context  // ✅ Pass full context with actor data
    );
  }
}

private adjustInteractionForOutcome(
  interaction: Interaction,
  outcome: OutcomeType,
  context: CheckContext  // ✅ NEW: full context instead of instance
): Interaction {
  // ... existing code
  
  if (adjustment.count !== undefined) {
    // ✅ NEW: Support function-based counts
    if (typeof adjustment.count === 'function') {
      adjusted.count = adjustment.count(context);
    } else {
      adjusted.count = adjustment.count;
    }
  }
}
```

### 5. Update claim-hexes Pipeline

```typescript
// src/pipelines/actions/claimHexes.ts

export const claimHexesPipeline: CheckPipeline = {
  // ... existing fields
  
  postRollInteractions: [
    {
      type: 'map-selection',
      id: 'selectedHexes',
      mode: 'hex-selection',
      colorType: 'claimed',
      
      outcomeAdjustment: {
        criticalSuccess: {
          // ✅ Dynamic count based on proficiency
          count: (ctx) => {
            const proficiency = ctx.actor?.proficiencyRank || 0;
            // Untrained/Trained = 2, Expert = 3, Master/Legendary = 4
            return proficiency >= 3 ? 4 : proficiency >= 2 ? 3 : 2;
          },
          title: 'Select hexes to claim (based on proficiency)'
        },
        success: {
          count: 1,
          title: 'Select 1 hex to claim'
        }
      },
      
      condition: (ctx) => {
        return ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess';
      }
    }
  ]
};
```

---

## Implementation Checklist

- [x] Add ActorContext interface to CheckContext.ts
- [x] Update CheckPipeline.ts to support dynamic count functions
- [ ] Update CheckInstanceHelpers to capture actor context
  - [ ] Accept proficiencyRank and actorLevel parameters
  - [ ] Store in instance metadata
- [ ] Update ActionsPhase to pass actor data to instance creation
  - [ ] Extract from kingdomRollComplete event detail
  - [ ] Pass to createActionCheckInstance
- [ ] Update UnifiedCheckHandler
  - [ ] Extract actor context from instance metadata
  - [ ] Populate CheckContext.actor
  - [ ] Support function-based interaction counts
- [ ] Update claim-hexes pipeline
  - [ ] Use dynamic count function
  - [ ] Calculate based on proficiencyRank
- [ ] Update PF2eSkillService to capture actor level
  - [ ] Add to pendingCheck flag
  - [ ] Dispatch in event detail

---

## Benefits

1. **Solves proficiency-based hex count** - Dynamic counts work correctly
2. **Future-proof** - Any action can use actor context (level, proficiency, etc.)
3. **Type-safe** - All actor data properly typed in ActorContext
4. **Minimal changes** - Data already captured, just needs to flow through system
5. **Backward compatible** - Optional fields, existing actions unaffected

---

## Testing Plan

1. **Test claim-hexes with different proficiencies:**
   - Untrained character → should get 2 hexes on crit
   - Expert character → should get 3 hexes on crit
   - Master character → should get 4 hexes on crit

2. **Test other map actions:** Verify they still work (build-roads, fortify-hex)

3. **Test non-map actions:** Verify backward compatibility

---

## Future Uses

With actor context available, pipelines can now:
- Scale effects based on character level
- Modify outcomes based on proficiency
- Apply character-specific bonuses
- Make decisions based on skill modifiers
- Support character-dependent interactions

Examples:
- Aid Another bonuses based on proficiency
- Level-scaled resource generation
- Proficiency-based success rates
- Character-aware preview calculations
