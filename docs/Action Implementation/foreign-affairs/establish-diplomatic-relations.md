# Establish Diplomatic Relations

**ID:** `establish-diplomatic-relations`  
**Category:** Foreign Affairs  
**Data File:** `data/player-actions/establish-diplomatic-relations.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (6 skills: diplomacy, society, performance, deception, occultism, religion)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Nation/faction selection UI
- Diplomatic status tracking
- Game effects for establishing relations

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "establishDiplomaticRelations",
  "targetNation": "nation-id"
}
```

**UI Component:** Simple nation selection dropdown

**Outcomes:**
- **Crit Success:** Allies + can immediately request aid
- **Success:** Allies established
- **Failure/Crit Failure:** No effect
