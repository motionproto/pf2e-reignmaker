# Send Scouts

**ID:** `send-scouts`  
**Category:** Expand the Borders  
**Data File:** `data/player-actions/send-scouts.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (6 skills: stealth, survival, nature, society, athletics, acrobatics)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Hex selection UI (unexplored hexes)
- Information revelation mechanics
- Game effects for scouting

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "sendScouts",
  "targetHexes": ["hex-1"],
  "revealInfo": true
}
```

**UI Component:** `SendScoutsUI.svelte`
- Hex selection (unexplored hexes)
- Display discovered information
- Show terrain, features, dangers
- Mark hexes as scouted

**Outcomes:**
- **Crit Success:** Learn about 2 hexes
- **Success:** Learn about 1 hex
- **Failure:** No report
- **Crit Failure:** Scouts lost (no info)
