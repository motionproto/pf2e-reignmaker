# Action Effects Integration Guide

## Overview

This document provides guidance on integrating **Gain Action** and **Lose Action** effects into the event/incident balance system.

---

## Action Economy Fundamentals

### What Are Actions?

- Each leader gets **1 action per turn**
- Actions are the fundamental currency of kingdom management
- Actions enable: resource generation, territory expansion, problem-solving, military operations, diplomacy

### Action Value

Based on analysis of typical action outcomes:
- **Resource actions**: ~2-5 gold equivalent (Sell Surplus, Harvest)
- **Territory actions**: ~5-8 value (Claim Hexes, Build Roads)
- **Problem-solving**: ~3-6 value (Deal with Unrest)
- **Average action value**: **~6-8 points**

**Recommended Balance Values:**
- **Gain Action**: **+8 points** (bonus action = extra opportunity)
- **Lose Action**: **-8 points** (lost opportunity + disruption)

---

## Current Implementation Status

### Existing Handler

`SpendPlayerActionHandler` already exists in the codebase:
- Located: `src/services/gameCommands/handlers/SpendPlayerActionHandler.ts`
- Command type: `spendPlayerAction`
- Functionality: Marks a character as having already acted without taking an action
- Selection modes: `random` or `player-choice`

### Current Usage

| Event/Incident | Outcome | Effect | Implementation Status |
|----------------|---------|--------|----------------------|
| Remarkable Treasure | Ruthless CF | Lose Action | TODO marker in code |
| Assassination Attempt | Ruthless CF | Lose Action | Implemented |
| Assassin Attack (incident) | Always | Lose Action | Implemented |
| Noble Conspiracy (incident) | Always | Lose Action | Implemented |

### Missing Implementation

**Gain Action** handler does not yet exist. Would need:
1. New handler: `GrantPlayerActionHandler`
2. Command type: `grantPlayerAction`
3. Functionality: Grant bonus action to a leader (random or player-choice)
4. Integration with turn state to track bonus actions

---

## Integration with Balance Editor

### Added to balance-editor.html

**EFFECT_TYPES:**
```javascript
'Action': { baseValue: 8 }
```

**FIXED_EFFECTS:**
```javascript
'Gain Action': 8,
'Lose Action': -8,
```

**EFFECT_CATEGORIES:**
```javascript
'Actions': ['Gain Action', 'Lose Action']
```

### CSV Export/Import

The balance editor now:
- Recognizes `Gain Action` and `Lose Action` as valid effects
- Calculates their value as ±8 points
- Includes them in the dropdown menu for adding effects
- Exports/imports them correctly in CSV format

---

## Usage Guidelines

### When to Use Gain Action

**Appropriate for:**
- **Critical Success rewards** on high-impact events
- Events representing exceptional efficiency or assistance
- Diplomatic events where allies provide support
- Economic/scholarly events that streamline governance

**Example Use Cases:**
- **Diplomatic Overture CS**: "Allied nation sends advisor to assist" → Gain Action
- **Economic Surge CS**: "Efficient systems free up leadership time" → Gain Action
- **Scholarly Discovery CS**: "Innovation streamlines governance" → Gain Action
- **Good Weather CS**: "Favorable conditions accelerate work" → Gain Action

**Balance Considerations:**
- Should be **rare** (CS only, special circumstances)
- Value: +8 points (significant reward)
- Narrative justification: External help, efficiency gains, favorable conditions

### When to Use Lose Action

**Appropriate for:**
- **Critical Failure penalties** on high-stakes events
- Events representing leadership distraction or incapacitation
- Incidents that target leaders directly
- Events with severe personal consequences

**Example Use Cases:**
- **Assassination Attempt CF**: "Leader paranoid, distracted by security concerns" → Lose Action
- **Public Scandal CF**: "Leader consumed by damage control" → Lose Action
- **Plague CF**: "Leader falls ill, quarantined" → Lose Action
- **Conspiracy CF**: "Leader investigating betrayal" → Lose Action

**Balance Considerations:**
- Appropriate for **CF outcomes** or **incidents**
- Value: -8 points (severe penalty)
- Narrative justification: Distraction, incapacitation, crisis management

---

## Design Patterns

### Virtuous Approach + Gain Action

**Pattern:** Diplomatic/collaborative success frees up resources
```
CS: Faction +1, -1d3 Unrest, Gain Action
Value: 3 + 4 + 8 = +15 (very strong CS)
```

**Narrative:** "Your generous diplomacy wins allies who send advisors to assist your kingdom."

### Ruthless Approach + Lose Action

**Pattern:** Brutal methods backfire, consuming leadership attention
```
CF: +1d3 Unrest, -1 Fame, Lose Action
Value: -4 + -5 + -8 = -17 (devastating CF)
```

**Narrative:** "Your harsh crackdown sparks paranoia. A leader spends the turn investigating conspiracies."

### Practical Approach + Conditional Action

**Pattern:** Efficiency gains on success, disruption on failure
```
CS: +2d3 Gold, Gain Action (if efficient)
CF: -1d3 Gold, Lose Action (if crisis)
```

**Narrative:** CS: "Streamlined processes free up time." CF: "Crisis management consumes leadership."

---

## Missing Effect Types Audit

Based on code analysis, the following effect types exist in handlers but are **not yet in the balance editor**:

### Territory Effects (Underutilized)
- **Fortify Hex**: Currently actions-only, could be event reward
- **Hex Seized by Faction**: Incidents-only, could be Ruthless CF
- **Remove Border Hexes**: Incidents-only, could be diplomatic/military CF

### Settlement Effects (Rare in Events)
- **Increase Settlement Level**: Rarely used, should be more common in growth events
- **Reduce Settlement Level**: Incidents-only, could be disaster/plague CF
- **Transfer Settlement**: Incidents-only (enemy takeover)

### Army Effects (Specialized)
- **Recruit Allied Army**: Request Military Aid only, could be diplomatic CS
- **Armies Defect**: Incidents-only, could be Ruthless CF on army events
- **Heal Army**: Tend Wounded only, could be medical/recovery events
- **Spawn Enemy Army**: Incidents-only, could be monster/raider CF

### Ongoing Effects (Underutilized)
- **Ongoing Resources**: Only Drug Den uses Ongoing Gold
- **Ongoing Unrest**: Only Cult Activity uses this
- **Opportunity**: More events should use ongoing effects for lasting consequences

---

## Recommendations

### Immediate Actions

1. **Add Gain Action to select CS outcomes**
   - Diplomatic Overture CS
   - Economic Surge CS
   - Scholarly Discovery CS
   - Good Weather CS

2. **Expand Lose Action usage**
   - Public Scandal CF
   - Plague CF (leader ill)
   - Feud CF (leader distracted)
   - Inquisition CF (leader under investigation)

3. **Create GainPlayerActionHandler**
   - Implement handler for bonus actions
   - Add to game-commands.ts
   - Integrate with turn state tracking

### Long-Term Improvements

1. **Expand Ongoing Effects**
   - More events with lasting consequences
   - Ongoing resource generation/drain
   - Ongoing unrest from unresolved problems

2. **Utilize Underused Effects**
   - Settlement level changes in growth/decline events
   - Hex seizure in border/rebellion events
   - Allied army recruitment in diplomatic events

3. **Balance Review**
   - Audit all events for action effect opportunities
   - Ensure CS/CF swings are appropriate
   - Add variety beyond standard gold/unrest patterns

---

## CSV Recalculation Script Update

The Python script for recalculating EVENT_NOW.csv already handles action effects:

```python
FIXED_EFFECTS = {
    # ... existing effects ...
    'Gain Action': 8,
    'Lose Action': -8,
}
```

No additional changes needed - the script will automatically recognize and value action effects correctly.

---

## Summary

**Action effects are now fully integrated into the balance system:**
- ✅ Added to balance-editor.html (EFFECT_TYPES, FIXED_EFFECTS, EFFECT_CATEGORIES)
- ✅ Documented in EVENT_BALANCE_ANALYSIS.md with valuation methodology
- ✅ Updated EVENT_EFFECTS_REFERENCE.md with usage guidelines
- ✅ CSV recalculation script handles action effects
- ⚠️ **Gain Action handler not yet implemented** (needs development)
- ⚠️ **Limited current usage** (only Lose Action in 4 events/incidents)

**Next Steps:**
1. Implement `GrantPlayerActionHandler` for Gain Action
2. Add Gain Action to appropriate CS outcomes
3. Expand Lose Action usage to more CF outcomes
4. Review all events for action effect opportunities
