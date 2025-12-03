# PF2eSkillService Refactor - COMPLETED

## Summary

The PF2eSkillService has been refactored to separate concerns:

1. **KingdomModifierService** (`src/services/domain/KingdomModifierService.ts`) - Domain logic for extracting modifiers from kingdom state
2. **PF2eSkillService** (`src/services/pf2e/PF2eSkillService.ts`) - Simplified to pure PF2e integration
3. **PipelineCoordinator** (`src/services/PipelineCoordinator.ts`) - Updated to use both services directly

---

## Architecture After Refactor

### Data Flow

```
PipelineCoordinator.step3_executeRoll()
  │
  ├── KingdomModifierService.getModifiersForCheck()
  │     ├── structuresService (structure bonuses)
  │     ├── UnrestService (unrest penalty)
  │     └── kingdomData.turnState (active aids)
  │
  ├── RollStateService.getRollModifiers() [if reroll]
  │
  ├── PF2eSkillService.executeSkillRoll()
  │     └── skill.roll() [PF2e system]
  │
  └── RollStateService.storeRollModifiers() [in callback]
```

### File Structure

```
src/services/
├── pf2e/
│   ├── PF2eSkillService.ts      # Simplified - pure PF2e integration
│   ├── PF2eCharacterService.ts  # Unchanged
│   ├── PF2eRollService.ts       # Unchanged (utilities)
│   └── index.ts
├── domain/
│   ├── KingdomModifierService.ts # NEW - kingdom roll modifiers
│   ├── CustomModifierService.ts  # Existing
│   ├── DiceService.ts            # Existing
│   └── unrest/
│       └── UnrestService.ts      # Existing
├── roll/
│   └── RollStateService.ts       # Existing - reroll modifier storage
```

---

## Service Responsibilities

### KingdomModifierService

**Location:** `src/services/domain/KingdomModifierService.ts`

**Responsibility:** Extract kingdom-specific modifiers for rolls

```typescript
export class KingdomModifierService {
  // Get all modifiers for a skill check
  getModifiersForCheck(options: {
    skillName: string;
    actionId?: string;
    checkType: 'action' | 'event' | 'incident';
    onlySettlementId?: string;
    enabledSettlement?: string;
    enabledStructure?: string;
  }): RollModifier[];

  // Check if any aid grants keep-higher
  hasKeepHigherAid(actionId: string, checkType: string): boolean;
}
```

**Sources:**
- Structure bonuses (via `structuresService`)
- Unrest penalty (via `UnrestService`)
- Active aids (from `turnState.actionsPhase/eventsPhase.activeAids`)

### PF2eSkillService (Simplified)

**Location:** `src/services/pf2e/PF2eSkillService.ts`

**Responsibility:** Pure PF2e system integration

```typescript
export class PF2eSkillService {
  // Execute roll with provided modifiers (pure PF2e)
  async executeSkillRoll(options: {
    actor: any;
    skill: any;
    dc: number;
    label: string;
    modifiers: RollModifier[];
    rollTwice?: 'keep-higher' | false;
    callback?: RollCallback;
    extraRollOptions?: string[];
  }): Promise<any>;

  // Utilities
  getSkill(actor: any, skillSlug: string): any;
  getSkillSlug(skillName: string): string;
  getKingdomActionDC(level: number): number;
  convertToPF2eModifiers(modifiers: RollModifier[]): any[];
  
  // Lore selection (UI helper)
  showLoreSelectionDialog(loreItems: any[]): Promise<any>;
}
```

### RollStateService (Existing)

**Location:** `src/services/roll/RollStateService.ts`

**Responsibility:** Persist modifiers for reroll support

```typescript
class RollStateService {
  async storeRollModifiers(instanceId: string, turn: number, actionId: string, modifiers: RollModifier[]): Promise<void>;
  async getRollModifiers(instanceId: string, turn: number): Promise<RollModifier[] | null>;
  async clearRollModifiers(instanceId: string): Promise<void>;
}
```

---

## Key Principles

### 1. PipelineCoordinator Stays the Orchestrator

The coordinator calls services directly in `step3_executeRoll()`:
- Calls `KingdomModifierService.getModifiersForCheck()` for modifiers
- Calls `RollStateService` for reroll handling
- Calls `PF2eSkillService.executeSkillRoll()` for execution

No new orchestration layer was added.

### 2. KingdomModifierService is Domain Logic

Lives in `domain/` not `pf2e/` or `roll/` because:
- Structure bonuses are kingdom domain concepts
- Unrest penalties are kingdom domain concepts
- Aid bonuses are kingdom domain concepts

None of these are PF2e concepts - they're game-specific logic.

### 3. PF2eSkillService is Pure PF2e

Contains only:
- DC calculation (standard PF2e rules)
- Skill slug mapping
- `skill.roll()` invocation
- Modifier format conversion

No kingdom-specific logic.

### 4. Backward Compatibility

Legacy functions still work:
- `performKingdomSkillCheck()` - marked @deprecated, uses services internally
- `performKingdomActionRoll()` - marked @deprecated
- Exports from `src/services/pf2e/index.ts` unchanged

---

## Migration Notes

### For New Code

Use `PipelineCoordinator` for all action/event/incident execution. It handles:
- Modifier collection via `KingdomModifierService`
- Reroll support via `RollStateService`
- Roll execution via `PF2eSkillService`

### For Existing Code

The deprecated `performKingdomSkillCheck()` still works. It internally uses `KingdomModifierService` now, so behavior is identical.

### Breaking Changes

None. All existing APIs are preserved.

---

## Related Documents

- [SERVICE_CONTRACTS.md](SERVICE_CONTRACTS.md) - Service responsibilities
- [ROLL_FLOW.md](ROLL_FLOW.md) - Roll execution flow
- [../systems/core/pipeline-coordinator.md](../systems/core/pipeline-coordinator.md) - Pipeline architecture

---

**Status:** ✅ Completed  
**Last Updated:** 2025-12-02
