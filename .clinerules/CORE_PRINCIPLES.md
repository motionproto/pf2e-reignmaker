# Core Architecture Principles

## 1. Single Source of Truth
- **Party Actor Flags** = ONLY persistent data source
- Kingdom data stored at: `actor.getFlag('pf2e-reignmaker', 'kingdom-data')`
- All writes go through wrapped actor methods
- Stores are derived/reactive, never written to directly

## 2. Kingmaker Integration (IMPORT ONLY)

**⚠️ CRITICAL: Kingmaker module is ONLY used for INITIAL IMPORT**

**Correct Usage:**
```typescript
// ✅ ONLY during initial setup
await territoryService.syncFromKingmaker();  // Import hex data ONCE

// ✅ All gameplay operations - update Kingdom Store directly
await updateKingdom(kingdom => {
  const hex = kingdom.hexes.find(h => h.id === hexId);
  if (hex) hex.claimedBy = PLAYER_KINGDOM;  // "player" constant
});
```

**WRONG Usage:**
```typescript
// ❌ NEVER do this during gameplay
await markHexesInKingmaker(hexIds);
await territoryService.syncFromKingmaker();
```

## 3. Kingdom Actor Wrapper Pattern
- Party actors are regular Foundry Actors, NOT KingdomActor instances
- `wrapKingdomActor()` adds kingdom methods to party actors at runtime
- Wrapper applied during actor discovery in `kingdomSync.ts`
- All code uses wrapped methods: `getKingdomData()`, `setKingdomData()`, `updateKingdomData()`

## 4. Clean Separation of Concerns
- **Svelte components** = Presentation only (UI, user interaction, display logic)
- **Controllers** = Business logic only (phase operations, game rules, calculations)
- **Services** = Complex operations (utilities, integrations, reusable logic)
- **NO business logic in Svelte files** - components delegate to controllers/services

## 5. Data Flow Pattern
```
Read:  Party Actor Flags → Wrapped Actor → KingdomStore → Component Display
Write: Component Action → Controller → Wrapped Actor → Party Actor Flags → Foundry → All Clients
```

## 6. Territory Filtering Pattern (Derived Stores)
- **Problem**: Duplicated filtering logic across components/controllers
- **Solution**: Centralized derived stores in KingdomStore.ts
- **Stores**: `claimedHexes`, `claimedSettlements`, `claimedWorksites`
- **Benefits**: Single source of truth, automatic reactivity, consistency

## 7. Phase Management Pattern
- **TurnManager** = Central coordinator (turn/phase progression only)
- **Phase Components** = Mount when active, call `controller.startPhase()`
- **Phase Controllers** = Execute phase business logic, mark completion
- **Self-executing** - NO triggering from TurnManager

```
Phase Flow: TurnManager.nextPhase() → Update currentPhase → 
           Component Mounts → controller.startPhase() → Execute Logic
```

## 8. Modular TurnManager Architecture
- **TurnManager** = Main coordinator class
- **PhaseHandler** = Utility class for step management (imported by TurnManager)
- **PhaseControllerHelpers** = Utility functions (imported by controllers)
- Utilities are implementation details, not separate architectural components

## 9. Pipeline Architecture (9-Step Pattern)

All player actions, events, and incidents follow a standardized 9-step pipeline:

```
Step 1: Requirements Check      (optional)
Step 2: Pre-Roll Interactions   (optional)
Step 3: Execute Roll            (always)
Step 4: Display Outcome         (always)
Step 5: Outcome Interactions    (optional)
Step 6: Wait For Apply          (always)
Step 7: Post-Apply Interactions (optional)
Step 8: Execute Action          (always)
Step 9: Cleanup                 (always)
```

**Key Files:**
- Pipeline definitions: `src/pipelines/actions/*.ts`, `src/pipelines/events/*.ts`, `src/pipelines/incidents/*.ts`
- Registry: `src/pipelines/PipelineRegistry.ts`
- Coordinator: `src/services/PipelineCoordinator.ts`

## 10. TypeScript Pipelines (Single Source of Truth)

**✅ Current Architecture (since January 2026):**
- All actions, events, and incidents defined in self-contained TypeScript files
- No JSON compilation needed
- `PipelineRegistry` provides runtime access
- Full TypeScript features available everywhere

**❌ Old Architecture (removed):**
- JSON data files with Python build scripts
- Separate loaders and helpers
- Split between data (JSON) and logic (TypeScript)

---

## Key Rules Summary

### DO:
- ✅ Keep Svelte components for presentation only
- ✅ Put business logic in controllers/services
- ✅ Use reactive stores for data display
- ✅ Use centralized derived stores (claimedHexes, etc.)
- ✅ Let phases self-execute on mount
- ✅ Use TypeScript pipelines for all game content

### DON'T:
- ❌ Put business logic in Svelte components
- ❌ Write to derived stores directly
- ❌ Duplicate filtering logic
- ❌ Trigger phase controllers from TurnManager
- ❌ Use Kingmaker for regular gameplay operations
- ❌ Use CommonJS `require()` (browser environment)

---

**For implementation details, see:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
