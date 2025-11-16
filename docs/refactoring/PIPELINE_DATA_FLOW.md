# Pipeline Data Flow Architecture

**Last Updated:** 2025-11-16

This document describes how data flows through the unified check pipeline system, ensuring consistent access to context at every stage of check resolution.

---

## Core Principle: CheckContext as the Data Bus

The pipeline system uses **CheckContext** as a unified data bus that propagates through all stages of check resolution. Every stage (preview, execute, interactions) receives the same context object, ensuring consistent access to data.

```typescript
interface CheckContext {
  check: any;                    // Action/Event/Incident definition
  outcome: OutcomeType;          // criticalSuccess | success | failure | criticalFailure
  kingdom: KingdomData;          // Full kingdom state
  metadata: CheckMetadata;       // User selections + actor data
  resolutionData: ResolutionData; // User inputs + dice rolls
  instanceId: string;            // Unique instance identifier
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              User Interactions (UI Layer)               │
├─────────────────────────────────────────────────────────┤
│  Pre-Roll Interactions → PipelineMetadataStorage       │
│  (settlement selection, faction selection, etc.)        │
└─────────────────┬───────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│           PipelineMetadataStorage (Bridge)              │
├─────────────────────────────────────────────────────────┤
│  store(actionId, playerId, metadata)                   │
│  retrieve(actionId, playerId) → metadata               │
│  clear(actionId, playerId)                             │
└─────────────────┬───────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│              Roll Completion Handler                    │
├─────────────────────────────────────────────────────────┤
│  CheckInstanceHelpers.createActionCheckInstance()      │
│  • Retrieves metadata from storage                     │
│  • Merges into instance.metadata                       │
│  • Stores in actor flags                               │
└─────────────────┬───────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────┐
│              CheckContext (Data Bus)                    │
├─────────────────────────────────────────────────────────┤
│  • check: Action definition                            │
│  • outcome: Roll result                                │
│  • kingdom: Full state                                 │
│  • metadata: Pre-roll + actor data ✅                  │
│  • resolutionData: Dice rolls + user inputs            │
│  • instanceId: Unique identifier                       │
└───────┬───────────────┬───────────────┬─────────────────┘
        ↓               ↓               ↓
┌───────────┐  ┌────────────┐  ┌──────────────┐
│ preview() │  │ execute()  │  │ interactions │
└───────────┘  └────────────┘  └──────────────┘
     ✅              ✅               ✅
  Has full       Has full        Has full
  context        context         context
```

---

## Interaction Patterns

### Pattern 1: Pre-Roll Interactions (NEW)

**When to use:** Action needs user input BEFORE the roll (settlement selection, faction selection, army selection, etc.)

**Data Flow:**
```
1. User clicks skill
2. preRollInteractions execute → User selects entity
3. Metadata stored in PipelineMetadataStorage
4. Roll dialog appears
5. Roll completes → CheckInstanceHelpers retrieves metadata
6. Metadata merged into CheckContext
7. Preview/Execute have access to metadata
```

**Example: execute-or-pardon-prisoners**

```typescript
export const executeOrPardonPrisonersPipeline: CheckPipeline = {
  id: 'execute-or-pardon-prisoners',
  
  // 1. Pre-roll: Select settlement
  preRollInteractions: [
    {
      id: 'settlement',
      type: 'entity-selection',
      entityType: 'settlement',
      filter: (settlement) => settlement.imprisonedUnrest > 0
    }
  ],
  
  // 2. Preview: Use metadata
  preview: {
    calculate: (ctx) => {
      const settlementId = ctx.metadata.settlement.id;  // ✅ Available!
      const settlement = ctx.kingdom.settlements.find(s => s.id === settlementId);
      // Calculate preview...
    }
  },
  
  // 3. Execute: Use metadata
  execute: async (ctx) => {
    const settlementId = ctx.metadata.settlement.id;  // ✅ Available!
    await reduceImprisoned(settlementId, amount);
  }
};
```

**Actions using this pattern:** #11 (execute-or-pardon), #12-16 (diplomatic/army actions)

---

### Pattern 2: Post-Apply Interactions (Existing)

**When to use:** Action needs user input AFTER roll and Apply button (hex selection, entity creation, etc.)

**Data Flow:**
```
1. User clicks skill
2. Roll dialog appears
3. Roll completes → CheckContext created
4. User clicks Apply
5. postApplyInteractions execute → User selects items
6. onComplete() receives selections + full context
7. Execute logic directly in onComplete()
```

**Example: claim-hexes**

```typescript
export const claimHexesPipeline: CheckPipeline = {
  id: 'claim-hexes',
  
  // 1. Post-apply: Select hexes AFTER Apply
  postApplyInteractions: [
    {
      id: 'hexes',
      type: 'map-selection',
      count: (ctx) => {
        // Context available to determine hex count
        const proficiency = ctx.metadata.actor.proficiencyRank;
        return proficiency >= 3 ? 4 : proficiency >= 2 ? 3 : 2;
      },
      onComplete: async (hexIds, ctx) => {
        // Execute directly - no separate execute() needed
        await markHexesClaimed(hexIds);
        
        // Full context available if needed
        console.log('Kingdom:', ctx.kingdom);
        console.log('Outcome:', ctx.outcome);
      }
    }
  ],
  
  // 2. Execute: Empty (work done in onComplete)
  execute: async (ctx) => {
    return { success: true };
  }
};
```

**Actions using this pattern:** #1 (claim-hexes), #6-9 (hex selection actions)

---

### Pattern 3: No Interactions (Simple)

**When to use:** Action is fully automatic with no user input needed

**Data Flow:**
```
1. User clicks skill
2. Roll dialog appears
3. Roll completes → CheckContext created
4. User clicks Apply
5. Execute runs with context
```

**Example: deal-with-unrest**

```typescript
export const dealWithUnrestPipeline: CheckPipeline = {
  id: 'deal-with-unrest',
  
  // No interactions - fully automatic
  
  // Execute: Use context for logic
  execute: async (ctx) => {
    const reduction = ctx.outcome === 'criticalSuccess' ? 3 :
                     ctx.outcome === 'success' ? 2 : 1;
    
    await updateKingdom(kingdom => {
      kingdom.unrest = Math.max(0, kingdom.unrest - reduction);
    });
    
    return { success: true };
  }
};
```

**Actions using this pattern:** #2-5 (resource actions)

---

## PipelineMetadataStorage Lifecycle

The metadata storage service manages the complete lifecycle of pre-roll interaction data:

```typescript
// 1. STORE: After pre-roll interactions (ActionsPhase.svelte)
const metadata = await executePreRollInteractions(actionId, kingdom);
pipelineMetadataStorage.store(actionId, userId, metadata);

// 2. RETRIEVE: When creating check instance (CheckInstanceHelpers.ts)
const metadata = pipelineMetadataStorage.retrieve(actionId, userId);
Object.assign(instanceMetadata, metadata);  // Merge into instance

// 3. PROPAGATE: Instance metadata becomes context metadata
const ctx: CheckContext = {
  check: action,
  outcome,
  kingdom,
  metadata: instance.metadata,  // ✅ Pre-roll data available
  ...
};

// 4. CLEANUP: After successful execution (ActionPhaseController.ts)
if (result.success) {
  pipelineMetadataStorage.clear(actionId, playerId);
}
```

---

## Key Integration Points

### 1. ActionsPhase.svelte
**Role:** Detect and execute pre-roll interactions, store metadata

```typescript
if (unifiedCheckHandler.needsPreRollInteraction(actionId)) {
  const metadata = await executePreRollInteractions(actionId, kingdom);
  
  // ✅ Store for later retrieval
  pipelineMetadataStorage.store(actionId, userId, metadata);
  
  // Now execute the roll
  await executeSkillAction(...);
}
```

### 2. CheckInstanceHelpers.ts
**Role:** Retrieve and merge metadata when creating check instance

```typescript
// ✅ Retrieve pipeline metadata
const pipelineMetadata = pipelineMetadataStorage.retrieve(actionId, userId);

// ✅ Merge into instance metadata
const metadata = {
  ...createActionMetadata(actionId, pendingActions),  // Legacy
  ...pipelineMetadata,  // Pipeline (pre-roll)
  actor: { ... }        // Actor data
};

// ✅ Store in instance
await checkInstanceService.createInstance(..., metadata);
```

### 3. UnifiedCheckHandler.ts
**Role:** Build CheckContext and pass to pipeline functions

```typescript
// ✅ Build context with full metadata
const context: CheckContext = {
  check: action,
  outcome,
  kingdom,
  metadata: instance.metadata,  // ✅ Includes pre-roll data
  resolutionData,
  instanceId
};

// ✅ Pass to all pipeline stages
const preview = await pipeline.preview.calculate(context);
const result = await pipeline.execute(context);
```

### 4. ActionPhaseController.ts
**Role:** Cleanup metadata after successful execution

```typescript
const result = await actionResolver.executeAction(...);

// ✅ Cleanup after success
if (result.success && playerId) {
  pipelineMetadataStorage.clear(actionId, playerId);
}
```

---

## Choosing the Right Pattern

| Pattern | When to Use | Example Actions |
|---------|-------------|-----------------|
| **Pre-Roll** | Need user input BEFORE roll (entity selection) | execute-or-pardon, diplomatic relations, army actions |
| **Post-Apply** | Need user input AFTER roll (map selection, creation) | claim-hexes, build-roads, fortify-hex |
| **No Interactions** | Fully automatic, no user input | deal-with-unrest, sell-surplus |

---

## Benefits of This Architecture

✅ **Single Source of Truth** - CheckContext is the authoritative data bus  
✅ **Consistent Access** - Every stage uses `ctx.metadata`, `ctx.kingdom`, etc.  
✅ **No Manual Passing** - Data flows automatically through the system  
✅ **Type-safe** - TypeScript ensures correct access patterns  
✅ **Scalable** - Works for all 26 actions without special cases  
✅ **Testable** - Context can be mocked for unit tests  

---

## See Also

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Step-by-step migration instructions
- [ACTION_MIGRATION_CHECKLIST.md](./ACTION_MIGRATION_CHECKLIST.md) - Progress tracking
- [CheckPipeline.ts](../../src/types/CheckPipeline.ts) - Pipeline type definitions
- [CheckContext.ts](../../src/types/CheckContext.ts) - Context type definitions
