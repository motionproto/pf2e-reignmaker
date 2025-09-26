# Svelte Business Logic Separation Migration Plan

**Created:** September 26, 2025, 3:27 PM (Europe/Berlin)  
**Author:** Migration Planning Team  
**Project:** PF2e Reignmaker Module

## Executive Summary

This document outlines the comprehensive migration plan to extract business logic from Svelte components and implement proper separation of concerns in the PF2e Reignmaker module. The migration addresses critical issues where business logic is embedded within UI components, making the codebase difficult to test, maintain, and extend.

## Problem Statement

### Current Issues Identified

1. **Business Logic in UI Components**
   - Svelte components contain extensive business logic in script tags
   - Direct state mutations happening in components
   - Complex calculations and algorithms mixed with presentation logic
   - Dice rolling and RNG logic directly in components

2. **Specific Problem Areas**
   - `EventsPhase.svelte`: Contains event resolution logic, DC calculations, and resource modifications
   - `ActionsPhase.svelte`: Includes action parsing, state management, and availability checks
   - `ActionCard.svelte`: Has outcome parsing, state change formatting, and fame reroll logic
   - `UnrestPhase.svelte`: Contains unrest calculations, tier determination, and incident rolling

3. **Consequences of Current Architecture**
   - **Poor Testability**: Cannot unit test business logic without UI
   - **Limited Reusability**: Logic tied to specific components
   - **Maintenance Burden**: Changes require understanding both UI and business logic
   - **Type Safety Issues**: Loose typing in component scripts
   - **Performance Concerns**: Business logic re-executes with component re-renders

## Migration Phases

### Phase 1: Service Layer Extraction (Week 1)
**Target Completion: October 3, 2025**

#### 1.1 Create Service Infrastructure
```
src/
├── services/
│   ├── domain/
│   │   ├── EventResolutionService.ts
│   │   ├── ActionExecutionService.ts
│   │   ├── UnrestService.ts
│   │   ├── DiceService.ts
│   │   └── index.ts
│   ├── parsers/
│   │   ├── ActionOutcomeParser.ts
│   │   ├── EventEffectParser.ts
│   │   └── index.ts
│   └── formatters/
│       ├── StateChangeFormatter.ts
│       ├── ResourceFormatter.ts
│       └── index.ts
```

#### 1.2 EventResolutionService Implementation
**File:** `src/services/domain/EventResolutionService.ts`

```typescript
export interface StabilityCheckResult {
    roll: number;
    success: boolean;
    newDC: number;
    event?: EventData;
}

export interface EventOutcomeApplication {
    modifiers: Map<string, number>;
    messages: string[];
    continuousEffects?: KingdomModifier[];
}

export class EventResolutionService {
    constructor(
        private diceService: DiceService,
        private eventService: EventService
    ) {}

    performStabilityCheck(currentDC: number): StabilityCheckResult {
        const roll = this.diceService.rollD20();
        const success = roll >= currentDC;
        
        let newDC: number;
        let event: EventData | undefined;
        
        if (success) {
            newDC = 16; // Reset DC
            event = this.eventService.getRandomEvent();
        } else {
            newDC = Math.max(6, currentDC - 5);
        }
        
        return { roll, success, newDC, event };
    }

    applyEventOutcome(
        event: EventData, 
        outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): EventOutcomeApplication {
        const modifiers = new Map<string, number>();
        const messages: string[] = [];
        const continuousEffects: KingdomModifier[] = [];
        
        const effect = event.effects?.[outcome];
        if (!effect) return { modifiers, messages };
        
        // Parse and apply modifiers
        for (const modifier of effect.modifiers || []) {
            if (!modifier.enabled) continue;
            
            const currentValue = modifiers.get(modifier.selector) || 0;
            modifiers.set(modifier.selector, currentValue + modifier.value);
        }
        
        // Handle unresolved events
        if ((outcome === 'failure' || outcome === 'criticalFailure') && event.ifUnresolved) {
            const unresolvedModifier = this.createUnresolvedModifier(event);
            continuousEffects.push(unresolvedModifier);
        }
        
        messages.push(effect.msg);
        
        return { modifiers, messages, continuousEffects };
    }
    
    private createUnresolvedModifier(event: EventData): KingdomModifier {
        // Implementation details
    }
}
```

#### 1.3 ActionExecutionService Implementation
**File:** `src/services/domain/ActionExecutionService.ts`

```typescript
export interface ActionRequirement {
    met: boolean;
    reason?: string;
    requiredResources?: Map<string, number>;
}

export interface ActionOutcome {
    stateChanges: Map<string, any>;
    messages: string[];
    sideEffects?: SideEffect[];
}

export class ActionExecutionService {
    constructor(
        private parser: ActionOutcomeParser,
        private diceService: DiceService
    ) {}
    
    checkActionRequirements(
        action: PlayerAction, 
        kingdomState: KingdomState
    ): ActionRequirement {
        // Check specific action requirements
        if (action.id === 'execute-pardon-prisoners') {
            if (kingdomState.imprisonedUnrest <= 0) {
                return {
                    met: false,
                    reason: 'No imprisoned unrest to resolve'
                };
            }
        }
        
        // Check resource costs
        if (action.cost) {
            const lacking = new Map<string, number>();
            
            for (const [resource, required] of action.cost.entries()) {
                const available = kingdomState.resources.get(resource) || 0;
                if (available < required) {
                    lacking.set(resource, required - available);
                }
            }
            
            if (lacking.size > 0) {
                return {
                    met: false,
                    reason: 'Insufficient resources',
                    requiredResources: lacking
                };
            }
        }
        
        return { met: true };
    }
    
    executeAction(
        action: PlayerAction,
        outcome: string,
        kingdomState: KingdomState
    ): ActionOutcome {
        const parsedEffects = this.parser.parseActionOutcome(action, outcome);
        const stateChanges = new Map<string, any>();
        const messages: string[] = [];
        const sideEffects: SideEffect[] = [];
        
        // Apply parsed effects with business logic
        for (const [key, value] of parsedEffects.entries()) {
            stateChanges.set(key, this.calculateEffectValue(key, value, kingdomState));
        }
        
        return { stateChanges, messages, sideEffects };
    }
    
    private calculateEffectValue(
        effectKey: string, 
        effectValue: any, 
        state: KingdomState
    ): any {
        // Business logic for calculating actual values
    }
}
```

#### 1.4 Tasks for Phase 1
- [ ] Create service directory structure
- [ ] Implement DiceService for all RNG operations
- [ ] Extract event resolution logic to EventResolutionService
- [ ] Extract action execution logic to ActionExecutionService
- [ ] Extract unrest calculations to UnrestService
- [ ] Create comprehensive unit tests for each service
- [ ] Document service APIs

### Phase 2: Command Pattern Implementation (Week 2)
**Target Completion: October 10, 2025**

#### 2.1 Command Infrastructure
```
src/
├── commands/
│   ├── base/
│   │   ├── Command.ts
│   │   ├── CommandExecutor.ts
│   │   └── CommandHistory.ts
│   ├── event/
│   │   ├── ApplyEventOutcomeCommand.ts
│   │   └── ResolveEventCommand.ts
│   ├── action/
│   │   ├── ExecuteActionCommand.ts
│   │   └── ValidateActionCommand.ts
│   └── unrest/
│       ├── ResolveIncidentCommand.ts
│       └── UpdateUnrestCommand.ts
```

#### 2.2 Command Base Implementation
```typescript
export interface CommandResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    rollback?: () => void;
}

export abstract class Command<T = any> {
    abstract execute(): CommandResult<T>;
    abstract canExecute(): boolean;
    abstract getDescription(): string;
}

export class CommandExecutor {
    private history: CommandHistory;
    
    async execute<T>(command: Command<T>): Promise<CommandResult<T>> {
        if (!command.canExecute()) {
            return {
                success: false,
                error: 'Command cannot be executed in current state'
            };
        }
        
        const result = command.execute();
        
        if (result.success) {
            this.history.add(command, result);
        }
        
        return result;
    }
    
    undo(): boolean {
        return this.history.undo();
    }
    
    redo(): boolean {
        return this.history.redo();
    }
}
```

#### 2.3 Tasks for Phase 2
- [ ] Create command base classes and interfaces
- [ ] Implement CommandExecutor with history management
- [ ] Create commands for all state mutations
- [ ] Add validation logic to commands
- [ ] Implement rollback mechanisms
- [ ] Add command queuing for complex operations
- [ ] Create integration tests for command flow

### Phase 3: Component Refactoring (Week 3)
**Target Completion: October 17, 2025**

#### 3.1 Component Refactoring Pattern

**BEFORE (EventsPhase.svelte):**
```svelte
<script lang="ts">
function performStabilityCheck() {
    isRolling = true;
    showStabilityResult = false;
    
    setTimeout(() => {
        // BAD: Business logic in component
        stabilityRoll = Math.floor(Math.random() * 20) + 1;
        const currentDC = eventDC;
        const success = stabilityRoll >= currentDC;
        
        if (success) {
            gameState.update(state => {
                state.eventDC = 16;
                return state;
            });
            
            const event = eventService.getRandomEvent();
            if (event) {
                currentEvent = event;
            }
        } else {
            gameState.update(state => {
                state.eventDC = Math.max(6, state.eventDC - 5);
                return state;
            });
        }
        
        showStabilityResult = true;
        isRolling = false;
    }, 1000);
}
</script>
```

**AFTER (EventsPhase.svelte):**
```svelte
<script lang="ts">
import { eventController } from '../../../controllers/EventController';

async function performStabilityCheck() {
    isRolling = true;
    showStabilityResult = false;
    
    // GOOD: Component only handles UI state
    const result = await eventController.performStabilityCheck();
    
    stabilityRoll = result.roll;
    if (result.event) {
        currentEvent = result.event;
    }
    
    showStabilityResult = true;
    isRolling = false;
}
</script>
```

#### 3.2 Refactoring Checklist for Each Component
- [ ] EventsPhase.svelte
  - [ ] Remove dice rolling logic
  - [ ] Remove DC calculations
  - [ ] Remove resource modification logic
  - [ ] Use EventController for all business logic
- [ ] ActionsPhase.svelte
  - [ ] Remove parseActionOutcome function
  - [ ] Remove isActionAvailable logic
  - [ ] Use ActionController
- [ ] ActionCard.svelte
  - [ ] Remove state change formatting
  - [ ] Remove fame reroll calculations
  - [ ] Use formatters for display
- [ ] UnrestPhase.svelte
  - [ ] Remove tier calculations
  - [ ] Remove incident rolling
  - [ ] Use UnrestController

### Phase 4: Store Enhancement (Week 4)
**Target Completion: October 24, 2025**

#### 4.1 Enhanced Store Pattern
```typescript
// src/stores/controllers/EventController.ts
export class EventController {
    constructor(
        private eventService: EventResolutionService,
        private commandExecutor: CommandExecutor,
        private gameState: Writable<GameState>,
        private kingdomState: Writable<KingdomState>
    ) {}
    
    async performStabilityCheck(): Promise<StabilityCheckResult> {
        const state = get(this.gameState);
        const result = this.eventService.performStabilityCheck(state.eventDC);
        
        // Use command for state mutation
        const command = new UpdateEventDCCommand(result.newDC);
        await this.commandExecutor.execute(command);
        
        if (result.event) {
            const setEventCommand = new SetCurrentEventCommand(result.event);
            await this.commandExecutor.execute(setEventCommand);
        }
        
        return result;
    }
    
    async resolveEvent(
        eventId: string,
        skill: string,
        outcome: string
    ): Promise<void> {
        const command = new ResolveEventCommand(eventId, skill, outcome);
        const result = await this.commandExecutor.execute(command);
        
        if (!result.success) {
            throw new Error(result.error);
        }
    }
}
```

#### 4.2 Tasks for Phase 4
- [ ] Create controller classes for each domain
- [ ] Wire controllers to services and commands
- [ ] Update stores to use controllers
- [ ] Remove business logic from existing stores
- [ ] Add event emitters for side effects
- [ ] Create integration tests

## File Structure Changes

### Before
```
src/
├── view/kingdom/turnPhases/
│   ├── EventsPhase.svelte (1000+ lines with business logic)
│   ├── ActionsPhase.svelte (800+ lines with business logic)
│   └── UnrestPhase.svelte (600+ lines with business logic)
├── stores/
│   ├── kingdom.ts (mixed concerns)
│   └── gameState.ts (mixed concerns)
```

### After
```
src/
├── view/kingdom/turnPhases/
│   ├── EventsPhase.svelte (200 lines, UI only)
│   ├── ActionsPhase.svelte (150 lines, UI only)
│   └── UnrestPhase.svelte (100 lines, UI only)
├── services/domain/
│   ├── EventResolutionService.ts
│   ├── ActionExecutionService.ts
│   └── UnrestService.ts
├── commands/
│   ├── base/
│   ├── event/
│   └── action/
├── controllers/
│   ├── EventController.ts
│   ├── ActionController.ts
│   └── UnrestController.ts
├── stores/
│   ├── kingdom.ts (state management only)
│   └── gameState.ts (state management only)
```

## Success Criteria

### Phase 1 Success Metrics
- [ ] All business logic extracted from components
- [ ] 100% unit test coverage for services
- [ ] No direct state mutations in components
- [ ] All RNG operations through DiceService

### Phase 2 Success Metrics
- [ ] All state changes through commands
- [ ] Undo/redo functionality working
- [ ] Command validation preventing invalid states
- [ ] Command history persisted

### Phase 3 Success Metrics
- [ ] Components under 200 lines each
- [ ] No business logic in script tags
- [ ] All calculations in services
- [ ] Clear separation of concerns

### Phase 4 Success Metrics
- [ ] Stores only managing state
- [ ] Controllers orchestrating operations
- [ ] Clean dependency injection
- [ ] Full integration test suite passing

## Testing Strategy

### Unit Tests
- Services: Test all business logic in isolation
- Commands: Test execution and rollback
- Parsers: Test all parsing scenarios
- Formatters: Test all formatting cases

### Integration Tests
- Controller flow tests
- Command chain tests
- Store update tests
- Event propagation tests

### E2E Tests
- User workflow tests
- State persistence tests
- Error recovery tests

## Risk Mitigation

### Identified Risks
1. **Breaking existing functionality**
   - Mitigation: Incremental refactoring with tests
2. **Performance regression**
   - Mitigation: Performance benchmarks before/after
3. **Increased complexity**
   - Mitigation: Clear documentation and patterns
4. **Team adoption**
   - Mitigation: Pair programming and code reviews

## Code Review Checklist

For each PR:
- [ ] No business logic in components
- [ ] All state changes through commands
- [ ] Services have unit tests
- [ ] Documentation updated
- [ ] No direct DOM manipulation
- [ ] TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Performance impact assessed

## Next Steps

1. **Immediate Actions (Today)**
   - Create service directory structure
   - Begin extracting EventResolutionService
   - Set up unit test framework

2. **This Week**
   - Complete Phase 1 service extraction
   - Begin command pattern design
   - Document service APIs

3. **Ongoing**
   - Daily progress updates
   - Weekly architecture reviews
   - Continuous integration testing

## References

- [Svelte Best Practices](https://svelte.dev/docs)
- [Command Pattern](https://refactoring.guru/design-patterns/command)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- [Separation of Concerns](https://en.wikipedia.org/wiki/Separation_of_concerns)

---

**Document Version:** 1.0  
**Last Updated:** September 26, 2025, 3:27 PM  
**Next Review:** October 3, 2025
