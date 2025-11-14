# GameCommandsResolver - Final Integration Steps

## Current Status

✅ **COMPLETED**: All 8 command modules extracted (~830 lines)
✅ **VERIFIED**: All extracted files compile without errors
✅ **RESTORED**: Main file from git (clean state, 1,453 lines)

⚠️ **PENDING**: Replace inline implementations with imported references

---

## Integration Checklist

### Step 1: Add Import Statements (Lines 20-60)

**Location**: After existing imports, before `ResolveResult` interface

**Action**: Add the following import block:

```typescript
// Extracted command imports
import { 
  recruitArmy as recruitArmyCommand,
  disbandArmy as disbandArmyCommand,
  trainArmy as trainArmyCommand,
  getPartyLevel,
  createEquipmentEffect,
  getEquipmentDisplayName
} from './commands/armies/armyCommands';

import { foundSettlement as foundSettlementCommand } from './commands/settlements/foundSettlement';

import { 
  chooseAndGainResource as chooseAndGainResourceCommand,
  giveActorGold as giveActorGoldCommand,
  getKingdomTaxationTier,
  calculateIncome
} from './commands/resources/playerRewards';

import { 
  reduceImprisoned as reduceImprisonedCommand,
  releaseImprisoned as releaseImprisonedCommand
} from './commands/unrest/imprisonedUnrest';

import { 
  destroyStructure as destroyStructureCommand,
  damageStructure as damageStructureCommand
} from './commands/structures/damageCommands';

import { 
  getBorderHexes,
  removeBorderHexes as removeBorderHexesCommand
} from './commands/territory/borderHexes';

import { adjustFactionAttitude as adjustFactionAttitudeCommand } from './commands/factions/attitudeCommands';

import { 
  calculateRandomNearbyHex,
  applyConditionToActor
} from './commands/combat/conditionHelpers';
```

**Verification**: Run `npx tsc --noEmit` - should compile without errors

---

### Step 2: Replace `recruitArmy` Method (Lines ~57-170)

**Search for**: `async recruitArmy(level: number, name?: string, exemptFromUpkeep?: boolean)`

**Replace entire method body with**:
```typescript
async recruitArmy(level: number, name?: string, exemptFromUpkeep?: boolean): Promise<PreparedCommand> {
  return recruitArmyCommand(level, name, exemptFromUpkeep);
},
```

**Line Count**: Reduces ~113 lines to 3 lines

**Verification**: 
- Run `npx tsc --noEmit`
- Check for any reference errors to `recruitArmyCommand`

---

### Step 3: Replace `disbandArmy` Method (Lines ~172-210)

**Search for**: `async disbandArmy(armyId: string, deleteActor: boolean = true)`

**Replace entire method body with**:
```typescript
async disbandArmy(armyId: string, deleteActor: boolean = true): Promise<PreparedCommand> {
  return disbandArmyCommand(armyId, deleteActor);
},
```

**Line Count**: Reduces ~38 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 4: Replace `foundSettlement` Method (Lines ~212-250)

**Search for**: `async foundSettlement(name: string, location, grantFreeStructure)`

**Replace entire method body with**:
```typescript
async foundSettlement(
  name: string,
  location: { x: number; y: number } = { x: 0, y: 0 },
  grantFreeStructure: boolean = false
): Promise<PreparedCommand> {
  return foundSettlementCommand(name, location, grantFreeStructure);
},
```

**Line Count**: Reduces ~38 lines to 6 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 5: Replace `giveActorGold` Method (Lines ~252-330)

**Search for**: `async giveActorGold(multiplier: number, settlementId: string)`

**Replace entire method body with**:
```typescript
async giveActorGold(multiplier: number, settlementId: string): Promise<PreparedCommand> {
  return giveActorGoldCommand(multiplier, settlementId);
},
```

**Line Count**: Reduces ~78 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 6: Replace Helper Methods (Lines ~332-390)

**Replace both `getKingdomTaxationTier` and `calculateIncome` with direct references**:

```typescript
getKingdomTaxationTier,

calculateIncome,
```

**Line Count**: Reduces ~58 lines to 4 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 7: Replace `reduceImprisoned` Method (Lines ~392-450)

**Search for**: `async reduceImprisoned(settlementId: string, amount)`

**Replace entire method body with**:
```typescript
async reduceImprisoned(settlementId: string, amount: string | number): Promise<ResolveResult> {
  return reduceImprisonedCommand(settlementId, amount);
},
```

**Line Count**: Reduces ~58 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 8: Replace `trainArmy` Method (Lines ~452-540)

**Search for**: `async trainArmy(armyId: string, outcome: string)`

**Replace entire method body with**:
```typescript
async trainArmy(armyId: string, outcome: string): Promise<PreparedCommand> {
  return trainArmyCommand(armyId, outcome);
},
```

**Line Count**: Reduces ~88 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 9: Replace `getPartyLevel` Helper (Lines ~542-555)

**Replace entire method with direct reference**:

```typescript
getPartyLevel,
```

**Line Count**: Reduces ~13 lines to 1 line

**Verification**: Run `npx tsc --noEmit`

---

### Step 10: Keep `outfitArmy` Inline (Lines ~557-730)

**Action**: **NO CHANGES** - Keep this method as-is

**Reason**: Contains complex interactive dialog logic that's tightly coupled to the resolver context

**Line Count**: ~173 lines (remains unchanged)

---

### Step 11: Replace Equipment Helpers (Lines ~732-820)

**Replace both `createEquipmentEffect` and `getEquipmentDisplayName` with direct references**:

```typescript
createEquipmentEffect,

getEquipmentDisplayName,
```

**Line Count**: Reduces ~88 lines to 4 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 12: Update `deployArmy` Helper References (Lines ~822-940)

**Action**: Replace `this.calculateRandomNearbyHex` and `this.applyConditionToActor` calls

**Search for** (line ~863):
```typescript
const randomHex = this.calculateRandomNearbyHex(destinationHex, 2);
```

**Replace with**:
```typescript
const randomHex = calculateRandomNearbyHex(destinationHex, 2);
```

**Search for** (line ~890):
```typescript
await this.applyConditionToActor(armyActor, conditionString);
```

**Replace with**:
```typescript
await applyConditionToActor(armyActor, conditionString);
```

**Line Count**: No reduction, but fixes references

**Verification**: Run `npx tsc --noEmit`

---

### Step 13: Remove Inline Helper Methods (Lines ~942-1100)

**Delete entire methods** (they're now imported):
- `calculateRandomNearbyHex` (~40 lines)
- `applyConditionToActor` (~118 lines)

**Line Count**: Reduces ~158 lines to 0 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 14: Replace `releaseImprisoned` Method (Lines ~1102-1170)

**Search for**: `async releaseImprisoned(percentage: number | 'all')`

**Replace entire method body with**:
```typescript
async releaseImprisoned(percentage: number | 'all'): Promise<ResolveResult> {
  return releaseImprisonedCommand(percentage);
},
```

**Line Count**: Reduces ~68 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 15: Replace `destroyStructure` Method (Lines ~1172-1290)

**Search for**: `async destroyStructure(category?, targetTier?, count = 1)`

**Replace entire method body with**:
```typescript
async destroyStructure(
  category?: string,
  targetTier?: 'highest' | 'lowest' | number,
  count: number = 1
): Promise<ResolveResult> {
  return destroyStructureCommand(category, targetTier, count);
},
```

**Line Count**: Reduces ~118 lines to 7 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 16: Replace `damageStructure` Method (Lines ~1292-1360)

**Search for**: `async damageStructure(targetStructure?, settlementId?, count = 1)`

**Replace entire method body with**:
```typescript
async damageStructure(
  targetStructure?: string,
  settlementId?: string,
  count: number = 1
): Promise<ResolveResult> {
  return damageStructureCommand(targetStructure, settlementId, count);
},
```

**Line Count**: Reduces ~68 lines to 7 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 17: Replace `removeBorderHexes` Method (Lines ~1362-1430)

**Search for**: `async removeBorderHexes(count: number | 'dice', dice?: string)`

**Replace entire method body with**:
```typescript
async removeBorderHexes(count: number | 'dice', dice?: string): Promise<ResolveResult> {
  return removeBorderHexesCommand(count, dice);
},
```

**Line Count**: Reduces ~68 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 18: Replace `getBorderHexes` Helper (Lines ~1432-1450)

**Replace entire method with direct reference**:

```typescript
getBorderHexes,
```

**Line Count**: Reduces ~18 lines to 1 line

**Verification**: Run `npx tsc --noEmit`

---

### Step 19: Replace `adjustFactionAttitude` Method (Lines ~1452-1560)

**Search for**: `async adjustFactionAttitude(factionId, steps, options?)`

**Replace entire method body with**:
```typescript
async adjustFactionAttitude(
  factionId: string | null,
  steps: number,
  options?: {
    maxLevel?: string;
    minLevel?: string;
    count?: number;
  }
): Promise<PreparedCommand> {
  return adjustFactionAttitudeCommand(factionId, steps, options);
},
```

**Line Count**: Reduces ~108 lines to 11 lines

**Verification**: Run `npx tsc --noEmit`

---

### Step 20: Replace `chooseAndGainResource` Method (Lines ~1562-1620)

**Search for**: `async chooseAndGainResource(resources: string[], amount: number)`

**Replace entire method body with**:
```typescript
async chooseAndGainResource(resources: string[], amount: number): Promise<ResolveResult> {
  return chooseAndGainResourceCommand(resources, amount);
},
```

**Line Count**: Reduces ~58 lines to 3 lines

**Verification**: Run `npx tsc --noEmit`

---

## Final Verification

### Step 21: Full TypeScript Compilation
```bash
npx tsc --noEmit
```
**Expected**: Zero errors

### Step 22: Line Count Verification
```bash
wc -l src/services/GameCommandsResolver.ts
```
**Expected**: ~600 lines (down from 1,453 lines = 58% reduction)

### Step 23: Git Diff Review
```bash
git diff src/services/GameCommandsResolver.ts
```
**Review**: Ensure only expected changes (imports added, inline code removed)

---

## Rollback Plan

If any step fails:

1. **Immediate rollback**:
   ```bash
   git checkout src/services/GameCommandsResolver.ts
   ```

2. **Resume from last successful step** in this checklist

---

## Expected Final Structure

```typescript
export async function createGameCommandsResolver() {
  return {
    // Imported references (most methods)
    recruitArmy: recruitArmyCommand,
    disbandArmy: disbandArmyCommand,
    foundSettlement: foundSettlementCommand,
    giveActorGold: giveActorGoldCommand,
    getKingdomTaxationTier,
    calculateIncome,
    reduceImprisoned: reduceImprisonedCommand,
    trainArmy: trainArmyCommand,
    getPartyLevel,
    
    // Inline (complex interactive logic)
    async outfitArmy(...) { /* ~173 lines */ },
    
    // Imported references
    createEquipmentEffect,
    getEquipmentDisplayName,
    
    // Inline (uses imported helpers)
    async deployArmy(...) { 
      // Uses: calculateRandomNearbyHex, applyConditionToActor
    },
    
    // Imported references
    releaseImprisoned: releaseImprisonedCommand,
    destroyStructure: destroyStructureCommand,
    damageStructure: damageStructureCommand,
    removeBorderHexes: removeBorderHexesCommand,
    getBorderHexes,
    adjustFactionAttitude: adjustFactionAttitudeCommand,
    chooseAndGainResource: chooseAndGainResourceCommand,
  };
}
```

---

## Success Criteria

✅ TypeScript compiles without errors
✅ File reduced from 1,453 → ~600 lines (58% reduction)
✅ All 20 methods either imported or updated
✅ `outfitArmy` and `deployArmy` remain inline (as designed)
✅ No functionality changes (zero breaking changes)
