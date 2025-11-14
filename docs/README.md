# PF2e Reignmaker Documentation

This documentation describes the architecture and core systems of the Reignmaker kingdom management module for Foundry VTT.

---

## Quick Start

New to the project? Start here:

1. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive overview of the entire system
2. **[AI_ACTION_GUIDE](guides/AI_ACTION_GUIDE.md)** - Quick reference for implementing/updating actions
3. Pick a system to learn more about (see below)

---

## Core Systems

These documents describe the four main architectural systems:

### [Check Instance System](systems/check-instance-system.md)
Unified architecture for all check-based gameplay (events, incidents, player actions).

**Topics:**
- ActiveCheckInstance data structure
- Check lifecycle (creation → resolution → application → cleanup)
- Multi-client synchronization
- Integration with typed modifiers

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

## File Organization

```
docs/
├── README.md                       (this file - navigation guide)
├── ARCHITECTURE.md                 (comprehensive system overview)
├── UNIFIED_CHECK_ARCHITECTURE.md   (unified check resolution architecture)
├── BUILD_SYSTEM.md                 (build system reference)
├── TESTING_MANUAL.md               (testing guide)
├── features/                       (feature documentation)
│   └── save-load-feature.md
├── guides/                         (implementation guides)
│   ├── AI_ACTION_GUIDE.md          (action implementation quick reference)
│   └── CUSTOM_UI_ACTION_GUIDE.md   (custom UI patterns)
├── systems/                        (core system documentation)
│   ├── check-instance-system.md
│   ├── turn-and-phase-system.md
│   ├── typed-modifiers-system.md
│   ├── game-commands-system.md
│   └── phase-controllers.md
├── todo/                           (development tracking)
│   ├── known_issues.md
│   ├── manual_effects_automation.md
│   └── production_recalculation.md
├── refactoring/                    (migration documentation)
│   ├── README.md
│   ├── MIGRATION_GUIDE.md
│   ├── CODE_INVENTORY.md
│   ├── GAME_COMMANDS_CLASSIFICATION.md
│   ├── ACTION_MIGRATION_MATRIX.md
│   └── implementation/             (TypeScript implementation files)
├── design-system/                  (UI/UX documentation)
└── archived/                       (historical/completed work)
```

---

## Documentation Philosophy

These documents focus on **architectural principles and data flow**, not implementation details:

- **What is this system?** - Purpose and overview
- **Why does it exist?** - Architectural rationale
- **How does it work?** - High-level data flow
- **What are the key patterns?** - Architectural patterns

**Not included:**
- Implementation guides or TODO lists
- Complete API documentation (see TypeScript types in code)
- Detailed code examples (see actual implementations)

---

## Architecture Principles

From [ARCHITECTURE.md](ARCHITECTURE.md):

1. **Single Source of Truth** - KingdomActor is the only persistent data source
2. **Clean Separation of Concerns** - Components = UI, Controllers = Logic, Services = Utilities
3. **Reactive Bridge Pattern** - Svelte stores provide reactive access to KingdomActor
4. **Self-Executing Phases** - Phase components auto-start controllers on mount
5. **Type Safety** - Explicit TypeScript types, no regex pattern matching

---

## Key Files Reference

**Data Layer:**
- `src/actors/KingdomActor.ts` - Single source of truth
- `src/stores/KingdomStore.ts` - Reactive bridge layer

**Turn/Phase:**
- `src/models/turn-manager/TurnManager.ts` - Turn/phase coordinator
- `src/controllers/*PhaseController.ts` - Phase business logic
- `src/controllers/shared/PhaseControllerHelpers.ts` - Shared utilities

**Checks & Effects:**
- `src/services/CheckInstanceService.ts` - Check lifecycle management
- `src/services/GameEffectsService.ts` - Effect application
- `src/types/modifiers.ts` - Hand-written modifier types

**UI:**
- `src/view/kingdom/turnPhases/*.svelte` - Phase components
- `src/view/kingdom/components/BaseCheckCard.svelte` - Unified check UI
- `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Outcome resolution

---

## For New Developers

**Recommended reading order:**

1. [ARCHITECTURE.md](ARCHITECTURE.md) - Get the big picture
2. [Phase Controllers](systems/phase-controllers.md) - Understand how phases work
3. [Turn and Phase System](systems/turn-and-phase-system.md) - See how turns flow
4. [Check Instance System](systems/check-instance-system.md) - Learn check-based gameplay
5. [Typed Modifiers System](systems/typed-modifiers-system.md) - Understand resource changes

Then explore the codebase with this architectural context.

---

## Contributing

When adding new features:

- ✅ Follow existing architectural patterns
- ✅ Use type-safe modifiers, not string parsing
- ✅ Delegate business logic to controllers
- ✅ Keep UI components presentation-only
- ✅ Use CheckInstanceService for all check operations
- ✅ Update documentation if architecture changes

---

**Questions?** Check the comprehensive [ARCHITECTURE.md](ARCHITECTURE.md) or explore the system-specific docs in `systems/`.
