# Deploy Army

**ID:** `deploy-army`  
**Category:** Military Operations  
**Data File:** `data/player-actions/deploy-army.json`

---

## Current Implementation Status

### ✅ Implemented
- Basic action structure
- Skill variety (5 skills: nature, survival, athletics, stealth, warfare-lore)

### ⏳ Not Implemented
- Army selection UI
- Hex/location targeting
- Movement mechanics
- Status effects (fatigued, enfeebled)
- Initiative penalties
- Hex claiming on critical success
- Game effects for deployment

---

## What Needs to Be Done

### 1. Game Effects Needed
```json
{
  "type": "deployArmy",
  "targetArmy": "selected-army-id",
  "targetHex": "hex-id",
  "outcome": "criticalSuccess",  // determines effects
  "effects": {
    "criticalSuccess": { "move": true, "claimHex": true },
    "success": { "move": true },
    "failure": { "move": true, "initiativePenalty": -2, "fatigued": true },
    "criticalFailure": { "randomHex": true, "initiativePenalty": -2, "fatigued": true, "enfeebled": 1 }
  }
}
```

### 2. Custom UI Required
**Component:** `DeployArmyUI.svelte`

**Features:**
- Army selection dropdown (show all armies)
- Hex/location picker on kingdom map
- Display army current location
- Show movement path (if applicable)
- Outcome display with status effects

### 3. Status Effect Application
**Failure:**
- Apply -2 initiative penalty to army
- Mark army as fatigued

**Critical Failure:**
- Roll 1d6 for direction, 1-3 for offset
- Move to random nearby hex
- Apply -2 initiative penalty
- Mark army as fatigued AND enfeebled 1
- Add +1 unrest to kingdom

---

## Complexity Rating

**🟡 Moderate**
- Requires army selection
- Hex targeting system
- Status effect application
- Random hex calculation (crit failure)
- Hex claiming integration

---

## Dependencies

- Army management system
- Hex map/grid system
- Status effect tracking on armies
- Hex claiming mechanics

---

## Implementation Priority

**Phase 4** (Moderate Actions) - Needs army system + map integration
