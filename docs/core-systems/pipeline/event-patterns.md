# Event Pipeline Patterns Reference

**Quick Reference Guide for Implementing Events**

**Last Updated:** December 10, 2025

---

## Overview

Events represent things that happen TO your kingdom, requiring you to respond. Unlike actions (which you choose to perform), events are triggered by the game system and present challenges or opportunities.

This guide covers:
- Standard events (simple modifier application)
- **Strategic choice events** (with voting system)
- Outcome badges in events
- Personality tracking system

---

## Event Types

### Type 1: Standard Events

**When:** Event has one possible approach, outcomes determined purely by skill check

**Structure:**
```typescript
export const standardEventPipeline: CheckPipeline = {
  id: 'event-id',
  name: 'Event Name',
  description: 'Event description',
  checkType: 'event',
  tier: 1,
  
  skills: [
    { skill: 'diplomacy', description: 'negotiate peacefully' },
    { skill: 'intimidation', description: 'use force' }
  ],
  
  outcomes: {
    criticalSuccess: {
      description: 'Excellent outcome',
      modifiers: [
        { type: 'static', resource: 'fame', value: 2, duration: 'immediate' }
      ],
      endsEvent: true
    },
    success: {
      description: 'Good outcome',
      modifiers: [
        { type: 'static', resource: 'fame', value: 1, duration: 'immediate' }
      ],
      endsEvent: true
    },
    failure: {
      description: 'Bad outcome',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      endsEvent: true
    },
    criticalFailure: {
      description: 'Terrible outcome',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }
      ],
      endsEvent: true
    }
  },
  
  preview: {
    calculate: async (ctx) => {
      // Optional: Add dynamic preview logic
      // If omitted, badges auto-generated from modifiers
      return { resources: [], outcomeBadges: [] };
    }
  },
  
  traits: ['ongoing']  // Optional: 'ongoing', 'dangerous', 'beneficial'
};
```

---

## Type 2: Strategic Choice Events (With Voting)

**When:** Event offers multiple strategic approaches that fundamentally change the nature of the resolution

### Architecture

**Key Concept:** Strategic choices appear BEFORE skills are shown and determine which skills are available.

**Flow:**
```
Event Triggered
    ↓
Leadership votes on approach (PreRollChoiceSelector)
    ↓
Skills filtered based on chosen approach
    ↓
Player selects skill and rolls
    ↓
Outcome determined by approach + roll result
    ↓
Modifiers applied based on approach + outcome
```

### Complete Example: Criminal Trial

```typescript
import type { CheckPipeline } from '../../types/CheckPipeline';
import { valueBadge } from '../../types/OutcomeBadge';

export const criminalTrialPipeline: CheckPipeline = {
  id: 'criminal-trial',
  name: 'Criminal Trial',
  description: 'Authorities catch a notorious criminal or resolve a major injustice.',
  checkType: 'event',
  tier: 1,

  // Strategic choice - triggers voting system
  // Options ordered: Virtuous (left) → Practical (center) → Ruthless (right)
  strategicChoice: {
    label: 'How will you administer justice?',
    required: true,
    options: [
      {
        id: 'mercy',
        label: 'Show Mercy',
        description: 'Demonstrate compassion and forgiveness',
        icon: 'fas fa-dove',
        skills: ['religion', 'diplomacy'],
        personality: { virtuous: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 3, 'negative')
          ]
        }
      },
      {
        id: 'fair',
        label: 'Fair Trial',
        description: 'Ensure justice is served fairly and transparently',
        icon: 'fas fa-balance-scale',
        skills: ['society', 'diplomacy'],
        personality: { practical: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          success: [
            valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive'),
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 1, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')
          ]
        }
      },
      {
        id: 'harsh',
        label: 'Harsh Punishment',
        description: 'Make an example to deter future crime',
        icon: 'fas fa-gavel',
        skills: ['intimidation', 'performance'],
        personality: { ruthless: 3 },
        outcomeBadges: {
          criticalSuccess: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 3, 'positive')
          ],
          success: [
            valueBadge('Reduce Unrest by {{value}}', 'fas fa-shield-alt', 2, 'positive')
          ],
          failure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
          ],
          criticalFailure: [
            valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative'),
            valueBadge('Lose {{value}} Fame', 'fas fa-star', 1, 'negative')
          ]
        }
      }
    ]
  },

  // All skills available across all approaches
  skills: [
    { skill: 'society', description: 'legal proceedings' },
    { skill: 'diplomacy', description: 'public ceremony' },
    { skill: 'intimidation', description: 'show of force' },
    { skill: 'performance', description: 'public demonstration' },
    { skill: 'religion', description: 'moral guidance' },
  ],

  // Base outcomes - modifiers calculated dynamically by preview
  outcomes: {
    criticalSuccess: {
      description: 'Your handling of justice is exemplary.',
      endsEvent: true,
      modifiers: [], // Populated dynamically
      outcomeBadges: [] // Populated from strategicChoice.options
    },
    success: {
      description: 'Justice is served effectively.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    failure: {
      description: 'Complications arise from your approach.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'Your approach backfires severely.',
      endsEvent: true,
      modifiers: [],
      outcomeBadges: []
    }
  },

  preview: {
    calculate: async (ctx) => {
      // Read approach from kingdom store (set by voting system)
      const { get } = await import('svelte/store');
      const { kingdomData } = await import('../../stores/KingdomStore');
      const kingdom = get(kingdomData);
      const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
      const outcome = ctx.outcome;

      // Find the selected approach option
      const selectedOption = criminalTrialPipeline.strategicChoice?.options.find(
        opt => opt.id === approach
      );
      
      // Get outcome badges from the selected approach
      const outcomeType = outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] || [];

      // Calculate modifiers based on approach (mirrors badges)
      let modifiers: any[] = [];
      
      if (approach === 'mercy') {
        if (outcome === 'criticalSuccess') {
          modifiers = [
            { type: 'static', resource: 'fame', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
          ];
        } else if (outcome === 'success') {
          modifiers = [{ type: 'static', resource: 'fame', value: 1, duration: 'immediate' }];
        } else if (outcome === 'failure') {
          modifiers = [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }];
        } else if (outcome === 'criticalFailure') {
          modifiers = [{ type: 'static', resource: 'unrest', value: 3, duration: 'immediate' }];
        }
      } else if (approach === 'fair') {
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
          modifiers = [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }];
        } else if (outcome === 'criticalFailure') {
          modifiers = [{ type: 'static', resource: 'unrest', value: 2, duration: 'immediate' }];
        }
      } else if (approach === 'harsh') {
        if (outcome === 'criticalSuccess') {
          modifiers = [{ type: 'static', resource: 'unrest', value: -3, duration: 'immediate' }];
        } else if (outcome === 'success') {
          modifiers = [{ type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }];
        } else if (outcome === 'failure') {
          modifiers = [{ type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }];
        } else if (outcome === 'criticalFailure') {
          modifiers = [
            { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
            { type: 'static', resource: 'fame', value: -1, duration: 'immediate' }
          ];
        }
      }

      // Store modifiers for execute step
      ctx.metadata._outcomeModifiers = modifiers;

      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    // Apply modifiers calculated in preview
    const modifiers = ctx.metadata?._outcomeModifiers || [];
    if (modifiers.length > 0) {
      const { updateKingdom } = await import('../../stores/KingdomStore');
      await updateKingdom((kingdom) => {
        for (const mod of modifiers) {
          if (mod.resource === 'unrest') {
            kingdom.unrest = Math.max(0, kingdom.unrest + mod.value);
          } else if (mod.resource === 'fame') {
            kingdom.fame = Math.max(0, kingdom.fame + mod.value);
          }
        }
      });
    }

    return { success: true };
  },

  traits: ['beneficial']
};
```

---

## Strategic Choice: Key Components

### 1. Choice Ordering Rule

**IMPORTANT:** Strategic choice options MUST be ordered left-to-right:

1. **LEFT (Virtuous)** - Does what is right, regardless of cost
2. **CENTER (Practical)** - Balanced, lawful, tries to please all parties
3. **RIGHT (Ruthless)** - Acts at expense of others for self-profit

**Example:**
```typescript
strategicChoice: {
  options: [
    { id: 'mercy', personality: { virtuous: 3 } },    // LEFT
    { id: 'fair', personality: { practical: 3 } },    // CENTER
    { id: 'harsh', personality: { ruthless: 3 } }     // RIGHT
  ]
}
```

### 2. Outcome Badges in Options

Each strategic choice option defines its own badges for each outcome:

```typescript
{
  id: 'approach-id',
  label: 'Approach Name',
  description: 'What this approach means',
  icon: 'fas fa-icon',
  skills: ['skill1', 'skill2'],
  personality: { virtuous: 3 },  // Or practical/ruthless
  outcomeBadges: {
    criticalSuccess: [
      valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive')
    ],
    success: [
      valueBadge('Gain {{value}} Fame', 'fas fa-star', 1, 'positive')
    ],
    failure: [
      valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 1, 'negative')
    ],
    criticalFailure: [
      valueBadge('Gain {{value}} Unrest', 'fas fa-exclamation-triangle', 2, 'negative')
    ]
  }
}
```

### 3. Preview Calculate Pattern

The `preview.calculate()` function reads badges from the selected option:

```typescript
preview: {
  calculate: async (ctx) => {
    // 1. Get selected approach from kingdom store
    const { get } = await import('svelte/store');
    const { kingdomData } = await import('../../stores/KingdomStore');
    const kingdom = get(kingdomData);
    const approach = kingdom.turnState?.eventsPhase?.selectedApproach;
    
    // 2. Find the selected option
    const selectedOption = myEventPipeline.strategicChoice?.options.find(
      opt => opt.id === approach
    );
    
    // 3. Get badges for current outcome
    const outcomeType = ctx.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    const outcomeBadges = selectedOption?.outcomeBadges?.[outcomeType] || [];
    
    // 4. Calculate corresponding modifiers
    const modifiers = calculateModifiersForApproach(approach, ctx.outcome);
    ctx.metadata._outcomeModifiers = modifiers;
    
    return { resources: [], outcomeBadges };
  }
}
```

---

## Personality Tracking System

### Overview

Strategic choices track kingdom personality over time, influencing future events and narrative.

### Personality Traits

Three core personality dimensions:

| Trait | Description | Scale |
|-------|-------------|-------|
| **virtuous** | Does what is right, regardless of cost | 0-10 |
| **practical** | Balanced, lawful, tries to please all parties | 0-10 |
| **ruthless** | Acts at expense of others for self-profit | 0-10 |

### Tracking in Choices

Each strategic choice option specifies its personality impact:

```typescript
{
  id: 'mercy',
  label: 'Show Mercy',
  personality: { virtuous: 3 }  // Adds 3 to virtuous when selected
}
```

**Weighted Impact:** Value represents strength of personality expression (1-10 scale)
- **1-2:** Minor expression
- **3-5:** Moderate expression
- **6-8:** Strong expression
- **9-10:** Defining choice

### Multiple Traits

Some choices can affect multiple traits:

```typescript
{
  id: 'scapegoat',
  label: 'Scapegoat Official',
  personality: {
    practical: 2,  // Somewhat practical (solves problem)
    ruthless: 5    // Primarily ruthless (sacrifices subordinate)
  }
}
```

### Future Expansion

Personality tracking enables:
- **Personality-gated events** - Only trigger if certain traits are high
- **Faction reactions** - Factions approve/disapprove based on personality
- **Narrative branching** - Different event chains for different personalities
- **Reputation system** - Kingdom known for its governing philosophy

---

## Implemented Strategic Choice Events

### 1. Criminal Trial

**Approaches:**
- **Virtuous:** Show Mercy (religion, diplomacy)
- **Practical:** Fair Trial (society, diplomacy)
- **Ruthless:** Harsh Punishment (intimidation, performance)

**Focus:** Justice administration philosophy

### 2. Feud

**Approaches:**
- **Virtuous:** Mediate Peacefully (diplomacy, society)
- **Practical:** ??? (needs implementation)
- **Ruthless:** Force Compliance (intimidation, warfare)

**Focus:** Conflict resolution methods

### 3. Inquisition

**Approaches:**
- **Virtuous:** Protect the Accused (diplomacy, society)
- **Practical:** Stay Neutral (society, deception)
- **Ruthless:** Support Inquisitors (religion, intimidation)

**Focus:** Religious authority and tolerance

### 4. Public Scandal

**Approaches:**
- **Virtuous:** Transparent Investigation (society, diplomacy)
- **Practical:** Scapegoat Official (intimidation, deception)
- **Ruthless:** Cover It Up (deception, intrigue)

**Focus:** Crisis management and honesty

---

## Pattern Comparison Table

| Feature | Standard Event | Strategic Choice Event |
|---------|---------------|----------------------|
| **Number of approaches** | 1 | 3 (virtuous/practical/ruthless) |
| **Skill selection** | From full list | Filtered by chosen approach |
| **Outcome badges** | Static in `outcomes` | Dynamic from `strategicChoice.options` |
| **Voting system** | No | Yes (PreRollChoiceSelector) |
| **Personality tracking** | No | Yes (per option) |
| **Preview calculation** | Optional | Required (reads from options) |
| **Complexity** | Low | Medium |

---

## Quick Implementation Checklist

When implementing a new strategic choice event:

### 1. Define Strategic Choice
- [ ] Create 3 options (virtuous, practical, ruthless)
- [ ] Order left to right
- [ ] Assign icons (Font Awesome)
- [ ] Define skills for each approach (2-3 per option)
- [ ] Set personality values

### 2. Define Outcome Badges
- [ ] Create badges for each option × outcome (12 total)
- [ ] Use `valueBadge()` for numeric effects
- [ ] Use `textBadge()` for special effects
- [ ] Ensure badges match modifiers

### 3. Implement Preview
- [ ] Read selected approach from kingdom store
- [ ] Find selected option
- [ ] Extract outcome badges
- [ ] Calculate matching modifiers
- [ ] Store modifiers in `ctx.metadata._outcomeModifiers`

### 4. Implement Execute
- [ ] Apply stored modifiers to kingdom
- [ ] Handle edge cases (no approach selected)
- [ ] Return success

### 5. Test
- [ ] Verify voting UI appears
- [ ] Test all 3 approaches
- [ ] Test all 4 outcomes per approach (12 combinations)
- [ ] Verify badges match modifiers
- [ ] Verify personality tracking (future)

---

## Common Mistakes

### ❌ Wrong Badge Location

```typescript
// WRONG - Badges in outcomes
outcomes: {
  success: {
    outcomeBadges: [valueBadge('...')]  // ❌ Static, not approach-specific
  }
}
```

```typescript
// CORRECT - Badges in strategicChoice.options
strategicChoice: {
  options: [{
    id: 'approach',
    outcomeBadges: {
      success: [valueBadge('...')]  // ✅ Approach-specific
    }
  }]
}
```

### ❌ Missing Outcome Type Cast

```typescript
// WRONG - TypeScript error
const badges = option.outcomeBadges[ctx.outcome];  // ❌ Type error
```

```typescript
// CORRECT - Cast to outcome type
const outcomeType = ctx.outcome as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
const badges = option.outcomeBadges[outcomeType];  // ✅ Works
```

### ❌ Badge-Modifier Mismatch

```typescript
// WRONG - Badge and modifier don't match
outcomeBadges: {
  success: [valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive')]
}
// But modifier says:
modifiers: [{ type: 'static', resource: 'fame', value: 1 }]  // ❌ Values don't match!
```

```typescript
// CORRECT - Badge and modifier match
outcomeBadges: {
  success: [valueBadge('Gain {{value}} Fame', 'fas fa-star', 2, 'positive')]
}
modifiers: [{ type: 'static', resource: 'fame', value: 2 }]  // ✅ Matches badge
```

---

## Related Documentation

- **Pipeline Coordinator:** [pipeline-coordinator.md](./pipeline-coordinator.md)
- **Pipeline Patterns (Actions):** [pipeline-patterns.md](./pipeline-patterns.md)
- **Choice-Based Events Migration:** [../../design/CHOICE_BASED_EVENTS_MIGRATION.md](../../design/CHOICE_BASED_EVENTS_MIGRATION.md)
- **CheckPipeline Types:** `src/types/CheckPipeline.ts`
- **EventResponseChoice Types:** `src/types/EventResponseChoice.ts`

---

**Status:** ✅ Production Ready - 4 strategic choice events implemented
