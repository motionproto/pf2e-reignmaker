# Create Worksite

**ID:** `create-worksite`  
**Category:** Economic & Resource Actions  
**Data File:** `data/player-actions/create-worksite.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (6 skills: crafting, nature, survival, athletics, arcana, religion)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Hex selection UI (controlled hexes only)
- Worksite type selection (farm/mine/quarry/lumbermill)
- Terrain validation (worksite must match terrain)
- Immediate resource grant on crit
- Game effects for worksite creation

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "createWorksite",
  "worksiteType": "farm" | "mine" | "quarry" | "lumbermill",
  "targetHex": "hex-id",
  "immediateResource": false
}
```

**Worksite Types by Terrain:**
- **Farm:** Plains/Farmland → Food
- **Mine:** Mountains → Ore
- **Quarry:** Hills/Mountains → Stone
- **Lumbermill:** Forest → Lumber

**UI Component:** `CreateWorksiteUI.svelte`
- Hex selection (controlled hexes only)
- Worksite type selection based on terrain
- Terrain validation
- Bonus tracking (+2 if hex marked from Harvest Resources crit)

**Outcomes:**
- **Crit Success:** Immediate 1 resource + worksite produces next turn
- **Success:** Worksite established, produces next turn
- **Failure/Crit Failure:** No effect
