# Diplomatic Mission

**ID:** `establish-diplomatic-relations`  
**Category:** Foreign Affairs  
**Data File:** `data/player-actions/establish-diplomatic-relations.json`

---

## Overview

The Diplomatic Mission action allows players to improve relations with factions through diplomatic envoys. It uses a pre-roll dialog to select which faction to target, then applies attitude changes based on the outcome.

---

## Implementation Status

### ✅ Complete
- Action JSON with standard modifier costs
- Faction selection dialog (FactionSelectionDialog.svelte)
- Action handler with attitude change logic
- Custom resolution for attitude changes
- Integrated into ActionsPhase.svelte

---

## Cost Structure

**Fixed Cost:** 4 gold

**Outcome-Based Costs:**
- **Critical Success:** 2 gold (half cost) + improve attitude by 1 step
- **Success:** 4 gold + improve attitude by 1 step
- **Failure:** 4 gold + no attitude change (money spent, no results)
- **Critical Failure:** 4 gold + worsen attitude by 1 step (made things worse)

---

## Requirements

1. **Factions Available:** At least one faction that can be improved (not Helpful or Hostile)
2. **Minimum Gold:** 2 gold (for critical success)
3. **Diplomatic Capacity:** Not currently enforced (unlimited Helpful relationships allowed)

---

## Faction Attitude Progression

Attitudes improve/worsen by one step:

**Attitude Scale (Best to Worst):**
1. Helpful
2. Friendly
3. Indifferent
4. Unfriendly
5. Hostile

**Action Restrictions:**
- Cannot improve factions that are already **Helpful** (max level)
- Cannot improve factions that are **Hostile** (requires different action)

---

## Implementation Details

### Files

**JSON Data:**
- `data/player-actions/establish-diplomatic-relations.json` - Action definition with costs

**TypeScript:**
- `EstablishDiplomaticRelationsAction.ts` - Action handler with attitude logic
- Registered in `src/controllers/actions/implementations/index.ts`

**Svelte Components:**
- `FactionSelectionDialog.svelte` - Pre-roll faction selection dialog
- Integrated into `ActionsPhase.svelte`

### Custom Resolution

The action uses custom resolution to handle attitude changes:

```typescript
async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
  // Get faction from instance metadata
  const factionId = instance?.metadata?.factionId;
  const outcome = instance?.metadata?.outcome;
  
  // Apply attitude changes based on outcome
  switch (outcome) {
    case 'criticalSuccess':
    case 'success':
      newAttitude = getNextAttitude(currentAttitude); // Improve by 1
      break;
    case 'criticalFailure':
      newAttitude = getPreviousAttitude(currentAttitude); // Worsen by 1
      break;
    case 'failure':
      // No change
      break;
  }
  
  // Update faction attitude
  await factionService.updateAttitude(factionId, newAttitude);
}
```

### Pre-Roll Dialog

The action requires selecting a faction before rolling:

1. Player clicks skill → Dialog opens
2. Dialog shows eligible factions (not Helpful/Hostile)
3. Player selects faction → Dialog closes
4. Skill roll executes with faction context
5. Outcome applied → Attitude changes

---

## Game Effects

**On Success/Critical Success:**
- Faction attitude improves by one step
- Gold cost deducted

**On Failure:**
- No attitude change
- Gold cost still deducted (diplomatic mission cost)

**On Critical Failure:**
- Faction attitude worsens by one step
- Gold cost deducted (made things worse)

---

## Future Enhancements

1. **Diplomatic Capacity Enforcement:** Currently unlimited Helpful relationships allowed. Should enforce capacity based on Embassy/Grand Embassy/Diplomatic Quarter structures.

2. **Hostile Faction Actions:** Separate action needed to improve Hostile factions (e.g., "Mend Relations" or "Send Peace Envoy")

3. **Dynamic Costs:** Could vary cost based on current attitude (harder to improve higher attitudes)

4. **Multiple Attempts:** Track failed attempts and increase DC for repeated failures

---

## Testing Checklist

- [ ] Action appears in Foreign Affairs category
- [ ] Requirements check works (factions available, gold available)
- [ ] Faction selection dialog shows eligible factions only
- [ ] Dialog filters out Helpful and Hostile factions
- [ ] Gold cost deducted for all outcomes
- [ ] Critical success costs 2 gold (half cost)
- [ ] Success/Failure/Critical Failure cost 4 gold
- [ ] Attitude improves on success/critical success
- [ ] Attitude worsens on critical failure
- [ ] No attitude change on failure
- [ ] {Faction} placeholder replaced in outcome messages
- [ ] Action can be performed multiple times (no one-time limit)

---

## Architecture Notes

This implementation follows the standard modifier + custom resolution pattern:

- **JSON modifiers** handle costs (static -2/-4 gold)
- **Custom resolution** handles game state changes (attitude updates)
- **Pre-roll dialog** provides user selection before roll
- **FactionService** handles all faction data mutations

This keeps UI concerns separate from business logic while leveraging the standard modifier system for cost display.
