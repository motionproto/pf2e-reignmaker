# Upgrade Settlement

**ID:** `upgrade-settlement`  
**Category:** Urban Planning  
**Data File:** `data/player-actions/upgrade-settlement.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: crafting, society, performance, arcana, medicine)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Settlement selection UI
- Tier progression validation
- Structure count requirements
- Level requirements
- Critical success free structure
- Game effects for upgrading

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "upgradeSettlement",
  "targetSettlement": "settlement-id",
  "structureBonus": false
}
```

**Settlement Tier Requirements:**
- **Village → Town:** Level 2+, 2 structures
- **Town → City:** Level 5+, 4 structures
- **City → Metropolis:** Level 10+, 6 structures

**UI Component:** `UpgradeSettlementUI.svelte`
- Settlement selection dropdown
- Display current tier and requirements
- Show progress toward next tier
- Validation (level + structure count)
- Critical success: Structure browser for free structure

**Outcomes:**
- **Crit Success:** Increase tier + select 1 free structure
- **Success:** Increase tier
- **Failure/Crit Failure:** No effect
