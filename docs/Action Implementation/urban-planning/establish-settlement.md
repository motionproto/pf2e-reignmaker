# Establish Settlement

**ID:** `establish-settlement`  
**Category:** Urban Planning  
**Data File:** `data/player-actions/establish-settlement.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: society, survival, diplomacy, religion, medicine)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Hex selection UI (controlled hexes only)
- Settlement creation mechanics
- Settlement naming
- Critical success free structure selection
- Game effects for founding

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "foundSettlement",
  "tier": "village",
  "targetHex": "hex-id",
  "name": "Settlement Name",
  "bonusStructure": false
}
```

**Settlement Details:**
- New settlements start as **Village** (Level 1)
- Settlement must be in controlled hex
- Critical success grants 1 free structure

**UI Component:** `EstablishSettlementUI.svelte`
- Hex selection (controlled hexes only)
- Settlement naming input
- Critical success: Structure browser for free structure

**Outcomes:**
- **Crit Success:** Found village + select 1 free structure
- **Success:** Found village
- **Failure/Crit Failure:** No effect
