# PF2e Reignmaker Documentation

This documentation describes the architecture and core systems of the Reignmaker kingdom management module for Foundry VTT.

---

## 🤖 For AI Agents

**Start here when exploring this codebase:**

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system overview
2. **Choose your task type:**
   - **Implementing/fixing actions?** → [guides/CUSTOM_UI_ACTION_GUIDE.md](guides/CUSTOM_UI_ACTION_GUIDE.md)
   - **Understanding checks/outcomes?** → [systems/outcome-display-system.md](systems/outcome-display-system.md)
   - **Working with pipelines?** → [systems/pipeline-coordinator.md](systems/pipeline-coordinator.md)
   - **Modifying resources?** → [systems/typed-modifiers-system.md](systems/typed-modifiers-system.md)
   - **Debugging issues?** → [refactoring/DEBUGGING_GUIDE.md](refactoring/DEBUGGING_GUIDE.md)

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
2. **[guides/CUSTOM_UI_ACTION_GUIDE.md](guides/CUSTOM_UI_ACTION_GUIDE.md)** - Quick reference for implementing actions
3. Pick a system to learn more about (see Core Systems below)

---

## Core Systems

These documents describe the main architectural systems:

### [OutcomeDisplay System](systems/outcome-display-system.md)
Universal outcome renderer for Actions, Events, and Incidents.

**Topics:**
- Automatic component inference from modifier types
- Unified badge system
- Custom component integration
- Registry pattern

### [Pipeline Coordinator](systems/pipeline-coordinator.md)
9-step pipeline architecture for all player actions.

**Topics:**
- Step-by-step execution flow
- Requirements checking
- Pre-roll and post-roll interactions
- Execute and cleanup phases

### [Turn and Phase System](systems/turn-and-phase-system.md)
Coordinate kingdom turn progression through six phases.

**Topics:**
- Turn lifecycle and phase order
- TurnState (per-turn data management)
- Phase progression patterns
- Self-executing phase architecture

### [Typed Modifiers System](systems/typed-modifiers-system.md)
Type-safe resource modifications using explicit TypeScript discriminants.

**Topics:**
- StaticModifier, DiceModifier, ChoiceModifier
- Duration types (immediate, ongoing, turn-count)
- Outcome structure and message placeholders
- Manual effects vs game commands

### [Game Commands System](systems/game-commands-system.md)
Structured gameplay commands for non-resource effects from player actions.

**Topics:**
- 25+ typed command definitions
- Territory, construction, military, diplomatic commands
- Service architecture (GameCommandsService, GameCommandsResolver)
- Integration with action outcomes and dual-effect pattern

### [Phase Controllers](systems/phase-controllers.md)
Implement phase-specific business logic following standardized patterns.

**Topics:**
- Factory function pattern
- Phase guard protection
- Step management helpers
- Six phase controller implementations

---

## Documentation Organization

```
docs/
├── README.md                          (this file - start here)
├── ARCHITECTURE.md                    (comprehensive system overview)
├── BUILD_SYSTEM.md                    (build system reference)
│
├── guides/                            (implementation how-tos)
│   ├── CUSTOM_UI_ACTION_GUIDE.md      ⭐ Creating custom action UI
│   ├── INLINE_COMPONENT_PATTERN.md    (postRoll vs postApply)
│   └── VALIDATION_PATTERNS.md         (validation strategies)
│
├── systems/                           (core architecture docs)
│   ├── outcome-display-system.md      ⭐ Universal outcome renderer
│   ├── pipeline-coordinator.md        ⭐ 9-step action pipeline
│   ├── turn-and-phase-system.md       (turn progression)
│   ├── typed-modifiers-system.md      (resource modifications)
│   ├── game-commands-system.md        (non-resource effects)
│   ├── phase-controllers.md           (phase business logic)
│   ├── events-and-incidents-system.md (random events)
│   ├── HEX_SELECTION_FLOW_GUIDE.md    (map interactions)
│   ├── MAP_SELECTION_PATTERN.md       (selection patterns)
│   ├── army-actor-linking.md          (army management)
│   ├── army-pathfinding-system.md     (army movement)
│   ├── canonical-edge-system.md       (hex borders)
│   ├── check-type-differences.md      (action/event/incident)
│   ├── app-window-management.md       (window lifecycle)
│   └── river-editor-implementation-summary.md (river editing)
│
├── refactoring/                       (migration & testing)
│   ├── README.md                      (migration overview)
│   ├── DEBUGGING_GUIDE.md             ⭐ Common issues & fixes
│   ├── TESTING_GUIDE.md               (systematic testing)
│   ├── ACTION_MIGRATION_CHECKLIST.md  (migration steps)
│   ├── CUSTOM_COMPONENTS_TODO.md      (component tracking)
│   └── MODIFIER_PATTERNS.md           (modifier best practices)
│
├── design-system/                     (UI/UX patterns)
│   ├── choice-buttons.md              (choice UI component)
│   └── surface-background-system.md   (color system)
│
├── todo/                              (development tracking)
│   ├── known_issues.md                (bug list)
│   ├── hex-selector-territory-layer-issue.md
│   └── production_recalculation.md
│
└── archived/                          (historical/completed work)
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
- Step-by-step tutorials (see guides/)
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

### I need to create a custom action UI component

1. Read: [guides/CUSTOM_UI_ACTION_GUIDE.md](guides/CUSTOM_UI_ACTION_GUIDE.md)
2. Follow the Arrest Dissidents example (complete working code)
3. Use the debugging checklist if issues arise

### I need to understand how actions work

1. Read: [systems/pipeline-coordinator.md](systems/pipeline-coordinator.md)
2. Read: [systems/outcome-display-system.md](systems/outcome-display-system.md)
3. Look at: `src/pipelines/actions/` for examples

### I need to modify resources or apply effects

1. Read: [systems/typed-modifiers-system.md](systems/typed-modifiers-system.md)
2. Read: [systems/game-commands-system.md](systems/game-commands-system.md)
3. Use explicit types (StaticModifier, DiceModifier, etc.)

### I'm debugging an issue

1. Read: [refactoring/DEBUGGING_GUIDE.md](refactoring/DEBUGGING_GUIDE.md)
2. Check: [todo/known_issues.md](todo/known_issues.md)
3. Follow the systematic debugging checklist

### I need to test changes

1. Read: [refactoring/TESTING_GUIDE.md](refactoring/TESTING_GUIDE.md)
2. Check: `src/constants/migratedActions.ts` for testing status
3. Follow the systematic testing approach

---

## For New Developers

**Recommended reading order:**

1. [ARCHITECTURE.md](ARCHITECTURE.md) - Get the big picture (30 min)
2. [systems/pipeline-coordinator.md](systems/pipeline-coordinator.md) - Understand action flow (15 min)
3. [systems/outcome-display-system.md](systems/outcome-display-system.md) - Learn outcome rendering (15 min)
4. [guides/CUSTOM_UI_ACTION_GUIDE.md](guides/CUSTOM_UI_ACTION_GUIDE.md) - See practical examples (20 min)
5. [systems/turn-and-phase-system.md](systems/turn-and-phase-system.md) - Understand turn flow (15 min)

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

**Questions?** Check the comprehensive [ARCHITECTURE.md](ARCHITECTURE.md) or explore the system-specific docs in `systems/`.
