# Execute or Pardon Prisoners

**ID:** `execute-or-pardon-prisoners`  
**Category:** Uphold Stability  
**Data File:** `data/player-actions/execute-or-pardon-prisoners.json`

---

## Current Implementation Status

### ✅ Implemented
- Typed modifier system for unrest changes
- Skill variety (5 skills split between Execute and Pardon approaches)
- Basic outcome structure

### ⚠️ Issues Found
**Missing dice modifier for Success outcome:**

**Current (INCOMPLETE):**
- Success: No modifiers defined

**Should Be:**
- Success: Remove 1d4 imprisoned unrest (needs DiceModifier or game effect)

### ⏳ Not Implemented
- Imprisoned unrest tracking system
- Mode selection (Execute vs Pardon)
- Tier validation (Pardon only available for Prison T3+)
- Settlement selection UI
- Game effects for imprisoned unrest removal
- Dice rolling for success outcome

---

## What Needs to Be Done

### 1. Fix Data File
Add dice modifier or game effect for success:
```json
"success": {
  "description": "Remove 1d4 imprisoned Unrest from the settlement",
  "modifiers": [],
  "gameEffects": [{
    "type": "removeImprisonedUnrest",
    "amount": "1d4",
    "targetSettlement": "selected-settlement-id"
  }]
}
```

### 2. Game Effects Needed
```json
{
  "type": "executeOrPardonPrisoners",
  "mode": "execute",  // or "pardon"
  "targetSettlement": "selected-settlement-id",
  "removeAll": false,  // true on crit success
  "removeAmount": "1d4"  // on success
}
```

### 3. Custom UI Required
**Component:** `ExecutePardonUI.svelte`

**Features:**
- **Step 1:** Settlement selection (only settlements with imprisoned unrest)
- **Step 2:** Mode selection (Execute vs Pardon)
  - Validate tier: Pardon only available for Prison T3+ or Donjon T4
  - Display available mode based on structure tier
- **Step 3:** Display current imprisoned unrest
- **Step 4:** Roll outcome and apply
  - Success: Roll 1d4, display result
  - Critical Success: Show "all imprisoned unrest removed"

**Mode-Specific Skills:**
- **Execute:** Intimidation, Society
- **Pardon:** Diplomacy, Religion, Performance

### 4. Tier Validation
**Stocks (T1) or Jail (T2):**
- Only Execute available

**Prison (T3) or Donjon (T4):**
- Execute OR Pardon available (player choice)

---

## Complexity Rating

**🔴 Complex**
- Requires imprisoned unrest tracking system
- Mode selection with tier-based validation
- Dice rolling for success outcome (1d4)
- Settlement-specific data access
- Custom multi-step UI

---

## Dependencies

- Imprisoned unrest system (same as Arrest Dissidents)
- Justice structure tier tracking
- Settlement data model
- Dice rolling UI component
- Mode selection UI

---

## Implementation Priority

**Phase 5** (Complex Actions) - Requires imprisoned unrest system and complex UI

---

## Notes

**Important Rules:**
- Only works in settlements with imprisoned unrest > 0
- Tier determines available modes
- Critical Success removes ALL imprisoned unrest + reduces current unrest by 1
- Success removes random amount (1d4)
- Critical Failure causes scandal/riot (+1 unrest)

**Related Actions:**
- Works in tandem with Arrest Dissidents (which creates imprisoned unrest)
- Forms complete justice system loop
