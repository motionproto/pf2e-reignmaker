# PF2e Reignmaker - Architecture Documentation

**Document Date:** September 30, 2025, 9:01 PM (Europe/Berlin, UTC+2:00)  
**Last Updated:** September 30, 2025, 9:14 PM (Europe/Berlin, UTC+2:00)

## Context Usage Instructions

**This architecture document represents the CURRENT, VERIFIED state of the PF2e Reignmaker codebase as of September 30, 2025. Use this as the authoritative reference for all architectural decisions and implementation guidance.**

### Key Sections for Quick Reference
- **"Core Architecture Components"** → Understand system layers
- **"Data Flow Architecture"** → Follow correct data patterns  
- **"Development Patterns > Adding New Features"** → Step-by-step implementation guide
- **"File Organization Principles"** → Know where to place new code
- **"Key Architectural Decisions"** → Understand WHY choices were made

### Decision-Making Hierarchy
**When making implementation choices:**
1. First check "Development Patterns" section
2. Reference "Service Layer" organization
3. Follow "Naming Conventions" 
4. Verify against "Data Flow Architecture"
5. Ensure "KingdomActor-centered design" compliance

### Anti-Pattern Warnings
**Avoid these deprecated patterns:**
- ❌ Dual stores (old kingdom.ts + gameState.ts pattern)
- ❌ Map/Set data structures (use Records/Arrays)
- ❌ Direct UI-to-store mutations (use controllers + commands)
- ❌ Business logic in Svelte components (use services)

### Quick Implementation Lookup
**Common tasks → Where to implement:**
- New game rules → `src/services/domain/`
- New UI features → `src/view/kingdom/`
- State mutations → `src/commands/`
- Data orchestration → `src/controllers/`
- Type definitions → `src/types/`

---

## Executive Summary

PF2e Reignmaker is a Foundry VTT module implementing kingdom management mechanics for Pathfinder 2e. The architecture has evolved to a **KingdomActor-centered design** that leverages Foundry's native actor system for data persistence while maintaining clean separation of concerns through a layered architecture pattern.

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Foundry VTT Integration                   │
├─────────────────────────────────────────────────────────────────┤
│                     View Layer (Svelte)                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Kingdom       │ │   Turn Phases   │ │  Components &   │   │
│  │   Components    │ │   (6 phases)    │ │  Tabs           │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Controller Layer                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  ActionPhase    │ │  EventPhase     │ │  StatusPhase    │   │
│  │  Controller     │ │  Controller     │ │  Controller     │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                   Command Pattern Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Action         │ │  Event          │ │  Kingdom        │   │
│  │  Commands       │ │  Commands       │ │  Commands       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Service Layer                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Domain         │ │  Economics      │ │  Territory      │   │
│  │  Services       │ │  Services       │ │  Services       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Data & State Layer                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  KingdomActor   │ │  Reactive       │ │  UI State       │   │
│  │  (Foundry)      │ │  Stores         │ │  Stores         │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architecture Components

### 1. Data & State Layer

#### KingdomActor (`src/actors/KingdomActor.ts`)
**Role:** Central data entity extending Foundry's Actor class

**Key Responsibilities:**
- Kingdom data persistence via Foundry's actor system using flags
- Data validation and business rule enforcement
- Reactive change events for UI updates
- Serializable kingdom state management

**Core Interface:**
```typescript
class KingdomActor extends Actor {
  // Data access
  getKingdom(): KingdomData | null
  setKingdom(kingdom: KingdomData): Promise<void>
  updateKingdom(updater: (kingdom: KingdomData) => void): Promise<void>
  
  // Phase management
  advancePhase(): Promise<void>
  markPhaseStepCompleted(stepId: string): Promise<void>
  isCurrentPhaseComplete(): boolean
  
  // Resource management
  modifyResource(resource: string, amount: number): Promise<void>
  setResource(resource: string, amount: number): Promise<void>
  
  // Collection management
  addSettlement(settlement: Settlement): Promise<void>
  addArmy(army: Army): Promise<void>
  removeArmy(armyId: string): Promise<void>
}
```

**Data Structure:** Uses simple, serializable objects instead of Maps/Sets:
```typescript
interface KingdomData {
  currentTurn: number;
  currentPhase: TurnPhase;
  resources: Record<string, number>;           // Not Map
  phaseStepsCompleted: Record<string, boolean>; // Not Set
  playerActions: Record<string, PlayerAction>; // Not Map
  // ... other serializable properties
}
```

#### Reactive Stores (`src/stores/`)
**Current Store Structure:**
- `kingdomActor.ts` - Main store providing reactive access to KingdomActor
- `turn.ts` - Turn and phase management state
- `ui.ts` - UI-specific state (expanded sections, selected items)

**Store Architecture:**
```typescript
// Primary reactive access to kingdom data
export const kingdomActor = writable<KingdomActor | null>(null);
export const kingdomData = derived(kingdomActor, $actor => $actor?.getKingdom());

// Convenience derived stores
export const currentTurn = derived(kingdomData, $data => $data?.currentTurn);
export const currentPhase = derived(kingdomData, $data => $data?.currentPhase);
export const resources = derived(kingdomData, $data => $data?.resources);
export const settlements = derived(kingdomData, $data => $data?.settlements);
export const armies = derived(kingdomData, $data => $data?.armies);
```

### 2. Service Layer

#### Domain Services (`src/services/domain/`)
**Current Structure:**
```
domain/
├── ActionExecutionService.ts      # Action execution logic
├── BuildQueueService.ts          # Construction queue management
├── DiceService.ts                # Dice rolling and probability
├── EventResolutionService.ts     # Event handling logic
├── ResourceManagementService.ts  # Resource calculations
├── UnrestService.ts              # Unrest mechanics
├── events/                       # Event-specific services
└── modifiers/                    # Modifier management services
```

#### Specialized Services (`src/services/`)
- `economics/` - Economic calculations and trade
- `settlements/` - Settlement management
- `structures/` - Building and structure logic
- `territory/` - Hex and territory management
- `formatters/` - Data formatting for UI
- `parsers/` - Data parsing and validation
- `ClientContextService.ts` - Client context management

### 3. Command Pattern Layer (`src/commands/`)

**Current Structure:**
```
commands/
├── base/                    # Command infrastructure
├── action/                  # Action-related commands
├── event/                   # Event-related commands
├── kingdom/                 # Kingdom state commands
└── unrest/                  # Unrest-related commands
```

**Purpose:** Encapsulates all state mutations with:
- Transactional consistency
- Rollback capabilities
- Business rule validation
- Audit trail potential

### 4. Controller Layer (`src/controllers/`)

**Current Controllers:**
- `ActionPhaseController.ts` - Orchestrates action phase operations
- `EventPhaseController.ts` - Manages event phase workflow
- `ResourcePhaseController.ts` - Resource phase management
- `StatusPhaseController.ts` - Status and overview operations
- `UnrestPhaseController.ts` - Unrest phase handling
- `UpkeepPhaseController.ts` - Upkeep and maintenance phase

**Controller Responsibilities:**
- Orchestrate services and commands
- Transform data for UI consumption
- Handle application workflow
- Manage cross-cutting concerns

### 5. View Layer (`src/view/kingdom/`)

**Current View Structure (Based on Actual Codebase):**
```
view/kingdom/
├── KingdomApp.ts            # Application entry point
├── KingdomAppShell.svelte   # Main shell component
├── components/              # Reusable UI components
│   ├── BuildStructureDialog.svelte
│   ├── KingdomStats.svelte
│   ├── OutcomeDisplay.svelte
│   ├── PhaseBar.svelte
│   ├── PhaseHeader.svelte
│   ├── PlayerActionTracker.svelte
│   └── ActionConfirmDialog.svelte
├── tabs/                    # Tab-based navigation
│   ├── TurnTab.svelte
│   ├── SettlementsTab.svelte
│   ├── TerritoryTab.svelte
│   ├── ModifiersTab.svelte
│   ├── FactionsTab.svelte
│   └── SettingsTab.svelte
└── turnPhases/              # Turn phase views
    ├── StatusPhase.svelte
    ├── ResourcesPhase.svelte
    ├── EventsPhase.svelte
    ├── ActionsPhase.svelte
    ├── UnrestPhase.svelte
    └── UpkeepPhase.svelte
```

**Technology:** Svelte components with reactive stores integration

### 6. UI Support Layer (`src/ui/`)

**Current UI Components:**
- `KingdomIcon.ts` - Icon handling utilities
- `KingdomIconDebug.ts` - Debug utilities for icons

## Data Flow Architecture

### Primary Data Flow
```
User Interaction (Svelte Component)
    ↓
Controller Method Call
    ↓
Service Orchestration (Business Logic)
    ↓
Command Execution (State Mutation)
    ↓
KingdomActor.updateKingdom() (Foundry Actor Update)
    ↓
Store Reactivity Update
    ↓
UI Re-render (Svelte Reactivity)
```

### Foundry Integration Flow
```
Module Load
    ↓
Hook Registration (src/hooks/)
    ↓
KingdomActor Registration
    ↓
Store Initialization
    ↓
UI Component Registration
    ↓
Module Ready
```

### Reactive Store Update Flow
```
KingdomActor Flag Update
    ↓
Foundry updateActor Hook
    ↓
Store Reactive Update (kingdomActor.update())
    ↓
Derived Store Updates (kingdomData, resources, etc.)
    ↓
Component Re-renders
```

## Key Architectural Decisions

### 1. KingdomActor-Centered Design
**Decision:** Use Foundry Actor as the primary data entity
**Rationale:** 
- Leverages Foundry's built-in persistence and networking
- Automatic cross-client synchronization
- Native permission system integration
- Consistent with Foundry ecosystem patterns

**Implementation:** Kingdom data stored in actor flags using module-specific keys

### 2. Clean Architecture with Command Pattern
**Decision:** Separate business logic into services and encapsulate mutations in commands
**Rationale:**
- Improved testability and maintainability
- Clear separation of concerns
- Rollback capabilities for complex operations
- Consistent state mutation patterns

### 3. Reactive Store Architecture
**Decision:** Use derived stores for reactive UI updates
**Rationale:**
- Automatic UI synchronization with data changes
- Minimal boilerplate for data binding
- Performance optimization through selective updates
- Clear data flow from actor to UI

### 4. Phase-Based Controllers
**Decision:** Dedicated controllers for each turn phase
**Rationale:**
- Clear separation of game phase logic
- Easier testing and maintenance
- Matches the game's natural flow (6 phases per turn)
- Scalable for future phase additions

### 5. Serializable Data Structures
**Decision:** Use simple objects and arrays instead of Maps/Sets
**Rationale:**
- Compatible with Foundry's actor flag system
- Eliminates serialization issues
- Simplifies data access patterns
- Better cross-client synchronization

## File Organization Principles

### Directory Structure Logic
```
src/
├── actors/              # Foundry actor extensions (KingdomActor)
├── api/                 # External API integrations
├── commands/            # Command pattern implementations
├── composables/         # Reusable reactive logic
├── controllers/         # Application layer orchestration
├── core/                # Core utilities and base classes
├── hooks/               # Foundry VTT lifecycle hooks
├── models/              # Data models and interfaces
├── services/            # Business logic services
├── stores/              # State management (3 stores)
├── styles/              # CSS and styling
├── types/               # TypeScript definitions
├── ui/                  # UI utilities and helpers
├── utils/               # General utility functions
└── view/                # Svelte view components (kingdom/)
```

### Naming Conventions
- **Controllers:** `{Phase}Controller.ts` (e.g., `ActionPhaseController.ts`)
- **Services:** `{Domain}Service.ts` (e.g., `ResourceManagementService.ts`)
- **Commands:** `{Action}Command.ts` (e.g., `ExecuteActionCommand.ts`)
- **Stores:** `{entity}.ts` (e.g., `kingdomActor.ts`)
- **Views:** `{Feature}.svelte` (e.g., `ActionsPhase.svelte`)

## Configuration and Build

### Module Configuration
**File:** `module.json`
- Foundry v11+ compatibility
- PF2e system dependency
- Asset and language file declarations

### Development Configuration
- **Vite:** Development server with HMR support
- **TypeScript:** Full type safety with strict mode
- **Svelte:** Component framework for reactive UI
- **ESLint/Prettier:** Code quality and formatting

### Build Process
```
TypeScript Source → Vite Build → Minified Bundle → Foundry Module
```

**Build Output:**
- `dist/pf2e-reignmaker.js` (1,825 kB)
- `dist/pf2e-reignmaker.css` (133 kB)
- Data files: `events.json`, `incidents.json`, `player-actions.json`

## Integration Points

### Foundry VTT Integration
1. **Actor System:** KingdomActor extends Foundry's Actor class
2. **Flag Storage:** Kingdom data stored in `actor.flags['pf2e-reignmaker']['kingdom-data']`
3. **Hooks System:** Lifecycle management through Foundry hooks
4. **Sheet System:** Custom kingdom sheets and dialogs
5. **Permission System:** Leverages Foundry's built-in permissions
6. **Update Synchronization:** Automatic via `updateActor` hooks

### PF2e System Integration
1. **Skill Checks:** Integration with PF2e's roll system
2. **Modifiers:** Kingdom modifiers appear in PF2e roll dialogs
3. **Character Integration:** Links kingdom actions to character skills
4. **Localization:** Uses PF2e's localization system

## Performance Considerations

### Optimization Strategies
1. **Selective Reactivity:** Derived stores only update when relevant data changes
2. **Lazy Loading:** Complex data loaded on-demand
3. **Batched Updates:** Multiple changes combined into single actor updates
4. **Minimal Re-renders:** Svelte's efficient update algorithm

### Scalability Measures
1. **Modular Services:** New features can be added without architectural changes
2. **Command Pattern:** Easy to add new operations and rollback mechanisms
3. **Plugin Architecture:** Service layer allows for extension points
4. **Type Safety:** TypeScript prevents runtime errors and aids refactoring

## Development Patterns

### Adding New Features
1. **Define Domain Model:** Add interfaces in `src/types/`
2. **Create Service:** Implement business logic in `src/services/domain/`
3. **Add Commands:** Create state mutation commands in `src/commands/`
4. **Build Controller:** Orchestrate operations in `src/controllers/`
5. **Create Views:** Build UI components in `src/view/kingdom/`

### Testing Strategy
1. **Unit Tests:** Services and commands with isolated logic
2. **Integration Tests:** Controllers with service orchestration
3. **Component Tests:** View components with mock data
4. **E2E Tests:** Complete user workflows through actual UI

### Error Handling
1. **Service Layer:** Throws domain-specific errors
2. **Controller Layer:** Catches and translates errors for UI
3. **View Layer:** Displays user-friendly error messages
4. **Logging:** Comprehensive logging for debugging

## Migration History

### Architecture Evolution
1. **v1.0:** Simple component-based architecture
2. **v2.0:** Introduction of stores for state management
3. **v3.0:** Clean architecture with service separation
4. **v4.0:** KingdomActor-centered design (current)

### Key Migrations Completed
- ✅ Dual-store elimination (kingdom.ts + gameState.ts → kingdomActor.ts)
- ✅ Service layer reorganization into domain folders
- ✅ Command pattern implementation for state mutations
- ✅ Controller-based application layer
- ✅ Reactive store architecture with derived stores
- ✅ Serializable data structures (Records instead of Maps/Sets)

### Legacy Cleanup
- Removed race condition-prone dual stores
- Eliminated Map/Set data structures for JSON serialization
- Simplified data flow patterns
- Consolidated business logic into service layer

## Current System Status

### Operational Components
- **Core Systems:** KingdomActor, reactive stores, phase controllers
- **Turn Management:** 6-phase turn system with automatic progression
- **Resource Management:** 6 resource types with calculations
- **Settlement System:** Settlement creation and management
- **Army System:** Military unit management
- **Event System:** Random events and outcomes
- **Modifier System:** Temporary and permanent kingdom modifiers

### Build Health
- **Bundle Size:** 1.8MB (311kB gzipped)
- **Build Time:** ~2.2 seconds
- **Dependencies:** Clean with no major vulnerabilities
- **Type Coverage:** Full TypeScript with strict mode

## Future Architecture Considerations

### Planned Enhancements
1. **Enhanced Type Safety:** More specific TypeScript interfaces
2. **Plugin System:** Formal extension points for custom features
3. **Performance Monitoring:** Built-in performance tracking
4. **Advanced Testing:** Visual regression and performance testing
5. **Documentation Generation:** Automatic API documentation

### Extensibility Roadmap
1. **Custom Rule Systems:** Framework for house rules and variants
2. **Third-Party Integrations:** API for external tools and services
3. **Advanced Analytics:** Kingdom performance tracking and insights
4. **Real-time Collaboration:** Enhanced multiplayer synchronization

### Technical Debt Management
1. **Regular Architecture Reviews:** Quarterly assessment of patterns
2. **Refactoring Sprints:** Dedicated time for technical improvements
3. **Performance Audits:** Regular performance and memory analysis
4. **Security Reviews:** Ongoing security assessment and updates

---

## Conclusion

The current PF2e Reignmaker architecture represents a mature, well-structured foundation that balances the complexity of kingdom management mechanics with the reliability and performance expectations of a Foundry VTT module. The KingdomActor-centered design provides a robust data persistence layer while the clean architecture pattern ensures maintainability and extensibility.

The modular service architecture, combined with the command pattern for state mutations and reactive stores for UI updates, creates a system that is both developer-friendly and performant. The integration with Foundry VTT's native systems ensures compatibility and leverages the platform's strengths while maintaining the flexibility needed for complex kingdom management features.

**Architecture Status:** Stable and production-ready  
**Last Review:** September 30, 2025, 9:01 PM (Europe/Berlin, UTC+2:00)  
**Next Scheduled Review:** December 30, 2025
