# Recover Army

**ID:** `recover-army`  
**Category:** Military Operations  
**Data File:** `data/player-actions/recover-army.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (6 skills: medicine, performance, religion, nature, crafting, warfare-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Army selection UI (damaged armies only)
- HP/segment recovery mechanics
- Game effects for recovery

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "recoverArmy",
  "targetArmy": "selected-army-id",
  "segmentsRecovered": 1
}
```

**UI Component:** `RecoverArmyUI.svelte`
- Army selection (damaged armies only)
- Display current HP/segments
- Show recovery preview

**Outcomes:**
- **Crit Success:** Full recovery (all HP)
- **Success:** Recover 1 segment
- **Failure/Crit Failure:** No recovery
