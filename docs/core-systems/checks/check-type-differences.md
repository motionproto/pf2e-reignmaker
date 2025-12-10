# Check Type Differences

**Purpose:** Document key differences between Events, Incidents, and Actions for PipelineCoordinator implementation

---

## Overview

All three check types (Events, Incidents, Actions) use **PipelineCoordinator** for execution, but have important behavioral differences that affect pipeline steps and data flow.

---

## Comparison Matrix

| Feature | Events | Incidents | Actions |
|---------|--------|-----------|---------|
| **Triggering** | Random selection at phase start | Unrest % roll during phase | Player-initiated |
| **Tier System** | Kingdom level (1-20) | Severity (minor/moderate/major) | Kingdom level (1-20) |
| **Persistence** | Can be ongoing (`endsEvent: false`) | Always immediate | Always immediate |
| **Ignore Option** | Yes (beneficial/dangerous rules) | No | No |
| **Data Location** | `data/events/*.json` | `data/incidents/{severity}/*.json` | `data/player-actions/*.json` |
| **Pipeline Entry** | Step 1 or special ignore flow | Step 1 (normal) | Step 1 (normal) |
| **TurnState Storage** | `turnState.eventsPhase` | `turnState.unrestPhase` | `turnState.actionsPhase` |
| **Multiple per Turn** | No (one active event max) | No (one incident max) | Yes (multiple actions) |

---

## Event-Specific Behaviors

### 1. Ongoing Events

**Mechanism:** Events persist across turns until resolved

**Data:**
```json
{
  "traits": ["ongoing"],
  "effects": {
    "failure": {
      "endsEvent": false  // ← Event will repeat next turn
    }
  }
}
```

**Pipeline Impact:**
- Step 8 (executeAction) checks `endsEvent` flag
- If `false`, updates `turnState.eventsPhase.eventTriggered = true`
- Same event appears at next turn's Events Phase
- Each roll applies its modifiers independently

**Storage:**
```typescript
turnState.eventsPhase = {
  eventRolled: boolean,
  eventTriggered: boolean,
  eventId: string | null
}
```

### 2. Event Ignore Flow

**Mechanism:** Players can ignore events without rolling

**Types:**
- **Beneficial events** - Auto-apply failure outcome immediately
- **Dangerous events** - Create pending outcome with failure preview
- **Neutral events** - Just clear

**Pipeline Impact:**
```
Beneficial Event Ignore:
  → Skip Steps 1-6
  → Jump directly to Step 8 (execute with failure outcome)
  
Dangerous Event Ignore:
  → Skip Steps 1-5
  → Jump to Step 6 (wait for apply with failure preview)
  
Neutral Event Ignore:
  → Skip all steps (just clear event)
```

**Code Path:**
```typescript
// SEPARATE from PipelineCoordinator
async ignoreEvent(eventId: string) {
  const event = eventService.getEventById(eventId);
  const isBeneficial = event.traits?.includes('beneficial');
  const isDangerous = event.traits?.includes('dangerous');
  
  if (isBeneficial && !isDangerous) {
    // Bypass pipeline entirely
    await resolveEvent(eventId, 'failure', resolutionData, true);
  } else if (isDangerous) {
    // Create preview, enter pipeline at Step 6
    await outcomePreviewService.createInstance(...);
  } else {
    await clearCurrentEvent(eventId);
  }
}
```

**Note:** Event ignore is NOT part of the standard 9-step pipeline flow.

---

## Incident-Specific Behaviors

### 1. Severity-Based Selection

**Mechanism:** Unrest level determines incident severity

**Thresholds:**
- Minor: Unrest 1-4
- Moderate: Unrest 5-10
- Major: Unrest 11+

**Pipeline Impact:**
- Step 1 (checkRequirements) uses severity instead of kingdom level
- DC calculation may differ (need to verify)

### 2. Unrest Triggering

**Mechanism:** d100 roll vs current unrest

**Code Path:**
```typescript
const unrestLevel = kingdom.unrest;
const roll = d100();

if (roll <= unrestLevel) {
  // Incident triggered
  const severity = determineSeverity(unrestLevel);
  const incident = selectIncident(severity);
  
  // Enter pipeline
  await pipelineCoordinator.executePipeline(incident.id, {...});
}
```

**Pipeline Impact:**
- UnrestPhaseController performs triggering logic BEFORE calling pipeline
- Pipeline only executes if incident is triggered

---

## Action-Specific Behaviors

### 1. Pre-Roll Interactions

**Mechanism:** Some actions require player choices BEFORE rolling

**Examples:**
- `collect-stipend` - Select which leader collects
- `recruit-unit` - Choose army type and level
- `establish-settlement` - Select hex location

**Pipeline Impact:**
- Step 2 (preRollInteractions) executes
- User makes selections via dialogs/components
- Selections stored in `context.metadata`
- Step 3 uses metadata for roll configuration

**Data:**
```json
{
  "preRollInteractions": [
    {
      "type": "actor-selection",
      "validRoles": ["ruler", "councilor"]
    }
  ]
}
```

### 2. Post-Apply Interactions

**Mechanism:** Some actions require player choices AFTER rolling but AFTER clicking Apply

**Examples:**
- `claim-hexes` - Select hexes on map
- `build-structure` - Choose settlement and structure

**Pipeline Impact:**
- Step 7 (postApplyInteractions) executes
- User makes selections via HexSelectorService or dialogs
- Selections stored in `context.resolutionData`
- Step 8 uses resolutionData for execution

### 3. Multiple Actions Per Turn

**Mechanism:** Players can perform unlimited actions (resource-limited)

**Pipeline Impact:**
- Each action gets its own PipelineContext
- No queue needed within single turn (actions are sequential)
- All action outcomes stored in `pendingOutcomes[]`
- Phase doesn't advance until player clicks "Continue"

**Storage:**
```typescript
turnState.actionsPhase = {
  actionsPerformed: number,
  actionLog: Array<{
    actionId: string,
    outcome: string,
    timestamp: number
  }>
}
```

---

## Pipeline Step Execution Matrix

| Step | Events | Incidents | Actions |
|------|--------|-----------|---------|
| **1. Requirements** | Check tier ≤ kingdom level | Check severity match | Check tier + resource costs |
| **2. Pre-Roll Interactions** | Rare | Rare | Common (actor/settlement/army selection) |
| **3. Execute Roll** | Always | Always | Always |
| **4. Display Outcome** | Always | Always | Always |
| **5. Outcome Interactions** | Dice/Choice modifiers | Dice/Choice modifiers | Dice/Choice modifiers + custom components |
| **6. Wait For Apply** | Always | Always | Always |
| **7. Post-Apply Interactions** | Rare | Rare | Common (hex selection, resource allocation) |
| **8. Execute Action** | Always (check `endsEvent`) | Always | Always |
| **9. Cleanup** | Always (update turnState) | Always | Always (log action) |

---

## Special Cases Requiring Custom Handling

### Events
- ✅ **Ongoing persistence** - Step 8 must check `endsEvent` and update `turnState.eventsPhase`
- ✅ **Ignore flow** - Separate code path outside PipelineCoordinator
- ✅ **Beneficial/Dangerous traits** - Affect ignore behavior only

### Incidents
- ✅ **Severity filtering** - UnrestPhaseController filters before pipeline entry
- ✅ **Triggering logic** - d100 roll happens before pipeline

### Actions
- ✅ **Pre-roll interactions** - Step 2 must handle actor/settlement/army dialogs
- ✅ **Post-apply interactions** - Step 7 must handle HexSelectorService integration
- ✅ **Custom resolution components** - Step 5 may render custom Svelte components
- ✅ **Multiple per turn** - Phase controller manages action queue

---

## Implementation Checklist

When implementing PipelineCoordinator for all check types:

**Events:**
- [ ] Handle ongoing event persistence in Step 8
- [ ] Implement separate ignore flow (outside pipeline)
- [ ] Store event state in `turnState.eventsPhase`
- [ ] Clear expired events at phase boundaries

**Incidents:**
- [ ] Pre-filter by severity before pipeline
- [ ] Implement d100 triggering logic in UnrestPhaseController
- [ ] Store incident state in `turnState.unrestPhase`
- [ ] Clear incidents at phase boundaries

**Actions:**
- [ ] Implement pre-roll interaction handlers in Step 2
- [ ] Implement post-apply interaction handlers in Step 7
- [ ] Support custom resolution components in Step 5
- [ ] Track action log in `turnState.actionsPhase`
- [ ] Handle multiple actions per turn

**All Check Types:**
- [ ] Use OutcomePreviewService for all outcome storage
- [ ] Use GameCommandsService for all modifier application
- [ ] Use GameCommandsResolver for all game commands
- [ ] Implement Step 3 callback resumption pattern
- [ ] Implement Step 6 pause/resume pattern

---

## Shared Components

These are IDENTICAL across all check types:

- ✅ OutcomePreview data structure
- ✅ OutcomeDisplay component (reads `checkType` prop)
- ✅ BaseCheckCard component (reads `checkType` prop)
- ✅ Typed modifiers (StaticModifier, DiceModifier, ChoiceModifier)
- ✅ Game commands (all 25+ command types)
- ✅ Special resources (damage_structure, imprisoned_unrest, etc.)
- ✅ PipelineContext structure (with `checkType` field)

---

## Summary

**Key Insight:** Events, Incidents, and Actions share 95% of their execution flow through PipelineCoordinator, with differences only in:

1. **Triggering mechanisms** (how they enter the pipeline)
2. **Persistence logic** (events can be ongoing)
3. **Interaction timing** (actions have more pre/post-roll interactions)
4. **Special flows** (event ignore bypasses pipeline)

**Architecture Decision:** PipelineCoordinator handles the common 9-step flow, while phase controllers handle check-type-specific triggering and persistence logic.

---

**Status:** 📋 Reference Document  
**Last Updated:** 2025-11-17
