# Train Army

**ID:** `train-army`  
**Category:** Military Operations  
**Data File:** `data/player-actions/train-army.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: intimidation, athletics, acrobatics, survival, warfare-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Army selection UI
- Level advancement mechanics
- Party level cap checking
- Game effects for training

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "trainArmy",
  "targetArmy": "selected-army-id",
  "levelIncrease": 1
}
```

**UI Component:** `TrainArmyUI.svelte`
- Army selection
- Display current level vs max (party level)
- Preview new level

**Outcomes:**
- **Crit Success:** Promote to party level
- **Success:** +1 level (max party level)
- **Failure/Crit Failure:** No change
