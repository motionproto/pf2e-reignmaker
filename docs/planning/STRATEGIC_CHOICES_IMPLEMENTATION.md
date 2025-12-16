# Strategic Choices Implementation Guide

## Overview

Strategic choices allow players to select an approach (Virtuous, Practical, or Ruthless) before rolling for an event. This choice determines:
- Available skills for the check
- Personality alignment scoring
- Outcome effects and modifiers for each success level

## Implementation Pattern

Based on existing implementations (`criminal-trial.ts`, `feud.ts`), here's the standard pattern:

### 1. Strategic Choice Configuration

```typescript
strategicChoice: {
  label: 'How will you handle [situation]?',
  required: true,
  options: [
    {
      id: 'virtuous',
      label: '[Virtuous Approach Name]',
      description: '[Brief description]',
      icon: 'fas fa-[icon]',
      skills: ['skill1', 'skill2'],
      personality: { virtuous: 3 },
      outcomeDescriptions: {
        criticalSuccess: '[CS description]',
        success: '[S description]',
        failure: '[F description]',
        criticalFailure: '[CF description]'
      },
      outcomeBadges: {
        criticalSuccess: [/* badges */],
        success: [/* badges */],
        failure: [/* badges */],
        criticalFailure: [/* badges */]
      }
    },
    // Practical option (center)
    {
      id: 'practical',
      // ... same structure
    },
    // Ruthless option (right)
    {
      id: 'ruthless',
      // ... same structure
    }
  ]
}
```

### 2. Preview Function

The preview function reads the selected approach from kingdom state and applies appropriate modifiers:

```typescript
preview: {
  calculate: async (ctx) => {
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    const outcome = ctx.outcome;

    const selectedOption = pipeline.strategicChoice?.options.find(opt => opt.id === approach);
    const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] ? [...selectedOption.outcomeBadges[outcomeType]] : [];

    // Apply approach-specific modifiers
    let modifiers: any[] = [];
    
    if (approach === 'virtuous') {
      // Virtuous modifiers by outcome
    } else if (approach === 'practical') {
      // Practical modifiers by outcome
    } else if (approach === 'ruthless') {
      // Ruthless modifiers by outcome
    }

    ctx.metadata._outcomeModifiers = modifiers;
    return { resources: [], outcomeBadges };
  }
}
```

### 3. Execute Function

The execute function handles special game commands (faction adjustments, imprisonment, structure damage, etc.):

```typescript
execute: async (ctx) => {
  // Execute prepared game commands
  const imprisonCommand = ctx.metadata?._preparedImprison;
  if (imprisonCommand?.commit) {
    await imprisonCommand.commit();
  }

  const factionAdjustment = ctx.metadata?._factionAdjustment;
  if (factionAdjustment?.factionId && factionAdjustment?.newAttitude) {
    await factionService.adjustAttitude(
      factionAdjustment.factionId,
      factionAdjustment.steps
    );
  }

  return { success: true };
}
```

## Event Balance Table Reference

The `EVENT_BALANCE_TABLE.csv` contains all strategic choices with their outcomes:

- **Column Structure**: Name, Approach, Approach Descriptor, CS outcomes, Success outcomes, Failure outcomes, CF outcomes
- **Three Approaches**: Virtuous (compassionate), Practical (pragmatic), Ruthless (authoritarian)
- **Balanced Values**: Each approach has roughly equal total value across all outcomes

## Events Requiring Strategic Choices

Based on the balance table, the following events need strategic choices implemented:

### Already Implemented ✅
1. Criminal Trial
2. Feud
3. Inquisition
4. Public Scandal
5. Plague
6. Food Shortage
7. Natural Disaster
8. Immigration
9. Assassination Attempt
10. Crime Wave

### Need Implementation 📝
11. Notorious Heist
12. Bandit Activity
13. Raiders
14. Trade Agreement
15. Economic Surge
16. Food Surplus
17. Boomtown
18. Land Rush
19. Pilgrimage
20. Diplomatic Overture
21. Festive Invitation
22. Visiting Celebrity
23. Grand Tournament
24. Archaeological Find
25. Magical Discovery
26. Remarkable Treasure
27. Nature's Blessing
28. Good Weather
29. Military Exercises
30. Drug Den
31. Monster Attack
32. Undead Uprising
33. Cult Activity

### Excluded (No Strategic Choices) ❌
- **Demand Expansion** (demand-hex) - Automatic hex selection
- **Demand Structure** (demand-structure) - Automatic structure requirement

## Implementation Checklist

For each event that needs strategic choices:

1. [ ] Add `strategicChoice` configuration with 3 options (virtuous, practical, ruthless)
2. [ ] Map approach names from balance table to option labels
3. [ ] Define skills for each approach based on balance table
4. [ ] Create `outcomeDescriptions` for each approach/outcome combination
5. [ ] Create `outcomeBadges` arrays using badge helpers (`valueBadge`, `diceBadge`, `textBadge`)
6. [ ] Implement `preview.calculate` to read approach and apply modifiers
7. [ ] Prepare game commands (faction adjustments, imprisonment, structure damage, etc.)
8. [ ] Implement `execute` to commit prepared commands
9. [ ] Update base `outcomes` to remove hardcoded modifiers (moved to strategic choices)
10. [ ] Test all 12 combinations (3 approaches × 4 outcomes)

## Badge Helpers

```typescript
import { valueBadge, diceBadge, textBadge } from '../../types/OutcomeBadge';

// Static value
valueBadge('Gain {{value}} Gold', 'fas fa-coins', 5, 'positive')

// Dice formula
diceBadge('Lose {{value}} Food', 'fas fa-wheat', '1d3', 'negative')

// Text only (for game commands)
textBadge('1 structure damaged', 'fas fa-house-crack', 'negative')
```

## Game Command Handlers

Common handlers used in strategic choices:

- `AdjustFactionHandler` - Faction attitude changes
- `ConvertUnrestToImprisonedHandler` - Imprison dissidents
- `ReduceImprisonedHandler` - Pardon prisoners
- `DamageStructureHandler` - Structure damage
- `ArmyConditionHandler` - Army status changes (well-trained, fatigued, enfeebled)

## Notes

- Standard modifiers (gold, unrest, fame) are applied automatically via `outcomeBadges`
- Game commands require prepare/commit pattern in preview/execute
- Faction adjustments use `factionService.adjustAttitude()`
- Approach selection is stored in `kingdom.turnState.eventsPhase.selectedApproach`
- All events use `endsEvent: true` in base outcomes (strategic choices override this if needed)
