# Harvest Resources

**ID:** `harvest-resources`  
**Category:** Expand the Borders  
**Data File:** `data/player-actions/harvest-resources.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (6 skills: nature, survival, crafting, athletics, occultism, medicine)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Hex selection UI (unharvested hexes only)
- Resource type determination (based on terrain)
- Hex depletion tracking
- Critical success worksite bonus (+2 to Create Worksite in this hex)
- Game effects for harvesting

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "harvestResources",
  "targetHex": "hex-id",
  "resourceType": "food",
  "amount": 1,
  "idealLocation": false
}
```

**Resource by Terrain:**
- **Plains/Farmland:** Food
- **Forest:** Lumber
- **Hills/Mountains:** Stone
- **Mountains:** Ore

**UI Component:** `HarvestResourcesUI.svelte`
- Hex selection (unharvested hexes only)
- Display terrain type
- Show available resource type

**Outcomes:**
- **Crit Success:** Gain 1 resource + mark hex for +2 worksite bonus
- **Success:** Gain 1 resource
- **Failure:** No effect
- **Crit Failure:** Hex depleted (cannot harvest next turn)
