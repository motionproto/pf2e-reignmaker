# Event Text Badge Migration - Progress Tracker

**Status**: Phase 8 COMPLETE (Cleanup & Missing Handlers)
**Started**: 2025-12-17
**Updated**: 2025-12-18
**Total Scope**: ~200 text badge instances across 36 event files

---

## Current Progress

**Overall**: Phase 8 complete - Cleanup of remaining static text badges and missing handlers

### Phase 0: Registry Updates ✅ COMPLETE
- [x] Import `RandomArmyEquipmentHandler`
- [x] Import `GrantStructureHandler` (replaced BuildKnowledgeStructureHandler in Phase 7)
- [x] Import `AddImprisonedHandler`
- [x] Register all handlers
- [x] Verify build passes

### Phase 1: High-Impact Conversions ✅ COMPLETE

#### Faction Adjustments (~80 instances) ✅ COMPLETE
- [x] scholarly-discovery.ts (2 instances) - Fixed parameter name `amount` → `steps`
- [x] food-shortage.ts (2 instances) - Full conversion
- [x] economic-surge.ts (4 instances) - Full conversion
- [x] food-surplus.ts (4 instances) - Full conversion (3 virtuous + 1 ruthless CF)
- [x] archaeological-find.ts (8 instances) - Full conversion (all 3 approaches)
- [x] assassination-attempt.ts (1 faction + 3 action badges) - Full conversion
- [x] bandit-activity.ts (1 faction instance) - Full conversion
- [x] cult-activity.ts (6 instances) - Full conversion (all 3 approaches)
- [x] diplomatic-overture.ts (12 instances) - Full conversion (all approaches, removed textBadge import)
- [x] drug-den.ts (1 instance) - Full conversion
- [x] festive-invitation.ts (6 instances) - Full conversion, fixed `amount` → `steps`, CF uses count:2
- [x] grand-tournament.ts (4 instances) - Full conversion (virtuous, practical, ruthless)
- [x] immigration.ts (5 instances) - Full conversion (all virtuous outcomes)
- [x] inquisition.ts (5 instances) - Full conversion, removed textBadge import
- [x] land-rush.ts (3 instances) - Full conversion (ruthless CS/F/CF)
- [x] magical-discovery.ts (9 instances) - Full conversion (2x virtuous CS/CF, 4x practical, removed textBadge)
- [x] military-exercises.ts (2 instances) - Full conversion (virtuous F + ruthless F)
- [x] monster-attack.ts (1 instance) - Full conversion (virtuous CS)
- [x] natural-disaster.ts (1 instance) - Full conversion (virtuous CS)
- [x] notorious-heist.ts (2 instances) - Full conversion (practical CS/CF)
- [x] pilgrimage.ts (3 instances) - Already converted (virtuous CS, practical CF, ruthless CF)
- [x] plague.ts (4 instances) - Full conversion (virtuous CS/S count:2/1, ruthless CF)
- [x] raiders.ts (2 instances) - Already converted (virtuous CS/CF)
- [x] trade-agreement.ts (6 instances) - Fixed `amount` → `steps`, removed textBadge import
- [x] undead-uprising.ts (4 instances) - Full conversion (virtuous CS, practical CS/S/F)
- [x] visiting-celebrity.ts (4 instances) - Full conversion (virtuous CS/S/F/CF)

#### Settlement Level Changes (~15 instances) ✅ COMPLETE
- [x] archaeological-find.ts (4 instances) - Full conversion
- [x] boomtown.ts (2 instances) - Full conversion (virtuous CS/S)
- [x] immigration.ts - Already had handler
- [x] plague.ts (1 instance) - Already had handler (virtuous CF)

### Phase 2: Medium-Impact Conversions (Partial - handled where encountered)
- [x] Structure damage - Handled via DamageStructureHandler where needed
- [x] Structure destroy - Handled via DestroyStructureHandler where needed
- [x] Worksite destroy - Handled via DestroyWorksiteHandler where needed
- [x] Imprisoned operations - Handled via AddImprisonedHandler, ConvertUnrestToImprisonedHandler where needed

### Phase 3: Army Condition Conversions ✅ COMPLETE
- [x] Created ApplyArmyConditionHandler with prepare/commit pattern
- [x] Registered handler in GameCommandHandlerRegistry (now 25 handlers)
- [x] Extended applyArmyCondition.ts to support custom effects (well-trained, poorly-trained)
- [x] monster-attack.ts - Full conversion (well-trained CS/S, fatigued F, enfeebled CF)
- [x] bandit-activity.ts - Full conversion (fatigued practical CF, ruthless CF)
- [x] natural-disaster.ts - Full conversion (enfeebled practical CF)
- [x] pilgrimage.ts - Full conversion (well-trained ruthless CS/S)
- [x] food-shortage.ts - Full conversion (fatigued practical CF)
- [x] undead-uprising.ts - Full conversion (sickened virtuous F, well-trained ruthless CS)
- [x] cult-activity.ts - Full conversion (frightened virtuous CF, well-trained ruthless CS/S)
- [x] public-scandal.ts - Full conversion (well-trained ruthless CS)
- [x] grand-tournament.ts - Full conversion (well-trained ruthless CS/S, fatigued ruthless F/CF)
- [x] festive-invitation.ts - Full conversion (well-trained ruthless S, fatigued F, enfeebled CF)
- [x] raiders.ts - Full conversion (enfeebled practical CF, fatigued ruthless F/CF)
- [x] crime-wave.ts - Full conversion (enfeebled practical CF)
- [x] good-weather.ts - Full conversion (well-trained ruthless CS/S, fatigued F, enfeebled CF)
- [x] feud.ts - Full conversion (fatigued practical CF)
- [x] military-exercises.ts - Full conversion (well-trained practical CS, fatigued practical F)

### Phase 5: Army Equipment Conversions ✅ COMPLETE
- [x] Refactored RandomArmyEquipmentHandler to use outfitArmy command properly
- [x] Handler now uses kingdom data model instead of actor flags
- [x] Supports `count` parameter for multiple army equipment grants
- [x] Generates dynamic badges showing army name and equipment type
- [x] festive-invitation.ts - Full conversion (ruthless CS: 1 army equipment)
- [x] military-exercises.ts - Full conversion (practical CS: 2 armies, practical S: 1 army)

### Phase 6: Territory Operations ✅ COMPLETE
Territory operations require user selection via `postApplyInteractions`, not the prepare/commit handler pattern.

#### Fortify Hex
- [x] military-exercises.ts - Added postApplyInteraction for virtuous CS/S free fortification
  - Uses hex validators (validateClaimed, validateNoSettlement)
  - Free fortification (no cost) - defaults to tier 1 Earthworks or upgrades existing
  - Uses updateKingdom directly for free fortification

#### Claim Hex
- [x] land-rush.ts - Fixed: Now properly claims hexes with postApplyInteraction
  - Updated imports to use claim validators (validateExplored, validateAdjacentToClaimed)
  - postApplyInteraction now uses 'claim' colorType and claim validation
  - Supports dynamic count (virtuous CS: 2 hexes, other successes: 1 hex)
  - execute() calls claimHexesExecution instead of createWorksiteExecution

#### Create Worksite
- [x] immigration.ts - Uses postApplyInteraction with WorksiteTypeSelector

### Phase 7: Structure Grants ✅ COMPLETE
Created generic `GrantStructureHandler` replacing specialized `BuildKnowledgeStructureHandler`.

#### Handler Features
- Supports multiple modes: specific structureId, category-based, or random
- `category` parameter: 'knowledge', 'residential', etc.
- `useProgression` parameter: follows structure tier progression within category
- `settlementId` parameter: specific settlement or 'random'
- `count` parameter: number of structures to grant
- Backwards compatible with `buildKnowledgeStructure` command type

#### Files Updated
- [x] GameCommandHandlerRegistry.ts - Replaced BuildKnowledgeStructureHandler with GrantStructureHandler
- [x] boomtown.ts - virtuous CS, practical CS/S, ruthless CS/S use handler
- [x] economic-surge.ts - ruthless CS uses handler
- [x] food-surplus.ts - virtuous CS uses handler
- [x] land-rush.ts - virtuous CS, practical CS use handler
- [x] archaeological-find.ts - practical CS uses handler with `category: 'knowledge'`
- [x] Deleted BuildKnowledgeStructureHandler.ts

### Phase 8: Cleanup & Missing Handlers ✅ COMPLETE
Final cleanup pass to remove remaining static text badges and add missing handler integrations.

#### Files Updated
- [x] criminal-trial.ts - Added AdjustFactionHandler for practical approach (CS: +1 faction, CF: -1 faction)
- [x] undead-uprising.ts:
  - Removed static text badges from outcomeBadges arrays
  - Added ConvertUnrestToImprisonedHandler for ruthless success
  - Added DamageStructureHandler for practical CF
  - Fixed execute() to use renamed prepared commands
- [x] feud.ts - Removed static text badges (faction, army condition, structure damage)
- [x] boomtown.ts - Removed static "Gain 1 structure" text badges
- [x] pilgrimage.ts - Removed static army condition text badges (handlers already integrated)
- [x] drug-den.ts:
  - Removed static text badges for imprisonment, structure damage
  - Added DamageStructureHandler for virtuous CF
  - Replaced ongoing gold text badges with valueBadge format
- [x] bandit-activity.ts:
  - Removed static text badges for army conditions, worksites
  - Added DestroyWorksiteHandler for virtuous CF
  - Converted worksite text badges to valueBadge format
- [x] good-weather.ts - Removed static army condition text badges (handlers already integrated)
- [x] Removed unused textBadge imports from all cleaned files
- [x] Build verified passing

### Phase 4: Special Cases
- [x] Structure grants (~5 instances) - Migrated to GrantStructureHandler (Phase 7)
- [x] Ongoing modifiers (~5 instances) - Handled in execute() functions with updateKingdom

---

## Quick Reference

### Conversion Pattern (Faction Adjustments)

**1. Add import:**
```typescript
import { AdjustFactionHandler } from '../../services/gameCommands/handlers/AdjustFactionHandler';
```

**2. Remove text badges from outcomeBadges definitions**

**3. Add handler prep in preview.calculate():**
```typescript
const factionHandler = new AdjustFactionHandler();
const factionCommand = await factionHandler.prepare(
  { type: 'adjustFactionAttitude', steps: 1, count: 1 }, // or steps: -1
  commandContext
);
if (factionCommand) {
  ctx.metadata._preparedFaction = factionCommand;
  if (factionCommand.outcomeBadges) {
    outcomeBadges.push(...factionCommand.outcomeBadges);
  } else if (factionCommand.outcomeBadge) {
    outcomeBadges.push(factionCommand.outcomeBadge);
  }
}
```

**4. Add commit in execute():**
```typescript
const factionCommand = ctx.metadata?._preparedFaction;
if (factionCommand?.commit) {
  await factionCommand.commit();
}
```

**Reference Files**: `food-shortage.ts`, `economic-surge.ts`, `archaeological-find.ts`, `diplomatic-overture.ts`

### Conversion Pattern (Army Conditions)

**1. Add import:**
```typescript
import { ApplyArmyConditionHandler } from '../../services/gameCommands/handlers/ApplyArmyConditionHandler';
```

**2. Remove text badges from outcomeBadges definitions** (handler generates dynamic badge with army name)

**3. Add handler prep in preview.calculate():**
```typescript
const armyHandler = new ApplyArmyConditionHandler();
const armyCommand = await armyHandler.prepare(
  { type: 'applyArmyCondition', condition: 'well-trained', value: 1, armyId: 'random' },
  commandContext
);
if (armyCommand) {
  ctx.metadata._preparedArmyCondition = armyCommand;
  if (armyCommand.outcomeBadges) {
    outcomeBadges.push(...armyCommand.outcomeBadges);
  }
}
```

**Supported conditions:** `sickened`, `enfeebled`, `frightened`, `clumsy`, `fatigued`, `well-trained`, `poorly-trained`

**4. Add commit in execute():**
```typescript
const armyCommand = ctx.metadata?._preparedArmyCondition;
if (armyCommand?.commit) {
  await armyCommand.commit();
}
```

**Reference Files**: `monster-attack.ts`, `bandit-activity.ts`, `good-weather.ts`

### Conversion Pattern (Army Equipment)

**1. Add import:**
```typescript
import { RandomArmyEquipmentHandler } from '../../services/gameCommands/handlers/RandomArmyEquipmentHandler';
```

**2. Remove text badges from outcomeBadges definitions** (handler generates dynamic badge with army name and equipment type)

**3. Add handler prep in preview.calculate():**
```typescript
const equipHandler = new RandomArmyEquipmentHandler();
const equipCommand = await equipHandler.prepare(
  { type: 'randomArmyEquipment', count: 1 }, // count: number of armies to equip
  commandContext
);
if (equipCommand) {
  ctx.metadata._preparedEquipment = equipCommand;
  // Remove static badge and add dynamic ones
  const filtered = outcomeBadges.filter(b => !b.template?.includes('army receives equipment'));
  outcomeBadges.length = 0;
  outcomeBadges.push(...filtered, ...(equipCommand.outcomeBadges || []));
}
```

**Command parameters:**
- `count`: Number of armies to equip (default: 1)
- `equipmentType`: 'armor' | 'runes' | 'weapons' | 'equipment' | 'random' (default: 'random')

**4. Add commit in execute():**
```typescript
const equipmentCommand = ctx.metadata?._preparedEquipment;
if (equipmentCommand?.commit) {
  await equipmentCommand.commit();
}
```

**Reference Files**: `festive-invitation.ts`, `military-exercises.ts`

### Conversion Pattern (Territory Operations - Fortify Hex)

Territory operations differ from other handlers because they require **user hex selection** via `postApplyInteractions`.

**1. Add imports:**
```typescript
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
```

**2. Add postApplyInteraction for hex selection:**
```typescript
postApplyInteractions: [
  {
    type: 'map-selection',
    id: 'fortifyHex',
    mode: 'hex-selection',
    count: 1,
    colorType: 'fortify',
    title: 'Select hex to fortify',
    required: true,
    condition: (ctx: any) => {
      // Only show for outcomes that grant fortification
      return ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success';
    },
    validateHex: (hexId: string): ValidationResult => {
      return safeValidation(() => {
        const kingdom = getFreshKingdomData();
        const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
        if (!hex) return { valid: false, message: 'Hex not found' };

        const claimedResult = validateClaimed(hexId, kingdom);
        if (!claimedResult.valid) return claimedResult;

        const settlementResult = validateNoSettlement(hexId, kingdom);
        if (!settlementResult.valid) return settlementResult;

        const currentTier = hex.fortification?.tier || 0;
        if (currentTier >= 4) {
          return { valid: false, message: 'Already at maximum fortification' };
        }

        return { valid: true, message: 'Valid hex for fortification' };
      }, hexId, 'fortify validation');
    }
  }
],
```

**3. Handle in execute() - for FREE fortifications (event rewards):**
```typescript
const selectedHexData = ctx.resolutionData?.compoundData?.fortifyHex;
if (selectedHexData?.hexIds?.[0]) {
  const hexId = selectedHexData.hexIds[0];
  const kingdom = get(kingdomData);
  const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
  const currentTier = hex?.fortification?.tier || 0;
  const nextTier = Math.min(currentTier + 1, 4) as 1 | 2 | 3 | 4;

  await updateKingdom(k => {
    const targetHex = k.hexes.find((h: any) => h.id === hexId);
    if (targetHex) {
      targetHex.fortification = {
        tier: nextTier,
        maintenancePaid: true,
        turnBuilt: k.currentTurn
      };
    }
  });
}
```

**Reference Files**: `military-exercises.ts` (virtuous approach)

### Conversion Pattern (Territory Operations - Claim Hex)

**1. Add imports:**
```typescript
import {
  validateExplored,
  validateAdjacentToClaimed,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
import { PLAYER_KINGDOM } from '../../types/ownership';
import { claimHexesExecution } from '../../execution/territory/claimHexes';
```

**2. Set metadata in preview.calculate():**
```typescript
// Set count based on outcome
if (outcome === 'criticalSuccess') {
  ctx.metadata._claimHexCount = 2;
} else if (outcome === 'success') {
  ctx.metadata._claimHexCount = 1;
}
```

**3. Add postApplyInteraction for hex selection:**
```typescript
postApplyInteractions: [
  {
    id: 'claimedHexes',
    type: 'map-selection',
    mode: 'hex-selection',
    count: (ctx: any) => ctx.metadata?._claimHexCount || 0,
    title: (ctx: any) => {
      const count = ctx.metadata?._claimHexCount || 1;
      return count > 1 ? `Select ${count} hexes to claim` : 'Select a hex to claim';
    },
    colorType: 'claim',
    required: true,
    condition: (ctx: any) => (ctx.metadata?._claimHexCount || 0) > 0,
    validateHex: (hexId: string, pendingClaims: string[] = []): ValidationResult => {
      return safeValidation(() => {
        const kingdom = getFreshKingdomData();
        const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
        if (!hex) return { valid: false, message: 'Hex not found' };
        if (hex.claimedBy === PLAYER_KINGDOM) {
          return { valid: false, message: 'Already claimed' };
        }
        if (pendingClaims.includes(hexId)) {
          return { valid: false, message: 'Already selected' };
        }
        const exploredResult = validateExplored(hexId);
        if (!exploredResult.valid) return exploredResult;
        const adjacencyResult = validateAdjacentToClaimed(hexId, pendingClaims, kingdom);
        if (!adjacencyResult.valid) return adjacencyResult;
        return { valid: true };
      }, hexId, 'claim validation');
    }
  }
],
```

**4. Handle in execute():**
```typescript
if (ctx.metadata?._claimHexCount > 0) {
  const selectedHexData = ctx.resolutionData?.compoundData?.claimedHexes;
  if (selectedHexData) {
    let hexIds: string[] = [];
    if (Array.isArray(selectedHexData)) {
      hexIds = selectedHexData;
    } else if (selectedHexData?.hexIds) {
      hexIds = selectedHexData.hexIds;
    }
    if (hexIds.length > 0) {
      await claimHexesExecution(hexIds);
    }
  }
}
```

**Reference Files**: `land-rush.ts`

### Conversion Pattern (Territory Operations - Create Worksite)

**1. Add imports:**
```typescript
import WorksiteTypeSelector from '../../services/hex-selector/WorksiteTypeSelector.svelte';
import {
  validateClaimed,
  validateNoSettlement,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
```

**2. Add postApplyInteraction with WorksiteTypeSelector:**
```typescript
postApplyInteractions: [
  {
    id: 'selectedHex',
    type: 'map-selection',
    mode: 'hex-selection',
    count: 1,
    title: 'Select a hex for the new worksite',
    colorType: 'worksite',
    required: true,
    condition: (ctx) => ctx.metadata?._gainWorksite === true,
    validateHex: (hexId: string): ValidationResult => {
      return safeValidation(() => {
        const kingdom = getFreshKingdomData();
        const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
        if (!hex) return { valid: false, message: 'Hex not found' };

        const claimedResult = validateClaimed(hexId, kingdom);
        if (!claimedResult.valid) return claimedResult;

        const settlementResult = validateNoSettlement(hexId, kingdom);
        if (!settlementResult.valid) return settlementResult;

        if (hex.worksite) {
          return { valid: false, message: `Hex already has a ${hex.worksite.type}` };
        }

        return { valid: true, message: 'Valid location for worksite' };
      }, hexId, 'worksite validation');
    },
    customSelector: {
      component: WorksiteTypeSelector
    }
  }
],
```

**3. Handle in execute():**
```typescript
const selectedHexData = ctx.resolutionData?.compoundData?.selectedHex;
if (selectedHexData?.hexIds?.[0]) {
  const hexId = selectedHexData.hexIds[0];
  const worksiteType = selectedHexData.metadata?.[hexId]?.worksiteType;

  const { createWorksiteExecution } = await import('../../execution/territory/createWorksite');
  await createWorksiteExecution(hexId, worksiteType);
}
```

**Reference Files**: `land-rush.ts`, `immigration.ts`

### Conversion Pattern (Structure Grants)

**1. Add import:**
```typescript
import { GrantStructureHandler } from '../../services/gameCommands/handlers/GrantStructureHandler';
```

**2. Remove static text badges from outcomeBadges definitions** (handler generates dynamic badge with structure name)

**3. Add handler prep in preview.calculate():**
```typescript
const structureHandler = new GrantStructureHandler();
const structureCommand = await structureHandler.prepare(
  { type: 'grantStructure' }, // Basic: random structure to random settlement
  // { type: 'grantStructure', category: 'knowledge', useProgression: true }, // Category-based
  // { type: 'grantStructure', structureId: 'library' }, // Specific structure
  commandContext
);
if (structureCommand) {
  ctx.metadata._preparedStructure = structureCommand;
  // Replace static badge with dynamic one
  const filtered = outcomeBadges.filter(b => !b.template?.includes('Gain 1 structure'));
  outcomeBadges.length = 0;
  outcomeBadges.push(...filtered, ...(structureCommand.outcomeBadges || []));
}
```

**Command parameters:**
- `structureId`: Specific structure ID (optional)
- `category`: Structure category - 'knowledge', 'residential', etc. (optional)
- `useProgression`: Follow tier progression in category (default: false)
- `settlementId`: Specific settlement or 'random' (default: 'random')
- `count`: Number of structures to grant (default: 1)

**4. Add commit in execute():**
```typescript
const structureCommand = ctx.metadata?._preparedStructure;
if (structureCommand?.commit) {
  await structureCommand.commit();
}
```

**Reference Files**: `boomtown.ts`, `economic-surge.ts`, `archaeological-find.ts`

---

## Handler Inventory

### In Registry (25 handlers)
- `AdjustFactionHandler` - Faction adjustments (most common)
- `ApplyArmyConditionHandler` - Army conditions (well-trained, sickened, etc.)
- `RandomArmyEquipmentHandler` - Random army equipment upgrades (uses outfitArmy command)
- `IncreaseSettlementLevelHandler`, `ReduceSettlementLevelHandler`
- `DamageStructureHandler`, `DestroyStructureHandler`, `DestroyWorksiteHandler`
- `AddImprisonedHandler`, `ReduceImprisonedHandler`, `ConvertUnrestToImprisonedHandler`, `ReleaseImprisonedHandler`
- `GrantStructureHandler` - Generic structure grants (replaces BuildKnowledgeStructureHandler)
- Plus others (see GameCommandHandlerRegistry.ts)

### Execution Functions (Use Directly)
- `claimHexesExecution(hexIds)` - Claim territory
- `fortifyHexExecution(hexId, tier)` - Build fortifications
- `createWorksiteExecution(hexId, type)` - Create worksites
- `applyArmyConditionExecution(actorId, condition, value)` - Army conditions (for direct use outside handler pattern)

---

## Migration Complete Summary

**Files Modified**: 30+ event files
**Pattern Applied**: Handler-based conversions with prepare/commit pattern
**Key Changes**:
- All faction text badges removed from outcomeBadges, replaced with AdjustFactionHandler
- All army condition text badges replaced with ApplyArmyConditionHandler
- All army equipment text badges replaced with RandomArmyEquipmentHandler
- Dynamic badge generation shows actual faction/army names instead of generic text
- Extended applyArmyCondition.ts to support both PF2e conditions AND custom effects
- Mutual exclusivity support (well-trained removes poorly-trained and vice versa)
- Deleted redundant applyWellTrained.ts file
- Build verified passing

**Phase 3 Highlights**:
- Created ApplyArmyConditionHandler with prepare/commit pattern
- 16 event files converted to use handler for army conditions
- Supported conditions: sickened, enfeebled, frightened, clumsy, fatigued, well-trained, poorly-trained

**Phase 5 Highlights**:
- Refactored RandomArmyEquipmentHandler to use outfitArmy command properly
- Handler uses kingdom data model (army.equipment) instead of actor flags
- Supports count parameter for equipping multiple armies
- Uses outfitArmy with 'success' outcome for +1 equipment bonus
- Generates dynamic badges showing army name and specific equipment type (Armor, Runes, Weapons, Enhanced Gear)
- festive-invitation.ts and military-exercises.ts converted to handler pattern

**Phase 6 Highlights** (Territory Operations):
- Territory operations use different pattern: `postApplyInteractions` + execution functions
- These require user hex selection, so can't use simple prepare/commit
- military-exercises.ts: Added postApplyInteraction for free fortification (virtuous CS/S)
- Free fortifications don't deduct costs - use updateKingdom directly
- land-rush.ts: Fixed to properly claim hexes (was incorrectly creating worksites)
  - Uses claim validators (validateExplored, validateAdjacentToClaimed)
  - Supports dynamic count (virtuous CS: 2 hexes, other successes: 1 hex)
  - Calls claimHexesExecution
- immigration.ts: Already properly uses postApplyInteractions with WorksiteTypeSelector

**Phase 7 Highlights** (Structure Grants):
- Created generic GrantStructureHandler replacing specialized BuildKnowledgeStructureHandler
- Handler supports multiple modes: specific structureId, category-based, or random
- Category-based mode with useProgression follows tier progression within structure category
- 5 event files converted: boomtown, economic-surge, food-surplus, land-rush, archaeological-find
- Dynamic badges show actual structure name (e.g., "Build Library in Rostland")
- Backwards compatible with legacy `buildKnowledgeStructure` command type

**Phase 8 Highlights** (Cleanup & Missing Handlers):
- criminal-trial.ts: Added missing AdjustFactionHandler for practical approach (CS/CF)
- undead-uprising.ts:
  - Removed static text badges from outcomeBadges arrays
  - Added ConvertUnrestToImprisonedHandler for ruthless success
  - Added DamageStructureHandler for practical CF
  - Fixed execute() to handle all prepared commands
- feud.ts: Removed static text badges (faction adjustments, army conditions, structure damage)
- boomtown.ts: Removed static "Gain 1 structure" text badges (handler generates dynamically)
- pilgrimage.ts: Removed static army condition text badges (handlers already integrated)
- drug-den.ts: Added DamageStructureHandler for virtuous CF, removed static badges
- bandit-activity.ts: Added DestroyWorksiteHandler for virtuous CF, converted worksite badges
- good-weather.ts: Removed static army condition text badges (handlers already integrated)
- Removed unused textBadge imports from all cleaned files

**Migration Complete**:
- All major text badge types converted to handler pattern
- Static badges removed from outcomeBadges arrays where handlers generate dynamically
- Ongoing modifier setup handled in execute() functions with updateKingdom
