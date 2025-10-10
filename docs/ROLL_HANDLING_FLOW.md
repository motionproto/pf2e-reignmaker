# Roll Handling Flow

This document describes the complete end-to-end flow for roll creation, skill card interaction, and result application in the pf2e-reignmaker system.

## Architecture Overview

The system uses a **ResolutionData-based architecture** where all user interactions (dice rolls, choices, resource selections) happen in the UI before the controller is called. Controllers receive final numeric values and simply apply them - no legacy resolution paths exist.

## The Complete Flow

The entire flow from roll creation through skill card interaction to result application is a single cohesive system that works consistently across events, incidents, and actions.

### 1. **Roll Initiation** (CheckCard.svelte)
- User clicks a skill tag from available options
- `CheckHandler` executes the skill check using Foundry's dice system
- Roll is performed with proper DC calculation based on kingdom level
- Roll result (critical success/success/failure/critical failure) is determined

### 2. **Result Processing** (CheckResultHandler)
- Takes the roll outcome from the dice system
- Loads the appropriate effect data from the event/incident/action definition
- Converts dice formulas and prepares state changes
- Builds display data including:
  - Effect message
  - State changes (resources, unrest, etc.)
  - Modifiers that need resolution
  - Manual effects requiring GM application
- Passes everything to OutcomeDisplay for user interaction

### 3. **Interactive Resolution** (OutcomeDisplay + StateChanges)
- Shows the outcome with proper styling (success/failure colors)
- Displays roll breakdown with details
- Presents any dice that need to be rolled (like "1d4 gold")
- Shows resource choices if applicable (e.g., choose between gold/lumber)
- **"Apply Result" button stays disabled** until all interactions complete:
  - ✅ All dice rolled (including stateChange dice)
  - ✅ All choices made
  - ✅ All resource selections made

**Dice Roll Handling:**
- Modifier dice (from `modifiers` array): Stored with numeric index keys (0, 1, 2...)
- State change dice (from `stateChanges` object): Stored with string keys ("state:food", "state:gold"...)
- Both types are collected in the same `resolvedDice` Map with mixed key types

### 4. **Application** (Controller.resolveEvent / Controller.resolveIncident)
- Receives `ResolutionData` with all final numeric values
- Passes to `GameEffectsService.applyNumericModifiers()` for consistent application
- Updates `KingdomActor` with final values
- Marks phase steps as complete (steps 1 & 2)
- Returns success/failure status

**ResolutionData Structure:**
```typescript
interface ResolutionData {
  numericModifiers: Array<{
    resource: string;
    value: number;  // Already rolled/resolved
  }>;
  manualEffects: string[];      // Displayed in UI, not auto-applied
  complexActions: any[];        // Future: complex game mechanics
}
```

### 5. **Persistence & Cleanup**
- `CheckCard` preserves the result even after applied (using internal `displayItem`)
- User can see what they resolved and review the outcome
- Incident/event data cleared at next turn start (StatusPhaseController)
- Turn progression continues normally

## Key Components

### CheckHandler
- Executes skill checks via Foundry dice system
- Handles roll callbacks (onStart, onComplete, onCancel, onError)
- Manages UI state during rolling

### CheckResultHandler
- Business logic bridge between roll system and UI
- Provides `getDisplayData()` for outcome display
- Provides `applyResolution()` for state application
- Phase-specific logic (event/incident/action controllers)

### OutcomeDisplay
- Interactive UI for outcome resolution
- Manages dice rolling, choices, resource selection
- Enforces completion requirements via button disable logic
- Emits standardized resolution data

### GameEffectsService
- Unified state application layer
- Handles resource changes, modifiers, roll resolution
- Consistent across all outcome types

## Data Flow

```
User Action → CheckHandler.executeCheck()
            ↓
         Roll Result
            ↓
OutcomeDisplay (User Interactions)
            ↓
    - Roll all dice
    - Make all choices  
    - Select all resources
            ↓
OutcomeResolutionService.buildResolutionData()
            ↓
         ResolutionData (final numeric values)
            ↓
Controller.resolveEvent/resolveIncident()
            ↓
GameEffectsService.applyNumericModifiers()
            ↓
       KingdomActor Update
            ↓
   Phase Step Completion
```

## Unified Pipeline

Everything flows through the same ResolutionData-based pipeline whether it's an:
- **Event** - `EventPhaseController.resolveEvent(eventId, outcome, resolutionData)`
- **Incident** - `UnrestPhaseController.resolveIncident(incidentId, outcome, resolutionData)`
- **Action** - `ActionPhaseController.resolveAction(actionId, outcome, resolutionData)` (future)

All use:
1. Same `CheckCard` component for skill checks
2. Same `CheckHandler` for Foundry dice rolls
3. Same `OutcomeDisplay` for user interactions (dice, choices, resources)
4. Same `OutcomeResolutionService` for building ResolutionData
5. Same `GameEffectsService` for applying final values

## Key Principles

- **UI does all interaction**: Dice rolling, choices, selections happen in OutcomeDisplay
- **Controller only applies**: Receives final numeric values via ResolutionData
- **No legacy paths**: All resolution goes through ResolutionData architecture
- **GameEffectsService**: Unified application layer for consistent state updates

This ensures consistency, maintainability, and a predictable user experience across all check-based interactions in the kingdom management system.
