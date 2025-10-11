# Hire Adventurers

**ID:** `hire-adventurers`  
**Category:** Foreign Affairs  
**Data File:** `data/player-actions/hire-adventurers.json`

---

## Current Status

### ✅ What's Working
- Basic action structure
- Skill variety (5 skills: diplomacy, society, deception, performance, thievery)

### ⚠️ Issues Found
None - data looks correct

### ⏳ What Needs Implementation
- Event selection UI
- Mode switching (auto-resolve vs +2 bonus)
- Cost handling (2 Gold upfront)
- Limit enforcement (once per turn)
- Game effects for hiring

---

## Implementation Notes

**Game Effects:**
```json
{
  "type": "hireAdventurers",
  "mode": "resolve-event" | "bonus-to-event",
  "eventId": "selected-event",
  "bonus": 2,
  "cost": 2
}
```

**UI Component:** `HireAdventurersUI.svelte`
- Event selection from active events
- Cost display (2 Gold upfront)
- Mode indication (auto-resolve vs +2 bonus)

**Outcomes:**
- **Crit Success:** Adventurers resolve one event entirely
- **Success:** Roll to resolve an event with +2 bonus
- **Failure:** Adventurers cause trouble, +1 unrest
- **Crit Failure:** Adventurers vanish/turn rogue, +2 unrest

**Special:** Costs 2 Gold when attempted, limit once per turn
