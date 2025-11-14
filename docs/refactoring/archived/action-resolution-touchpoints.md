# Action Resolution System: Touchpoints & Data Flow

**Purpose:** Complete mapping of the action resolution system showing all touchpoints from user interaction to state persistence

**Last Updated:** 2025-11-14

---

## Overview

This document maps the complete data flow for kingdom actions, identifying every touchpoint where data transforms or decisions are made. This provides a foundation for understanding and potentially refactoring the action resolution system.

---

## Core Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│             👤 USER: Select Action & Skill                          │
│  ActionsPhase.svelte → ActionCategorySection.svelte → Button Click │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│  👤 USER: Choose Context [PRE-ROLL DIALOG PATTERN]                 │
│  • Check CUSTOM_ACTION_HANDLERS[actionId].requiresPreDialog         │
│  • If true: Open dialog (e.g., SettlementSelectionDialog.svelte)  │
│  • Store selection in globalThis.__pending{Action}Selection        │
│  • Store in pending state: pendingYourAction = { skill, metadata } │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ SYSTEM: Prepare Roll                                │
│  ActionExecutionHelpers.executeActionRoll()                         │
│  • Create ExecutionContext with metadata                            │
│  • Get/select character actor                                       │
│  • Calculate DC from character level                                │
│  • Build roll options                                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ SYSTEM: Execute Skill Check                         │
│  performKingdomActionRoll() in roll-handler.ts                      │
│  • Execute Foundry VTT PF2e skill check                            │
│  • Determine outcome: critSuccess/success/failure/critFailure       │
│  • Post to chat                                                     │
│  • Fire 'kingdomRollComplete' event                                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Store Roll Result [CHECK INSTANCE SYSTEM]             │
│  ActionsPhase.handleRollComplete() → CheckInstanceHelpers           │
│  • Create ActiveCheckInstance                                       │
│  • Store in KingdomActor.activeCheckInstances[]                    │
│  • Set status: 'pending'                                           │
│  • Store appliedOutcome with modifiers from JSON                   │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ SYSTEM: Display Outcome Options                     │
│  OutcomeDisplay.svelte mounts with instance data                    │
│  • Display outcome description                                      │
│  • Mount interaction components:                                    │
│    - DiceRoller.svelte for dice modifiers                          │
│    - ChoiceSelector.svelte for choice modifiers [IN-LINE CHOICE]   │
│    - CustomComponent.svelte [CUSTOM COMPONENT PATTERN]             │
│  • Store interactions in instance.resolutionState                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│       👤 USER: Roll Dice & Make Choices [POST-ROLL INTERACTION]    │
│  User performs required interactions:                               │
│  • Roll dice → stored in resolutionState.resolvedDice              │
│  • Make choices → stored in resolutionState.selectedResources      │
│  • Custom component selection → stored in customComponentData      │
│  • Primary button enabled when all interactions complete            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ SYSTEM: Package User Decisions                      │
│  OutcomeDisplay.computeResolutionData()                             │
│  • Convert resolutionState to ResolutionData                       │
│  • Build numericModifiers: { resource, value }[]                   │
│  • Collect manualEffects: string[]                                 │
│  • Include customComponentData                                     │
│  • Emit 'primary' event with ResolutionData                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: PREVIEW OUTCOMES [PREPARE/COMMIT - PREPARE PHASE]     │
│  GameCommandsResolver.{commandMethod}() - Prepare only              │
│  • Calculate special effects (preview data)                        │
│  • NO state changes yet                                            │
│  • Return { specialEffect, commit } closure                        │
│  • OutcomeDisplay shows preview (e.g., "Will recruit Level 3 Army")│
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│         👤 USER: Click "Apply Result" Button                        │
│  User confirms they want to apply the outcome                       │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ SYSTEM: Route to Execution                          │
│  ActionsPhase.applyActionEffects()                                  │
│  • Receive ResolutionData from OutcomeDisplay                      │
│  • Call ActionPhaseController.resolveAction()                      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Check for Custom Logic [CUSTOM RESOLUTION PATTERN]   │
│  ActionPhaseController.resolveAction()                              │
│  • Check ACTION_IMPLEMENTATIONS[actionId]                          │
│  • If exists && needsCustomResolution(outcome):                    │
│    → Call customResolution.execute()                               │
│  • Else: Continue to standard resolution                           │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│              ⚙️ SYSTEM: Convert to Indexed Values                   │
│  ActionPhaseController.resolveAction()                              │
│  • Convert ResolutionData.numericModifiers to Map<index, value>    │
│  • Match by resource name to original modifier index               │
│  • Create preRolledValues Map for ActionResolver                   │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Orchestrate Execution [DUAL-EFFECT ARCHITECTURE]     │
│  ActionResolver.executeAction()                                     │
│  • Get action definition and outcome modifiers                     │
│  • Get game commands from action[outcome].gameCommands             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Apply Resource Changes [TYPED MODIFIERS SYSTEM]       │
│  GameCommandsService.applyOutcome()                                 │
│  • Apply numeric modifiers to resources                            │
│  • Use preRolledValues for dice modifiers                          │
│  • Detect shortfalls (negative resources)                          │
│  • Apply unrest penalties if needed                                │
│  • Update KingdomActor via updateKingdom()                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Execute Complex Operations [GAME COMMANDS SYSTEM]     │
│  For each gameCommand in action[outcome].gameCommands:              │
│  • Route via ActionResolver.executeGameCommand()                   │
│  • Special value resolution:                                       │
│    - "rolled" → lookup in preRolledValues Map                      │
│    - "kingdom-level" → get party level                             │
│    - "from-globalThis" → read stored selection                     │
│  • Execute via GameCommandsResolver method                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Route Game Commands [PREPARE/COMMIT PATTERN]          │
│  GameCommandsResolver.{commandMethod}()                             │
│  • Validate prerequisites                                          │
│  • If Prepare/Commit pattern:                                      │
│    - Return { specialEffect, commit }                              │
│    - Commit executed later                                         │
│  • Else:                                                           │
│    - Execute state changes immediately                             │
│  • Delegate to domain services (ArmyService, SettlementService)    │
│  • Update KingdomActor via updateKingdom()                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: APPLY OUTCOMES [PREPARE/COMMIT - COMMIT PHASE]        │
│  Execute PreparedCommand.commit() closures                          │
│  • Run all state changes that were previewed                       │
│  • Execute domain service operations                               │
│  • Update KingdomActor via updateKingdom()                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│   ⚙️ SYSTEM: Delegate to Specialists [DOMAIN SERVICES]             │
│  Specialized services handle complex operations:                    │
│  • ArmyService - Military operations                               │
│  • SettlementService - Settlement/structure management             │
│  • FactionService - Diplomatic relations                           │
│  • HexSelectorService - Interactive map selection                  │
│  • Each service updates KingdomActor                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   STATE PERSISTENCE TOUCHPOINT                      │
│  KingdomActor (Foundry Actor)                                       │
│  • Updates stored in actor.flags['pf2e-reignmaker']               │
│  • Foundry VTT handles persistence to world data                   │
│  • Updates broadcast to all connected clients                      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    REACTIVE UI UPDATE TOUCHPOINT                    │
│  KingdomStore (Svelte Store)                                        │
│  • Subscribes to KingdomActor changes                              │
│  • Updates all reactive UI components                              │
│  • Derived stores recalculate (claimedHexes, etc.)                │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      CLEANUP TOUCHPOINT                             │
│  CheckInstanceService.markApplied()                                 │
│  • Update instance status: 'pending' → 'applied'                   │
│  • Clear global state (delete globalThis.__pending*)              │
│  • Clear pending action state                                      │
│  • Show "✓ Applied" badge in UI                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pattern Descriptions & Usage

### Pre-Roll Dialog Pattern

**What it does:** Before the skill check happens, the user must select something specific (like which settlement, faction, army, or structure they're targeting).

**Why it exists:** Some actions need context that affects the roll outcome or game effects. For example, collecting a stipend gives different amounts based on which settlement you choose.

**Actions that use this:**
- `collect-stipend` - Select which settlement to collect from
- `build-structure` - Select structure type and which settlement to build in
- `repair-structure` - Select which structure to repair in which settlement
- `execute-or-pardon-prisoners` - Select which settlement has prisoners
- `establish-diplomatic-relations` - Select which faction to establish relations with
- `request-economic-aid` - Select which faction to request aid from
- `request-military-aid` - Select which faction to request military support from
- `deploy-army` - Select which army to deploy
- `train-army` - Select which army to train
- `outfit-army` - Select which army to outfit
- `recover-army` - Select which army to recover

---

### Check Instance System

**What it does:** After a skill check, the system creates a record that stores the roll outcome, user selections, dice results, and whether it's been applied. This record persists until the action is complete.

**Why it exists:** Allows users to roll dice, make choices, see previews, and apply results at their own pace. All check types (events, incidents, actions) use the same storage system.

**Actions that use this:** **ALL actions** - Every action that requires a skill check uses the Check Instance system.

---

### In-Line Choice Pattern

**What it does:** After seeing the outcome, the user picks ONE resource from a list of options (e.g., "Gain 1 Food, Lumber, OR Ore - you choose").

**Why it exists:** Some outcomes let the player choose which resource benefit or penalty applies based on their kingdom's current needs.

**Actions that use this:**
- Currently not heavily used in player actions, but common in events
- Can be used for any action where the JSON has `"type": "choice-buttons"` or `"type": "choice-dropdown"` modifiers

---

### Custom Component Pattern

**What it does:** After seeing the outcome, the user interacts with a special UI component unique to that action (like a slider, complex form, or interactive selection tool).

**Why it exists:** Some actions need more complex user input than just rolling dice or picking from a list.

**Actions that use this:**
- `arrest-dissidents` - Custom slider to choose how many dissidents to imprison (0 to maximum)
- `repair-structure` - Cost choice component showing different repair options

---

### Post-Roll Interaction Pattern

**What it does:** Umbrella term for ALL user interactions that happen after the skill check but before applying the result (dice rolling, choice selection, custom components).

**Why it exists:** Makes it clear that there's a phase where the user must interact with the UI before the outcome can be applied.

**Actions that use this:** **ALL actions with dice, choices, or custom components** - Most actions require at least rolling dice for variable outcomes.

---

### Custom Resolution Pattern

**What it does:** Actions with special business logic that runs instead of (or in addition to) the standard resolution flow. Examples: reducing costs by 50%, calculating tier transitions, or checking complex prerequisites.

**Why it exists:** Some actions have unique mechanics that can't be expressed in simple JSON modifiers.

**Actions that use this:**
- `build-structure` - Reduces costs by 50% on critical success, adds to build queue
- `repair-structure` - Repairs structures with cost calculations
- `upgrade-settlement` - Handles settlement tier transitions (village→town→city)
- `establish-diplomatic-relations` - Creates faction relationships
- `request-economic-aid` - Complex faction attitude checks and resource transfers
- `request-military-aid` - Military assistance with faction relationships
- `infiltration` - Intelligence gathering mechanics
- `execute-or-pardon-prisoners` - Prisoner management with settlement-specific effects
- `outfit-army` - Army equipment management
- `recruit-unit` - Army creation with level-based stats
- `deploy-army` - Army deployment mechanics

---

### Dual-Effect Architecture

**What it does:** Separates action outcomes into two parallel paths: (1) resource changes (gold, food, etc.) and (2) gameplay mechanics (recruit army, build structure, etc.).

**Why it exists:** Keeps the code clean by handling simple resource math separately from complex game logic. Resources are applied first, then game commands execute.

**Actions that use this:** **ALL actions** - The architecture applies to every action, though some only have resource changes and no game commands.

---

### Typed Modifiers System

**What it does:** Ensures all resource changes go through type-safe handlers that know how to apply StaticModifier (fixed value), DiceModifier (roll dice), and ChoiceModifier (user picks resource).

**Why it exists:** Prevents bugs by ensuring all resource changes follow the same validation and application logic, regardless of where they come from.

**Actions that use this:** **ALL actions** - Every action with modifiers in its JSON uses this system.

---

### Game Commands System

**What it does:** Provides 25+ structured commands for complex gameplay operations like recruiting armies, building structures, claiming hexes, adjusting faction attitudes, etc.

**Why it exists:** Encapsulates complex game mechanics into reusable, validated commands rather than scattering the logic across different files.

**Actions that use game commands:**
- `recruit-unit` - `recruitArmy` command
- `disband-army` - `disbandArmy` command
- `claim-hexes` - `claimHexes` command (with hex selection)
- `build-roads` - `buildRoads` command (with hex selection)
- `fortify-hex` - `fortifyHex` command (with hex selection)
- `establish-settlement` - `foundSettlement` command
- `execute-or-pardon-prisoners` - `reduceImprisoned` command
- `collect-stipend` - `giveActorGold` command
- `arrest-dissidents` - Creates imprisoned unrest in settlements
- Most diplomatic and military actions use game commands

---

### Prepare/Commit Pattern

**What it does:** For commands that need preview data, the command calculates effects and returns a preview WITHOUT changing game state. When the user clicks "Apply Result", the commit closure executes the actual state changes.

**Why it exists:** Lets users see exactly what will happen before confirming. Particularly important for irreversible actions like recruiting armies or building structures.

**Actions that use this:**
- `recruit-unit` - Shows "Will recruit Level X Army" before creating the army actor
- `establish-settlement` - Previews settlement creation before adding to kingdom
- `build-structure` - Shows structure costs and effects before adding to build queue
- Any action where the outcome creates or modifies entities (armies, settlements, structures)

**Actions that DON'T use this (immediate execution):**
- `claim-hexes` - Executes immediately (hex claiming is fast and reversible)
- `deal-with-unrest` - Simple resource changes only
- Most resource-only actions

---

### Hex Selection Pattern

**What it does:** Opens an interactive map overlay where the user clicks hexes to select them. Each operation type has different validation and visual feedback (claim=green, unclaim=red, road=teal, etc.).

**Why it exists:** Hex-based actions need visual, spatial selection rather than dropdowns or text input.

**Actions that use this:**
- `claim-hexes` - Select hexes to claim for the kingdom
- `build-roads` - Select hexes to connect with roads
- `fortify-hex` - Select a hex to fortify
- `create-worksite` - Select hex for resource extraction
- Any action with `requiresHexSelection: true`

---

### Domain Services Pattern

**What it does:** Specialized service classes that handle complex business logic for specific game domains (armies, settlements, factions, etc.).

**Why it exists:** Keeps complex logic organized and reusable. For example, ArmyService knows how to create army actors, calculate stats, and manage equipment.

**Services and their users:**

**ArmyService:**
- `recruit-unit`, `disband-army`, `train-army`, `outfit-army`, `deploy-army`, `recover-army`

**SettlementService:**
- `establish-settlement`, `upgrade-settlement`, `build-structure`, `repair-structure`

**FactionService:**
- `establish-diplomatic-relations`, `request-economic-aid`, `request-military-aid`

**HexSelectorService:**
- `claim-hexes`, `build-roads`, `fortify-hex`, `create-worksite`

**UnrestService:**
- `deal-with-unrest`, `arrest-dissidents`, `execute-or-pardon-prisoners`

---

## Pattern-to-Touchpoint Matrix

This table shows how each architectural pattern maps to specific touchpoints in the main data flow.

| # | Main Data Flow Touchpoint | Pre-Roll Dialog | Check Instance | In-Line Choice | Custom Component | Post-Roll Interaction | Custom Resolution | Dual-Effect Architecture | Typed Modifiers | Game Commands | Prepare/Commit | Hex Selection | Domain Services |
|---|---------------------------|-----------------|----------------|----------------|------------------|----------------------|-------------------|-------------------------|----------------|---------------|----------------|---------------|-----------------|
| 1 | 👤 USER: Select Action & Skill | | | | | | | | | | | | |
| 2 | 👤 USER: Choose Context | ✅ Pattern starts | | | | | | | | | | | |
| 3 | ⚙️ SYSTEM: Prepare Roll | | | | | | | | | | | | |
| 4 | ⚙️ SYSTEM: Execute Skill Check | | | | | | | | | | | | |
| 5 | ⚙️ SYSTEM: Store Roll Result | | ✅ Pattern active | | | | | | | | | | |
| 6 | ⚙️ SYSTEM: Display Outcome Options | | ✅ Instance read | ✅ Mounted if needed | ✅ Mounted if needed | | | | | | | | |
| 7 | 👤 USER: Roll Dice & Make Choices | | ✅ State stored | ✅ User selects | ✅ User interacts | ✅ Pattern active | | | ✅ Dice type | | | | |
| 8 | ⚙️ SYSTEM: Package User Decisions | | ✅ State read | ✅ Values packaged | ✅ Data packaged | ✅ Data consolidated | | | | | | | |
| 9 | ⚙️ SYSTEM: Route to Execution | | | | | | | | | | | | |
| 10 | ⚙️ SYSTEM: Check for Custom Logic | | | | | | ✅ Pattern decision | | | | | | |
| 11 | ⚙️ SYSTEM: Convert to Indexed Values | | | | | | | | | | | | |
| 12 | ⚙️ SYSTEM: Orchestrate Execution | | | | | | | ✅ Pattern active | | | | | |
| 13 | ⚙️ SYSTEM: Apply Resource Changes | | | | | | | ✅ Modifiers path | ✅ Pattern active | | | | |
| 14 | ⚙️ SYSTEM: Execute Complex Operations | ✅ Read context | | | | | | ✅ Commands path | | ✅ Pattern active | | | |
| 15 | ⚙️ SYSTEM: Route Game Commands | | | | | | | | | ✅ Commands routed | ✅ Pattern active | | |
| 16 | ⚙️ SYSTEM: Delegate to Specialists | | | | | | | | | ✅ Commands execute | ✅ Commits execute | ✅ Pattern active | ✅ Pattern active |
| 17 | ⚙️ SYSTEM: Persist to Database | ✅ Context cleared | ✅ Instance updated | | | | | | | | | | |
| 18 | ⚙️ SYSTEM: Broadcast State Changes | | | | | | | | | | | | |
| 19 | ⚙️ SYSTEM: Clean Up State | ✅ Global cleared | ✅ Instance cleared | | | | | | | | | | |

### Pattern Activity Spans

| Pattern | Start Touchpoint | End Touchpoint | Lifespan | Purpose |
|---------|-----------------|----------------|----------|---------|
| **Pre-Roll Dialog** | 2 (User Choice) | 19 (Cleanup) | Entire flow | Store context selection before roll |
| **Check Instance System** | 5 (Store Result) | 19 (Cleanup) | Post-roll | Unified check state storage |
| **In-Line Choice** | 6 (Display) | 8 (Package) | User interaction | Inline resource selection |
| **Custom Component** | 6 (Display) | 8 (Package) | User interaction | Action-specific UI |
| **Post-Roll Interaction** | 7 (User Choices) | 8 (Package) | User decisions | All post-roll user input |
| **Custom Resolution** | 10 (Check Logic) | 16 (Execute) | Custom path | Complex post-roll calculations |
| **Dual-Effect Architecture** | 12 (Orchestrate) | 16 (Execute) | Execution | Separates modifiers from commands |
| **Typed Modifiers System** | 7 (Dice rolls) | 13 (Apply) | Modifier handling | Type-safe resource changes |
| **Game Commands System** | 14 (Complex Ops) | 16 (Specialists) | Command handling | Structured gameplay mechanics |
| **Prepare/Commit Pattern** | 15 (Route Commands) | 16 (Commit) | Command execution | Preview before state changes |
| **Hex Selection Pattern** | 16 (Specialists) | 16 (Complete) | Service call | Interactive map selection |
| **Domain Services** | 16 (Specialists) | 16 (Complete) | Service call | Specialized business logic |

### Pattern Interaction Summary

**Sequential Patterns (One after another):**
1. Pre-Roll Dialog → Skill Check → Check Instance
2. Check Instance → Outcome Display → Post-Roll Interaction
3. Post-Roll Interaction → Package Decisions → Execute

**Parallel Patterns (Same touchpoint):**
- **Touchpoint 6-8:** In-Line Choice + Custom Component + Post-Roll Interaction
- **Touchpoint 12-16:** Dual-Effect (Modifiers + Commands in parallel)
- **Touchpoint 16:** Multiple services may execute in sequence

**Conditional Patterns (May or may not activate):**
- Pre-Roll Dialog - Only if `requiresPreDialog: true`
- In-Line Choice - Only if action has ChoiceModifier
- Custom Component - Only if action has custom resolution
- Custom Resolution - Only if `needsCustomResolution(outcome)` returns true
- Prepare/Commit - Only if command uses this pattern
- Hex Selection - Only if command needs map interaction

---

## Touchpoint Details

### 1. 👤 USER: Select Action & Skill

**Location:** `src/view/kingdom/turnPhases/ActionsPhase.svelte`

**User Action:** Clicks action button and selects skill variant

**Data In:** User click on action button  
**Data Out:** `{ actionId, skill, metadata? }`

**Decision Points:**
- Which action was clicked?
- Which skill variant chosen?

**Files Involved:**
- `ActionsPhase.svelte`
- `ActionCategorySection.svelte`

---

### 2. 👤 USER: Choose Context [PRE-ROLL DIALOG PATTERN]

**Location:** `src/controllers/actions/action-handlers-config.ts`

**User Action:** Selects settlement/faction/structure/army from dialog

**Pattern:** Pre-Roll Dialog - User makes selection BEFORE skill check to provide context

**Data In:** `actionId`  
**Data Out:** `{ skill, settlementId/factionId/structureId/etc }`

**Decision Points:**
- Does action require pre-roll dialog? (`requiresPreDialog: true`)
- What are valid selections?

**State Storage:**
- `pendingYourAction = { skill, selectionId }`
- `globalThis.__pendingYourSelection = selectionId`

**Files Involved:**
- `action-handlers-config.ts` - Registry
- `ActionsPhase.svelte` - State management
- `src/actions/{action-id}/*Dialog.svelte` - Dialog component
- `ActionDialogManager.svelte` - Dialog mounting

**Example Global State Keys:**
- `__pendingStipendSettlement`
- `__pendingExecuteOrPardonSettlement`
- `__pendingEconomicAidFaction`
- `__pendingTrainArmyArmy`

---

### 3. ⚙️ SYSTEM: Prepare Roll

**Location:** `src/controllers/actions/ActionExecutionHelpers.ts`

**System Operation:** Sets up skill check parameters

**Data In:** `ExecutionContext = { actionId, skill, metadata }`  
**Data Out:** Foundry roll configuration

**Operations:**
- Get or select character actor
- Calculate DC from character level
- Build roll options (aid bonuses, modifiers)

**Key Function:**
```typescript
executeActionRoll(
  context: ExecutionContext,
  options: {
    getDC: (level: number) => number,
    onRollCancel?: () => void
  }
)
```

**Files Involved:**
- `ActionExecutionHelpers.ts`

---

### 4. ⚙️ SYSTEM: Execute Skill Check

**Location:** `src/controllers/actions/roll-handler.ts`

**System Operation:** Runs PF2e roll system and determines outcome

**Data In:** Character, skill, DC, options  
**Data Out:** Outcome (critSuccess/success/failure/critFailure)

**Operations:**
- Execute Foundry VTT PF2e skill check
- Apply modifiers and circumstance bonuses
- Determine degree of success
- Post result to chat
- Fire `kingdomRollComplete` event

**Key Function:**
```typescript
performKingdomActionRoll(
  character: Actor,
  skillKey: string,
  dc: number,
  actionData: any
): Promise<void>
```

**Event Emitted:**
```typescript
{
  actionId: string,
  outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure',
  actorName: string,
  skillName: string
}
```

**Files Involved:**
- `roll-handler.ts`

---

### 5. ⚙️ SYSTEM: Store Roll Result [CHECK INSTANCE SYSTEM]

**Location:** `src/controllers/shared/CheckInstanceHelpers.ts`

**System Operation:** Creates persistent record of roll and outcome

**Pattern:** Check Instance System - Unified storage for all check types (events, incidents, actions)

**Data In:** `kingdomRollComplete` event  
**Data Out:** `ActiveCheckInstance` stored in actor

**Operations:**
- Create unique instance ID
- Load action definition from JSON
- Get outcome modifiers from action[outcome]
- Store in `KingdomActor.activeCheckInstances[]`

**Key Function:**
```typescript
createActionCheckInstance(
  actionId: string,
  outcome: string,
  actorName: string,
  skillName: string
): Promise<string>
```

**Data Structure:**
```typescript
interface ActiveCheckInstance {
  instanceId: string;
  checkType: 'action';
  checkId: string; // actionId
  status: 'pending';
  appliedOutcome: {
    outcome: string;
    modifiers: EventModifier[];
    manualEffects: string[];
    // ...
  };
  resolutionState?: {
    resolvedDice: Record<number, number>;
    selectedResources: Record<number, string>;
    customComponentData: any;
  };
}
```

**Files Involved:**
- `CheckInstanceHelpers.ts`
- `src/services/CheckInstanceService.ts`

---

### 6. ⚙️ SYSTEM: Display Outcome Options

**Location:** `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte`

**System Operation:** Renders outcome and mounts interaction UI

**Data In:** `ActiveCheckInstance`  
**Data Out:** User interactions stored in `resolutionState`

**Sub-Components Mounted:**
- `DiceRoller.svelte` - For dice modifiers [TYPED MODIFIERS - Dice]
- `ChoiceSelector.svelte` - For choice modifiers [IN-LINE CHOICE PATTERN]
- Custom component - If action has custom resolution [CUSTOM COMPONENT PATTERN]

**Interaction Flow:**
1. User rolls dice → stored in `resolvedDice[modifierIndex] = result`
2. User selects choice → stored in `selectedResources[modifierIndex] = resourceName`
3. User interacts with custom component → stored in `customComponentData`
4. Primary button enabled when all required interactions complete

**Files Involved:**
- `OutcomeDisplay.svelte`
- `DiceRoller.svelte`
- `ChoiceSelector.svelte`
- `src/actions/{action-id}/*Component.svelte` (custom)

---

### 7. 👤 USER: Roll Dice & Make Choices [POST-ROLL INTERACTION]

**Location:** Within OutcomeDisplay components

**User Action:** Interacts with dice rollers, choice buttons, custom components

**Patterns:**
- **Dice Modifiers** - User rolls dice to determine values
- **In-Line Choice** - User picks resource from choice-buttons/choice-dropdown
- **Custom Components** - User interacts with action-specific UI

**State Updates:**
```typescript
// Dice roll result
await updateInstanceResolutionState(instanceId, {
  resolvedDice: { [modifierIndex]: rolledValue }
});

// Choice selection
await updateInstanceResolutionState(instanceId, {
  selectedResources: { [modifierIndex]: resourceName }
});

// Custom component data
await updateInstanceResolutionState(instanceId, {
  customComponentData: { selectedOption: value }
});
```

**Validation:**
- All dice modifiers must be rolled
- All choice modifiers must have selection
- Custom components must validate via `validateData()`

**Files Involved:**
- `ResolutionStateHelpers.ts`
- Individual interaction components

---

### 8. ⚙️ SYSTEM: Package User Decisions

**Location:** `OutcomeDisplay.svelte`

**System Operation:** Consolidates all user interactions into single data structure

**Data In:** `instance.resolutionState`  
**Data Out:** `ResolutionData`

**Key Function:**
```typescript
function computeResolutionData(): ResolutionData {
  return {
    numericModifiers: [
      { resource: 'gold', value: 10 },
      { resource: 'imprisoned', value: rolledDiceValue }
    ],
    manualEffects: [...],
    customComponentData: { ... }
  };
}
```

**Transformation:**
- `resolvedDice` → numeric values in `numericModifiers`
- `selectedResources` → resource names in `numericModifiers`
- `customComponentData` → passed through unchanged
- Static modifiers → converted to numeric values

**Event Emitted:** `'primary'` with ResolutionData

**Files Involved:**
- `OutcomeDisplay.svelte`

---

### 9. ⚙️ SYSTEM: Preview Outcomes

**Location:** `OutcomeDisplay.svelte` (displays) + `GameCommandsResolver.ts` (calculates)

**System Operation:** Shows user what will happen BEFORE state changes

**Pattern:** Prepare/Commit - Calculate effects and show preview WITHOUT executing

**⚠️ UX INCONSISTENCY WARNING:**

Not all actions implement preview! This creates an inconsistent user experience:

**Actions WITH Preview (Prepare/Commit Pattern):**
- ✅ `recruit-unit` - Shows "Will recruit Level X Army"
- ✅ `establish-settlement` - Previews settlement creation
- ✅ `build-structure` - Shows structure costs/effects
- ✅ `request-economic-aid` - Shows faction attitude check
- ✅ `request-military-aid` - Shows military assistance details

**Actions WITHOUT Preview (Immediate Execution on Apply):**
- ⚠️ `claim-hexes` - Executes immediately (should show "Will claim X hexes")
- ⚠️ `deal-with-unrest` - Executes immediately (should show "Will reduce unrest by 2")
- ⚠️ `execute-or-pardon-prisoners` - Executes immediately (should show "Will reduce imprisoned by X")
- ⚠️ Most resource-only actions

**Actions with Custom Preview Implementation:**
- ✅ `arrest-dissidents` - Slider component shows selected amount before apply
- ✅ `repair-structure` - Cost choice component shows repair options

**For Actions Without Prepare/Commit:**

Actions that don't use the Prepare/Commit pattern should still provide preview:

1. **Calculate preview in OutcomeDisplay** before enabling "Apply Result" button
2. **Show preview in UI** (e.g., badge with "Will reduce unrest by 2")
3. **Execute only on confirm** when user clicks "Apply Result"

**Data In:** ResolutionData (from Step 8)  
**Data Out:** Preview display + commit closures

**Files Involved:**
- `OutcomeDisplay.svelte`
- `GameCommandsResolver.ts`

---

### 10. 👤 USER: Click "Apply Result" Button

**Key Function:**
```typescript
function computeResolutionData(): ResolutionData {
  return {
    numericModifiers: [
      { resource: 'gold', value: 10 },
      { resource: 'imprisoned', value: rolledDiceValue }
    ],
    manualEffects: [...],
    customComponentData: { ... }
  };
}
```

**Transformation:**
- `resolvedDice` → numeric values in `numericModifiers`
- `selectedResources` → resource names in `numericModifiers`
- `customComponentData` → passed through unchanged
- Static modifiers → converted to numeric values

**Event Emitted:** `'primary'` with ResolutionData

**Files Involved:**
- `OutcomeDisplay.svelte`

---

### 9. 👤 USER: Click "Apply Result" Button

**User Action:** Confirms they want to apply the outcome

---

### 10. ⚙️ SYSTEM: Route to Execution

**Location:** `src/view/kingdom/turnPhases/ActionsPhase.svelte`

**System Operation:** Dispatches ResolutionData to appropriate controller

**Data In:** `'primary'` event with ResolutionData  
**Data Out:** Controller method call

**Key Handler:**
```typescript
async function applyActionEffects(event: CustomEvent) {
  const { resolutionData, instanceId } = event.detail;
  await controller.resolveAction(actionId, outcome, resolutionData);
}
```

**Files Involved:**
- `ActionsPhase.svelte`

---

### 11. ⚙️ SYSTEM: Check for Custom Logic [CUSTOM RESOLUTION PATTERN]

**Location:** `src/controllers/ActionPhaseController.ts`

**System Operation:** Determines if action has custom implementation

**Pattern:** Custom Resolution - Actions with complex post-roll logic (50% cost reduction, tier transitions, etc.)

**Data In:** `{ actionId, outcome, resolutionData }`  
**Data Out:** Either custom execution or standard resolution

**Decision Tree:**
```typescript
const implementation = ACTION_IMPLEMENTATIONS[actionId];

if (implementation?.customResolution?.execute) {
  if (implementation.needsCustomResolution(outcome)) {
    // Execute custom logic
    return await implementation.customResolution.execute(resolutionData);
  }
}

// Otherwise: standard resolution via ActionResolver
```

**Files Involved:**
- `ActionPhaseController.ts`
- `src/controllers/actions/implementations/index.ts`
- `src/actions/{action-id}/*Action.ts`

---

### 12. ⚙️ SYSTEM: Convert to Indexed Values

**Location:** `src/controllers/ActionPhaseController.ts`

**System Operation:** Maps dice/choice results back to original modifier indices

**Data In:** `ResolutionData.numericModifiers[]`  
**Data Out:** `Map<number, number>` for ActionResolver

**Critical Conversion:**
```typescript
const preRolledValues = new Map<number, number>();
const actionModifiers = action[outcome].modifiers;

resolutionData.numericModifiers.forEach(rolled => {
  const modifierIndex = actionModifiers.findIndex(
    m => m.resource === rolled.resource
  );
  if (modifierIndex !== -1) {
    preRolledValues.set(modifierIndex, rolled.value);
  }
});
```

**Why This Matters:**
- Game commands use `"amount": "rolled"` which looks up by index
- Must match original modifier order in JSON
- Index mismatch causes wrong values to be applied

**Files Involved:**
- `ActionPhaseController.ts`

---

### 13. ⚙️ SYSTEM: Orchestrate Execution [DUAL-EFFECT ARCHITECTURE]

**Location:** `src/controllers/actions/action-resolver.ts`

**System Operation:** Coordinates modifiers and game commands

**Pattern:** Dual-Effect Architecture - Separates resource changes (modifiers) from gameplay mechanics (game commands)

**Data In:** `{ action, outcome, kingdom, preRolledValues }`  
**Data Out:** Orchestrated execution

**Key Responsibilities:**
1. Load action definition and outcome
2. Extract modifiers and game commands
3. Apply resource modifiers first (via GameCommandsService)
4. Execute game commands second (via GameCommandsResolver)
5. Return result

**Key Method:**
```typescript
async executeAction(
  action: PlayerAction,
  outcome: string,
  kingdom: any,
  preRolledValues?: Map<number, number>
): Promise<ActionResult>
```

**Files Involved:**
- `action-resolver.ts`

---

### 14. ⚙️ SYSTEM: Apply Resource Changes [TYPED MODIFIERS SYSTEM]

**Location:** `src/services/GameCommandsService.ts`

**System Operation:** Updates gold, food, lumber, unrest, etc.

**Pattern:** Typed Modifiers System - Type-safe handling of StaticModifier, DiceModifier, ChoiceModifier

**Data In:** `{ modifiers, outcome, preRolledValues }`  
**Data Out:** Updated kingdom resources

**Operations:**
1. Iterate through modifiers
2. For dice modifiers: lookup value in preRolledValues
3. For static modifiers: use value directly
4. Apply to kingdom resources
5. Detect shortfalls (negative resources)
6. Apply unrest penalties if resources go negative

**Key Method:**
```typescript
async applyOutcome(params: {
  type: 'action' | 'event' | 'incident';
  sourceId: string;
  outcome: string;
  modifiers: EventModifier[];
  preRolledValues?: Map<number, number>;
}): Promise<ApplicationResult>
```

**Files Involved:**
- `GameCommandsService.ts`

---

### 15. ⚙️ SYSTEM: Execute Complex Operations [GAME COMMANDS SYSTEM]

**Location:** `src/controllers/actions/action-resolver.ts`

**System Operation:** Handles armies, settlements, territory, diplomacy

**Pattern:** Game Commands System - Structured gameplay mechanics beyond resource changes (25+ command types)

**Data In:** `gameCommands[]` from action JSON  
**Data Out:** Command results

**Special Value Resolution:**
```typescript
// "rolled" → lookup dice value
if (command.amount === 'rolled') {
  const modifierIndex = modifiers.findIndex(m => 
    m.resource === 'imprisoned' && m.type === 'dice'
  );
  amount = preRolledValues.get(modifierIndex);
}

// "kingdom-level" → get party level
if (command.level === 'kingdom-level') {
  level = getPartyLevel();
}

// "from-globalThis" → read stored selection
const settlementId = globalThis.__pendingStipendSettlement;
```

**Routing:**
```typescript
for (const command of gameCommands) {
  await this.executeGameCommand(
    command,
    resolver,
    kingdom,
    isCritSuccess,
    preRolledValues,
    modifiers
  );
}
```

**Files Involved:**
- `action-resolver.ts`

---

### 16. ⚙️ SYSTEM: Route Game Commands [PREPARE/COMMIT PATTERN]

**Location:** `src/services/GameCommandsResolver.ts`

**System Operation:** Delegates to specific command handlers

**Data In:** Command parameters  
**Data Out:** State changes or PreparedCommand

**Pattern:** Prepare/Commit - Preview special effects BEFORE "Apply Result" is clicked

**Two Execution Modes:**

**Immediate Execution:**
```typescript
async commandName(params): Promise<CommandResult> {
  // Validate
  // Execute state changes immediately
  await updateKingdom(k => { ... });
  return { success: true };
}
```

**Prepare/Commit Pattern:**
```typescript
async commandName(params): Promise<PreparedCommand> {
  // PREPARE: Validate & calculate (NO state changes!)
  const previewData = calculate();
  
  // RETURN: Preview + commit closure
  return {
    specialEffect: {
      type: 'status',
      message: 'Preview message',
      icon: 'fa-icon'
    },
    commit: async () => {
      // Execute state changes when user confirms
      await updateKingdom(k => { ... });
    }
  };
}
```

**Command Categories:**
- Territory: `claimHexes`, `buildRoads`, `fortifyHex`
- Settlement: `foundSettlement`, `buildStructure`, `upgradeSettlement`
- Military: `recruitArmy`, `trainArmy`, `disbandArmy`
- Diplomatic: `adjustFactionAttitude`, `requestEconomicAid`
- Unrest: `arrestDissidents`, `reduceImprisoned`

**Files Involved:**
- `GameCommandsResolver.ts`

---

### 17. ⚙️ SYSTEM: Apply Outcomes [PREPARE/COMMIT - COMMIT PHASE]

**Location:** `src/controllers/actions/action-resolver.ts`

**System Operation:** Executes commit() closures from Prepare/Commit commands

**Data In:** PreparedCommand.commit() closures  
**Data Out:** Final state changes

**Operations:**
- Execute all commit() closures from prepare phase
- Run state changes that were previously only previewed
- Update KingdomActor via updateKingdom()

**Key Execution:**
```typescript
// Execute commit closures
for (const preparedCommand of preparedCommands) {
  if (preparedCommand.commit) {
    await preparedCommand.commit();
  }
}
```

**Files Involved:**
- `action-resolver.ts`
- `GameCommandsResolver.ts`

---

### 18. ⚙️ SYSTEM: Delegate to Specialists [DOMAIN SERVICES]

**Location:** Specialized service files

**System Operation:** Executes domain-specific logic

**Services:**

**ArmyService** (`src/services/armies/`)
- Create/delete army actors
- Update army stats and equipment
- Handle deployment and recovery

**SettlementService** (`src/services/settlements/`)
- Create/upgrade settlements
- Build/repair structures
- Manage settlement data

**FactionService** (`src/services/factions/`)
- Adjust faction attitudes
- Request diplomatic aid
- Track relationship changes

**HexSelectorService** (`src/services/hex-selector/`) [HEX SELECTION PATTERN]
- Interactive hex selection on map
- Validation functions
- Visual feedback and previews
- Color-coded by operation type (claim=green, unclaim=red, road=teal, etc.)

**Files Involved:**
- Service-specific files in `src/services/`

---

### 19. ⚙️ SYSTEM: Persist to Database

**Location:** `src/actors/KingdomActor.ts` (concept)

**System Operation:** Writes kingdom state to Foundry world database

**Actual Storage:** `Actor.flags['pf2e-reignmaker']['kingdom-data']`

**Update Pattern:**
```typescript
await updateKingdom(kingdom => {
  kingdom.resources.gold += 10;
  kingdom.hexes.find(h => h.id === '15.20').claimedBy = 1;
  kingdom.armies.push(newArmy);
});
```

**Persistence:**
- Updates written to Foundry Actor flags
- Foundry handles serialization to world database
- Changes broadcast to all connected clients via socket

**Files Involved:**
- `src/utils/kingdom-actor-wrapper.ts`
- `src/stores/KingdomStore.ts`

---

### 20. ⚙️ SYSTEM: Broadcast State Changes

**Location:** `src/stores/KingdomStore.ts`

**System Operation:** Syncs updated state to all connected clients

**Data Flow:**
```
KingdomActor update → Foundry socket → All clients
  → KingdomStore.subscribe()
    → Svelte component reactivity
      → UI re-renders
```

**Derived Stores:**
- `claimedHexes` - Filtered hexes
- `claimedSettlements` - Valid settlements
- `resources` - Current resource values
- `armies` - Army list

**Files Involved:**
- `KingdomStore.ts`
- All Svelte components using `$kingdomData`

---

### 21. ⚙️ SYSTEM: Clean Up State

**Location:** `src/services/CheckInstanceService.ts`

**System Operation:** Removes temporary data and marks action complete

**Data In:** `instanceId`  
**Data Out:** Updated instance status

**Operations:**
1. Mark instance as applied: `status: 'pending' → 'applied'`
2. Clear global state: `delete globalThis.__pending*`
3. Clear pending action state in component
4. Display "✓ Applied" badge

**Cleanup Timing:**
- Immediate: After successful application
- Phase boundaries: Remove old instances

**Key Method:**
```typescript
async markApplied(instanceId: string): Promise<void>
```

**Files Involved:**
- `CheckInstanceService.ts`
- `ActionsPhase.svelte`

---

## Data Structures Reference

### ExecutionContext

```typescript
interface ExecutionContext {
  actionId: string;
  skill: string;
  metadata?: Record<string, any>;
}
```

### ActiveCheckInstance

```typescript
interface ActiveCheckInstance {
  instanceId: string;
  checkType: 'event' | 'incident' | 'action';
  checkId: string;
  checkData: PlayerAction;
  createdTurn: number;
  status: 'pending' | 'resolved' | 'applied';
  appliedOutcome?: {
    outcome: string;
    actorName: string;
    skillName: string;
    effect: string;
    modifiers: EventModifier[];
    manualEffects: string[];
    effectsApplied: boolean;
  };
  resolutionState?: {
    resolvedDice: Record<number, number>;
    selectedResources: Record<number, string>;
    customComponentData: any;
  };
}
```

### ResolutionData

```typescript
interface ResolutionData {
  numericModifiers: Array<{
    resource: ResourceType;
    value: number;
  }>;
  manualEffects: string[];
  complexActions: any[];
  customComponentData?: any;
}
```

### EventModifier (from JSON)

```typescript
type EventModifier = 
  | StaticModifier
  | DiceModifier
  | ChoiceModifier;

interface StaticModifier {
  type: 'static';
  resource: ResourceType;
  value: number;
  duration: 'immediate' | 'ongoing';
}

interface DiceModifier {
  type: 'dice';
  resource: ResourceType;
  formula: string; // e.g., '1d4'
  negative: boolean;
  duration: 'immediate' | 'ongoing';
}

interface ChoiceModifier {
  type: 'choice-buttons' | 'choice-dropdown';
  resources: ResourceType[];
  value: number;
  negative: boolean;
  duration: 'immediate' | 'ongoing';
}
```

### GameCommand

```typescript
type GameCommand = 
  | ClaimHexesCommand
  | RecruitArmyCommand
  | AdjustFactionAttitudeCommand
  | ReduceImprisonedCommand
  | ... // 25+ command types

interface ReduceImprisonedCommand {
  type: 'reduceImprisoned';
  settlementId?: string; // or from globalThis
  amount: number | 'rolled' | 'all';
}

interface RecruitArmyCommand {
  type: 'recruitArmy';
  level: number | 'kingdom-level';
}
```

---

## Common Patterns

### Global State Pattern (Pre-Roll Dialogs)

**Store:**
```typescript
(globalThis as any).__pendingYourSelection = selectionId;
```

**Access:**
```typescript
const selectionId = (globalThis as any).__pendingYourSelection;
```

**Cleanup:**
```typescript
delete (globalThis as any).__pendingYourSelection;
```

**Common Keys:**
- `__pendingStipendSettlement`
- `__pendingExecuteOrPardonSettlement`
- `__pendingEconomicAidFaction`
- `__pendingTrainArmyArmy`
- `__pendingRecruitArmy`

### Prepare/Commit Pattern (Game Commands)

**Phase 1 - Prepare:**
```typescript
async yourCommand(params): Promise<PreparedCommand> {
  // NO state changes
  const calculatedValue = calculatePreview(params);
  
  return {
    specialEffect: {
      type: 'status',
      message: `Will apply: ${calculatedValue}`,
      icon: 'fa-icon'
    },
    commit: async () => {
      // Closure captures calculatedValue
      await updateKingdom(k => {
        k.value = calculatedValue;
      });
    }
  };
}
```

**Phase 2 - Commit:**
```typescript
// Executed after user clicks "Apply Result"
await preparedCommand.commit();
```

---

## Critical Integration Points

### 1. Modifier Index Matching

**Problem:** Dice values must match original modifier order

**Solution:**
```typescript
// In ActionPhaseController
const actionModifiers = action[outcome].modifiers;
resolutionData.numericModifiers.forEach(rolled => {
  const idx = actionModifiers.findIndex(m => m.resource === rolled.resource);
  preRolledValues.set(idx, rolled.value);
});

// In ActionResolver
if (command.amount === 'rolled') {
  const idx = modifiers.findIndex(m => m.type === 'dice' && m.resource === 'target');
  amount = preRolledValues.get(idx);
}
```

### 2. Custom vs Standard Resolution

**Decision Point:** `ActionPhaseController.resolveAction()`

```typescript
const implementation = ACTION_IMPLEMENTATIONS[actionId];

if (implementation?.customResolution?.execute &&
    implementation.needsCustomResolution(outcome)) {
  // Custom path
  return await implementation.customResolution.execute(resolutionData);
} else {
  // Standard path via ActionResolver
  return await actionResolver.executeAction(action, outcome, kingdom, preRolledValues);
}
```

### 3. Game Commands with Dice Values

**Pattern:** Use `"amount": "rolled"` in JSON

```json
{
  "modifiers": [{
    "type": "dice",
    "resource": "imprisoned",
    "formula": "1d4",
    "negative": true
  }],
  "gameCommands": [{
    "type": "reduceImprisoned",
    "amount": "rolled"
  }]
}
```

**Resolution:** ActionResolver looks up dice value by resource match

---

## File Organization

```
src/
├── view/kingdom/turnPhases/
│   ├── ActionsPhase.svelte                    # Main orchestrator
│   └── components/
│       ├── ActionDialogManager.svelte         # Dialog mounting
│       ├── ActionCategorySection.svelte       # Category rendering
│       └── OutcomeDisplay/
│           ├── OutcomeDisplay.svelte          # Resolution UI
│           ├── DiceRoller.svelte              # Dice interaction
│           ├── ChoiceSelector.svelte          # Choice interaction
│           └── components/
│               └── *CustomComponent.svelte    # Action-specific UI
│
├── controllers/
│   ├── ActionPhaseController.ts               # Phase controller
│   ├── actions/
│   │   ├── ActionExecutionHelpers.ts          # Roll orchestration
│   │   ├── action-handlers-config.ts          # Pre-roll registry
│   │   ├── action-resolver.ts                 # Action execution
│   │   ├── roll-handler.ts                    # PF2e roll system
│   │   └── implementations/
│   │       └── index.ts                       # Action implementations
│   └── shared/
│       ├── CheckInstanceHelpers.ts            # Instance creation
│       ├── ResolutionStateHelpers.ts          # State management
│       └── GameCommandHelpers.ts              # Command routing
│
├── services/
│   ├── CheckInstanceService.ts                # Instance lifecycle
│   ├── GameCommandsService.ts                 # Resource modifiers
│   ├── GameCommandsResolver.ts                # Command execution
│   ├── armies/                                # Army operations
│   ├── settlements/                           # Settlement operations
│   ├── factions/                              # Diplomatic operations
│   └── hex-selector/                          # Map interaction
│
├── actions/
│   └── {action-id}/
│       ├── *Action.ts                         # Custom implementation
│       ├── *Dialog.svelte                     # Pre-roll dialog
│       └── *Component.svelte                  # Custom resolution UI
│
├── stores/
│   └── KingdomStore.ts                        # Reactive state
│
└── actors/
    └── KingdomActor.ts                        # Data persistence
```

---

## Summary: Complete Action Resolution Flow

The action resolution system flows through **22 sequential touchpoints** from user click to state cleanup. Each step is either a user action (👤) or system operation (⚙️).

### Complete Sequential Flow

1. **👤 USER: Select Action & Skill** - Click action button, choose skill variant
2. **👤 USER: Choose Context** *(optional)* - Pre-roll dialog for settlement/faction/structure/army selection
3. **⚙️ SYSTEM: Prepare Roll** - Set up character, DC, roll options
4. **👤 USER: Execute Skill Check** - Player rolls d20 vs DC (PF2e roll dialog), system determines outcome (crit success/success/failure/crit failure)
5. **⚙️ SYSTEM: Store Roll Result** - Create CheckInstance with outcome and modifiers from JSON
6. **⚙️ SYSTEM: Display Outcome Options** - Mount dice rollers, choice selectors, custom components
7. **👤 USER: Roll Outcome Dice & Make Choices** *(if needed)* - Roll variable effect dice (e.g., "1d4 imprisoned"), select resources for ChoiceModifiers, interact with custom components
8. **⚙️ SYSTEM: Package User Decisions** - Build ResolutionData with all rolled/selected values
9. **⚙️ SYSTEM: Preview Outcomes** *(optional)* - Show preview of effects WITHOUT state changes (Prepare/Commit pattern)
10. **👤 USER: Click "Apply Result"** - Confirm application of outcome
11. **⚙️ SYSTEM: Route to Execution** - Dispatch to controller
12. **⚙️ SYSTEM: Check for Custom Logic** *(optional)* - Route to custom implementation if needed
13. **⚙️ SYSTEM: Convert to Indexed Values** - Map resource names back to modifier indices
14. **⚙️ SYSTEM: Orchestrate Execution** - Split into two parallel paths (Dual-Effect Architecture)
15. **⚙️ SYSTEM: Apply Resource Changes** - Update gold, food, lumber, unrest (Typed Modifiers System)
16. **⚙️ SYSTEM: Execute Complex Operations** - Process game commands with special value resolution
17. **⚙️ SYSTEM: Route Game Commands** - Delegate to GameCommandsResolver methods
18. **⚙️ SYSTEM: Apply Outcomes** - Execute commit() closures for Prepare/Commit commands
19. **⚙️ SYSTEM: Delegate to Specialists** *(if needed)* - Call domain services (Army, Settlement, Faction, Hex Selector)
20. **⚙️ SYSTEM: Persist to Database** - Write to Foundry Actor flags
21. **⚙️ SYSTEM: Broadcast State Changes** - Sync to all connected clients
22. **⚙️ SYSTEM: Clean Up State** - Clear CheckInstance, global state, pending actions

### Flow Variations by Action Type

**Minimal Action** (e.g., `deal-with-unrest`):
- Steps: 1 → 3 → 4 → 5 → 6 → 10 → 11 → 14 → 15 → 20 → 21 → 22
- Skips: Pre-roll dialog (2), Post-roll interaction (7-8), Preview (9), Custom logic (12), Game commands (16-19)

**Standard Action with Dice** (e.g., `execute-or-pardon-prisoners`):
- Steps: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 10 → 11 → 14 → 15 → 16 → 17 → 18 → 20 → 21 → 22
- Includes: Pre-roll dialog (2), Dice rolling (7-8), Game commands (16-18)

**Complex Action with Preview** (e.g., `recruit-unit`):
- Steps: 1 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22
- Includes: All steps - Dice (7-8), Preview (9), Custom logic (12), Game commands with Prepare/Commit (17-18), Domain services (19)

**Hex-Based Action** (e.g., `claim-hexes`):
- Steps: 1 → 3 → 4 → 5 → 6 → 10 → 11 → 14 → 16 → 17 → 19 → 20 → 21 → 22
- Includes: Hex selection service (19) for interactive map selection

### Key Architectural Patterns in Flow

| Pattern | Touchpoints | Purpose |
|---------|-------------|---------|
| **Pre-Roll Dialog** | 2 → stored → read at 16 | Context selection before skill check |
| **Check Instance** | 5 → 6 → 7 → 8 → 22 | Unified state storage for roll outcome |
| **Post-Roll Interaction** | 7 → 8 | User rolls dice, makes choices |
| **Custom Resolution** | 12 | Special business logic (50% cost reduction, tier transitions) |
| **Dual-Effect Architecture** | 14 → 15 & 16 | Separate resource changes from game mechanics |
| **Typed Modifiers** | 15 | Type-safe application of Static/Dice/Choice modifiers |
| **Game Commands** | 16 → 17 → 18 | Structured complex operations (armies, settlements, etc.) |
| **Prepare/Commit** | 9 (prepare) → 18 (commit) | Preview BEFORE state changes, apply AFTER user confirms |
| **Domain Services** | 19 | Specialized logic (ArmyService, SettlementService, etc.) |

Each touchpoint has clear **data in**, **data out**, and **decision points**, providing a complete map for understanding, debugging, or refactoring the system.

---

**Related Documentation:**
- `docs/systems/action-resolution-complete-flow.md` - Complete reference guide
- `docs/AI_ACTION_GUIDE.md` - Quick implementation guide
- `docs/systems/check-instance-system.md` - Check instance architecture
- `docs/systems/game-commands-system.md` - Game commands reference
