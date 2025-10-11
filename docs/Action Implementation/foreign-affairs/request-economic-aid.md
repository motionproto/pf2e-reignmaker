# Request Economic Aid

**ID:** `request-economic-aid`  
**Category:** Foreign Affairs  
**Data File:** `data/player-actions/request-economic-aid.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: diplomacy, society, performance, thievery, medicine)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Allied nation selection
- Resource type selection (any resource OR gold)
- Amount handling (2 on success, 3 on crit)
- Game effects for aid

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "requestEconomicAid",
  "allyNation": "nation-id",
  "resourceType": "player-choice",
  "amount": 2
}
```

**UI Component:** `RequestEconomicAidUI.svelte`
- Allied nation selection
- Resource type selection (any resource OR gold)
- Amount preview

**Outcomes:**
- **Crit Success:** Gain 3 resources OR 3 gold
- **Success:** Gain 2 resources OR 2 gold
- **Failure/Crit Failure:** No effect
