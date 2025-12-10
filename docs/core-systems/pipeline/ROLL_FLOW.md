# Roll Execution Flow

This document describes the complete flow of roll execution, from user action to outcome display.

## Pipeline Overview

The roll system uses a 9-step pipeline coordinated by `PipelineCoordinator`:

```
Step 0: Initialize (generate instanceId)
Step 1: Check Requirements
Step 2: Pre-Roll Interactions
Step 3: Execute Roll ← Reroll rewinds here
Step 4: Display Outcome
Step 5: Outcome Interactions
Step 6: Wait For Apply
Step 7: Post-Apply Interactions
Step 8: Execute Action
Step 9: Cleanup
```

## Service Responsibilities

```
PipelineCoordinator.step3_executeRoll()
  │
  ├── KingdomModifierService.getModifiersForCheck()
  │     ├── structuresService (structure bonuses)
  │     ├── UnrestService (unrest penalty)
  │     └── kingdomData.turnState (active aids)
  │
  ├── RollStateService.getRollModifiers() [if reroll]
  │
  ├── PF2eSkillService.executeSkillRoll()
  │     └── skill.roll() [PF2e system]
  │
  └── RollStateService.storeRollModifiers() [in callback]
```

## Instance ID Format

```
T{turn}-{actionId}-{randomId}
```

Example: `T5-deploy-army-abc123def456`

- **T{turn}**: Current turn number (enables turn-aware validation)
- **{actionId}**: Action/event/incident ID (for debugging)
- **{randomId}**: Random suffix (ensures uniqueness)

---

## Initial Roll Flow

### 1. User Initiates Roll

```
User clicks skill button in BaseCheckCard
  ↓
Phase component receives executeSkill event
  ↓
Phase calls executeSkillCheck(skill, null)
```

### 2. Pipeline Initialization

```typescript
// PipelineCoordinator.executePipeline()
const currentTurn = getKingdomActor()?.getKingdomData()?.currentTurn || 0;
context.instanceId = `T${currentTurn}-${actionId}-${foundry.utils.randomID()}`;
// e.g., "T5-deploy-army-abc123def456"
```

### 3. Roll Execution (Step 3)

```typescript
// PipelineCoordinator.step3_executeRoll()

// 1. Get modifiers from KingdomModifierService
const modifiers = kingdomModifierService.getModifiersForCheck({
  skillName,
  actionId: ctx.actionId,
  checkType: ctx.checkType,
  onlySettlementId: ctx.metadata?.onlySettlementId,
  enabledSettlement: ctx.metadata?.enabledSettlement,
  enabledStructure: ctx.metadata?.enabledStructure
});

// 2. Check for keep-higher aid
const useKeepHigher = kingdomModifierService.hasKeepHigherAid(
  ctx.actionId, 
  ctx.checkType
);

// 3. Execute roll via PF2eSkillService
await pf2eSkillService.executeSkillRoll({
  actor: actingCharacter,
  skill,
  dc,
  label: `${labelPrefix}: ${pipeline.name}`,
  modifiers,
  rollTwice: useKeepHigher ? 'keep-higher' : false,
  callback,
  extraRollOptions: [...]
});
```

### 4. PF2e System Roll

```typescript
// PF2eSkillService.executeSkillRoll()

// Convert modifiers to PF2e format
const pf2eModifiers = this.convertToPF2eModifiers(modifiers);

// Execute PF2e roll
await skill.roll({
  dc: { value: dc },
  label,
  modifiers: pf2eModifiers,
  rollTwice: rollTwice || false,
  skipDialog: false,
  callback,
  extraRollOptions
});
```

### 5. Modifier Storage (in callback)

```typescript
// PipelineCoordinator callback (only on initial roll)
if (!isReroll && ctx.instanceId && rollModifiers.length > 0) {
  // Convert PF2e modifiers to RollModifier format
  const rollModifiersForStorage = rollModifiers.map(mod => fromPF2eModifier(mod));
  
  // Store via RollStateService
  await rollStateService.storeRollModifiers(
    ctx.instanceId,
    currentTurn,
    ctx.actionId,
    rollModifiersForStorage
  );
}
```

### 6. Storage Location

```typescript
// Stored in kingdom.turnState.actionsPhase.actionInstances[instanceId]
{
  instanceId: "T5-deploy-army-abc123",
  actionId: "deploy-army",
  turnNumber: 5,
  rollModifiers: [
    { label: "Town Hall", value: 1, type: "circumstance", enabled: true, ignored: false },
    { label: "Custom Bonus", value: 2, type: "circumstance", enabled: true, ignored: false }
  ],
  timestamp: 1699999999999
}
```

---

## Reroll Flow

### 1. User Initiates Reroll

```
User clicks "Reroll with Fame" in OutcomeDisplay
  ↓
OutcomeDisplay.handleReroll() is called
```

### 2. Fame Deduction

```typescript
// OutcomeDisplay.handleReroll()
const fameCheck = await canRerollWithFame();
if (!fameCheck.canReroll) {
  ui.notifications?.warn(fameCheck.error);
  return;
}

const deductResult = await deductFameForReroll();
if (!deductResult.success) {
  ui.notifications?.error(deductResult.error);
  return;
}
```

### 3. Reroll via PipelineCoordinator

```typescript
// OutcomeDisplay calls PipelineCoordinator directly
const pipelineCoordinator = await getPipelineCoordinator();
await pipelineCoordinator.rerollFromStep3(instanceId);
```

### 4. Pipeline Rewind

```typescript
// PipelineCoordinator.rerollFromStep3()
const context = this.pendingContexts.get(instanceId);
context.isReroll = true;  // Mark as reroll

// Clear old outcome preview
await this.checkInstanceService.clearInstance(instanceId);

// Re-execute Step 3
await this.step3_executeRoll(context);
```

### 5. Modifier Retrieval and Merge

```typescript
// PipelineCoordinator.step3_executeRoll() - reroll path
if (isReroll && ctx.instanceId) {
  // Load stored modifiers
  const storedModifiers = await rollStateService.getRollModifiers(
    ctx.instanceId,
    currentTurn
  );
  
  if (storedModifiers && storedModifiers.length > 0) {
    const matchedLabels = new Set<string>();
    
    // Enable existing modifiers that match stored modifiers
    for (const mod of modifiers) {
      const storedMod = storedModifiers.find(m => m.label === mod.label);
      if (storedMod) {
        mod.enabled = true;
        mod.ignored = false;
        matchedLabels.add(storedMod.label);
      }
    }
    
    // Add unmatched stored modifiers (custom modifiers from previous roll)
    for (const storedMod of storedModifiers) {
      if (!matchedLabels.has(storedMod.label)) {
        modifiers.push({
          label: storedMod.label,
          value: storedMod.value,
          type: storedMod.type || 'circumstance',
          enabled: true,
          ignored: false
        });
      }
    }
  }
}
```

### 6. Reroll Execution

```typescript
// PF2e roll with restored modifiers
await pf2eSkillService.executeSkillRoll({
  actor: actingCharacter,
  skill,
  dc,
  label,
  modifiers,  // Includes restored modifiers
  rollTwice: useKeepHigher ? 'keep-higher' : false,
  callback  // Does NOT store modifiers on reroll
});
```

---

## Modifier Types

### RollModifier Format

```typescript
interface RollModifier {
  label: string;      // "Town Hall", "Aid from Alice"
  value: number;      // +1, +2, -2
  type: ModifierType; // 'circumstance' | 'item' | 'status' | 'untyped'
  enabled: boolean;   // Was it enabled in the roll?
  ignored: boolean;   // Was it ignored by stacking rules?
  source?: string;    // 'structure', 'aid', 'unrest', 'custom'
}
```

### Modifier Sources (via KingdomModifierService)

| Source | Example | Source ID |
|--------|---------|-----------|
| Structure | "Oakhaven Town Hall" (+1) | `structure` |
| Unrest | "Unrest Penalty" (-2) | `unrest` |
| Aid | "Aid from Alice (Diplomacy)" (+2) | `aid` |

### Filtered Out (NOT stored)

- **ability** - Character ability modifier (recalculated by PF2e)
- **proficiency** - Character proficiency bonus (recalculated by PF2e)

These are automatically added by PF2e on every roll, so storing them would create duplicates.

---

## Turn Boundary Handling

### At Turn Start (StatusPhaseController)

```typescript
// Clear stale roll state from previous turns
await rollStateService.clearStaleTurnData(currentTurn);
```

### Validation on Retrieval

```typescript
// RollStateService.getRollModifiers()
if (storedState.turnNumber !== currentTurn) {
  console.warn('Stored modifiers are from a different turn - data may be stale');
  // Still returns modifiers - caller decides what to do
}
```

---

## Error Handling

### Failed Reroll

```typescript
// OutcomeDisplay.handleReroll()
try {
  await pipelineCoordinator.rerollFromStep3(instanceId);
} catch (error) {
  // Restore fame if roll failed
  await restoreFameAfterFailedReroll(deductResult.previousFame);
  ui.notifications?.error('Failed to reroll. Fame has been restored.');
}
```

### Missing Modifiers

```typescript
// PipelineCoordinator - if no stored modifiers found
if (!storedModifiers || storedModifiers.length === 0) {
  console.warn('No stored modifiers found for reroll');
  // Roll proceeds without restored modifiers
}
```

---

## Sequence Diagram

```
┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌─────────┐
│OutcomeDisplay│  │PipelineCoord.   │  │KingdomModifier   │  │RollStateService│  │PF2eSkillService│  │PF2e     │
└──────┬───────┘  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  └───────┬────────┘  └────┬────┘
       │                   │                    │                    │                   │                │
       │ handleReroll()    │                    │                    │                   │                │
       │──────────────────>│                    │                    │                   │                │
       │                   │                    │                    │                   │                │
       │                   │ rerollFromStep3()  │                    │                   │                │
       │                   │ isReroll=true      │                    │                   │                │
       │                   │                    │                    │                   │                │
       │                   │ getModifiersFor    │                    │                   │                │
       │                   │ Check()            │                    │                   │                │
       │                   │───────────────────>│                    │                   │                │
       │                   │                    │                    │                   │                │
       │                   │ modifiers          │                    │                   │                │
       │                   │<───────────────────│                    │                   │                │
       │                   │                    │                    │                   │                │
       │                   │ getRollModifiers() │                    │                   │                │
       │                   │───────────────────────────────────────>│                   │                │
       │                   │                    │                    │                   │                │
       │                   │ storedModifiers    │                    │                   │                │
       │                   │<───────────────────────────────────────│                   │                │
       │                   │                    │                    │                   │                │
       │                   │ executeSkillRoll() │                    │                   │                │
       │                   │──────────────────────────────────────────────────────────>│                │
       │                   │                    │                    │                   │                │
       │                   │                    │                    │                   │ skill.roll()   │
       │                   │                    │                    │                   │───────────────>│
       │                   │                    │                    │                   │                │
       │                   │                    │                    │                   │ callback       │
       │                   │                    │                    │                   │<───────────────│
       │                   │                    │                    │                   │                │
       │                   │ callback           │                    │                   │                │
       │                   │<──────────────────────────────────────────────────────────│                │
       │                   │                    │                    │                   │                │
       │ UI updates        │                    │                    │                   │                │
       │<──────────────────│                    │                    │                   │                │
       │                   │                    │                    │                   │                │
```

---

## Related Documentation

- [../services/SERVICE_CONTRACTS.md](../services/SERVICE_CONTRACTS.md) - Service responsibilities and boundaries
- [../services/skill-service.md](../services/skill-service.md) - PF2e skill service documentation
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) - Overall system architecture
- [../../guides/testing-guide.md](../../guides/testing-guide.md) - Testing procedures
