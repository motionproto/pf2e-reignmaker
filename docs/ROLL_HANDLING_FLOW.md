# Roll Handling Flow

This document describes the complete end-to-end flow for roll creation, skill card interaction, and result application in the pf2e-reignmaker system.

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

### 4. **Application** (CheckResultHandler.applyResolution)
- Collects all rolled values, choices, and selections from UI
- Standardizes data through `OutcomeResolutionService`
- Passes to `GameEffectsService` for consistent application
- Updates `KingdomActor` with final values
- Creates ongoing modifiers if applicable (from failed events/incidents)
- Marks phase step as complete
- Returns success/failure status

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
CheckResultHandler.getDisplayData() → OutcomeDisplay
            ↓
    User Interactions (dice/choices/resources)
            ↓
CheckResultHandler.applyResolution() → GameEffectsService
            ↓
       KingdomActor Update
            ↓
   Phase Step Completion
```

## Unified Pipeline

Everything flows through the same pipeline whether it's an:
- **Event** - EventPhaseController
- **Incident** - UnrestPhaseController  
- **Action** - ActionPhaseController

All use:
1. Same `CheckCard` component
2. Same `CheckHandler` for rolls
3. Same `OutcomeDisplay` for results
4. Same `GameEffectsService` for application

This ensures consistency, maintainability, and a predictable user experience across all check-based interactions in the kingdom management system.
