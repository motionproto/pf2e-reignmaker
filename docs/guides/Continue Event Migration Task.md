# Continue Event Migration Task

Continue migrating events to the strategic choice pattern. Check `docs/planning/EVENT_MIGRATION_STATUS.md` for current status.

## Critical Documentation to Review First

**Before implementing any game effects, you MUST read:**
- `src/services/gameCommands/README.md` - Complete guide for handlers, execution functions, and ongoing modifiers
- `docs/planning/EVENT_MIGRATION_STATUS.md` - See "Technical Implementation Guide" section for full modifier flow

## Standardized Choice IDs (IMPORTANT)

**All events MUST use standardized personality trait IDs:**

```typescript
strategicChoice: {
  label: 'How will you [handle this event]?',
  required: true,
  options: [
    {
      id: 'virtuous',     // ← ALWAYS use 'virtuous' for left choice
      label: '[Event-Specific Label]',  // ← Descriptive, event-specific
      description: '...',
      personality: { virtuous: 3 },
      // ...
    },
    {
      id: 'practical',    // ← ALWAYS use 'practical' for center choice
      label: '[Event-Specific Label]',
      description: '...',
      personality: { practical: 3 },
      // ...
    },
    {
      id: 'ruthless',     // ← ALWAYS use 'ruthless' for right choice
      label: '[Event-Specific Label]',
      description: '...',
      personality: { ruthless: 3 },
      // ...
    }
  ]
}
```

**In preview.calculate() and execute():**
```typescript
if (approach === 'virtuous') { ... }    // ← NOT 'mercy', 'mediate', etc.
if (approach === 'practical') { ... }   // ← NOT 'fair', 'neutral', etc.
if (approach === 'ruthless') { ... }    // ← NOT 'harsh', 'force', etc.
```

**Why:** Every event has exactly 1 Virtuous, 1 Practical, and 1 Ruthless choice. Using standardized IDs ensures consistency and predictability.

## Choice-Specific Outcome Descriptions

**Each choice MUST have unique outcome descriptions:**

```typescript
{
  id: 'virtuous',
  label: 'Show Mercy',
  // ... other fields
  outcomeDescriptions: {
    criticalSuccess: 'Your compassion transforms the guilty into reformed citizens.',
    success: 'Justice tempered with mercy resolves the situation.',
    failure: 'Your leniency is seen as weakness.',
    criticalFailure: 'Your mercy emboldens criminals and angers victims.'
  }
}
```

These descriptions are automatically used instead of generic pipeline outcomes when a choice is selected.

**⚠️ CRITICAL REQUIREMENTS - Outcome Descriptions:**

### 1. Narratively Distinct
Outcome descriptions must be **narratively distinct** across TWO dimensions:

**Across Strategic Choices** - Each approach (Virtuous/Practical/Ruthless) tells a completely different story
- Example: Food Shortage's "Feed the People" critical success talks about nobles donating and community networks, while "Prioritize Elite" describes executions and harsh discipline

**Across Outcome Types** - Each outcome level (CS/S/F/CF) shows different consequences within the same approach
- Example: "Feed the People" success shows community gratitude, while failure shows military weakness despite good intentions

**Do NOT use generic fallback text.** Each of the 12 descriptions (3 choices × 4 outcomes) should be unique and specific to both the chosen approach AND the roll result.

### 2. Length Constraint: Under 100 Characters
**All outcome descriptions MUST be under 100 characters.**

This is a hard limit for UI display purposes. Keep descriptions punchy and focused:

- Remove filler words ("your", "the kingdom", "widespread")
- Use sentence fragments when appropriate
- Focus on key consequences, not exhaustive details
- Maximum 2 short sentences per description
- Badges show mechanical effects - descriptions show narrative flavor

## Key Patterns (Do NOT Duplicate)

### 1. Game Command Handlers (`src/services/gameCommands/handlers/`)
**Use for:** Complex operations needing prepare/commit pattern

**Available handlers:**
- `ConvertUnrestToImprisonedHandler` - Imprison dissidents (reduces unrest, adds imprisoned)
- `ReduceImprisonedHandler` - Pardon/release imprisoned
- `DamageStructureHandler` - Damage random structure
- `DestroyStructureHandler` - Completely destroy structure
- `AdjustFactionHandler` - Change faction relations (±1 only)

### 2. Badge Helper Utilities (`src/utils/badge-helpers.ts`)
**Use for:** Actions that need to target an entity with automatic selection

**When to use:**
- Actions that target settlements, structures, or other entities
- Need to select target with most available capacity
- Want to show target name in badge before dice roll

**Available helpers:**
- `createTargetedDiceBadge()` - For dice roll amounts (e.g., "Imprison 1d3 in Hoofton")
- `createTargetedStaticBadge()` - For static amounts (e.g., "Repair 5 in Oakdale")

**Example:**
```typescript
import { createTargetedDiceBadge } from '../../../utils/badge-helpers';
import type { ActionTarget } from '../../../utils/badge-helpers';

// In handler's prepare() method:
const targets: ActionTarget[] = settlements.map(s => ({
  id: s.id,
  name: s.name,
  capacity: calculateCapacity(s) - s.currentAmount
}));

const { badge, targetId, maxCapacity } = createTargetedDiceBadge({
  formula: '1d3',
  action: 'Imprison',
  targets,
  icon: 'fas fa-handcuffs',
  variant: 'info'
});
```

**See:** `docs/core-systems/checks/check-card.md` - Badge Helper Utilities section

### 3. Execution Functions (`src/execution/`)
**Use for:** Simple one-shot effects

**Available functions:**
- `applyArmyConditionExecution` - Apply sickened/enfeebled/fatigued/etc to armies
- `createWorksiteExecution` - Create worksites on hexes
- `tendWoundedExecution` - Heal armies or remove conditions

### 4. Ongoing Modifiers
**Use for:** Multi-turn recurring effects

Add to `kingdom.activeModifiers[]` with `sourceType: 'custom'`. The `CustomModifierService` auto-processes these each turn.

## Reference Implementations

**Study these examples before implementing:**

- **`src/pipelines/events/feud.ts`** - Faction adjustment, imprisonment, structure damage
- **`src/pipelines/events/plague.ts`** - Ongoing modifiers, structure damage/destroy
- **`src/pipelines/events/food-shortage.ts`** - Army conditions, morale checks
- **`src/pipelines/events/immigration.ts`** - Worksite creation
- **`src/pipelines/events/criminal-trial.ts`** - Imprisonment and pardon handlers

## Implementation Checklist

For each new event:

- [ ] Use standardized choice IDs: `'virtuous'`, `'practical'`, `'ruthless'`
- [ ] Add `outcomeDescriptions` to each strategic choice option
- [ ] Use `outcomeBadges` with proper badge templates (see EVENT_MIGRATION_STATUS.md)
- [ ] Check existing handlers/functions before creating new ones
- [ ] Use approach checks: `if (approach === 'virtuous')` not event-specific IDs
- [ ] Test badge-to-modifier conversion with SimpleEventSelector debug tool
- [ ] Verify personality values are set (typically 3 for moderate expression)

## Rules

1. **NEVER use event-specific choice IDs** - Always use `'virtuous'`, `'practical'`, `'ruthless'`
2. **ALWAYS check existing functions** before creating new ones
3. **Use execution functions for simple effects**, handlers for complex ones
4. **Never duplicate handler functionality** that already exists
5. **Follow the one-of-each pattern** - Exactly 1 choice per personality trait
6. **Test thoroughly** using the debug tools before submitting

---
