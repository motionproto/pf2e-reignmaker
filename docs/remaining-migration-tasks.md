# Remaining Migration Tasks

## 📋 Assessment of Components Still Requiring Refactoring

Based on analysis of the codebase, the following components still contain business logic that needs to be extracted:

### 🔴 High Priority - Core Phase Components

#### 1. **ActionsPhase.svelte** (650+ lines)
**Current Issues:**
- Contains `parseActionOutcome()` function with 100+ lines of text parsing logic
- Direct state mutations throughout
- Business logic for action validation mixed with UI
- Inline dice rolling (`Math.floor(Math.random() * 4) + 1`)

**Required Work:**
- Integrate `ActionPhaseController` 
- Remove `parseActionOutcome()` - already available in service
- Use `ExecuteActionCommand` for all state changes
- Extract validation logic to controller

#### 2. **UnrestPhase.svelte** (400+ lines)
**Current Issues:**
- Direct RNG calls (`Math.floor(Math.random() * 100) + 1`)
- Incident rolling logic embedded
- Direct state mutations for unrest changes

**Required Work:**
- Integrate `UnrestPhaseController`
- Use `diceService` for all RNG
- Move incident logic to controller
- Create `ProcessUnrestCommand` for state changes

#### 3. **StatusPhase.svelte** (300+ lines)
**Current Issues:**
- Fame calculations inline
- Modifier application logic
- Direct state mutations (`state.fame = Math.min(...)`)

**Required Work:**
- Create `StatusPhaseController`
- Extract fame logic to service
- Create `UpdateFameCommand`
- Move modifier processing to service

#### 4. **UpkeepPhase.svelte** (500+ lines)
**Current Issues:**
- Resource decay logic embedded
- Unresolved event processing
- Direct resource manipulation
- Project cost application logic

**Required Work:**
- Create `UpkeepPhaseController`
- Extract resource decay to service
- Create `ProcessUpkeepCommand`
- Move project logic to service

### 🟡 Medium Priority - Supporting Components

#### 5. **ActionCard.svelte** (300+ lines)
**Current Issues:**
- Fame reroll logic embedded
- Direct state mutations for fame changes

**Required Work:**
- Extract fame reroll to `DiceService`
- Use commands for fame updates
- Remove business logic from component

#### 6. **KingdomStats.svelte** (200+ lines)
**Current Issues:**
- Direct phase transition logic
- State mutations for fame

**Required Work:**
- Create `TurnController` for phase transitions
- Use commands for all state changes

#### 7. **SettingsTab.svelte** (150+ lines)
**Current Issues:**
- Kingdom reset logic embedded
- Direct resource manipulation

**Required Work:**
- Create `ResetKingdomCommand`
- Move reset logic to service

### 🟢 Low Priority - Already Refactored

#### ✅ **EventsPhase.svelte**
- Already has `EventsPhaseRefactored.svelte` as example
- Controller and services complete
- Serves as template for other refactors

## 📦 Missing Commands

The following commands need to be created:

### State Mutation Commands
1. **UpdateResourcesCommand** - Generic resource updates
2. **ProcessUnrestCommand** - Unrest generation and modification
3. **UpdateFameCommand** - Fame changes with validation
4. **ProcessUpkeepCommand** - Upkeep phase resource decay
5. **ResetKingdomCommand** - Full kingdom state reset
6. **ApplyModifierCommand** - Apply/remove kingdom modifiers
7. **ProcessIncidentCommand** - Incident resolution effects
8. **TransitionPhaseCommand** - Phase transitions with validation

### Complex Operation Commands
9. **ProcessProjectCommand** - Project cost application
10. **ResolveUnresolvedEventCommand** - Delayed event processing

## 🏗️ Missing Services

### Domain Services Needed
1. **ResourceManagementService**
   - Resource decay calculations
   - Storage limits
   - Resource conversion logic

2. **ProjectService**
   - Project cost calculations
   - Resource allocation
   - Progress tracking

3. **PhaseTransitionService**
   - Phase validation
   - Transition rules
   - Auto-advance logic

## 🎯 Missing Controllers

1. **StatusPhaseController**
2. **UpkeepPhaseController**
3. **ResourcePhaseController**
4. **TurnController** (orchestrates all phases)

## 📊 Migration Metrics

### Current State
- **Components with business logic**: 7 major components
- **Direct state mutations found**: 29+ instances
- **Inline RNG calls**: 5+ instances
- **Text parsing logic**: 100+ lines

### Target State
- **Components**: Pure UI only (~200 lines each)
- **State mutations**: 0 (all through commands)
- **RNG calls**: 0 (all through DiceService)
- **Business logic**: 0 (all in services)

## 🚀 Recommended Migration Order

### Phase 4: Complete Component Migration (Week 1-2)
1. **Day 1-2**: Migrate ActionsPhase.svelte using ActionPhaseController
2. **Day 3-4**: Migrate UnrestPhase.svelte using UnrestPhaseController
3. **Day 5-6**: Create StatusPhaseController and migrate StatusPhase.svelte
4. **Day 7-8**: Create UpkeepPhaseController and migrate UpkeepPhase.svelte
5. **Day 9-10**: Refactor supporting components (ActionCard, KingdomStats)

### Phase 5: Store Enhancement (Week 3)
1. Create TurnController for phase orchestration
2. Enhance kingdomState store to use command pattern
3. Add command history to store for undo/redo
4. Implement state persistence

### Phase 6: Testing & Documentation (Week 4)
1. Write unit tests for all services
2. Write integration tests for controllers
3. Test command rollback scenarios
4. Update documentation

## 📝 Component Refactoring Checklist

For each component migration:
- [ ] Create/use appropriate controller
- [ ] Remove all direct state mutations
- [ ] Replace RNG with diceService
- [ ] Extract business logic to services
- [ ] Create necessary commands
- [ ] Remove parseActionOutcome and similar functions
- [ ] Test component with new architecture
- [ ] Update component to ~200 lines

## 🎓 Lessons from Completed Work

Based on the successful migration of EventsPhase:
1. **Controllers simplify components dramatically** - 400+ lines reduced to ~200
2. **Commands provide safety** - Rollback capability prevents corruption
3. **Services are highly reusable** - Same services used across phases
4. **Type safety catches issues early** - TypeScript prevents many bugs

## 📈 Expected Benefits After Full Migration

1. **Code Reduction**: ~3,000 lines of mixed concerns → ~1,500 lines of clean code
2. **Test Coverage**: 0% → 80%+ possible
3. **Maintenance Time**: 50% reduction in bug fixes
4. **Feature Development**: 2x faster with clean architecture
5. **Onboarding**: New developers understand codebase in days vs weeks

---

*Generated: September 26, 2025*
*Estimated Remaining Work: 3-4 weeks*
*Components Requiring Migration: 7*
*Commands to Create: 10+*
