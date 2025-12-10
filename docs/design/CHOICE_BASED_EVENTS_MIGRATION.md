# Choice-Based Events Migration Plan

**Status:** Planning Phase  
**Last Updated:** December 8, 2025  
**Owner:** Development Team

---
code docs/design-system/CHOICE_BASED_EVENTS_MIGRATION.md

## Overview

### Vision

Transform the event system from passive resolution (roll → outcome) to **strategic choice-driven gameplay** where every event presents meaningful decisions that express kingdom personality and priorities.

### Current State

- **37 events** with standard flow: Event triggers → Select skill → Roll → Apply outcome
- **31 pure modifier events** - just apply resource changes
- **6 special events** - faction selection, hex claiming, structure damage
- Minimal player agency - skill selection is the only choice

### Target State

- **Every event offers strategic choices** that affect:
  - Available skills (pre-roll approach selection)
  - Outcome benefits (post-roll benefit selection)
  - Kingdom personality (tracked choices influence future events)
- **Merged similar events** into choice-driven "mega-events"
- **Richer narrative** - choices reveal kingdom's values and priorities

### Goals

✅ **Player Agency** - Meaningful decisions in every event  
✅ **Kingdom Personality** - Choices define kingdom character  
✅ **Strategic Depth** - Risk/reward tradeoffs  
✅ **Backward Compatible** - Existing architecture reused  
✅ **Scalable** - Easy to add more choice-based events

---

## Architecture Overview

### UI Flow Changes

#### **Current Flow:**
```
Event Card → Skills Visible → Player Selects Skill → Roll → Outcome
```

#### **New Flow (Pre-Roll Choice):**
```
Event Card → Choice Selector Visible (Skills Hidden)
  ↓
Player Selects Approach
  ↓
Skills Appear (Filtered to Choice) → Player Selects Skill → Roll → Outcome (Modified by Choice)
```

#### **New Flow (Post-Roll Choice):**
```
Event Card → Skills Visible → Player Selects Skill → Roll → Outcome Preview
  ↓
Choice Selector Appears (Inline)
  ↓
Player Selects Benefit → Apply Result
```

### Key Components

1. **PreRollChoiceSelector.svelte** (NEW)
   - Displays approach choices before skill selection
   - Emits selected approach to parent
   - Hides itself after selection

2. **BaseCheckCard.svelte** (MODIFIED)
   - Conditionally shows/hides skills based on choice state
   - Filters skills based on selected approach
   - Passes choice metadata to pipeline

3. **PipelineCoordinator.ts** (MODIFIED)
   - Handles `affectsSkills` flag in interactions
   - Stores selected approach in metadata
   - Filters skills before displaying

4. **CheckPipeline Interface** (EXTENDED)
   - New `affectsSkills: boolean` flag on interactions
   - New `outcomeModifiers` on choice options
   - New `icon` field for visual choices

---

## Event Conversions

### Category 1: Dual Approach Events (Pre-Roll Choice)

Events where the **method of resolution** is a strategic choice.

---

#### **1. Feud → "Conflict Resolution"**

**File:** `src/pipelines/events/feud.ts`

**Current Behavior:**
- Skills: Diplomacy, Intimidation, Deception
- Success: -1 Unrest
- Failure: +1 Unrest
- Critical Failure: +1 Unrest + damage structure

**New Behavior:**

```typescript
preRollInteractions: [
  {
    type: 'choice',
    id: 'approach',
    label: 'How will you handle the feud?',
    required: true,
    affectsSkills: true,
    options: [
      {
        id: 'mediate',
        label: 'Mediate Peacefully',
        description: 'Use diplomacy to bring the families together',
        icon: '🤝',
        skills: ['diplomacy', 'society'],
        outcomeModifiers: {
          criticalSuccess: { unrest: -2, fame: 1 },
          success: { unrest: -2, fame: 1 },
          failure: { unrest: 1 }
        },
        personality: 'diplomatic'
      },
      {
        id: 'force',
        label: 'Force Compliance',
        description: 'Use authority and intimidation to end the conflict',
        icon: '⚔️',
        skills: ['intimidation', 'warfare'],
        outcomeModifiers: {
          success: { unrest: -1 },
          failure: { unrest: 2 },
          criticalFailure: { 
            unrest: 2, 
            gameCommands: [{ type: 'damageStructure', count: 1 }]
          }
        },
        personality: 'forceful'
      },
      {
        id: 'manipulate',
        label: 'Manipulate Outcome',
        description: 'Use deception to secretly resolve the feud',
        icon: '🎭',
        skills: ['deception', 'intrigue'],
        outcomeModifiers: {
          criticalSuccess: { unrest: -2, fame: 1 },
          success: { unrest: -1 },
          failure: { unrest: 1, fame: -1 }
        },
        personality: 'cunning'
      }
    ]
  }
]
```

**Personality Impact:**
- Mediate → +1 Diplomatic, +1 Just
- Force → +1 Forceful, +1 Authoritarian
- Manipulate → +1 Cunning, +1 Political

---

#### **2. Criminal Trial → "Justice Administration"**

**File:** `src/pipelines/events/criminal-trial.ts`

**Current Behavior:**
- Generic justice check
- Success: -1 Unrest
- Failure: +1 Unrest

**New Behavior:**

```typescript
preRollInteractions: [
  {
    type: 'choice',
    id: 'approach',
    label: 'How will you administer justice?',
    required: true,
    affectsSkills: true,
    options: [
      {
        id: 'fair',
        label: 'Fair Trial',
        description: 'Ensure justice is served fairly and transparently',
        icon: '⚖️',
        skills: ['society', 'diplomacy'],
        outcomeModifiers: {
          criticalSuccess: { fame: 2, unrest: -1 },
          success: { fame: 1, unrest: -1 },
          failure: { unrest: 1 }
        },
        personality: 'just'
      },
      {
        id: 'harsh',
        label: 'Harsh Punishment',
        description: 'Make an example to deter future crime',
        icon: '🔨',
        skills: ['intimidation', 'warfare'],
        outcomeModifiers: {
          criticalSuccess: { unrest: -3 },
          success: { unrest: -2 },
          failure: { unrest: 1 },
          criticalFailure: { unrest: 2, fame: -1 }
        },
        personality: 'ruthless'
      },
      {
        id: 'mercy',
        label: 'Show Mercy',
        description: 'Demonstrate compassion and forgiveness',
        icon: '💛',
        skills: ['religion', 'diplomacy'],
        outcomeModifiers: {
          criticalSuccess: { fame: 2, unrest: -1 },
          success: { fame: 1 },
          failure: { unrest: 2 }
        },
        personality: 'compassionate'
      }
    ]
  }
]
```

**Personality Impact:**
- Fair Trial → +1 Just, +1 Democratic
- Harsh Punishment → +1 Ruthless, +1 Authoritarian
- Show Mercy → +1 Compassionate, +1 Forgiving

---

#### **3. Public Scandal → "Crisis Management"**

**File:** `src/pipelines/events/public-scandal.ts`

**Current Behavior:**
- Generic scandal resolution
- Success: -1 Unrest
- Failure: +1 Unrest, -1 Fame

**New Behavior:**

```typescript
preRollInteractions: [
  {
    type: 'choice',
    id: 'approach',
    label: 'How will you handle the scandal?',
    required: true,
    affectsSkills: true,
    options: [
      {
        id: 'transparent',
        label: 'Transparent Investigation',
        description: 'Publicly investigate and reveal the truth',
        icon: '🔍',
        skills: ['society', 'diplomacy'],
        outcomeModifiers: {
          criticalSuccess: { fame: 2, unrest: -1 },
          success: { fame: 1 },
          failure: { fame: -1, unrest: 1 }
        },
        personality: 'honest'
      },
      {
        id: 'coverup',
        label: 'Cover It Up',
        description: 'Suppress the scandal quietly',
        icon: '🤫',
        skills: ['deception', 'intrigue'],
        outcomeModifiers: {
          success: { /* no penalties */ },
          failure: { fame: -2, unrest: 2 },
          criticalFailure: { fame: -3, unrest: 3 }
        },
        personality: 'secretive'
      },
      {
        id: 'scapegoat',
        label: 'Scapegoat Official',
        description: 'Blame a subordinate to protect the crown',
        icon: '👤',
        skills: ['intimidation', 'deception'],
        outcomeModifiers: {
          success: { unrest: -1 },
          failure: { fame: -1, unrest: 1 }
        },
        personality: 'ruthless'
      }
    ]
  }
]
```

**Personality Impact:**
- Transparent → +1 Honest, +1 Transparent
- Cover Up → +1 Secretive, +1 Pragmatic
- Scapegoat → +1 Ruthless, +1 Political

---

#### **4. Inquisition → "Religious Authority"**

**File:** `src/pipelines/events/inquisition.ts`

**Current Behavior:**
- Generic inquisition response
- Success: -1 Unrest
- Failure: +1 Unrest

**New Behavior:**

```typescript
preRollInteractions: [
  {
    type: 'choice',
    id: 'approach',
    label: 'How will you respond to the inquisition?',
    required: true,
    affectsSkills: true,
    options: [
      {
        id: 'support',
        label: 'Support Inquisitors',
        description: 'Endorse the hunt for heresy',
        icon: '🔥',
        skills: ['religion', 'intimidation'],
        outcomeModifiers: {
          success: { unrest: -1 },
          failure: { unrest: 2, fame: -1 }
        },
        personality: 'theocratic'
      },
      {
        id: 'protect',
        label: 'Protect the Accused',
        description: 'Stand against persecution',
        icon: '🛡️',
        skills: ['diplomacy', 'society'],
        outcomeModifiers: {
          criticalSuccess: { fame: 2 },
          success: { fame: 1 },
          failure: { unrest: 1 }
        },
        personality: 'tolerant'
      },
      {
        id: 'neutral',
        label: 'Stay Neutral',
        description: 'Let the church and people work it out',
        icon: '⚖️',
        skills: ['society', 'deception'],
        outcomeModifiers: {
          success: { gold: 1 },  // Both sides bribe you
          failure: { unrest: 2 }  // Everyone angry
        },
        personality: 'pragmatic'
      }
    ]
  }
]
```

**Personality Impact:**
- Support → +1 Theocratic, +1 Authoritarian
- Protect → +1 Tolerant, +1 Just
- Neutral → +1 Pragmatic, +1 Political

---

### Category 2: Benefit Selection Events (Post-Roll Choice)

Events where **success offers multiple reward paths**.

---

#### **5. Economic Surge → "Growth Strategy"**

**File:** `src/pipelines/events/economic-surge.ts`

**Current Behavior:**
- Success: +1d3 Gold
- Critical Success: +2d3 Gold
- Ongoing event

**New Behavior:**

```typescript
postRollInteractions: [
  {
    type: 'choice',
    id: 'benefit',
    label: 'How will you leverage this economic boom?',
    condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
    options: [
      {
        id: 'profit',
        label: 'Maximize Profit',
        description: '+3 Gold',
        icon: '💰',
        modifiers: [
          { type: 'static', resource: 'gold', value: 3 }
        ],
        personality: 'economic'
      },
      {
        id: 'stability',
        label: 'Stability Focus',
        description: '+2 Gold, -1 Unrest',
        icon: '🏛️',
        modifiers: [
          { type: 'static', resource: 'gold', value: 2 },
          { type: 'static', resource: 'unrest', value: -1 }
        ],
        personality: 'stable'
      },
      {
        id: 'infrastructure',
        label: 'Build Infrastructure',
        description: '+1 Gold, Free economic structure',
        icon: '🏗️',
        modifiers: [
          { type: 'static', resource: 'gold', value: 1 }
        ],
        gameCommands: [
          { type: 'grantFreeStructure', category: 'commerce' }
        ],
        personality: 'builder'
      }
    ]
  }
]
```

**Personality Impact:**
- Maximize Profit → +1 Economic, +1 Mercantile
- Stability Focus → +1 Stable, +1 Cautious
- Infrastructure → +1 Builder, +1 Long-term

---

#### **6. Archaeological Find → "Discovery Management"**

**File:** `src/pipelines/events/archaeological-find.ts`

**Current Behavior:**
- Critical Success: +1d4 Gold, -1 Unrest, +1 Fame
- Success: +1 Gold
- Failure: Choice of 1 resource (already has choice!)

**New Behavior:**

Expand success outcomes to include choices:

```typescript
postRollInteractions: [
  {
    type: 'choice',
    id: 'benefit',
    label: 'What will you do with the discovery?',
    condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
    options: [
      {
        id: 'display',
        label: 'Display Artifacts',
        description: 'Create a museum exhibit',
        icon: '🎨',
        modifiers: [
          { type: 'static', resource: 'fame', value: 2 }
        ],
        personality: 'cultural'
      },
      {
        id: 'sell',
        label: 'Sell to Collectors',
        description: 'Maximize economic gain',
        icon: '💰',
        modifiers: [
          { type: 'static', resource: 'gold', value: 3 }
        ],
        personality: 'economic'
      },
      {
        id: 'study',
        label: 'Academic Study',
        description: 'Gain magical knowledge',
        icon: '📚',
        modifiers: [
          { type: 'static', resource: 'gold', value: 1 }
        ],
        // Add +2 bonus to next check (stored in metadata)
        onComplete: async (choice, ctx) => {
          await updateKingdom(k => {
            if (!k.temporaryBonuses) k.temporaryBonuses = [];
            k.temporaryBonuses.push({
              type: 'check',
              value: 2,
              source: 'Archaeological Study',
              duration: 1
            });
          });
        },
        personality: 'scholarly'
      },
      {
        id: 'monument',
        label: 'Build Monument',
        description: 'Construct a cultural landmark',
        icon: '🏛️',
        gameCommands: [
          { type: 'grantFreeStructure', category: 'culture' }
        ],
        personality: 'cultural'
      }
    ]
  }
]
```

Keep existing failure choice as-is.

**Personality Impact:**
- Display → +1 Cultural, +1 Prestige
- Sell → +1 Economic, +1 Pragmatic
- Study → +1 Scholarly, +1 Knowledge
- Monument → +1 Cultural, +1 Builder

---

#### **7. Grand Tournament → "Victory Celebration"**

**File:** `src/pipelines/events/grand-tournament.ts`

**Current Behavior:**
- Success: +1 Fame
- Critical Success: +2 Fame

**New Behavior:**

```typescript
postRollInteractions: [
  {
    type: 'choice',
    id: 'benefit',
    label: 'How will you leverage the tournament's success?',
    condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
    options: [
      {
        id: 'military',
        label: 'Military Display',
        description: '+1 Fame, Army training bonus',
        icon: '🎖️',
        modifiers: [
          { type: 'static', resource: 'fame', value: 1 }
        ],
        onComplete: async (choice, ctx) => {
          // Grant +1 to next army training action
          await updateKingdom(k => {
            if (!k.temporaryBonuses) k.temporaryBonuses = [];
            k.temporaryBonuses.push({
              type: 'action',
              actionId: 'train-army',
              value: 2,
              source: 'Tournament Training',
              duration: 1
            });
          });
        },
        personality: 'military'
      },
      {
        id: 'cultural',
        label: 'Cultural Celebration',
        description: '+2 Fame, -1 Unrest',
        icon: '🎭',
        modifiers: [
          { type: 'static', resource: 'fame', value: 2 },
          { type: 'static', resource: 'unrest', value: -1 }
        ],
        personality: 'cultural'
      },
      {
        id: 'economic',
        label: 'Prize Economy',
        description: '+2 Gold from merchant sponsorships',
        icon: '💰',
        modifiers: [
          { type: 'static', resource: 'gold', value: 2 }
        ],
        personality: 'economic'
      },
      {
        id: 'diplomatic',
        label: 'Diplomatic Showcase',
        description: 'Improve relations with 1 faction',
        icon: '🤝',
        modifiers: [
          { type: 'static', resource: 'fame', value: 1 }
        ],
        gameCommands: [
          { type: 'adjustFactionAttitude', steps: 1 }
        ],
        personality: 'diplomatic'
      }
    ]
  }
]
```

**Personality Impact:**
- Military → +1 Military, +1 Martial
- Cultural → +1 Cultural, +1 Prestige
- Economic → +1 Economic, +1 Mercantile
- Diplomatic → +1 Diplomatic, +1 Social

---

### Category 3: Crisis Mitigation Events

Events where **failure offers damage control options**.

---

#### **8. Food Shortage → "Famine Response"**

**File:** `src/pipelines/events/food-shortage.ts`

**Current Behavior:**
- Success: -1d4 Food
- Failure: -2d4 Food, +1 Unrest
- Critical Failure: -2d6+1 Food, +2 Unrest

**New Behavior:**

```typescript
postRollInteractions: [
  {
    type: 'choice',
    id: 'mitigation',
    label: 'How will you mitigate the food shortage?',
    condition: (ctx) => ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure',
    options: [
      {
        id: 'import',
        label: 'Emergency Imports',
        description: 'Buy food from neighbors (-4 Gold, reduce food loss by half)',
        icon: '💰',
        modifiers: [
          { type: 'static', resource: 'gold', value: -4 }
        ],
        onComplete: async (choice, ctx) => {
          // Reduce food loss by half (already applied, so refund half)
          const foodLost = Math.abs(ctx.metadata.foodChange || 0);
          const refund = Math.floor(foodLost / 2);
          await updateKingdom(k => {
            k.resources.food += refund;
          });
        },
        personality: 'economic'
      },
      {
        id: 'ration',
        label: 'Strict Rationing',
        description: '+2 Unrest, reduce food loss by half',
        icon: '😠',
        modifiers: [
          { type: 'static', resource: 'unrest', value: 2 }
        ],
        onComplete: async (choice, ctx) => {
          // Reduce food loss by half
          const foodLost = Math.abs(ctx.metadata.foodChange || 0);
          const refund = Math.floor(foodLost / 2);
          await updateKingdom(k => {
            k.resources.food += refund;
          });
        },
        personality: 'authoritarian'
      },
      {
        id: 'accept',
        label: 'Accept Losses',
        description: 'No additional cost, full food loss applies',
        icon: '📉',
        modifiers: [],
        personality: 'resigned'
      }
    ]
  }
]
```

**Personality Impact:**
- Emergency Imports → +1 Economic, +1 Pragmatic
- Strict Rationing → +1 Authoritarian, +1 Harsh
- Accept Losses → +1 Resigned, +1 Fatalistic

---

## Implementation Phases

### **Phase 1: Core Infrastructure** (3-4 hours)

#### 1.1 Type Definitions

**File:** `src/types/CheckPipeline.ts`

Add new fields to `Interaction` interface:

```typescript
export interface Interaction {
  // ... existing fields ...
  
  // NEW: Choice-specific fields
  affectsSkills?: boolean;  // If true, choice filters available skills
  options?: ChoiceOption[];  // Choice options (for type='choice')
  
  // NEW: Personality tracking
  personality?: string;  // Personality trait affected by this choice
}

export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  icon?: string;  // Emoji or icon class
  skills?: string[];  // Skills available for this choice (if affectsSkills=true)
  modifiers?: EventModifier[];  // Modifiers to apply
  gameCommands?: GameCommand[];  // Game commands to execute
  outcomeModifiers?: {  // Modifiers per outcome (overrides base)
    criticalSuccess?: { [resource: string]: number };
    success?: { [resource: string]: number };
    failure?: { [resource: string]: number };
    criticalFailure?: { [resource: string]: number };
  };
  onComplete?: (choice: any, ctx: CheckContext) => Promise<void>;  // Custom logic
  personality?: string;  // Personality trait for this choice
}
```

#### 1.2 PreRollChoiceSelector Component

**File:** `src/view/kingdom/components/CheckCard/components/PreRollChoiceSelector.svelte`

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let label: string;
  export let options: any[];
  export let disabled: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  function selectOption(optionId: string) {
    if (disabled) return;
    dispatch('select', { optionId });
  }
</script>

<div class="pre-roll-choice-selector">
  <h4 class="choice-label">{label}</h4>
  <div class="choice-options">
    {#each options as option}
      <button
        class="choice-option"
        on:click={() => selectOption(option.id)}
        disabled={disabled}
      >
        {#if option.icon}
          <span class="option-icon">{option.icon}</span>
        {/if}
        <div class="option-content">
          <div class="option-label">{option.label}</div>
          <div class="option-description">{option.description}</div>
        </div>
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .pre-roll-choice-selector {
    margin: var(--space-16) 0;
  }
  
  .choice-label {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-12);
  }
  
  .choice-options {
    display: flex;
    flex-direction: column;
    gap: var(--space-10);
  }
  
  .choice-option {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    padding: var(--space-12) var(--space-16);
    background: var(--surface-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    
    &:hover:not(:disabled) {
      background: var(--surface-primary-high);
      border-color: var(--border-primary-medium);
      transform: translateY(-1px);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .option-icon {
    font-size: var(--font-2xl);
    line-height: 1;
  }
  
  .option-content {
    flex: 1;
  }
  
  .option-label {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  }
  
  .option-description {
    font-size: var(--font-sm);
    color: var(--text-secondary);
  }
</style>
```

#### 1.3 BaseCheckCard Integration

**File:** `src/view/kingdom/components/BaseCheckCard.svelte`

Add pre-roll choice handling:

```svelte
<script lang="ts">
  // ... existing imports ...
  import PreRollChoiceSelector from './CheckCard/components/PreRollChoiceSelector.svelte';
  
  // ... existing props ...
  export let preRollChoice: any = null;  // Pre-roll choice configuration
  
  // ... existing code ...
  
  // Track choice state
  let selectedApproach: string | null = null;
  let availableSkillsFiltered: any[] = [];
  
  // Filter skills based on selected approach
  $: effectiveSkills = selectedApproach && preRollChoice?.options
    ? skillsWithLore.filter(s => {
        const option = preRollChoice.options.find((o: any) => o.id === selectedApproach);
        return option?.skills?.includes(s.skill);
      })
    : skillsWithLore;
  
  function handleApproachSelect(event: CustomEvent) {
    const { optionId } = event.detail;
    selectedApproach = optionId;
    
    // Dispatch to parent to store in metadata
    dispatch('approachSelected', { approach: optionId });
  }
</script>

<!-- In card details, before skills section -->
{#if preRollChoice && !selectedApproach && !resolved}
  <PreRollChoiceSelector
    label={preRollChoice.label}
    options={preRollChoice.options}
    disabled={isRolling || !isViewingCurrentPhase}
    on:select={handleApproachSelect}
  />
{:else if skills && skills.length > 0 && (!resolved || checkType === 'action')}
  <!-- Show skills section (existing code) -->
  <!-- Use effectiveSkills instead of skillsWithLore -->
{/if}
```

#### 1.4 PipelineCoordinator Integration

**File:** `src/services/PipelineCoordinator.ts`

Update `step2_preRollInteractions` to handle skill filtering:

```typescript
private async step2_preRollInteractions(ctx: PipelineContext): Promise<void> {
  // ... existing code ...
  
  for (const interaction of pipeline.preRollInteractions) {
    const result = await this.executeInteraction(interaction, kingdom, metadata);
    
    // Store result in metadata
    if (interaction.id && result !== null && result !== undefined) {
      metadata[interaction.id] = result;
      
      // NEW: Handle skill filtering for choices
      if (interaction.type === 'choice' && interaction.affectsSkills) {
        const selectedOption = interaction.options?.find((o: any) => o.id === result);
        if (selectedOption?.skills) {
          metadata.availableSkills = selectedOption.skills;
          log(ctx, 2, 'preRollInteractions', `Skills filtered to: ${selectedOption.skills.join(', ')}`);
        }
      }
    }
  }
}
```

### **Phase 2: Event Conversions** (6-8 hours)

Convert each event one at a time, test in isolation, then move to next.

#### Order of Implementation:

1. **Feud** (simplest pre-roll choice)
2. **Economic Surge** (simplest post-roll choice)
3. **Criminal Trial** (expand pre-roll patterns)
4. **Archaeological Find** (expand existing choice)
5. **Public Scandal** (complex pre-roll)
6. **Grand Tournament** (complex post-roll with callbacks)
7. **Inquisition** (pre-roll with faction impact)
8. **Food Shortage** (crisis mitigation pattern)

#### Conversion Checklist (per event):

- [ ] Create backup of original file
- [ ] Add `preRollInteractions` or `postRollInteractions` array
- [ ] Define choice options with modifiers
- [ ] Update `outcomes` to reference choice modifiers
- [ ] Add personality tracking (if Phase 4 included)
- [ ] Test in-game (all outcomes)
- [ ] Verify choice persistence across rerolls
- [ ] Update event documentation

### **Phase 3: Testing & Refinement** (3-4 hours)

#### 3.1 Manual Testing Checklist

For each converted event:

- [ ] Pre-roll choice displays correctly
- [ ] Skills filter based on choice
- [ ] Selected approach persists in UI
- [ ] Roll executes with correct skills
- [ ] Outcome modifiers apply correctly
- [ ] Post-roll choices display (if applicable)
- [ ] Choice benefits apply correctly
- [ ] Reroll preserves selections
- [ ] Multi-player sync works
- [ ] Visual polish (icons, spacing, colors)

#### 3.2 Regression Testing

Verify existing events still work:

- [ ] Events without choices still function
- [ ] Pure modifier events unchanged
- [ ] Special events (faction, hex, structure) unaffected
- [ ] Event phase flow unchanged
- [ ] Ignore button still works

#### 3.3 Balance Review

For each choice:

- [ ] Risk/reward feels balanced
- [ ] No dominant strategy
- [ ] Meaningful tradeoffs exist
- [ ] Outcomes feel fair

### **Phase 4: Future Enhancements** (Optional)

#### 4.1 Personality Tracking System

**File:** `src/services/PersonalityTracker.ts`

```typescript
export interface PersonalityTrait {
  id: string;
  name: string;
  value: number;  // 0-10 scale
  description: string;
}

export class PersonalityTracker {
  async recordChoice(choice: string, personality: string): Promise<void> {
    await updateKingdom(k => {
      if (!k.personality) {
        k.personality = {};
      }
      
      if (!k.personality[personality]) {
        k.personality[personality] = 0;
      }
      
      k.personality[personality] += 1;
    });
  }
  
  getPersonalityProfile(): PersonalityTrait[] {
    const kingdom = getKingdomData();
    const personality = kingdom?.personality || {};
    
    return Object.entries(personality).map(([id, value]) => ({
      id,
      name: this.getTraitName(id),
      value: value as number,
      description: this.getTraitDescription(id)
    }));
  }
  
  private getTraitName(id: string): string {
    const names: Record<string, string> = {
      diplomatic: 'Diplomatic',
      forceful: 'Forceful',
      cunning: 'Cunning',
      just: 'Just',
      ruthless: 'Ruthless',
      economic: 'Economic',
      cultural: 'Cultural',
      // ... etc
    };
    return names[id] || id;
  }
  
  private getTraitDescription(id: string): string {
    // Return description for each trait
  }
}
```

#### 4.2 Personality-Triggered Events

Create new events that only trigger based on personality:

**Example:** "Diplomatic Crisis" - Only triggers if `diplomatic >= 5`

```typescript
{
  id: 'diplomatic-crisis',
  name: 'Diplomatic Crisis',
  description: 'Your reputation as a peacemaker draws a difficult negotiation',
  
  // Only rolls if personality is high enough
  requirements: (kingdom) => ({
    met: (kingdom.personality?.diplomatic || 0) >= 5,
    reason: 'Requires Diplomatic personality'
  }),
  
  // ... rest of event
}
```

#### 4.3 Faction Reactions to Choices

Some factions approve/disapprove based on kingdom choices:

```typescript
// In choice option
{
  id: 'harsh-punishment',
  label: 'Harsh Punishment',
  // ...
  factionReactions: [
    { factionId: 'merchants-guild', attitudeChange: -1 },  // Disapprove
    { factionId: 'military', attitudeChange: 1 }  // Approve
  ]
}
```

#### 4.4 Choice History UI

Display past choices in kingdom sheet:

**Location:** `src/view/kingdom/tabs/overview/PersonalityTab.svelte`

Shows:
- Personality trait bars (visual representation)
- Recent choices made (last 10)
- Dominant personality traits
- Predicted future event types

---

## Testing Strategy

### Unit Tests (Optional)

- [ ] Choice option filtering logic
- [ ] Skill filtering based on choice
- [ ] Outcome modifier merging
- [ ] Personality tracking calculations

### Integration Tests

- [ ] Full event flow (choice → roll → outcome)
- [ ] Reroll with preserved choices
- [ ] Multi-player choice sync
- [ ] Cross-phase persistence

### Manual Testing Script

```
1. Start new kingdom in Events phase
2. Trigger test event (use debug panel)
3. Verify choice selector appears
4. Select each choice option
5. Verify skills filter correctly
6. Execute skill check for each outcome
7. Verify modifiers apply correctly
8. Test reroll with preserved choice
9. Test multi-player sync (if applicable)
10. Verify no console errors
```

---

## Rollback Plan

If issues arise, rollback is simple:

1. **Revert converted event files** from backups
2. **Remove PreRollChoiceSelector component** (no dependencies)
3. **Revert BaseCheckCard.svelte** (minimal changes, isolated)
4. **No database migrations** - metadata is non-breaking

All changes are **additive and backward-compatible**.

---

## Success Metrics

### Quantitative
- ✅ 8 events converted successfully
- ✅ 0 regression bugs in existing events
- ✅ < 100ms UI delay for choice rendering
- ✅ 100% of choices result in expected outcomes

### Qualitative
- ✅ Players report increased engagement
- ✅ Choices feel meaningful and impactful
- ✅ Kingdom personality emerges from choices
- ✅ UI flow feels natural and intuitive

---

## Timeline Estimate

- **Phase 1** (Infrastructure): 3-4 hours
- **Phase 2** (Event Conversions): 6-8 hours
- **Phase 3** (Testing): 3-4 hours
- **Phase 4** (Personality System): 4-6 hours (optional)

**Total:** 12-16 hours (core), +4-6 hours (personality system)

---

## Next Steps

1. ✅ Create migration plan (this document)
2. 🔲 Review and approve plan
3. 🔲 Begin Phase 1 (infrastructure)
4. 🔲 Test infrastructure with mock event
5. 🔲 Begin Phase 2 (event conversions)
6. 🔲 Iterative testing per event
7. 🔲 Phase 3 final testing
8. 🔲 Optional: Phase 4 personality system

---

## Questions & Decisions

### Open Questions
- Should personality tracking be in Phase 1 or Phase 4?
- Do we want faction reactions to choices immediately?
- Should choices affect DC difficulty?
- Do we need choice history persistence?

### Decisions Made
- ✅ Use inline choice selector (not modal)
- ✅ Pre-roll choices filter skills
- ✅ Post-roll choices shown in outcome preview
- ✅ Reroll preserves choice selections
- ✅ Backward compatible with existing events

---

## References

- [Event System Documentation](../systems/EVENT_SYSTEM.md)
- [Pipeline Architecture](./ARCHITECTURE_SUMMARY.md)
- [CheckPipeline Interface](../../src/types/CheckPipeline.ts)
- [BaseCheckCard Component](../../src/view/kingdom/components/BaseCheckCard.svelte)

---

**End of Migration Plan**
