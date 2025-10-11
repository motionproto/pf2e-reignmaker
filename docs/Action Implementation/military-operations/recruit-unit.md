# Recruit Unit

**ID:** `recruit-unit`  
**Category:** Military Operations  
**Data File:** `data/player-actions/recruit-unit.json`

---

## Current Implementation Status

### ✅ Implemented
- Typed modifier system for unrest changes
- Skill variety (5 skills: diplomacy, intimidation, society, performance, athletics)
- Game effects for army recruitment
- Correct outcome modifiers

**Verification:**
- Critical Success: -1 unrest + recruit army ✅
- Success: recruit army ✅
- Failure: no effect ✅
- Critical Failure: +1 unrest ✅

### ⏳ Not Implemented
- Army creation UI/interface
- Integration with army management system
- Level assignment (party level)

---

## What Needs to Be Done

### 1. Game Effects Status
**Already defined in data:**
```json
"gameEffects": [{
  "type": "recruitArmy",
  "level": "kingdom-level",
  "description": "Create new army unit at party level"
}]
```

### 2. Implementation Needed
**Service/Controller:**
- Create `ArmyService` or `ArmyController`
- Handle `recruitArmy` game effect
- Create new army actor/entity
- Set level to party level
- Add to kingdom's army roster

**Data Model:**
- Army entity structure
- Link to kingdom
- Track level, HP, equipment, etc.

### 3. Custom UI
**Component:** Standard action display is sufficient

**Post-Action:**
- Show newly created army in army roster
- Display army details (level, type, status)

---

## Complexity Rating

**🟡 Moderate**
- Game effects already defined in data ✅
- Requires army management system
- Needs integration with party level tracking
- Standard UI (no custom component needed)

---

## Dependencies

- Army management system
- Party level access
- Army data model
- Army roster display

---

## Implementation Priority

**Phase 3** (Simple Game Effects) - Game effects defined, needs execution layer

---

## Notes

**Status:** This action is marked as ✅ COMPLETE in the implementation tracker, but the game effects execution is not yet implemented. The data structure is correct, but runtime execution needs:

1. ArmyService to handle `recruitArmy` game effect
2. Create army entity with proper level
3. Add to kingdom's army list
4. Update UI to show new army

This is currently the **only action with game effects in the data files**, making it a good reference for implementing the game effects system.
