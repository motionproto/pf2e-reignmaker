# PF2e Skill Service

**Pure PF2e system integration for kingdom skill checks**

---

## Overview

The PF2e Skill Service provides integration between kingdom mechanics and the PF2e game system's skill rolling infrastructure. It handles:

- Executing PF2e skill rolls with kingdom-specific modifiers
- DC calculation based on character level
- Skill name mapping (kingdom → PF2e slugs)
- Lore skill selection dialogs
- Roll modifier format conversion

---

## Architecture

### Service Separation

**PF2eSkillService** (Pure PF2e Integration)
- Location: `src/services/pf2e/PF2eSkillService.ts`
- Responsibility: Interface with PF2e game system
- No kingdom-specific business logic

**KingdomModifierService** (Kingdom Logic)
- Location: `src/services/domain/KingdomModifierService.ts`
- Responsibility: Calculate kingdom-specific modifiers
- Sources: Structures, unrest, active aids

### Data Flow

```
PipelineCoordinator.step3_executeRoll()
  │
  ├─→ KingdomModifierService.getModifiersForCheck()
  │     ├─→ Structure bonuses (via StructuresService)
  │     ├─→ Unrest penalty (via UnrestService)
  │     └─→ Active aids (from turnState)
  │
  ├─→ RollStateService.getRollModifiers() [for rerolls]
  │
  ├─→ PF2eSkillService.executeSkillRoll()
  │     └─→ skill.roll() [PF2e system API]
  │
  └─→ RollStateService.storeRollModifiers() [in callback]
```

---

## Core API

### executeSkillRoll()

**Primary method for executing PF2e skill rolls**

```typescript
async executeSkillRoll(options: {
  actor: any;                    // PF2e actor to roll for
  skill: any;                    // Skill object from actor.skills
  dc: number;                    // Difficulty class
  label: string;                 // Roll label (e.g., "Kingdom Action: Claim Hex")
  modifiers: RollModifier[];     // Modifiers to apply
  rollTwice?: 'keep-higher' | false;  // Roll twice, keep higher
  callback?: RollCallback;       // Callback when roll completes
  extraRollOptions?: string[];   // PF2e roll options
}): Promise<any>;
```

**Usage (from PipelineCoordinator):**

```typescript
// Get kingdom modifiers
const modifiers = kingdomModifierService.getModifiersForCheck({
  skillName: 'diplomacy',
  actionId: 'claim-hexes',
  checkType: 'action'
});

// Execute roll
const roll = await pf2eSkillService.executeSkillRoll({
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

### Helper Methods

**getKingdomActionDC(characterLevel: number): number**
- Calculates DC based on character level
- Uses standard PF2e level-based DCs
- Range: DC 14 (level 0) to DC 40 (level 20)

**getSkillSlug(skillName: string): string**
- Maps kingdom skill names to PF2e system slugs
- Handles variations: "applicable lore" → "lore"

**getSkill(actor: any, skillName: string): any**
- Gets skill object from actor by name
- Returns actor.skills[slug]

**convertToPF2eModifiers(modifiers: RollModifier[]): any[]**
- Converts RollModifier[] to PF2e Modifier objects
- Uses game.pf2e.Modifier constructor when available
- Preserves enabled/ignored states

---

## Skill Name Mapping

Kingdom skill names map to PF2e system slugs:

| Kingdom Name | PF2e Slug |
|-------------|-----------|
| Intimidation | intimidation |
| Diplomacy | diplomacy |
| Stealth | stealth |
| Deception | deception |
| Athletics | athletics |
| Society | society |
| Crafting | crafting |
| Survival | survival |
| Nature | nature |
| Medicine | medicine |
| Religion | religion |
| Arcana | arcana |
| Occultism | occultism |
| Performance | performance |
| Acrobatics | acrobatics |
| Thievery | thievery |
| **Applicable Lore** | lore |

---

## Lore Skill Handling

When a check requires "applicable lore":

1. System checks if actor has any lore skills
2. If multiple lore skills exist, shows selection dialog
3. User selects which lore to use
4. Roll proceeds with selected lore skill

**UI Component:** `LoreSelectionDialog.svelte`

---

## Modifier Management

### Format Conversion

**RollModifier (Kingdom Format):**
```typescript
{
  label: string;
  value: number;
  type: string;        // 'circumstance', 'item', 'status', etc.
  enabled: boolean;
  ignored: boolean;
}
```

**PF2e Modifier (System Format):**
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

### Reroll Support

On **initial roll**:
- Extracts PF2e modifiers from roll message
- Filters out ability and proficiency (recalculated by system)
- Stores via `RollStateService.storeRollModifiers()`

On **reroll**:
- Loads stored modifiers via `RollStateService.getRollModifiers()`
- Matches by label with current kingdom modifiers
- Adds any unmatched modifiers from previous roll
- Ensures identical modifier state

---

## Legacy API (Deprecated)

### performKingdomSkillCheck()

**Still supported but deprecated** - Use `PipelineCoordinator` instead.

```typescript
async performKingdomSkillCheck(
  skillName: string,
  checkType: 'action' | 'event' | 'incident',
  checkName: string,
  checkId: string,
  checkEffects?: any,
  actionId?: string,
  callback?: RollCallback,
  isReroll?: boolean,
  instanceId?: string
): Promise<any>;
```

**Used by:**
- `SettlementBasicInfo.svelte` (settlement skill checks)
- `EventsPhase.svelte` (event resolution)
- `ExecutionHelpers.ts` (legacy action execution)

**Migration Path:** These will be migrated to use `PipelineCoordinator` + `executeSkillRoll()` directly.

---

## Related Services

**KingdomModifierService** (`src/services/domain/KingdomModifierService.ts`)
- Calculates kingdom-specific modifiers
- Structure bonuses, unrest penalties, active aids
- Used by PipelineCoordinator before calling executeSkillRoll()

**RollStateService** (`src/services/roll/RollStateService.ts`)
- Stores/loads modifiers for reroll support
- Turn-aware storage (modifiers tied to specific turn)
- Prevents modifier drift across rerolls

**PF2eCharacterService** (`src/services/pf2e/PF2eCharacterService.ts`)
- Character selection and assignment
- Level calculation
- Skill proficiency checks

---

## Related Documentation

- [pipeline-coordinator.md](pipeline-coordinator.md) - How rolls are orchestrated
- [ROLL_FLOW.md](ROLL_FLOW.md) - Complete roll execution flow
- [SERVICE_CONTRACTS.md](SERVICE_CONTRACTS.md) - Service responsibilities

---

**Status:** ✅ Production Ready  
**Location:** `src/services/pf2e/PF2eSkillService.ts`  
**Last Updated:** 2025-12-10
