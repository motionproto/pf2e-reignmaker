# Build Structure

**ID:** `build-structure`  
**Category:** Urban Planning  
**Data File:** `data/player-actions/build-structure.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: crafting, society, athletics, acrobatics, stealth)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Settlement selection UI
- Structure browser integration
- Cost calculation (50% off on crit)
- Settlement slot availability checking
- Game effects for building

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "buildStructure",
  "targetSettlement": "settlement-id",
  "structureId": "selected-structure",
  "count": 1,
  "costReduction": 50
}
```

**UI Component:** `BuildStructureUI.svelte`
- Settlement selection dropdown
- Structure browser/catalog
- Cost display (50% discount on crit)
- Slot availability check

**Outcomes:**
- **Crit Success:** Build structure for half cost
- **Success:** Build 1 structure (full cost)
- **Failure/Crit Failure:** No progress
