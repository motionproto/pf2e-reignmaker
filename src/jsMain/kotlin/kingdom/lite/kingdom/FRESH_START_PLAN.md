# Fresh Start Plan for Kingdom System

## Why Fresh Start?
- 280+ compilation errors after full day of cleanup
- Legacy code too intertwined with deleted systems
- Trying to patch incompatible architecture
- Clean JSON data and rules already available

## What We Keep:
1. **Data Layer** (already working):
   - JSON files for structures, events, player actions, incidents
   - Basic parsing structures (RawActivity.kt, etc.)
   - Reference rules documentation

2. **Core Types** (salvageable):
   - KingdomData.kt (simplified version)
   - RawActivity.kt
   - Basic modifier system

## What We Delete:
1. **All Legacy UI/Sheet System**:
   - `/sheet/` directory (completely broken)
   - KingdomSheet and related contexts

2. **Broken Event System**:
   - KingdomEvent.kt (references deleted types)
   - Event managers relying on old architecture

3. **Dead Code**:
   - References to charter/government/feats
   - Skill/ability checks tied to deleted systems
   - Complex dialog systems

## New Architecture:

### Phase 1: Core Business Logic
```kotlin
// KingdomCore.kt - Simplified kingdom state management
data class Kingdom(
    val name: String,
    val level: Int,
    val resources: Resources,
    val modifiers: List<Modifier>,
    val settlements: List<Settlement>
)

// ActivityProcessor.kt - Handle player actions
class ActivityProcessor {
    fun executeActivity(kingdom: Kingdom, activity: RawActivity): Result
}

// EventSystem.kt - Simple event handling
class EventSystem {
    fun processEvent(kingdom: Kingdom, event: RawKingdomEvent): Result
}
```

### Phase 2: Simple UI
- Use existing SimpleApp framework
- One main screen showing kingdom status
- Action buttons for activities
- Event notifications

### Phase 3: Integration
- Hook into Foundry's existing UI
- Use native roll system
- Store data in existing structures

## Implementation Steps:

1. **Delete all broken code** (5 min)
   - Remove sheet/ directory
   - Remove broken event/milestone files
   - Keep only working data structures

2. **Create minimal Kingdom core** (30 min)
   - Simple data class for kingdom state
   - Basic resource management
   - Activity execution

3. **Simple UI using SimpleApp** (30 min)
   - Display kingdom stats
   - List available activities
   - Show active events

4. **Hook up to Foundry** (30 min)
   - Save/load kingdom data
   - Connect to dice rolling
   - Basic chat output

## Benefits:
- Clean, maintainable code
- Works with existing JSON data
- No legacy baggage
- Can be built incrementally
- Actually compiles!

## Decision Points:
1. Start fresh now vs continue cleanup? **Recommend: Start fresh**
2. Keep any legacy code? **Recommend: Only data structures**
3. Build order? **Recommend: Core → UI → Integration**
