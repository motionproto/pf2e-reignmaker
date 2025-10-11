# Request Military Aid

**ID:** `request-military-aid`  
**Category:** Foreign Affairs  
**Data File:** `data/player-actions/request-military-aid.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: diplomacy, intimidation, society, arcana, warfare-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Allied nation selection
- Temporary troop allocation
- Duration tracking (1 battle)
- Game effects for aid

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "requestMilitaryAid",
  "allyNation": "nation-id",
  "troopCount": 1,
  "duration": "1-battle"
}
```

**UI Component:** Simple allied nation selection

**Outcomes:**
- **Crit Success:** Gain 2 allied troops OR 1 powerful special detachment for 1 battle
- **Success:** Gain 1 allied troop for 1 battle
- **Failure/Crit Failure:** No effect
