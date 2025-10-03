# GameEffectsService Usage Guide

## Overview

The **GameEffectsService** provides a unified interface for applying outcomes from events, incidents, and actions to the kingdom actor. It ensures consistent effect application across all game systems while maintaining the architectural principle of a single source of truth.

## Architecture

### Key Components

1. **GameEffectsService** (`src/services/GameEffectsService.ts`)
   - Applies immediate resource changes
   - Handles special effects (structure damage, hex claims, etc.)
   - Returns structured results
   - Does NOT track ongoing modifiers

2. **ModifierService** (`src/services/ModifierService.ts`)
   - Stores modifiers in `kingdom.activeModifiers[]`
   - Applies ongoing effects each turn (Status phase)
   - Cleans up expired modifiers
   - Handles resolution attempts

3. **Controllers** (EventPhaseController, UnrestPhaseController, etc.)
   - Call GameEffectsService for immediate effects
   - Call ModifierService to create ongoing modifiers
   - Manage phase-specific business logic

### Data Flow

```
Component/Controller → GameEffectsService.applyOutcome() → updateKingdom() → KingdomActor → Foundry → All Clients
```

## Basic Usage

### 1. Import the Service

```typescript
import { createGameEffectsService } from '../services/GameEffectsService';

const gameEffectsService = await createGameEffectsService();
```

### 2. Apply an Outcome

```typescript
const result = await gameEffectsService.applyOutcome({
  type: 'event' | 'incident' | 'action',
  sourceId: 'unique-identifier',
  sourceName: 'Display Name',
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  modifiers: EventModifier[],
  context?: {
    playerId?: string,
    settlementId?: string,
    hexId?: string
  }
});

if (result.success) {
  console.log('Applied resources:', result.applied.resources);
  console.log('Special effects:', result.applied.specialEffects);
} else {
  console.error('Failed:', result.error);
}
```

## Examples

### Example 1: Event Outcome (EventPhaseController)

```typescript
// Get the outcome effects from the event
const effectOutcome = event.effects?.[outcome];
if (!effectOutcome) {
  throw new Error(`No effects defined for outcome: ${outcome}`);
}

// Use GameEffectsService to apply the outcome
const result = await gameEffectsService.applyOutcome({
  type: 'event',
  sourceId: event.id,
  sourceName: event.name,
  outcome: outcome,
  modifiers: effectOutcome.modifiers || [],
  createOngoingModifier: false
});

// Handle unresolved modifier creation separately
if (event.ifUnresolved && (outcome === 'failure' || outcome === 'criticalFailure')) {
  const modifierService = await createModifierService();
  const unresolvedModifier = modifierService.createFromUnresolvedEvent(event, currentTurn);
  
  if (unresolvedModifier) {
    await updateKingdom(kingdom => {
      if (!kingdom.activeModifiers) kingdom.activeModifiers = [];
      kingdom.activeModifiers.push(unresolvedModifier);
    });
  }
}
```

### Example 2: Incident Outcome (UnrestPhaseController)

```typescript
// Load incident data
const { incidentLoader } = await import('./incidents/incident-loader');
const incident = incidentLoader.getIncidentById(incidentId);

// Get the outcome effects
const effectOutcome = incident.effects?.[outcome];

// Use GameEffectsService
const gameEffectsService = await createGameEffectsService();
const result = await gameEffectsService.applyOutcome({
  type: 'incident',
  sourceId: incident.id,
  sourceName: incident.name,
  outcome: outcome,
  modifiers: effectOutcome.modifiers || []
});
```

### Example 3: Action Outcome (Future - ActionsPhaseController)

```typescript
// For kingdom actions like Build Structure, Claim Hex, etc.
const result = await gameEffectsService.applyOutcome({
  type: 'action',
  sourceId: 'build-structure',
  sourceName: 'Build Structure',
  outcome: 'success',
  modifiers: [
    { 
      name: 'Structure Cost',
      resource: 'gold',
      value: -2,
      duration: 'immediate'
    }
  ],
  context: {
    playerId: 'player1',
    settlementId: 'capital'
  }
});
```

## Modifier Structure

The service expects modifiers in the `EventModifier` format:

```typescript
interface EventModifier {
  name: string;              // Display name for the effect
  resource: ResourceType;    // 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries' | 'unrest' | 'fame'
  value: number;             // Positive or negative change
  duration: ModifierDuration; // 'immediate' | 'ongoing' | 'permanent' | 'turns'
  turns?: number;            // Required if duration === 'turns'
}
```

### Duration Types

- **immediate**: Applied once, right now
- **permanent**: Applied once, but the effect is permanent (use sparingly)
- **turns**: Applied immediately, tracked for X turns, then removed
- **ongoing**: Applied every turn until conditions are met (handled by ModifierService)

## Special Effects

The service includes handlers for special effects that don't fit the standard resource model:

### Available Special Effects

1. **damage_structure** - Randomly damages a structure in a settlement
2. **destroy_structure** - Randomly destroys a structure in a settlement
3. **imprisoned_unrest** - Converts regular unrest to imprisoned unrest
4. **claim_hex** - Claims a hex for the kingdom

### Using Special Effects

Currently, special effects are referenced in modifier selectors but not yet fully implemented. The placeholder handlers exist in the service:

```typescript
// TODO: Implement when structure system is ready
await gameEffectsService.applySpecialEffect('damage_structure', params, result);
```

## Error Handling

The service returns a structured result with success status:

```typescript
interface ApplyOutcomeResult {
  success: boolean;
  error?: string;
  applied: {
    resources: Array<{ resource: ResourceType; value: number }>;
    specialEffects: string[];
  };
}
```

Always check `result.success` before proceeding:

```typescript
const result = await gameEffectsService.applyOutcome({...});

if (!result.success) {
  console.error('Failed to apply outcome:', result.error);
  // Handle error appropriately
  return;
}

// Proceed with success case
console.log('Applied:', result.applied);
```

## Best Practices

### 1. Use the Service for All Immediate Effects

Don't manipulate kingdom resources directly in controllers:

```typescript
// ❌ BAD - Direct manipulation
await updateKingdom(kingdom => {
  kingdom.resources.gold += 5;
  kingdom.unrest -= 1;
});

// ✅ GOOD - Use the service
await gameEffectsService.applyOutcome({
  type: 'event',
  sourceId: 'reward',
  sourceName: 'Kingdom Reward',
  outcome: 'success',
  modifiers: [
    { name: 'Gold reward', resource: 'gold', value: 5, duration: 'immediate' },
    { name: 'Reduced unrest', resource: 'unrest', value: -1, duration: 'immediate' }
  ]
});
```

### 2. Separate Immediate from Ongoing Effects

Use GameEffectsService for immediate application, ModifierService for ongoing effects:

```typescript
// Apply immediate effects
const result = await gameEffectsService.applyOutcome({...});

// Create ongoing modifier if needed
if (shouldCreateModifier) {
  const modifierService = await createModifierService();
  const modifier = modifierService.createFromUnresolvedEvent(event, currentTurn);
  // ... add to kingdom.activeModifiers
}
```

### 3. Provide Clear Context

Include relevant context for debugging and potential future features:

```typescript
await gameEffectsService.applyOutcome({
  type: 'action',
  sourceId: 'claim-hex',
  sourceName: 'Claim Hex',
  outcome: 'success',
  modifiers: [...],
  context: {
    playerId: game.user.id,
    settlementId: nearestSettlement.id,
    hexId: targetHex.id
  }
});
```

### 4. Log Important Operations

The service provides built-in logging, but add your own context in controllers:

```typescript
console.log(`🎯 [MyController] Applying outcome for ${sourceName}`);
const result = await gameEffectsService.applyOutcome({...});
console.log(`✅ [MyController] Outcome applied successfully`);
```

## Integration Checklist

When integrating GameEffectsService into a new controller:

- [ ] Import `createGameEffectsService`
- [ ] Create service instance: `const gameEffectsService = await createGameEffectsService()`
- [ ] Replace direct kingdom updates with `gameEffectsService.applyOutcome()`
- [ ] Convert effects to `EventModifier[]` format
- [ ] Handle ongoing modifiers separately with ModifierService
- [ ] Test all outcome degrees (critical success, success, failure, critical failure)
- [ ] Verify resource changes are applied correctly
- [ ] Check that phase completion still works

## Testing

To verify the service works correctly:

1. **Test each outcome degree** - Ensure all four outcomes apply effects correctly
2. **Test resource boundaries** - Resources should never go negative (except unrest)
3. **Test multiple modifiers** - Verify multiple modifiers in one outcome work
4. **Test special resources** - Unrest and fame have special handling
5. **Test error handling** - Verify graceful failure with invalid data

## Future Enhancements

Planned improvements to the service:

- [ ] Implement structure damage/destruction handlers
- [ ] Implement hex claiming handler
- [ ] Add outcome tracking to prevent double-application
- [ ] Support for conditional effects based on kingdom state
- [ ] Better integration with choice-based outcomes (e.g., "gain 1 Resource of your choice")

## Related Documentation

- [Architecture Summary](.clinerules/ARCHITECTURE_SUMMARY.md) - Overall system architecture
- [Phase Controller Guide](PHASE_CONTROLLER_GUIDE.md) - How controllers work
- [Modifiers System](../src/models/Modifiers.ts) - Ongoing modifier details
