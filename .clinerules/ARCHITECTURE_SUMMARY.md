## Core Architecture Principles

### 1. Single Source of Truth
- **KingdomActor** = ONLY persistent data source
- All writes go through KingdomActor methods
- Stores are derived/reactive, never written to directly

### 2. Clean Separation of Concerns
- **Svelte components** = Presentation only (UI, user interaction, display logic)
- **Controllers** = Business logic only (phase operations, game rules, calculations)
- **Services** = Complex operations (utilities, integrations, reusable logic)
- **NO business logic in Svelte files** - components delegate to controllers/services

### 3. Data Flow Pattern
```
Read:  KingdomActor → kingdomData store → Component Display
Write: Component Action → Controller → KingdomActor → Foundry → All Clients
```

## Implementation Patterns

### Component Pattern (UI Only)
```svelte
<script>
// ✅ READ from stores
import { kingdomData, resources } from '../stores/kingdomActor';

// ✅ UI state only
let isProcessing = false;

// ✅ Delegate to controller
async function handleAction() {
  const { createController } = await import('../controllers/SomeController');
  const controller = await createController();
  const result = await controller.performAction();
  // Handle result in UI
}
</script>
```

### Controller Pattern (Business Logic Only)
```typescript
export async function createSomeController() {
  return {
    async performAction() {
      // Business logic here
      await setResource('fame', 1);
      await markPhaseStepCompleted('step-1');
      return { success: true };
    }
  };
}
```

## Key Rules

### DO:
- ✅ Keep Svelte components for presentation only
- ✅ Put business logic in controllers/services
- ✅ Use reactive stores for data display
- ✅ Return `{ success: boolean, error?: string }` from controllers
- ✅ Use clear console logging with emoji indicators

### DON'T:
- ❌ Put business logic in Svelte components
- ❌ Write to derived stores directly
- ❌ Create complex abstractions unless necessary
- ❌ Mix UI concerns with business logic

## File Organization
```
src/
├── view/          # Svelte components (presentation only)
├── controllers/   # Business logic (phase operations, game rules)
├── services/      # Complex operations (utilities, calculations)
├── stores/        # Reactive bridges (read-only)
├── actors/        # KingdomActor (single source of truth)
└── models/        # TurnManager (simple turn progression)
```

---

**Remember:** If you're touching UI, it goes in Svelte. If you're implementing game logic, it goes in controllers/services.
