# Sell Surplus

**ID:** `sell-surplus`  
**Category:** Economic & Resource Actions  
**Data File:** `data/player-actions/sell-surplus.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (7 skills: society, diplomacy, deception, performance, thievery, occultism, mercantile-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Resource type selection
- Quantity selection (minimum 2 required)
- Exchange rate handling (2:1 on success, 2:2 on crit)
- Game effects for selling

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "sellSurplus",
  "resourceType": "player-choice",
  "exchangeRate": "2:1" | "2:2"
}
```

**UI Component:** `SellSurplusUI.svelte`
- Resource type selection
- Quantity selection (must have 2 minimum)
- Exchange rate display

**Outcomes:**
- **Crit Success:** Trade 2 resources → 2 gold (1:1 rate)
- **Success:** Trade 2 resources → 1 gold (2:1 rate)
- **Failure/Crit Failure:** No effect
