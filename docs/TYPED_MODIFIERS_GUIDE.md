# Typed Modifiers System Guide

**Date:** 2025-10-11  
**Purpose:** Replace regex-based modifier detection with explicit TypeScript types

---

## Overview

The typed modifiers system eliminates brittle regex pattern matching by using explicit type discriminants. All modifiers now have a `type` field that clearly identifies their category.

## Modifier Types

### 1. Static Modifier

Fixed numeric value applied to a resource.

```typescript
{
  type: 'static',
  resource: 'unrest',
  value: 1,
  duration: 'immediate',
  name: 'Optional source name'
}
```

**Usage:**
- Most common modifier type
- Immediate numerical changes
- No player input required

**Available Resources:**
- Basic resources: `'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries'`
- Kingdom stats: `'unrest' | 'fame'`
- Special resources: 
  - `'imprisoned_unrest'` - Unrest specifically from imprisoning dissidents
  - `'damage_structure'` - Used to damage kingdom structures

### 2. Dice Modifier

Requires player to roll dice for the value.

```typescript
{
  type: 'dice',
  resource: 'gold',
  formula: '2d6',        // Just the formula (no negative sign)
  negative: true,         // Separate flag for negative
  duration: 'immediate'
}
```

**Examples:**
- `{ formula: '1d4', negative: false }` → Roll 1d4 (positive)
- `{ formula: '2d6+1', negative: true }` → Roll -(2d6+1) (negative)

### 3. Choice Modifier

Player chooses from multiple resource options.

```typescript
{
  type: 'choice',
  resources: ['lumber', 'ore', 'food', 'stone'],
  value: {
    formula: '2d4+1',
    negative: true
  },
  duration: 'immediate'
}
```

**Value can be:**
- **Number:** Static value for all choices
- **DiceValue:** Player rolls after choosing

---

## Duration Types

The system supports three duration types:

### 1. Immediate Duration

**Type:** `'immediate'` (string)

Modifier applies once and is done. Default if duration is omitted.

```typescript
{
  type: 'static',
  resource: 'gold',
  value: 5,
  duration: 'immediate'  // Or omit for same effect
}
```

### 2. Ongoing Duration

**Type:** `'ongoing'` (string)

Modifier persists until the event is resolved (for events with `endsEvent: false`).

```typescript
{
  type: 'static',
  resource: 'unrest',
  value: 1,
  duration: 'ongoing'
}
```

### 3. Turn Count Duration

**Type:** `number`

Modifier lasts for a specific number of turns, then expires automatically.

```typescript
{
  type: 'static',
  resource: 'economy',
  value: -1,
  duration: 3  // Lasts for 3 turns
}
```

**Use cases:**
- Temporary buffs from festivals
- Limited-duration debuffs from disasters
- Time-limited economic effects

**Type-safe handling:**
```typescript
import { isTurnCountDuration, isImmediateDuration, isOngoingDuration } from '../types/modifiers';

if (isTurnCountDuration(modifier.duration)) {
  // It's a number - store with expiration
  const expiresAtTurn = currentTurn + modifier.duration;
} else if (isOngoingDuration(modifier.duration)) {
  // It's ongoing - expires when event resolves
} else {
  // It's immediate (or undefined) - apply once
}
```

---

## Migration from Old Format

### Before (String-based)
```json
{
  "resource": "gold",
  "value": "-2d6",
  "duration": "immediate"
}
```

### After (Typed)
```json
{
  "type": "dice",
  "resource": "gold",
  "formula": "2d6",
  "negative": true,
  "duration": "immediate"
}
```

### Before (Resource Array)
```json
{
  "resource": ["lumber", "ore", "food"],
  "value": "-(2d4+1)",
  "duration": "immediate"
}
```

### After (Typed)
```json
{
  "type": "choice",
  "resources": ["lumber", "ore", "food"],
  "value": {
    "formula": "2d4+1",
    "negative": true
  },
  "duration": "immediate"
}
```

---

## Code Usage

### Type Guards

```typescript
import { isDiceModifier, isChoiceModifier, isStaticModifier } from '../types/modifiers';

// TypeScript will narrow the type automatically
if (isDiceModifier(modifier)) {
  // modifier is DiceModifier
  const formula = modifier.formula;
  const negative = modifier.negative || false;
}
```

### Processing Modifiers

```typescript
import type { EventModifier } from '../types/modifiers';

function processModifier(modifier: EventModifier) {
  switch (modifier.type) {
    case 'static':
      return applyStaticValue(modifier.resource, modifier.value);
      
    case 'dice':
      return showDiceRoller(modifier.formula, modifier.negative);
      
    case 'choice':
      return showChoiceButtons(modifier.resources, modifier.value);
  }
}
```

---

## Benefits

### 1. No More Regex
**Before:**
```typescript
const DICE_PATTERN = /^-?\\(?\\d+d\\d+([+-]\\d+)?\\)?$/;
if (typeof value === 'string' && DICE_PATTERN.test(value)) {
  // Is it a dice formula?
}
```

**After:**
```typescript
if (modifier.type === 'dice') {
  // Yes, it's a dice modifier!
}
```

### 2. TypeScript Type Safety

```typescript
// TypeScript knows the exact structure
function handleDice(mod: DiceModifier) {
  // mod.formula exists and is string
  // mod.resource exists and is ResourceType
  // mod.value doesn't exist (compile error if accessed)
}
```

### 3. Self-Documenting Data

JSON files now clearly show what each modifier does:
- `"type": "static"` → Apply fixed value
- `"type": "dice"` → Roll dice
- `"type": "choice"` → Player chooses

### 4. Easy Validation

Build scripts can validate structure:
```python
if modifier['type'] == 'dice':
    assert 'formula' in modifier
    assert 'value' not in modifier
```

---

## Files Updated

### Data Files
- ✅ `data/events/*.json` - Fully migrated to typed modifiers
- ✅ `data/incidents/**/*.json` - Fully migrated to typed modifiers
- ✅ `data/player-actions/*.json` - Fully migrated to typed modifiers

### TypeScript Types
- ✅ `src/types/modifiers.ts` (new file)

### Code Status
- ✅ `src/types/modifiers.ts` - Core type definitions
- ✅ `src/types/events.ts` - Auto-generated types using modifiers
- ✅ `src/services/resolution/DiceRollingService.ts` - Uses typed modifiers
- ✅ `src/view/kingdom/components/OutcomeDisplay/OutcomeDisplay.svelte` - Handles all modifier types
- ✅ `src/controllers/shared/PhaseHelpers.ts` - Refactored for Svelte helpers
- ✅ Phase components (EventsPhase, UnrestPhase, ActionsPhase) - Use typed modifiers

---

## Migration Script

Run the migration script to convert data files:

```bash
python3 buildscripts/migrate-typed-modifiers.py
```

**Results:**
- Processes all events, incidents, and player-actions
- Converts old format to new typed format
- Preserves `manualEffects` and `gameEffects` as-is
- Outputs summary of files modified

---

## Build Integration

The typed modifier system is integrated with the build process:

### Hand-Written vs Auto-Generated Types

**Hand-Written (Never Auto-Generated):**
- `src/types/modifiers.ts` - Architectural types for modifiers
- Marked with `⚠️ HAND-WRITTEN - DO NOT AUTO-GENERATE ⚠️` header

**Auto-Generated (From Data):**
- `src/types/events.ts` - Imports from `modifiers.ts`
- `src/types/incidents.ts` - Re-exports from `events.ts`
- `src/types/player-actions.ts` - Independent generation

### Build Script Protection

**File:** `buildscripts/generate-types.py`

The build script now:
1. **Checks** for `modifiers.ts` existence before generating
2. **Imports** modifier types instead of generating them
3. **Fails safely** if `modifiers.ts` is missing

```python
# Safety check in generate-types.py
modifiers_path = types_dir / 'modifiers.ts'
if not modifiers_path.exists():
    print("❌ ERROR: src/types/modifiers.ts not found!")
    print("   This hand-written file is required.")
    sys.exit(1)
```

### Running the Build

```bash
# Generate TypeScript types from data
npm run generate-types

# Or directly:
python3 buildscripts/generate-types.py
```

**Output:**
```
✓ Found hand-written modifiers.ts
📝 Generating event types...
  ✓ Written to src/types/events.ts
```

The generated `events.ts` will import from `modifiers.ts`:
```typescript
import type { 
  EventModifier, 
  ModifierDuration,
  StaticModifier,
  DiceModifier,
  ChoiceModifier,
  DiceValue
} from './modifiers';
```

### Important Notes

1. **Never edit** `events.ts`, `incidents.ts`, or `player-actions.ts` manually
2. **Always edit** `modifiers.ts` manually (it's architectural)
3. **Run build** after changing data files to regenerate types
4. **Build fails** if `modifiers.ts` is missing (safety feature)

---

## Future Enhancements

The typed modifier system can be extended with additional modifier types as needed:

```typescript
// Percentage modifier
export interface PercentageModifier {
  type: 'percentage';
  resource: ResourceType;
  percent: number;
  negative?: boolean;
  duration?: ModifierDuration;
}

// Conditional modifier
export interface ConditionalModifier {
  type: 'conditional';
  condition: string;
  modifier: EventModifier;
  duration?: ModifierDuration;
}
```

**Note:** The `GameEffect` interface in `src/types/modifiers.ts` provides basic typing for game effects. Full automation of game effects is planned for future implementation.

---

## Migration Complete

The typed modifier system has been fully implemented:

**Completed:**
1. ✅ All data files migrated to typed modifiers
2. ✅ TypeScript types created and integrated
3. ✅ All code updated to use typed modifiers
4. ✅ Regex detection replaced with type discrimination
5. ✅ All outcome types tested and working

**Backward Compatibility:**
The old regex-based string parsing has been completely replaced. All modifier detection now uses explicit type fields (`type: 'static' | 'dice' | 'choice'`).

---

## Questions?

See:
- `docs/OUTCOME_HANDLING_AUDIT.md` - Original bug analysis
- `src/types/modifiers.ts` - Type definitions
- `buildscripts/migrate-typed-modifiers.py` - Migration script
