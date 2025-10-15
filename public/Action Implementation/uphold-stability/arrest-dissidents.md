# Arrest Dissidents

**ID:** `arrest-dissidents`  
**Category:** Uphold Stability  
**Data File:** `data/player-actions/arrest-dissidents.json`

---

## Current Implementation Status

### ✅ Implemented
- Typed modifier system for unrest reduction
- Skill variety (intimidation, society, stealth, deception, athletics)
- Basic outcome modifiers

### ⚠️ Issues Found
**CRITICAL DATA ISSUE:** The current modifiers are incorrect!

**Current (WRONG):**
- Critical Success: -8 unrest
- Success: -4 unrest  
- Failure: 0 unrest
- Critical Failure: +1 unrest

**Should Be (per Actions.md):**
- Critical Success: Convert 8 unrest → imprisoned (net effect depends on capacity)
- Success: Convert 4 unrest → imprisoned (net effect depends on capacity)
- Failure: No effect
- Critical Failure: +1 unrest

### ⏳ Not Implemented
- Imprisoned unrest tracking system
- Justice structure capacity checking
- Settlement selection UI
- Game effects for conversion logic

---

## What Needs to Be Done

### 1. Fix Data File Modifiers
The modifiers should NOT directly reduce unrest. Instead:
- Remove current unrest
- Add imprisoned unrest (tracked separately)
- Respect capacity limits

### 2. Game Effects Needed
```json
{
  "type": "arrestDissidents",
  "unrestToConvert": 2,  // or 4 on crit
  "targetSettlement": "selected-settlement-id",
  "capacityCheck": true
}
```

### 3. Custom UI Required
**Component:** `ArrestDissidentsUI.svelte`

**Features:**
- Settlement selection dropdown (only settlements with Justice structures)
- Display current imprisoned/capacity for each settlement
- Validate capacity before allowing action
- Visual feedback when at capacity

**Capacity by Structure:**
- Stocks (T1): 1 imprisoned unrest
- Jail (T2): 2 imprisoned unrest
- Prison (T3): 4 imprisoned unrest
- Donjon (T4): 8 imprisoned unrest

### 4. Data Model Updates
Add to KingdomActor:
```typescript
settlements: {
  [settlementId: string]: {
    imprisonedUnrest: number;
    justiceStructureTier: number; // 0-4
    justiceCapacity: number; // calculated from tier
  }
}
```

---

## Complexity Rating

**🔴 Complex**
- Requires imprisoned unrest tracking system
- Needs settlement-specific data storage
- Custom UI with capacity validation
- Integration with justice structures

---

## Dependencies

- Justice structure system
- Settlement data model
- Capacity tracking mechanism
- UI component for settlement selection

---

## Implementation Priority

**Phase 5** (Complex Actions) - Requires significant new systems
