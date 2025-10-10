# Player Actions Implementation Tracker

## Overview

This document tracks the implementation of `gameEffects` for all 26 player actions. Each action is categorized by UI complexity and lists the required game effects and custom UI components.

---

## Progress Summary

**Total Actions:** 26  
**Completed:** 1 (Recruit Unit)  
**Remaining:** 25

---

## Actions by Category

### ✅ Completed Actions

- [x] **Recruit Unit** - Military operation with `recruitArmy` effect

---

### 🎯 Uphold Stability (5 actions)

#### - [ ] Aid Another
**Complexity:** Complex - Proficiency scaling + reroll  
**Game Effects:**
```json
{
  "type": "aidBonus",
  "target": "other-pc",
  "bonusType": "proficiency-scaled",
  "value": {
    "trained": 2,
    "expert": 2,
    "master": 3,
    "legendary": 4
  },
  "allowReroll": true  // Only on critical success
}
```
**Custom UI:** Target PC selection, apply bonus to their next action

---

#### - [ ] Resolve a Kingdom Event
**Complexity:** Variable - Depends on event  
**Game Effects:**
```json
{
  "type": "resolveEvent",
  "eventId": "selected-event"
}
```
**Custom UI:** Event selection from active events list

---

#### - [ ] Arrest Dissidents
**Complexity:** Complex - Capacity checking  
**Game Effects:**
```json
{
  "type": "arrestDissidents",
  "unrestToImprison": 2,  // 2/4 depending on success level
  "capacityCheck": true
}
```
**Custom UI:** 
- Check justice structure capacity before allowing
- Display current imprisoned/capacity
- Visual feedback on capacity limits
- Settlement selection (which justice structure to use)

**Special Logic:**
- Critical Success: 4 unrest → imprisoned
- Success: 2 unrest → imprisoned
- Must respect structure capacity (Stocks=1, Jail=2, Prison=4, Donjon=8)

---

#### - [ ] Execute or Pardon Prisoners
**Complexity:** Complex - Dice rolls + mode selection  
**Game Effects:**
```json
// Execute or Pardon choice affects modifier application
{
  "type": "executePrisoners",  // or "pardonPrisoners"
  "removeAllImprisoned": false,  // Only on crit success
  "removeAmount": "dice",
  "dice": "1d4"
}
```
**Custom UI:**
- Settlement selection (which justice structure)
- Mode selection: Execute vs Pardon (only Prison T3+ allows Pardon)
- Display current imprisoned unrest
- Roll dice for success outcome (1d4 imprisoned removed)

---

#### - [ ] Deal with Unrest
**Complexity:** Simple - Resource modifiers only  
**Game Effects:** None needed (modifiers handle this)

---

### ⚔️ Military Operations (6 actions)

#### - [x] Recruit Unit
**Status:** ✅ COMPLETE

---

#### - [ ] Outfit Army
**Complexity:** Moderate - Equipment selection  
**Game Effects:**
```json
{
  "type": "outfitArmy",
  "targetArmy": "selected-army-id",
  "upgradeCount": 1,  // 2 on crit or 2 armies with same upgrade
  "upgradeType": "armour"  // or "runes", "weapons", "equipment"
}
```
**Custom UI:**
- Army selection dropdown
- Equipment type selection (armour/runes/weapons/equipment)
- Critical success: Choose 2 upgrades OR 2 armies with same upgrade

---

#### - [ ] Deploy Army
**Complexity:** Moderate - Target selection  
**Game Effects:**
```json
{
  "type": "deployArmy",
  "targetArmy": "selected-army-id",
  "targetHex": "hex-id",
  "claimHexAfterBattle": true  // Only on crit success
}
```
**Custom UI:**
- Army selection
- Hex/location target selection
- Initiative penalty on failure (-2)
- Fatigue/Enfeebled status display

---

#### - [ ] Recover Army
**Complexity:** Moderate - Army selection  
**Game Effects:**
```json
{
  "type": "recoverArmy",
  "targetArmy": "selected-army-id",
  "segmentsRecovered": 1,  // "all" on crit success
  "fullRecovery": false
}
```
**Custom UI:**
- Army selection (damaged armies only)
- Display current HP/segments
- Show recovery amount preview

---

#### - [ ] Train Army
**Complexity:** Moderate - Army selection  
**Game Effects:**
```json
{
  "type": "trainArmy",
  "targetArmy": "selected-army-id",
  "levelIncrease": 1,
  "promoteToCap": false  // true on crit (promote to party level)
}
```
**Custom UI:**
- Army selection
- Display current level vs max (party level)
- Preview new level

---

#### - [ ] Disband Army
**Complexity:** Simple - Army selection  
**Game Effects:**
```json
{
  "type": "disbandArmy",
  "targetArmy": "selected-army-id"
}
```
**Custom UI:** Army selection dropdown

---

### 🗺️ Expand the Borders (5 actions)

#### - [ ] Claim Hexes
**Complexity:** Complex - Proficiency scaling + hex selection  
**Game Effects:**
```json
{
  "type": "claimHexes",
  "count": "proficiency-scaled",
  "scaling": {
    "trained": 1,
    "expert": 1,
    "master": 2,
    "legendary": 3
  },
  "bonus": 1  // Extra hex on crit success
}
```
**Custom UI:**
- Hex map selection (must be adjacent to controlled territory)
- Show allowed hex count based on proficiency
- +2 circumstance bonus UI indicator when hex adjacent to 3+ controlled hexes

---

#### - [ ] Build Roads
**Complexity:** Moderate - Hex path selection  
**Game Effects:**
```json
{
  "type": "buildRoads",
  "hexCount": "standard",
  "bonus": 1  // Extra hex on crit
}
```
**Custom UI:**
- Multi-hex path selection
- Visual road preview on map

---

#### - [ ] Send Scouts
**Complexity:** Moderate - Target selection  
**Game Effects:**
```json
{
  "type": "sendScouts",
  "purpose": "exploration",
  "hexCount": 1  // 2 on crit success
}
```
**Custom UI:**
- Hex selection for scouting
- Display discovered information

---

#### - [ ] Fortify Hex
**Complexity:** Moderate - Hex selection  
**Game Effects:**
```json
{
  "type": "fortifyHex",
  "targetHex": "hex-id"
}
```
**Custom UI:**
- Hex selection (controlled hexes only)
- Display fortification benefits (+1 AC, +2 initiative for defenders)

---

#### - [ ] Harvest Resources
**Complexity:** Simple - Resource modifiers only  
**Game Effects:** None needed (immediate resource gain via modifiers)  
**Note:** Critical success identifies ideal worksite location (+2 bonus to future Create Worksite)

---

### 🏗️ Urban Planning (5 actions)

#### - [ ] Establish Settlement
**Complexity:** Moderate - Hex selection  
**Game Effects:**
```json
{
  "type": "foundSettlement",
  "tier": "village",
  "targetHex": "hex-id",
  "bonusStructure": false  // true on crit success
}
```
**Custom UI:**
- Hex selection (controlled hexes only)
- Settlement naming
- Critical success: Select 1 free structure to build

---

#### - [ ] Upgrade Settlement
**Complexity:** Moderate - Settlement selection  
**Game Effects:**
```json
{
  "type": "upgradeSettlement",
  "targetSettlement": "settlement-id",
  "structureBonus": 1  // Only on crit success
}
```
**Custom UI:**
- Settlement selection (must meet level + structure prereqs)
- Show current tier and requirements
- Critical success: Select 1 free structure

**Requirements:**
- Village → Town: Level 2+, 2 structures
- Town → City: Level 5+, 4 structures
- City → Metropolis: Level 10+, 6 structures

---

#### - [ ] Build Structure
**Complexity:** Complex - Structure browser integration  
**Game Effects:**
```json
{
  "type": "buildStructure",
  "targetSettlement": "settlement-id",
  "count": 1,
  "costReduction": 50  // Only on crit success
}
```
**Custom UI:**
- Settlement selection
- Structure browser/catalog
- Cost display (50% off on crit)
- Settlement slot availability check

---

#### - [ ] Repair Structure
**Complexity:** Moderate - Structure selection  
**Game Effects:**
```json
{
  "type": "repairStructure",
  "targetStructure": "structure-id",
  "costVariation": "dice"  // Free on crit, 1d4 or 50% cost on success
}
```
**Custom UI:**
- Settlement selection
- Damaged structure selection
- Cost display (varies by outcome)

---

### 🤝 Foreign Affairs (5 actions)

#### - [ ] Establish Diplomatic Relations
**Complexity:** Simple - Nation selection  
**Game Effects:**
```json
{
  "type": "establishDiplomaticRelations",
  "targetNation": "nation-id"
}
```
**Custom UI:**
- Nation/faction selection from available options
- Track diplomatic status

---

#### - [ ] Request Economic Aid
**Complexity:** Moderate - Resource type selection  
**Game Effects:**
```json
{
  "type": "requestEconomicAid",
  "resourceType": "player-choice",  // gold, food, lumber, stone, ore
  "amount": 2  // 3 on crit success
}
```
**Custom UI:**
- Allied nation selection
- Resource type selection (any resource OR gold)
- Amount preview (2 on success, 3 on crit)

---

#### - [ ] Request Military Aid
**Complexity:** Simple - Allied nation selection  
**Game Effects:**
```json
{
  "type": "requestMilitaryAid",
  "allyNation": "nation-id",
  "troopCount": 1,  // 2 on crit
  "duration": "1-battle"
}
```
**Custom UI:**
- Allied nation selection
- Display allied troop provided

---

#### - [ ] Infiltration
**Complexity:** Simple - Target nation selection  
**Game Effects:**
```json
{
  "type": "infiltration",
  "targetNation": "nation-id"
}
```
**Custom UI:**
- Target nation selection
- Display intelligence gathered (text result)

---

#### - [ ] Hire Adventurers
**Complexity:** Complex - Mode switching + event selection  
**Game Effects:**
```json
// Critical Success
{
  "type": "hireAdventurers",
  "mode": "resolve-event",
  "eventId": "selected-event"
}

// Success
{
  "type": "hireAdventurers",
  "mode": "bonus-to-event",
  "bonus": 2,
  "eventId": "selected-event"
}
```
**Custom UI:**
- Event selection from active events
- Cost display (2 Gold upfront)
- Mode indication (auto-resolve vs +2 bonus)

**Special:** Costs 2 Gold, limit once per turn

---

### 💰 Economic & Resource Actions (5 actions)

#### - [ ] Sell Surplus
**Complexity:** Simple - Resource type selection  
**Game Effects:** None needed (modifiers handle conversion)  
**Custom UI:**
- Resource type selection
- Quantity selection (must have 2 minimum)
- Exchange rate display (2:1 success, 2:2 crit)

---

#### - [ ] Purchase Resources
**Complexity:** Complex - Multi-step transaction  
**Game Effects:**
```json
{
  "type": "purchaseResources",
  "resourceType": "player-choice",
  "exchangeRate": 2,  // 1 on crit, 2 on success
  "quantity": "player-choice"
}
```
**Custom UI:**
- **Step 1:** Roll to establish exchange rate
- **Step 2:** Resource type selection
- **Step 3:** Quantity input (limited by available gold)
- **Step 4:** Confirm transaction
- Real-time cost calculation display

---

#### - [ ] Create Worksite
**Complexity:** Complex - Type + location selection  
**Game Effects:**
```json
{
  "type": "createWorksite",
  "worksiteType": "player-choice",  // farm/mine/quarry/lumbermill
  "targetHex": "hex-id",
  "immediateResource": true  // Only on crit success
}
```
**Custom UI:**
- Hex selection (controlled hexes only)
- Worksite type selection based on hex terrain
- Validation: Check if terrain supports worksite type
- Critical success: Immediate resource grant

---

#### - [ ] Harvest Resources
**Complexity:** Simple - Hex selection  
**Game Effects:** None needed (resource gain via modifiers)  
**Custom UI:**
- Hex selection (unharvested hexes only)
- Resource type based on terrain
- Critical success: Mark hex for +2 worksite bonus

---

#### - [ ] Collect Stipend
**Complexity:** Simple - Resource modifiers only  
**Game Effects:** None needed (personal gold gain via modifiers)  
**Requirements:** Settlement with Counting House T2+ structure

---

## Custom UI Architecture

### Proposed Pattern: Outcome-Specific Components

Each action outcome can specify an optional custom component for complex interactions:

```typescript
interface ActionOutcome {
  description: string;
  modifiers: ActionModifier[];
  gameEffects?: GameEffect[];
  customComponent?: {
    component: string;  // Component name/path
    props?: Record<string, any>;
  };
}
```

### Example: Purchase Resources

```json
{
  "effects": {
    "success": {
      "description": "Establish 2:1 exchange rate",
      "modifiers": [],
      "gameEffects": [{
        "type": "purchaseResources",
        "exchangeRate": 2
      }],
      "customComponent": {
        "component": "PurchaseResourcesUI",
        "props": {
          "exchangeRate": 2
        }
      }
    }
  }
}
```

### Component Integration Points

1. **ActionOutcomeDisplay.svelte** - Renders outcome, checks for custom component
2. **Custom Components Directory** - `src/view/actions/outcomes/`
3. **Component Registry** - Map action IDs to custom components

### Required Custom Components

1. `SelectArmyUI.svelte` - Used by: Deploy, Recover, Train, Disband, Outfit
2. `SelectHexUI.svelte` - Used by: Claim, Fortify, Create Worksite, Found Settlement
3. `SelectStructureUI.svelte` - Used by: Build, Repair
4. `PurchaseResourcesUI.svelte` - Multi-step transaction
5. `ArrestDissidentsUI.svelte` - Capacity checking + settlement selection
6. `ExecutePardonUI.svelte` - Mode selection + dice rolling
7. `HireAdventurersUI.svelte` - Event selection + mode display

---

## Implementation Strategy

### Phase 1: Foundation
1. Design custom UI component architecture
2. Create base custom components (Army selector, Hex selector, etc.)
3. Update TypeScript types to support `customComponent` in outcomes

### Phase 2: Simple Actions (No Custom UI)
Add gameEffects to actions that only need simple data:
- Establish Diplomatic Relations
- Request Military Aid
- Infiltration
- Disband Army
- Send Scouts
- Fortify Hex

### Phase 3: Moderate Actions (Simple Custom UI)
Implement actions with straightforward custom components:
- Train Army
- Recover Army
- Deploy Army
- Build Roads
- Establish Settlement
- Upgrade Settlement

### Phase 4: Complex Actions (Advanced Custom UI)
Tackle actions requiring complex multi-step interactions:
- Purchase Resources
- Arrest Dissidents
- Execute/Pardon Prisoners
- Build Structure
- Create Worksite
- Claim Hexes
- Hire Adventurers
- Outfit Army
- Aid Another

---

## Notes

- **Proficiency Scaling:** Need runtime access to character proficiency for Claim Hexes, Aid Another
- **Dice Rolling:** Execute/Pardon uses 1d4, Sell Surplus uses 1d4 on crit
- **Capacity Constraints:** Arrest Dissidents must check justice structure capacity
- **Cost Modifiers:** Build Structure gets 50% off on crit success
- **Mode Switching:** Hire Adventurers changes behavior based on success level
- **Multi-Step:** Purchase Resources requires roll → select → purchase flow
