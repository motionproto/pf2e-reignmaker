# Check Card System

**Universal UI for Actions, Events, and Incidents**

---

## Overview

The **Check Card** is the primary interface for all skill checks in the kingdom system - whether player-initiated actions, random events, or unrest-triggered incidents. It provides a consistent UX for rolling, viewing outcomes, and applying results.

**Components:**
- **BaseCheckCard** - Card container with skill selection
- **OutcomeDisplay** - Universal outcome renderer with badges, choices, and custom components

**Key Principle:** All check types (actions, events, incidents) share the same UI components. Differences are in triggering and data, not presentation.

---

## User Flow

### Standard Flow

```
1. Check Card Opens
   ├─ Event name and description
   ├─ Available skills listed
   └─ Strategic choice selection (if event has strategicChoice)

2. User Selects Skill
   └─ Click skill button

3. Roll Dialog Opens
   └─ PF2e system dialog with modifiers

4. Outcome Display
   ├─ Degree of success shown
   ├─ Outcome badges displayed (static + dice)
   ├─ Choice buttons shown (if needed)
   └─ Custom components shown (if needed)

5. User Resolves Interactions
   ├─ Roll all dice badges
   ├─ Make all choices
   └─ Complete all custom components

6. Apply Button Enabled
   └─ User clicks "Apply Result"

7. Effects Execute
   ├─ Resources modified
   ├─ Game commands executed
   └─ Check card closes (or persists if ongoing)
```

---

## Badge System

### Badge Types

**Static Badge:**
```typescript
{
  icon: 'fa-coins',
  prefix: 'Receive',
  value: { type: 'static', amount: 50 },
  suffix: 'gold',
  variant: 'positive'
}
// Displays: "🪙 Receive 50 gold"
```

**Dice Badge (Interactive):**
```typescript
{
  icon: 'fa-gavel',
  prefix: 'Remove',
  value: { type: 'dice', formula: '1d4' },
  suffix: 'imprisoned unrest',
  variant: 'positive'
}
// Displays: "🔨 Remove [🎲 1d4] imprisoned unrest" (clickable)
// After roll: "🔨 Remove 3 imprisoned unrest"
```

**Choice Badge:**
```typescript
{
  icon: 'fa-coins',
  prefix: 'Gain',
  value: { type: 'choice', options: ['Gold', 'Fame'], amount: 3 },
  variant: 'positive'
}
// Displays: Choice buttons for Gold or Fame
```

### Badge Variants

- `'positive'` - Green (gains, benefits)
- `'negative'` - Red (losses, penalties)
- `'info'` - Blue (neutral information)
- `'default'` - Gray (neutral)

### Auto-Conversion

Modifiers in pipeline outcomes are automatically converted to badges:

```typescript
// Pipeline definition:
outcomes: {
  success: {
    description: 'You succeed!',
    modifiers: [
      { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
    ]
  }
}

// Auto-converted to badge:
{
  icon: 'fa-coins',
  prefix: 'Gain',
  value: { type: 'dice', formula: '2d6' },
  suffix: 'Gold',
  variant: 'positive'
}
```

---

## Strategic Choices (Pre-Roll)

**Purpose:** Player chooses approach BEFORE rolling, changing available skills and outcome modifiers.

**Used By:** Events with narrative decision-making (Criminal Trial, Feud, Public Scandal, Inquisition)

### Implementation Example: Criminal Trial

**Pipeline Definition:**

```typescript
export const criminalTrialPipeline: CheckPipeline = {
  id: 'criminal-trial',
  name: 'Criminal Trial',
  description: 'Authorities catch a notorious criminal - how will you administer justice?',
  checkType: 'event',
  tier: 1,

  // Strategic choice: Shown BEFORE skill selection
  strategicChoice: {
    label: 'How will you administer justice?',
    required: true,
    options: [
      {
        id: 'fair',
        label: 'Fair Trial',
        description: 'Ensure justice is served fairly and transparently',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'diplomacy'],
        personality: { practical: 3 }  // Future: tracks kingdom personality
      },
      {
        id: 'harsh',
        label: 'Harsh Punishment',
        description: 'Make an example to deter future crime',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'performance'],
        personality: { ruthless: 3 }
      },
      {
        id: 'mercy',
        label: 'Show Mercy',
        description: 'Demonstrate compassion and forgiveness',
        icon: 'fas fa-dove',
        skills: ['religion', 'diplomacy'],
        personality: { virtuous: 3 }
      }
    ]
  },

  skills: [
    { skill: 'society', description: 'legal proceedings' },
    { skill: 'diplomacy', description: 'public ceremony' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'performance', description: 'public demonstration' },
    { skill: 'religion', description: 'moral guidance' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Justice triumphs.',
      endsEvent: true,
      modifiers: [] // Calculated dynamically based on choice
    },
    success: {
      description: 'Justice is served.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'Complications arise from the trial.',
      endsEvent: true,
      modifiers: []
    },
    criticalFailure: {
      description: 'Justice is miscarried.',
      endsEvent: true,
      modifiers: []
    },
  },

  preview: {
    calculate: async (ctx) => {
      const approach = ctx.metadata?.approach;
      const outcome = ctx.outcome;
      let modifiers: any[] = [];

      if (approach === 'fair') {
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 1, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'failure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
          ];
        }
      } else if (approach === 'harsh') {
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -3, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }
          ];
        }
        // ... etc
      } else if (approach === 'mercy') {
        // ... different modifiers
      }

      // Store for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges: [] };
    }
  },

  execute: async (ctx) => {
    const modifiers = ctx.metadata?._outcomeModifiers || [];
    // Apply modifiers...
    
    // TODO: Track personality choice for kingdom/leaders
    // await personalityTracker.recordChoice(approach, personality);
    
    return { success: true };
  },

  traits: ['beneficial'],
};
```

### UX Flow

```
1. Check card opens
2. THREE CHOICE BUTTONS shown:
   [⚖️ Fair Trial] [🔨 Harsh Punishment] [🕊️ Show Mercy]
3. User selects "Fair Trial"
4. Skill buttons update to show only Society and Diplomacy
5. User rolls with Society
6. Outcome shows modifiers specific to Fair Trial + outcome
7. User applies result
```

### Type Definition

```typescript
interface EventResponseChoice {
  id: string;
  label: string;
  description: string;
  icon: string;
  skills: string[];  // Which skills are available for this choice
  personality?: {
    virtuous?: number;   // 0-10 scale
    practical?: number;  // 0-10 scale
    ruthless?: number;   // 0-10 scale
  };
}

interface EventResponseChoices {
  label: string;
  required: boolean;
  options: EventResponseChoice[];
}
```

---

## Choice Modifiers (Post-Roll)

**Purpose:** Player chooses which resource to gain/lose AFTER rolling.

**Used By:** Events with flexible rewards (Economic Surge, Grand Tournament, Archaeological Find)

### Implementation Example: Economic Surge

**Pipeline Definition:**

```typescript
export const economicSurgePipeline: CheckPipeline = {
  id: 'economic-surge',
  name: 'Economic Surge',
  description: 'Trade and productivity boom throughout your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
    { skill: 'society', description: 'manage growth' },
    { skill: 'diplomacy', description: 'attract traders' },
    { skill: 'crafting', description: 'increase production' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Trade flourishes - choose how to invest the windfall.',
      endsEvent: false,
      modifiers: [
        { type: 'choice', resources: ['gold', 'fame'], value: 4, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The economy grows steadily - choose the benefit.',
      endsEvent: false,
      modifiers: [
        { type: 'choice', resources: ['gold', 'fame'], value: 3, duration: 'immediate' }
      ]
    },
    failure: {
      description: 'The economic surge slows.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'gold', value: 1, duration: 'immediate' }
      ]
    },
  },

  // No preview needed - ChoiceModifier is handled automatically
  preview: {
    calculate: async (ctx) => {
      return { resources: [], outcomeBadges: [] };
    }
  },

  traits: ['beneficial', 'ongoing'],
};
```

### UX Flow

```
1. User rolls skill check
2. Success! Outcome displays:
   "Trade flourishes - choose how to invest the windfall."
3. TWO CHOICE BUTTONS shown:
   [🪙 Gold +3] [⭐ Fame +3]
4. User clicks "Gold +3"
5. Apply button enables
6. User clicks Apply
7. +3 Gold applied to kingdom
```

### Auto-Handling

The system automatically:
- Detects `{ type: 'choice' }` modifiers
- Renders choice buttons with icons
- Disables Apply button until choice made
- Applies selected resource when Apply clicked

**No custom code needed!**

---

## Custom Components

**Purpose:** For unique interactions beyond badges and choices.

**Used By:** Actions with complex resource selection (Harvest Resources, Sell Surplus, Purchase Resources)

### Implementation Example: Harvest Resources

**Pipeline Definition:**

```typescript
export const harvestResourcesPipeline: CheckPipeline = {
  // ...
  postRollInteractions: [
    {
      type: 'configuration',
      id: 'resourceSelection',
      component: 'ResourceChoiceSelector',
      condition: (ctx) => ctx.outcome === 'success',
      
      onComplete: async (data, context) => {
        // User selected a resource
        const { selectedResource, amount } = data;
        
        await applyResourceChanges([{
          resource: selectedResource,
          value: amount
        }]);
      }
    }
  ]
};
```

### Component Requirements

Custom components must:
1. Be registered in `ComponentRegistry`
2. Emit `'resolution'` event with standard format:
   ```typescript
   dispatch('resolution', {
     isResolved: true,
     metadata: { selectedResource: 'food' },
     modifiers: [{ resource: 'food', value: 2 }]
   });
   ```

---

## Dice Roll Data Flow

**Critical:** Dice values are rolled ONCE in UI, never re-rolled in execute.

### The Flow

```
1. User sees dice badge: "🎲 2d6 gold"

2. User clicks dice
   └─ DiceRollingService rolls: Result = 8
   └─ Stored in resolutionData.numericModifiers

3. Badge updates: "8 gold" (no longer clickable)

4. User clicks "Apply Result"

5. UnifiedCheckHandler.applyDefaultModifiers() runs FIRST
   └─ Reads resolutionData.numericModifiers
   └─ Applies exact rolled value (8 gold)
   └─ Uses GameCommandsService (includes shortfall detection)

6. Pipeline execute() runs (if defined)
   └─ Modifiers already applied
   └─ Only implements custom game logic
```

### Guarantees

- ✅ **No Re-Rolling** - Value rolled once, preserved
- ✅ **Exact Values** - UI shows what you get
- ✅ **Shortfall Detection** - Automatic for all dice modifiers
- ✅ **Execute-First Pattern** - Modifiers applied before custom execute

---

## Apply Button Validation

The Apply button automatically disables until all interactions are resolved.

### Three Validation Types

**1. Dice Rolls**
- Detects: Any badge or modifier with `type: 'dice'`
- Requires: All dice clicked and rolled
- Visual: Dice badges show clickable state until rolled

**2. Choices**
- Detects: Any modifier with `type: 'choice'`
- Requires: User clicks one choice button
- Visual: Choice buttons shown, Apply disabled until selection

**3. Custom Components**
- Detects: `postRollInteractions` or `customComponent` in preview
- Requires: Component emits `'resolution'` event
- Visual: Component UI shown, Apply disabled until complete

### Combined Validation

```typescript
// All three checks combined:
$: allInteractionsResolved = allDiceRolled && customComponentResolved && choiceResolved;

// Apply button disabled when:
primaryButtonDisabled = applied || !allInteractionsResolved || !hasContent;
```

---

## Check Type Differences

All checks use the same Check Card UI, but differ in triggering and persistence:

| Feature | Events | Incidents | Actions |
|---------|--------|-----------|---------|
| **Triggering** | Random selection at phase start | Unrest % roll during phase | Player-initiated |
| **Tier System** | Kingdom level (1-20) | Severity (minor/moderate/major) | Kingdom level (1-20) |
| **Persistence** | Can be ongoing (`endsEvent: false`) | Always immediate | Always immediate |
| **Ignore Option** | Yes (beneficial/dangerous rules) | No | No |
| **Multiple per Turn** | No (one active max) | No (one max) | Yes (unlimited) |
| **Strategic Choices** | Yes (pre-roll approach) | No | No (uses pre-roll interactions instead) |
| **Choice Modifiers** | Yes (common) | Yes (common) | Yes (common) |

### Pipeline Entry Points

**Events:**
- EventPhaseController selects random event
- Checks for ongoing events from previous turn
- Calls PipelineCoordinator

**Incidents:**
- UnrestPhaseController rolls d100 vs unrest
- If triggered, selects incident by severity
- Calls PipelineCoordinator

**Actions:**
- User clicks action button in ActionsPhase
- ActionPhaseController calls PipelineCoordinator
- Multiple actions can execute sequentially

---

## Badge Helper Utilities

### Targeted Actions with Automatic Selection

For actions that target a specific entity (settlement, structure, etc.) based on capacity, use the **Badge Helper Utilities** in `src/utils/badge-helpers.ts`.

This pattern is useful when you need to:
- Select a target with the most available capacity
- Show the target name in the badge before dice are rolled
- Support both dice formulas and static amounts

**Common use cases:**
- Imprisonment (selecting settlement with most prison capacity)
- Structure damage/repair (selecting structure)
- Resource allocation (selecting storage location)
- Faction relations (selecting faction)

### Import

```typescript
import { createTargetedDiceBadge, createTargetedStaticBadge } from '../../../utils/badge-helpers';
import type { ActionTarget } from '../../../utils/badge-helpers';
```

### Usage: Dice Formula

```typescript
// Build targets array
const targets: ActionTarget[] = settlements.map(settlement => ({
  id: settlement.id,
  name: settlement.name,
  capacity: calculateAvailableCapacity(settlement)
}));

// Create badge with automatic target selection
const { badge, targetId, targetName, maxCapacity } = createTargetedDiceBadge({
  formula: '1d3',
  action: 'Imprison',
  targets,
  icon: 'fas fa-handcuffs',
  variant: 'info',
  noTargetMessage: 'No prisons available'  // Optional
});

// Badge shows: "Imprison 1d3 in Hoofton"
// After roll: "Imprison 2 in Hoofton"
```

### Usage: Static Amount

```typescript
const { badge, targetId, targetName, maxCapacity } = createTargetedStaticBadge({
  amount: 5,
  action: 'Repair',
  targets: repairableStructures,
  icon: 'fas fa-hammer',
  variant: 'positive'
});

// Badge shows: "Repair 5 in Oakdale"
```

### How It Works

1. **Target Selection**: Automatically selects the target with the **most available capacity**
2. **Capacity Filtering**: Ignores targets with 0 capacity
3. **Badge Creation**: Includes target name in the template
4. **Metadata Return**: Returns `targetId`, `targetName`, and `maxCapacity` for use in commit phase

### Complete Example: Game Command Handler

```typescript
import { createTargetedDiceBadge } from '../../../utils/badge-helpers';
import type { ActionTarget } from '../../../utils/badge-helpers';

async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
  const diceFormula = command.diceFormula;
  
  // Build targets with available capacity
  const targets: ActionTarget[] = settlements.map(s => ({
    id: s.id,
    name: s.name,
    capacity: calculateCapacity(s) - s.currentAmount
  }));
  
  // Create badge
  const { badge, targetId, targetName, maxCapacity } = createTargetedDiceBadge({
    formula: diceFormula,
    action: 'Imprison',
    targets,
    icon: 'fas fa-handcuffs',
    variant: 'info'
  });
  
  // Store target for commit
  const metadata = { targetId, targetName, maxCapacity };
  
  return {
    outcomeBadges: [badge],
    metadata,
    commit: async () => {
      // Use targetId to apply effect
      await applyToTarget(metadata.targetId, rollResult);
    }
  };
}
```

### ActionTarget Interface

```typescript
interface ActionTarget {
  id: string;
  name: string;
  capacity: number;  // Available capacity for the action
}
```

### Return Value

```typescript
{
  badge: UnifiedOutcomeBadge;  // The badge to display
  targetId: string | null;     // ID of selected target (null if none available)
  targetName: string | null;   // Name of selected target
  maxCapacity: number;         // Max capacity of selected target
}
```

### No Target Available

If no targets have capacity, returns a text badge:

```typescript
{
  badge: textBadge('No prisons available', 'fas fa-handcuffs', 'info'),
  targetId: null,
  targetName: null,
  maxCapacity: 0
}
```

### Best Practices

1. **Build fresh targets** - Calculate capacity at prepare time, not during construction
2. **Filter by capacity** - Only include targets with available space
3. **Store metadata** - Save targetId for the commit phase
4. **Cap amounts** - In commit, use `min(rollResult, maxCapacity)` to respect limits

---

## For Developers

### Adding Static Badges to Pipeline

```typescript
outcomes: {
  success: {
    description: 'You succeed!',
    modifiers: [
      { type: 'static', resource: 'gold', value: 50, duration: 'immediate' }
    ]
  }
}
// Auto-converts to: "🪙 Gain 50 Gold" badge
```

### Adding Dice Badges to Pipeline

```typescript
outcomes: {
  success: {
    description: 'You succeed!',
    modifiers: [
      { type: 'dice', resource: 'gold', formula: '2d6', duration: 'immediate' }
    ]
  }
}
// Auto-converts to: "🪙 Gain [🎲 2d6] Gold" clickable badge
```

### Adding Choice Modifiers

```typescript
outcomes: {
  success: {
    description: 'Choose your reward.',
    modifiers: [
      { type: 'choice', resources: ['gold', 'fame'], value: 3, duration: 'immediate' }
    ]
  }
}
// Auto-renders: [🪙 Gold +3] [⭐ Fame +3] choice buttons
```

### Adding Strategic Choices (Events Only)

```typescript
export const myEventPipeline: CheckPipeline = {
  strategicChoice: {
    label: 'How will you respond?',
    required: true,
    options: [
      {
        id: 'peaceful',
        label: 'Peaceful Resolution',
        description: 'Negotiate diplomatically',
        icon: 'fas fa-handshake',
        skills: ['diplomacy', 'society'],
        personality: { virtuous: 3 }
      },
      {
        id: 'forceful',
        label: 'Show of Force',
        description: 'Intimidate into compliance',
        icon: 'fas fa-fist-raised',
        skills: ['intimidation', 'warfare'],
        personality: { ruthless: 3 }
      }
    ]
  },
  
  preview: {
    calculate: async (ctx) => {
      const approach = ctx.metadata?.approach;
      const outcome = ctx.outcome;
      
      // Calculate modifiers based on approach + outcome
      let modifiers = [];
      if (approach === 'peaceful' && outcome === 'success') {
        modifiers = [{ type: 'static', resource: 'fame', value: 2 }];
      } else if (approach === 'forceful' && outcome === 'success') {
        modifiers = [{ type: 'static', resource: 'unrest', value: -2 }];
      }
      
      ctx.metadata._outcomeModifiers = modifiers;
      return { resources: [], outcomeBadges: [] };
    }
  },
  
  execute: async (ctx) => {
    // Apply modifiers + track personality (future)
  }
};
```

### Adding Custom Components

```typescript
postRollInteractions: [
  {
    type: 'configuration',
    id: 'myCustomThing',
    component: 'MyCustomComponent',  // Must be registered
    condition: (ctx) => ctx.outcome === 'success',
    
    onComplete: async (data, context) => {
      // Handle user's selection
      await doSomething(data);
    }
  }
]
```

---

## Related Documentation

- **[pipeline/pipeline-coordinator.md](../pipeline/pipeline-coordinator.md)** - Complete 9-step execution flow
- **[pipeline/pipeline-patterns.md](../pipeline/pipeline-patterns.md)** - Implementation patterns for actions
- **[effects/typed-modifiers-system.md](../effects/typed-modifiers-system.md)** - Modifier type reference

---

**Status:** ✅ Production Ready  
**Components:** `BaseCheckCard.svelte`, `OutcomeDisplay.svelte`  
**Last Updated:** 2025-12-10
