# Game Command Handler System

## Overview

Game commands are discrete effects that can be triggered by actions, events, or incidents.
Examples include: recruiting armies, adjusting faction attitudes, destroying structures.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GameCommandHandlerRegistry               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  handlers: GameCommandHandler[]                      │   │
│  │  - GiveActorGoldHandler                              │   │
│  │  - RecruitArmyHandler                                │   │
│  │  - DestroyWorksiteHandler                            │   │
│  │  - ConvertUnrestToImprisonedHandler                  │   │
│  │  - ... (21 total handlers)                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  process(command, ctx) → PreparedCommand                    │
│  executeCommand(command, ctx) → GameCommandResult           │
└─────────────────────────────────────────────────────────────┘
```

## Two Execution Patterns

### Pattern 1: Prepare/Commit (Interactive)

**Use when:**
- User needs to see a preview before confirming
- Command requires UI interaction (dialogs, selectors)
- Post-apply interactions need metadata from preparation

**Flow:**
```typescript
// 1. Prepare (generates preview, no state changes)
const prepared = await registry.process(command, ctx);

// 2. Show preview to user
// prepared.outcomeBadge contains display info

// 3. User clicks Apply
await prepared.commit();  // State changes happen here
```

**Example (outfit army):**
```typescript
const prepared = await registry.process(
  { type: 'outfitArmy', armyId, equipmentType: 'armor' },
  ctx
);
// Shows: "Outfit Light Infantry with Basic Armor"
// User clicks Apply
await prepared.commit();  // Army is equipped
```

### Pattern 2: Immediate Execute (Automatic)

**Use when:**
- Command runs as part of automatic outcome application
- No user preview needed
- Used by `pipeline.outcomes.gameCommands`

**Flow:**
```typescript
// Single call - prepares AND commits
const result = await registry.executeCommand(command, ctx);
if (!result.success) {
  console.error(result.error);
}
```

**Example (event outcome):**
```typescript
// In notorious-heist.ts
outcomes: {
  criticalSuccess: {
    gameCommands: [
      { type: 'convertUnrestToImprisoned', amount: 2, bonusUnrestReduction: 1 }
    ]
  }
}

// UnifiedCheckHandler automatically calls:
await registry.executeCommand(command, ctx);
```

## When to Use Each Pattern

| Scenario | Pattern |
|----------|---------|
| User must choose options (equipment, settlement, faction) | Prepare/Commit |
| Preview shows specific affected entities (structures, hexes) | Prepare/Commit |
| Post-apply interaction needs metadata (map display) | Prepare/Commit |
| Commands in `pipeline.outcomes.gameCommands` | Immediate Execute |
| Simple automatic outcome effects | Immediate Execute |

## Creating a New Handler

```typescript
import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';

export class MyNewHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'myNewCommand';
  }

  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    // 1. Validate inputs
    if (!command.requiredParam) {
      return null;  // Skip command
    }

    // 2. Calculate what will happen (NO state changes here)
    const thingsToDo = calculateThings(ctx.kingdom);

    // 3. Return preview badge and commit function
    return {
      outcomeBadge: {
        icon: 'fa-magic',
        template: `Will do ${thingsToDo.length} things`,
        variant: 'positive'
      },
      commit: async () => {
        // 4. Actually apply state changes here
        await updateKingdom(k => {
          // modify kingdom state
        });
      }
    };
  }
}
```

## Handler Registration

Add new handlers to the registry in `GameCommandHandlerRegistry.ts`:

```typescript
private handlers: GameCommandHandler[] = [
  // ... existing handlers ...
  new MyNewHandler(),  // Add here
];
```

## Key Interfaces

### GameCommandHandler
```typescript
interface GameCommandHandler {
  canHandle(command: any): boolean;
  prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null>;
}
```

### PreparedCommand
```typescript
interface PreparedCommand {
  outcomeBadge?: UnifiedOutcomeBadge;    // Single badge for preview
  outcomeBadges?: UnifiedOutcomeBadge[]; // Multiple badges
  commit: () => Promise<void>;            // Deferred execution
  metadata?: Record<string, any>;         // Data for post-apply interactions
}
```

### GameCommandResult
```typescript
interface GameCommandResult {
  success: boolean;
  error?: string;
  message?: string;
  skipped?: boolean;  // True if handler returned null
}
```

### GameCommandContext
```typescript
interface GameCommandContext {
  actionId?: string;
  outcome: string;
  kingdom: KingdomData;
  metadata?: Record<string, any>;
  pendingState?: {
    armyId?: string;
    settlementId?: string;
    factionId?: string;
    // ... other pending data
  };
}
```

## Existing Handlers

| Handler | Command Type | Purpose |
|---------|--------------|---------|
| GiveActorGoldHandler | `giveActorGold` | Grant gold to player actors |
| RecruitArmyHandler | `recruitArmy` | Create new army unit |
| DisbandArmyHandler | `disbandArmy` | Remove army unit |
| TrainArmyHandler | `trainArmy` | Level up army |
| OutfitArmyHandler | `outfitArmy` | Equip army with gear |
| DeployArmyHandler | `deployArmy` | Move army on map |
| FoundSettlementHandler | `foundSettlement` | Create new settlement |
| AdjustFactionHandler | `adjustFactionAttitude` | Change faction relations |
| RequestMilitaryAidHandler | `requestMilitaryAid*` | Request military assistance |
| DestroyWorksiteHandler | `destroyWorksite` | Remove worksite from hex |
| DamageStructureHandler | `damageStructure` | Damage building |
| DestroyStructureHandler | `destroyStructure` | Remove building |
| SpendPlayerActionHandler | `spendPlayerAction` | Consume player's action |
| ReleaseImprisonedHandler | `releaseImprisoned` | Convert imprisoned → unrest |
| ReduceImprisonedHandler | `reduceImprisoned` | Lower imprisoned count |
| ConvertUnrestToImprisonedHandler | `convertUnrestToImprisoned` | Convert unrest → imprisoned |
| RemoveBorderHexesHandler | `removeBorderHexes` | Unclaim border hexes |
| SeizeHexesHandler | `seizeHexes` | Enemy takes hexes |
| ReduceSettlementLevelHandler | `reduceSettlementLevel` | Lower settlement level |
| SpawnEnemyArmyHandler | `spawnEnemyArmy` | Create enemy army |
| TransferSettlementHandler | `transferSettlement` | Change settlement ownership |
| DefectArmiesHandler | `defectArmies` | Armies switch factions |

## Execution Functions (Direct Use)

For simpler operations that don't need the prepare/commit pattern, use execution functions directly.
These are located in `src/execution/`:

| Function | File | Purpose |
|----------|------|---------|
| `applyArmyConditionExecution` | `armies/applyArmyCondition.ts` | Apply condition to army (sickened, enfeebled, frightened, clumsy, fatigued) |
| `createWorksiteExecution` | `territory/createWorksite.ts` | Create worksite on a hex |
| `tendWoundedExecution` | `armies/tendWounded.ts` | Heal army or remove conditions |
| `trainArmyExecution` | `armies/trainArmy.ts` | Train army to party level |

**Example usage in an event pipeline:**
```typescript
execute: async (ctx) => {
  // Apply condition to army
  const { applyArmyConditionExecution } = await import('../../execution/armies/applyArmyCondition');
  await applyArmyConditionExecution(actorId, 'sickened', 1);

  // Create worksite
  const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
  await createWorksiteExecution(hexId, 'farmstead');
}
```

## Adding Ongoing Modifiers

For multi-turn effects (e.g., plague that lasts 2 turns), add modifiers directly to `kingdom.activeModifiers[]`.
The `CustomModifierService` automatically applies these each turn and decrements duration.

**Example:**
```typescript
import { updateKingdom } from '../../stores/KingdomStore';

await updateKingdom(k => {
  if (!k.activeModifiers) k.activeModifiers = [];
  k.activeModifiers.push({
    id: `ongoing-effect-${Date.now()}`,
    name: 'Plague Spreads',
    description: 'The plague continues to ravage your kingdom.',
    icon: 'fas fa-biohazard',
    tier: 1,
    sourceType: 'custom',  // Required for CustomModifierService to process
    sourceId: ctx.instanceId || 'event-id',
    sourceName: 'Plague Event',
    startTurn: kingdom.turn || 1,
    modifiers: [
      { type: 'static', resource: 'food', value: -2, duration: 2 }  // -2 food for 2 turns
    ]
  });
});
```

**Key points:**
- `sourceType: 'custom'` is required for the modifier to be processed by `CustomModifierService`
- `duration` on each modifier effect controls how many turns it lasts
- Effects are applied at the start of each phase via `applyCustomModifiers()`
- Expired modifiers (duration reaches 0) are automatically removed

**UI Reference:** Players can also create/edit custom modifiers via the Modifiers Tab (`ModifiersTab.svelte`)

## When to Use What

| Scenario | Approach |
|----------|----------|
| Complex state changes with preview | Game Command Handler (prepare/commit) |
| User needs to select target (settlement, faction, etc.) | Game Command Handler |
| Simple one-shot effect (apply condition, create worksite) | Execution Function |
| Multi-turn recurring effect | Direct `activeModifiers[]` addition |
| Automatic outcome processing | `pipeline.outcomes.gameCommands` |

## Avoiding Duplication

Before creating a new handler or function:

1. **Check existing handlers** in `src/services/gameCommands/handlers/`
2. **Check existing execution functions** in `src/execution/`
3. **Check if `activeModifiers[]` can handle it** for recurring effects
4. **Check the Actions** in `src/pipelines/actions/` for patterns

