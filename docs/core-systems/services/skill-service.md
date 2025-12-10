# PF2e Skill Service

**Purpose:** Pure PF2e system integration for kingdom skill checks

**Last Updated:** 2025-12-10

---

## Overview

PF2eSkillService provides the bridge between kingdom mechanics and PF2e game system's skill rolling infrastructure.

**Location:** `src/services/pf2e/PF2eSkillService.ts`

**Responsibilities:**
- Execute PF2e skill rolls with kingdom modifiers
- Calculate level-based DCs
- Map kingdom skill names to PF2e slugs
- Convert modifier formats

**Does NOT:**
- Collect kingdom modifiers (that's KingdomModifierService)
- Store roll state (that's RollStateService)
- Orchestrate pipelines (that's PipelineCoordinator)

---

## Core API

### executeSkillRoll()

**Primary method for executing PF2e skill rolls**

```typescript
async executeSkillRoll(options: {
  actor: any;                    // PF2e actor to roll for
  skill: any;                    // Skill object from actor.skills
  dc: number;                    // Difficulty class
  label: string;                 // Roll label
  modifiers: RollModifier[];     // Modifiers to apply
  rollTwice?: 'keep-higher' | false;
  callback?: RollCallback;       // Called when roll completes
  extraRollOptions?: string[];
}): Promise<any>;
```

**Usage Example:**
```typescript
// From PipelineCoordinator.step3_executeRoll()
const modifiers = kingdomModifierService.getModifiersForCheck({
  skillName: 'diplomacy',
  actionId: 'claim-hexes',
  checkType: 'action'
});

await pf2eSkillService.executeSkillRoll({
  actor: character,
  skill: character.skills.diplomacy,
  dc: 20,
  label: 'Kingdom Action: Claim Hexes',
  modifiers,
  rollTwice: hasKeepHigherAid ? 'keep-higher' : false,
  callback: async (roll, outcome, message) => {
    // Handle roll result
  }
});
```

---

## Helper Methods

### DC Calculation
```typescript
getKingdomActionDC(characterLevel?: number): number
```
Returns level-based DC (DC 14 at level 0, DC 40 at level 20)

### Skill Mapping
```typescript
getSkillSlug(skillName: string): string
```
Maps kingdom skill names to PF2e slugs ("Applicable Lore" → "lore")

### Skill Lookup
```typescript
getSkill(actor: any, skillName: string): any
```
Gets skill object from actor by name

### Modifier Conversion
```typescript
convertToPF2eModifiers(modifiers: RollModifier[]): PF2eModifier[]
```
Converts RollModifier[] to PF2e Modifier objects

---

## Skill Name Mapping

| Kingdom Name | PF2e Slug |
|-------------|-----------|
| Intimidation | intimidation |
| Diplomacy | diplomacy |
| Stealth | stealth |
| Crafting | crafting |
| Survival | survival |
| Medicine | medicine |
| Performance | performance |
| **Applicable Lore** | lore |
| *(etc.)* | *(lowercase)* |

---

## Lore Skill Handling

When check requires "applicable lore":
1. Check if actor has lore skills
2. If multiple exist, show selection dialog
3. User selects which lore to use
4. Roll proceeds with selected lore

**UI:** `LoreSelectionDialog.svelte`

---

## Modifier Format

### Kingdom Format (Input)
```typescript
{
  label: string;
  value: number;
  type: string;       // 'circumstance', 'item', 'status'
  enabled: boolean;
  ignored: boolean;
}
```

### PF2e Format (Output)
```typescript
{
  label: string;
  modifier: number;
  type: string;
  slug: string;
  enabled: boolean;
  ignored: boolean;
  test: (options: string[]) => boolean;
}
```

---

## Reroll Support

**Initial Roll:**
- Extracts PF2e modifiers from roll message
- Filters out ability and proficiency (recalculated by system)
- Stores via `RollStateService.storeRollModifiers()`

**Reroll:**
- Loads stored modifiers via `RollStateService.getRollModifiers()`
- Matches by label with current modifiers
- Adds unmatched modifiers from previous roll
- Ensures identical modifier state

---

## Service Integration

```
PipelineCoordinator.step3_executeRoll()
  │
  ├─→ KingdomModifierService.getModifiersForCheck()
  │     └─→ Structure bonuses, unrest, aids
  │
  ├─→ RollStateService.getRollModifiers() [reroll]
  │
  ├─→ PF2eSkillService.executeSkillRoll()
  │     ├─→ convertToPF2eModifiers()
  │     └─→ skill.roll() [PF2e system]
  │
  └─→ RollStateService.storeRollModifiers() [callback]
```

---

## Related Services

- **KingdomModifierService** - Calculates kingdom modifiers before calling this service
- **RollStateService** - Stores/loads modifiers for reroll support
- **PF2eCharacterService** - Character selection and level calculation

---

## Related Documentation

- [SERVICE_CONTRACTS.md](./SERVICE_CONTRACTS.md) - Service responsibilities
- [../pipeline/pipeline-coordinator.md](../pipeline/pipeline-coordinator.md) - Roll orchestration
- [../pipeline/ROLL_FLOW.md](../pipeline/ROLL_FLOW.md) - Complete roll flow

**Status:** ✅ Accurate as of 2025-12-10
