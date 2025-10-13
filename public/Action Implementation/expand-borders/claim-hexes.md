# Claim Hexes

**ID:** `claim-hexes`  
**Category:** Expand the Borders  
**Data File:** `data/player-actions/claim-hexes.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: nature, survival, intimidation, occultism, religion)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Proficiency scaling (1/1/2/3 hexes based on trained/expert/master/legendary)
- Hex selection UI (multi-hex)
- Adjacency validation
- Circumstance bonus (+2 when hex adjacent to 3+ controlled hexes)
- Game effects for claiming

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "claimHexes",
  "proficiency": "master",
  "hexCount": 2,
  "bonusHex": false,
  "selectedHexes": ["hex-1", "hex-2"]
}
```

**Proficiency Scaling:**
- **Trained/Expert:** 1 hex per action
- **Master:** 2 hexes per action
- **Legendary:** 3 hexes per action
- **Critical Success:** +1 bonus hex

**UI Component:** `ClaimHexesUI.svelte`
- Hex map selection (multi-select based on proficiency)
- Adjacency validation (hexes must be adjacent to controlled territory)
- Circumstance bonus indicator (+2 when hex adjacent to 3+ controlled hexes)
- Visual preview of hexes to be claimed

**Outcomes:**
- **Crit Success:** Claim all targeted hexes +1 extra
- **Success:** Claim targeted hexes (based on proficiency)
- **Failure/Crit Failure:** No effect
