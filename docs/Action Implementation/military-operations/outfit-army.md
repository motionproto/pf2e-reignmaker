# Outfit Army

**ID:** `outfit-army`  
**Category:** Military Operations  
**Data File:** `data/player-actions/outfit-army.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: crafting, society, intimidation, thievery, warfare-lore)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Army selection UI
- Equipment type selection (armour/runes/weapons/equipment)
- Critical success logic (2 upgrades OR 2 armies)
- Game effects for outfitting

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "outfitArmy",
  "targetArmy": "selected-army-id",
  "upgradeType": "armour",
  "upgradeCount": 1
}
```

**Equipment Types:**
- **Armour:** +1 AC
- **Runes:** +1 to hit
- **Weapons:** +1 damage dice
- **Equipment:** +1 saving throws

**UI Component:** `OutfitArmyUI.svelte`
- Army selection
- Equipment type selection
- Critical success: 2 upgrades OR 2 armies with same upgrade

**Outcomes:**
- **Crit Success:** Outfit troop with 2 upgrades, OR 2 troops with same upgrade
- **Success:** Outfit 1 troop with 1 upgrade
- **Failure/Crit Failure:** No gear
