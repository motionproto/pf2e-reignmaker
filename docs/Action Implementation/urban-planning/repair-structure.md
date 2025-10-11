# Repair Structure

**ID:** `repair-structure`  
**Category:** Urban Planning  
**Data File:** `data/player-actions/repair-structure.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (same as Build Structure)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Settlement selection UI
- Damaged structure selection
- Cost variation handling (free/1d4/50% based on outcome)
- Game effects for repair

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "repairStructure",
  "targetStructure": "structure-id",
  "costVariation": "free" | "1d4" | "half"
}
```

**UI Component:** `RepairStructureUI.svelte`
- Settlement selection
- Damaged structure selection only
- Cost display (varies by outcome)

**Outcomes:**
- **Crit Success:** Repaired for free
- **Success:** Pay 1d4 gold OR 1/2 the build cost (player choice)
- **Failure:** Remains damaged
- **Crit Failure:** Lose 1 gold
