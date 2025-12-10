# PF2e Reignmaker Documentation

This documentation describes the architecture and core systems of the Reignmaker kingdom management module for Foundry VTT.

---

## 🤖 For AI Agents

**Start here when exploring this codebase:**

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system overview
2. **Choose your task type:**
   - **Understanding checks/outcomes?** → [core-systems/checks/outcome-display-system.md](core-systems/checks/outcome-display-system.md)
   - **Working with pipelines?** → [core-systems/pipeline/pipeline-coordinator.md](core-systems/pipeline/pipeline-coordinator.md)
   - **Modifying resources?** → [core-systems/effects/typed-modifiers-system.md](core-systems/effects/typed-modifiers-system.md)
   - **Debugging issues?** → [guides/debugging-guide.md](guides/debugging-guide.md)

**Key architectural rules (read ARCHITECTURE.md for details):**
- ✅ Party Actor Flags = Single source of truth
- ✅ Svelte components = UI only (no business logic)
- ✅ Controllers/Services = Business logic only
- ✅ Use `'resolution'` event with `metadata` for custom components
- ✅ Use `postRollInteractions` for inline components

---

## Quick Start

New to the project? Start here:

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive overview of the entire system
2. **[core-systems/pipeline/pipeline-patterns.md](core-systems/pipeline/pipeline-patterns.md)** - Pattern reference for implementing actions
3. Pick a system to learn more about (see Core Systems below)

---

## Core Systems

### Core Architecture (core-systems/)

**[Pipeline Coordinator](core-systems/pipeline-coordinator.md)** - 9-step pipeline architecture for all player actions
- Step-by-step execution flow
- Requirements checking
- Pre-roll and post-roll interactions

**[Turn and Phase System](core-systems/turn-and-phase-system.md)** - Kingdom turn progression through six phases
- Turn lifecycle and phase order
- TurnState (per-turn data management)
- Self-executing phase architecture

**[Phase Controllers](core-systems/phase-controllers.md)** - Phase-specific business logic
- Factory function pattern
- Phase guard protection
- Six phase controller implementations

**[OutcomeDisplay System](core-systems/outcome-display-system.md)** - Universal outcome renderer
- Automatic component inference from modifier types
- Unified badge system
- Custom component integration

**[Typed Modifiers System](core-systems/typed-modifiers-system.md)** - Type-safe resource modifications
- StaticModifier, DiceModifier, ChoiceModifier
- Duration types (immediate, ongoing, turn-count)
- Manual effects vs game commands

**[Game Commands System](core-systems/game-commands-system.md)** - Non-resource effects
- 25+ typed command definitions
- Territory, construction, military, diplomatic commands
- Service architecture

**[Events and Incidents](core-systems/events-and-incidents-system.md)** - Random kingdom events
- Event structure and traits
- Incident severity tiers
- Outcome modifiers

**[Check Type Differences](core-systems/check-type-differences.md)** - Events vs Incidents vs Actions
- Triggering mechanisms
- Persistence patterns
- Pipeline differences

### Map Systems (map-systems/)

**[Hex Selection Flow](map-systems/HEX_SELECTION_FLOW_GUIDE.md)** - Map-based interaction for actions
- Selection state machine
- Visual states and timing
- Integration with pipelines

**[Map Selection Pattern](map-systems/MAP_SELECTION_PATTERN.md)** - Selection patterns
- Hex selection patterns
- Validation strategies

**[Canonical Edge System](map-systems/canonical-edge-system.md)** - Hex border management
- Single source of truth for edges
- Edge ID format
- River and road integration

**[River Editor](map-systems/river-editor-implementation-summary.md)** - River editing tools
- River segment management
- Flow direction handling

### Gameplay Systems (gameplay-systems/)

**[Army Pathfinding](gameplay-systems/army-pathfinding-system.md)** - A* pathfinding for armies
- Movement range calculation
- Visual path preview
- Terrain costs

**[Army Actor Linking](gameplay-systems/army-actor-linking.md)** - Army management
- Actor integration
- Army lifecycle

**[App Window Management](gameplay-systems/app-window-management.md)** - UI visibility control
- CSS-based hide/show
- Map interaction mode

---

## Documentation Organization

```
docs/
├── README.md                          (this file - start here)
├── ARCHITECTURE.md                    (comprehensive system overview)
├── BUILD_SYSTEM.md                    (build system reference)
│
├── core-systems/                      (core architecture fundamentals)
│   ├── README.md                      (quick reference index)
│   ├── pipeline/                      (pipeline execution)
│   │   ├── pipeline-coordinator.md    ⭐ 9-step execution flow
│   │   ├── pipeline-patterns.md       ⭐ Implementation patterns
│   │   └── ROLL_FLOW.md               (roll execution flow)
│   ├── checks/                        (check execution & outcomes)
│   │   ├── outcome-display-system.md  ⭐ Universal outcome renderer
│   │   ├── check-type-differences.md  (events vs incidents vs actions)
│   │   ├── events-and-incidents-system.md (random events)
│   │   └── apply-button-validation.md (result validation)
│   ├── effects/                       (resource & game effects)
│   │   ├── typed-modifiers-system.md  (resource modifications)
│   │   └── game-commands-system.md    (non-resource effects)
│   ├── phases/                        (turn & phase management)
│   │   ├── turn-and-phase-system.md   (turn progression)
│   │   └── phase-controllers.md       (phase business logic)
│   └── services/                      (core services)
│       ├── skill-service.md           (PF2e skill service)
│       └── SERVICE_CONTRACTS.md       (service responsibilities)
│
├── map-systems/                       (map and territory features)
│   ├── HEX_SELECTION_FLOW_GUIDE.md    (map interactions)
│   ├── MAP_SELECTION_PATTERN.md       (selection patterns)
│   ├── canonical-edge-system.md       (hex borders)
│   └── river-editor-implementation-summary.md (river editing)
│
├── gameplay-systems/                  (gameplay features)
│   ├── army-pathfinding-system.md     (army movement)
│   ├── army-actor-linking.md          (army management)
│   └── app-window-management.md       (window lifecycle)
│
├── guides/                            (practical guides)
│   ├── debugging-guide.md             ⭐ Common issues & fixes
│   └── testing-guide.md               (systematic testing)
│
├── design/                            (UI/UX patterns)
│   ├── choice-buttons.md              (choice UI component)
│   └── surface-background-system.md   (color system)
│
└── planning/                          (development tracking)
    └── (future planning files)
```

**⭐ = Most frequently referenced by AI agents**

---

## Documentation Philosophy

These documents focus on **architectural principles and data flow**, not implementation details:

- **What is this system?** - Purpose and overview
- **Why does it exist?** - Architectural rationale
- **How does it work?** - High-level data flow
- **What are the key patterns?** - Architectural patterns

**Not included:**
- Step-by-step tutorials (see core-systems/pipeline-patterns.md)
- Complete API documentation (see TypeScript types in code)
- Detailed code walkthroughs (see actual implementations)

---

## Architecture Principles

From [ARCHITECTURE.md](ARCHITECTURE.md):

1. **Single Source of Truth** - Party Actor Flags is the only persistent data source
2. **Clean Separation of Concerns** - Components = UI, Controllers = Logic, Services = Utilities
3. **Reactive Bridge Pattern** - Svelte stores provide reactive access to KingdomActor
4. **Self-Executing Phases** - Phase components auto-start controllers on mount
5. **Type Safety** - Explicit TypeScript types, no regex pattern matching
6. **Pipeline Architecture** - All actions follow standardized 9-step pipeline

---

## Key Files Reference

**Data Layer:**
- `src/actors/KingdomActor.ts` - Single source of truth
- `src/stores/KingdomStore.ts` - Reactive bridge layer

**Turn/Phase:**
- `src/models/turn-manager/TurnManager.ts` - Turn/phase coordinator
- `src/controllers/*PhaseController.ts` - Phase business logic
- `src/controllers/shared/PhaseControllerHelpers.ts` - Shared utilities

**Pipelines & Actions:**
- `src/pipelines/actions/*.ts` - Action pipeline definitions
- `src/services/PipelineCoordinator.ts` - 9-step execution engine
- `src/services/UnifiedCheckHandler.ts` - Check execution

**Checks & Effects:**
- `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Universal outcome renderer
- `src/services/GameCommandsService.ts` - Non-resource effects
- `src/types/modifiers.ts` - Hand-written modifier types

**UI:**
- `src/view/kingdom/turnPhases/*.svelte` - Phase components
- `src/view/kingdom/components/OutcomeDisplay/` - Outcome resolution UI
- `src/view/kingdom/components/OutcomeDisplay/config/ComponentRegistry.ts` - Custom component registry

---

## Common Tasks

### I need to implement a new action

1. Read: [core-systems/pipeline/pipeline-patterns.md](core-systems/pipeline/pipeline-patterns.md)
2. Find your pattern and copy structure from similar action
3. Test in Foundry - roll, apply, verify state changes

### I need to understand how actions work

1. Read: [core-systems/pipeline/pipeline-coordinator.md](core-systems/pipeline/pipeline-coordinator.md)
2. Read: [core-systems/checks/outcome-display-system.md](core-systems/checks/outcome-display-system.md)
3. Look at: `src/pipelines/actions/` for examples

### I need to modify resources or apply effects

1. Read: [core-systems/effects/typed-modifiers-system.md](core-systems/effects/typed-modifiers-system.md)
2. Read: [core-systems/effects/game-commands-system.md](core-systems/effects/game-commands-system.md)
3. Use explicit types (StaticModifier, DiceModifier, etc.)

### I'm debugging an issue

1. Read: [guides/debugging-guide.md](guides/debugging-guide.md)
2. Follow the systematic debugging checklist

### I need to test changes

1. Read: [guides/testing-guide.md](guides/testing-guide.md)
2. Check: `src/constants/migratedActions.ts` for testing status
3. Follow the systematic testing approach

---

## For New Developers

**Recommended reading order:**

1. [ARCHITECTURE.md](ARCHITECTURE.md) - Get the big picture (30 min)
2. [core-systems/pipeline/pipeline-coordinator.md](core-systems/pipeline/pipeline-coordinator.md) - Understand action flow (15 min)
3. [core-systems/checks/outcome-display-system.md](core-systems/checks/outcome-display-system.md) - Learn outcome rendering (15 min)
4. [core-systems/pipeline/pipeline-patterns.md](core-systems/pipeline/pipeline-patterns.md) - See practical patterns (20 min)
5. [core-systems/phases/turn-and-phase-system.md](core-systems/phases/turn-and-phase-system.md) - Understand turn flow (15 min)

Then explore the codebase with this architectural context.

---

## Contributing

When adding new features:

- ✅ Follow existing architectural patterns
- ✅ Use type-safe modifiers, not string parsing
- ✅ Delegate business logic to controllers
- ✅ Keep UI components presentation-only
- ✅ Use PipelineCoordinator for all actions
- ✅ Dispatch `'resolution'` events with `metadata` for custom components
- ✅ Update documentation if architecture changes

---

**Questions?** Check the comprehensive [ARCHITECTURE.md](ARCHITECTURE.md) or explore the system-specific docs in `core-systems/`, `map-systems/`, and `gameplay-systems/`.
