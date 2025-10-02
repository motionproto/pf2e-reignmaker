# Build Queue System - TODO

## Purpose
Manage construction project queue and resource allocation for kingdom structures.

## Architecture Requirements

### ❌ DO NOT
- Write directly to stores (violates architecture)
- Use non-existent `kingdomState` store
- Create singleton services with complex state management
- Mix UI concerns with business logic

### ✅ DO
- Write ALL data changes to **KingdomActor** via `updateKingdom()`
- Read from **KingdomStore** reactive bridges
- Follow **controller pattern** (not service singleton)
- Keep business logic separate from presentation

## Required Functionality

### Core Features
1. **Queue Management**
   - Add structures to build queue
   - Remove structures from queue
   - Reorder queue priority
   - Track construction progress

2. **Resource Allocation**
   - Allocate kingdom resources to projects
   - Track partial resource investment
   - Return resources when canceling projects
   - Auto-allocate based on priority (optional)

3. **Project Completion**
   - Detect when projects are fully funded
   - Add completed structures to settlements
   - Clean up completed projects from queue

### Data Structure (in KingdomActor)
```typescript
interface KingdomData {
  // ... existing fields
  buildQueue?: BuildProject[];
}

interface BuildProject {
  id: string;
  structureId: string;
  structureName: string;
  settlementName: string;
  cost: Map<string, number>;      // Total cost
  invested: Map<string, number>;  // Currently invested
  // ... other fields as needed
}
```

## Integration Points

### With KingdomActor
- Store build queue in `kingdom.buildQueue`
- Update via `updateKingdom()` method
- Never write to stores directly

### With Settlement/Structure Systems
- Validate structure can be built in settlement
- Check settlement tier requirements
- Add completed structures to settlement.structureIds

### With Resource System
- Check available kingdom resources
- Deduct from kingdom.resources when allocating
- Refund to kingdom.resources when canceling

## Implementation Pattern

### Controller-Based (Recommended)
```typescript
// src/controllers/BuildQueueController.ts
export async function createBuildQueueController() {
  return {
    async addToQueue(structureId: string, settlementId: string) {
      // Validate structure and settlement
      // Create BuildProject
      // Add to KingdomActor
      await updateKingdom(kingdom => {
        if (!kingdom.buildQueue) kingdom.buildQueue = [];
        kingdom.buildQueue.push(project);
      });
    },
    
    async allocateResources(projectId: string, resources: Map<string, number>) {
      // Validate resources available
      // Update project and kingdom via KingdomActor
      await updateKingdom(kingdom => {
        // Update project.invested
        // Deduct from kingdom.resources
      });
    }
  };
}
```

## References
- Architecture: `docs/ARCHITECTURE.md`
- KingdomActor: `src/actors/KingdomActor.ts`
- KingdomStore: `src/stores/KingdomStore.ts`
- Settlement Service: `src/services/settlements/`
- Structure Service: `src/services/structures/`

## Notes
- Old implementation violated architecture by using non-existent stores
- New implementation must follow controller pattern
- All persistence goes through KingdomActor
- UI components delegate to controllers
