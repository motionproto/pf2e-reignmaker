# Fortify Hex

**ID:** `fortify-hex`  
**Category:** Expand the Borders  
**Data File:** `data/player-actions/fortify-hex.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: crafting, athletics, intimidation, thievery, warfare-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Hex selection UI (controlled hexes only)
- Fortification tracking on hexes
- Combat benefits (+1 AC, +2 initiative for defenders)
- Game effects for fortification

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "fortifyHex",
  "targetHex": "hex-id",
  "unrestReduction": false
}
```

**Fortification Benefits:**
Troops defending in fortified hex gain:
- +1 armor class (circumstance bonus)
- +2 initiative (circumstance bonus)

**UI Component:** `FortifyHexUI.svelte`
- Hex selection (controlled hexes only)
- Display current fortification status
- Show fortification benefits

**Outcomes:**
- **Crit Success:** Fortify hex, reduce unrest by 1
- **Success:** Fortify hex
- **Failure/Crit Failure:** No effect
