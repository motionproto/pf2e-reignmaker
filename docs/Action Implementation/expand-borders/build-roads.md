# Build Roads

**ID:** `build-roads`  
**Category:** Expand the Borders  
**Data File:** `data/player-actions/build-roads.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (4 skills: crafting, survival, athletics, nature)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Hex path selection
- Road placement mechanics
- Critical success bonus hex
- Game effects for road building

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "buildRoads",
  "hexPath": ["hex-1", "hex-2", "hex-3"],
  "bonusHex": false
}
```

**UI Component:** `BuildRoadsUI.svelte`
- Multi-hex path selection
- Visual road preview on map
- Path validation (contiguous hexes)

**Outcomes:**
- **Crit Success:** Build roads +1 hex
- **Success:** Build roads (standard count)
- **Failure/Crit Failure:** No effect
