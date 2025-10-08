# CheckCard Unification Analysis

## Overview

After refactoring the old `CheckCard.svelte` into `EventCard.svelte` and making both components architecturally compliant, we can now compare the two components to identify overlaps and unification opportunities.

## Component Comparison

### EventCard (`src/view/kingdom/components/EventCard.svelte`)
- **Used by:** EventsPhase, UnrestPhase, OngoingEventCard
- **Handles:** Event and Incident resolution
- **Size:** ~200 lines (pure presentation)
- **Unique Features:**
  - `showIgnoreButton` prop (events only)
  - Simpler prop structure (no expansion/availability logic)
  - No completion tracking
  - Direct event dispatching pattern

### CheckCard (`src/view/kingdom/components/CheckCard/CheckCard.svelte`)
- **Used by:** ActionsPhase
- **Handles:** Player action resolution
- **Size:** ~300 lines (pure presentation)
- **Unique Features:**
  - Expandable/collapsible cards
  - Availability checking and missing requirements display
  - `CompletionNotifications` component for tracking multiple player completions
  - Special/cost display sections
  - More complex state management (expanded, available, etc.)

## Key Overlaps

### 1. **Shared UI Components** ✅
Both use:
- `SkillTag` component
- `PossibleOutcomes`/`OutcomesSection` component
- `OutcomeDisplay` component

### 2. **Event Dispatching Pattern** ✅
Both dispatch the same core events:
- `on:executeSkill` - Skill execution
- `on:applyResult` - Apply resolution
- `on:cancel` - Cancel resolution
- `on:reroll` - Reroll with fame
- `on:debugOutcomeChanged` - Debug mode

### 3. **Resolution State Management** ✅
Both manage resolution state via props:
```typescript
resolved: boolean
resolution: {
  outcome: string;
  actorName: string;
  skillName: string;
  effect: string;
  stateChanges?: Record<string, any>;
  modifiers?: any[];
  manualEffects?: string[];
  // ...
}
```

### 4. **Aid Another Support** ✅
Both support Aid Another functionality:
- `showAidButton` prop
- `aidResult` prop
- Aid button/badge rendering

## Key Differences

### 1. **Card Expansion Logic**
- **CheckCard:** Has expand/collapse functionality with header
- **EventCard:** Always expanded (no header/expansion)

### 2. **Availability/Requirements**
- **CheckCard:** Shows availability state, missing requirements
- **EventCard:** No availability checking (events/incidents are always "available")

### 3. **Completion Tracking**
- **CheckCard:** Uses `CompletionNotifications` for multi-player tracking
- **EventCard:** Single resolution only (events/incidents are one-time)

### 4. **Special Content**
- **CheckCard:** Has special rules and cost display
- **EventCard:** No special/cost display

### 5. **Ignore Functionality**
- **EventCard:** Has ignore button (events only)
- **CheckCard:** No ignore functionality

## Unification Options

### Option 1: Unified Base Component ⭐ **RECOMMENDED**
Create a single `BaseCheckCard` component with all features as optional props:

**Pros:**
- Single source of truth for check UI
- Easy to maintain and update
- Consistent behavior across all check types
- Can share bug fixes and improvements

**Cons:**
- More props to manage
- Slightly more complex component
- Need to ensure props don't conflict

**Implementation:**
```svelte
<BaseCheckCard
  checkType="action" | "event" | "incident"
  expandable={true}  // Only for actions
  showCompletions={true}  // Only for actions
  showIgnoreButton={false}  // Only for events
  showSpecialSection={true}  // Only for actions
  showAvailability={true}  // Only for actions
  // ... other shared props
/>
```

### Option 2: Keep Separate with Shared Utilities
Keep `EventCard` and `CheckCard` separate but extract shared logic to utilities:

**Pros:**
- Simpler individual components
- Clear separation by use case
- Less prop complexity

**Cons:**
- Potential for drift between components
- Duplicate rendering logic
- Harder to ensure consistency

### Option 3: Composition Pattern
Create small composable pieces and build both from same parts:

**Pros:**
- Maximum flexibility
- Reusable pieces
- Clear component boundaries

**Cons:**
- More files to manage
- More complex component tree
- May over-engineer the solution

## Recommendation: Option 1 (Unified Component)

**Rationale:**
1. The components are 80% similar - most differences are just conditional rendering
2. Both follow the same architectural pattern (presentation only)
3. Both dispatch the same events to parents
4. Easier to maintain one component than keep two in sync
5. Can use feature flags/props to enable/disable specific features

**Migration Path:**
1. Create `BaseCheckCard.svelte` with all features
2. Add feature flags for action-specific, event-specific features
3. Update ActionsPhase to use BaseCheckCard with action flags
4. Update EventsPhase/UnrestPhase to use BaseCheckCard with event/incident flags
5. Deprecate EventCard.svelte
6. Clean up old CheckCard references

## Shared Utilities to Extract

Regardless of unification approach, these utilities should be shared:

1. **SkillTag rendering logic** - Already shared ✅
2. **OutcomeDisplay data formatting** - Already delegated to controllers ✅
3. **Aid result rendering** - Could be extracted to component
4. **Resolution state type** - Already shared via TypeScript types

## Action Items

### If Moving Forward with Option 1:
- [ ] Create `BaseCheckCard.svelte` in `src/view/kingdom/components/`
- [ ] Implement feature flags for conditional rendering
- [ ] Add comprehensive props documentation
- [ ] Update ActionsPhase to use BaseCheckCard
- [ ] Update EventsPhase to use BaseCheckCard
- [ ] Update UnrestPhase to use BaseCheckCard
- [ ] Update OngoingEventCard to use BaseCheckCard
- [ ] Add tests/documentation for new component
- [ ] Deprecate old EventCard component

### If Keeping Separate (Option 2):
- [ ] Extract shared aid rendering to `AidButton.svelte` component
- [ ] Document the differences between components
- [ ] Create shared type definitions file
- [ ] Add cross-references in component comments

## OutcomeDisplay Relationship Analysis

### Current Architecture

**OutcomeDisplay** (`src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`) is a **complex subcomponent** (~400 lines) used by both EventCard and CheckCard to display resolution results.

**What OutcomeDisplay Does:**
- Displays outcome header with color-coded styling
- Shows effect message and roll breakdown
- Manages **dice rolling** for dynamic modifiers (has state + logic)
- Manages **resource selection** for multi-resource modifiers (has state + logic)
- Manages **choice selection** for outcome choices (has state + logic)
- Validates when primary button should be enabled (has validation logic)
- Dispatches events: `primary`, `cancel`, `reroll`, `debugOutcomeChanged`

**How CheckCard/EventCard Use It:**
```svelte
{#if resolved && resolution}
  <OutcomeDisplay
    outcome={resolution.outcome}
    actorName={resolution.actorName}
    effect={resolution.effect}
    stateChanges={resolution.stateChanges}
    modifiers={resolution.modifiers}
    // ... other props
    on:primary={handleApplyResult}
    on:cancel={handleCancel}
    on:reroll={handleReroll}
  />
{/if}
```

### Architectural Concern ⚠️

**OutcomeDisplay violates the "presentation only" principle:**
- ❌ Has internal state management (`resolvedDice`, `selectedChoice`, `selectedResources`)
- ❌ Has business logic (dice rolling, choice processing, validation)
- ❌ Computes derived state (`displayStateChanges`, `diceResolved`, etc.)

**EventCard/CheckCard are now pure presentation:**
- ✅ No business logic
- ✅ No state management (except local UI state)
- ✅ Delegate everything to parent

This creates an **inconsistency**: The parent components are pure, but their subcomponent (OutcomeDisplay) is not.

### Integration Options

#### Option A: Keep OutcomeDisplay Separate (Current State)
**Pros:**
- Reusable across different contexts
- Complex logic is encapsulated
- Already working

**Cons:**
- Architectural inconsistency (business logic in UI component)
- Two-layer event forwarding (OutcomeDisplay → CheckCard → Parent)
- Harder to track state flow

#### Option B: Refactor OutcomeDisplay to Pure Presentation ⭐
**Pros:**
- Consistent architecture across all components
- Parent controls all state
- Clearer data flow

**Cons:**
- More props to manage
- Parents need to handle dice rolling, choice selection logic
- More complex parent components

**Implementation:**
```svelte
<!-- Parent (EventsPhase/ActionsPhase) manages state -->
<script>
  let resolvedDice = new Map();
  let selectedChoice = null;
  let selectedResources = new Map();
  
  // Pass state down, handle events up
</script>

<OutcomeDisplay
  {resolvedDice}
  {selectedChoice}
  {selectedResources}
  on:diceRoll={(e) => { resolvedDice.set(...); resolvedDice = resolvedDice; }}
  on:choiceSelect={(e) => { selectedChoice = e.detail.index; }}
/>
```

#### Option C: Integrate OutcomeDisplay Into CheckCard
**Pros:**
- Single component responsibility
- Simpler prop structure
- Direct event handling

**Cons:**
- Duplicates OutcomeDisplay code in EventCard and CheckCard
- Harder to maintain consistency
- Larger component files

#### Option D: Extract OutcomeDisplay Logic to Controller
**Pros:**
- OutcomeDisplay becomes presentation-only
- Logic in proper layer (controller/service)
- Consistent architecture

**Cons:**
- Need to create new OutcomeController
- More indirection
- Potentially over-engineered

### Recommendation: Option B (Refactor to Pure Presentation)

**Rationale:**
1. **Architectural consistency** - All components should be presentation-only
2. **Better data flow** - Parent owns state, passes down props, receives events
3. **Easier debugging** - All state in one place (parent component)
4. **Follows established pattern** - Same as how CheckCard/EventCard now work

**Migration Steps:**
1. Move dice rolling state to parent (EventsPhase/UnrestPhase/ActionsPhase)
2. Move choice selection state to parent
3. Move resource selection state to parent
4. OutcomeDisplay becomes pure presentation:
   - Takes all state as props
   - Dispatches events for all interactions
   - No internal business logic
5. Parents handle validation logic (when to enable primary button)

**Alternative (Less Ideal):** If OutcomeDisplay logic is too complex, extract to an `OutcomeDisplayController` that parents can use to manage the state.

## Conclusion

The refactoring has revealed that **EventCard** and **CheckCard** are very similar architecturally. A unified component would reduce code duplication and ensure consistent behavior across all check types. The main challenge is managing the conditional features (expansion, completions, ignore, special) without making the component too complex.

**Additionally, OutcomeDisplay should be refactored** to follow the same pure presentation pattern as EventCard/CheckCard, moving its business logic to parent components or a dedicated controller.

**Recommendations:**
1. **Short-term:** Proceed with Option 1 (Unified BaseCheckCard) to consolidate CheckCard/EventCard
2. **Medium-term:** Refactor OutcomeDisplay to pure presentation (Option B) for architectural consistency
