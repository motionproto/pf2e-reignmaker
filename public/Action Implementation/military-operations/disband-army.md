# Disband Army

**ID:** `disband-army`  
**Category:** Military Operations  
**Data File:** `data/player-actions/disband-army.json`

---

## Current Status

### ✅ What's Working
- Typed modifier system for unrest changes
- Skill variety (5 skills: intimidation, diplomacy, society, performance, warfare-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Army selection UI
- Army deletion/removal
- Game effects for disbanding

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "disbandArmy",
  "targetArmy": "selected-army-id"
}
```

**UI Component:** `SelectArmyUI.svelte` (reusable)
- Army selection dropdown
- Display army details (level, HP, status)
- Confirmation dialog

**Outcomes:**
- **Crit Success:** Remove army, -2 unrest
- **Success:** Remove army, -1 unrest
- **Failure:** Remove army, no unrest change
- **Crit Failure:** Remove army, +1 unrest
