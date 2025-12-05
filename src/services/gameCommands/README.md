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

