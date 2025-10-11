# Infiltration

**ID:** `infiltration`  
**Category:** Foreign Affairs  
**Data File:** `data/player-actions/infiltration.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (6 skills: deception, stealth, thievery, society, arcana, acrobatics)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Target nation selection
- Intelligence display system
- Game effects for espionage

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "infiltration",
  "targetNation": "nation-id",
  "intelligenceLevel": "valuable" | "broad"
}
```

**UI Component:** Simple target nation selection + intelligence text display

**Outcomes:**
- **Crit Success:** Valuable intel (specific, actionable)
- **Success:** Broad intel (general information)
- **Failure:** No effect
- **Crit Failure:** Spies are captured
