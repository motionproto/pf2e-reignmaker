# Incident Migration Review: First Pass Analysis

**Purpose:** Comprehensive analysis of all 30 incident pipelines - flagging issues, blockers, and items needing manual testing.

**Date:** 2025-11-29  
**Status:** 🔍 Initial Review Complete

---

## Executive Summary

### Current State

**✅ Good News:**
- All 30 incidents have pipeline files created
- All registered in PipelineRegistry
- Basic structure in place (outcomes, skills, execute function)
- Integration with unified check handler working

**⚠️ Issues Found:**
- All incidents have **empty** `preview` objects
- No incidents implement proper `preview.calculate()` functions
- Game commands referenced in JSON but **not executed** in pipelines
- Manual effects noted but **not implemented**
- No custom components for user choices
- Choice modifiers not handled properly

**🚨 Critical Blockers:**
- 9 game commands **do not exist** yet
- 2 incidents need custom Svelte components (**not created**)
- Preview system will **crash** without proper structure

---

## Critical Issues (Must Fix)

### Issue #1: Missing Preview Implementation

**Problem:** All incidents have empty preview objects:
```typescript
preview: {
  // Empty - will cause crashes!
}
```

**Impact:** OutcomeDisplay will crash with "TypeError: preview.specialEffects is not iterable"

**Solution:** Every incident needs:
```typescript
preview: {
  calculate: (ctx) => ({
    resources: [],      // Required!
    outcomeBadges: [],  // Required!
    warnings: []        // Optional
  })
}
```

**Affected:** All 30 incidents

---

### Issue #2: Game Commands Not Executed

**Problem:** JSON has game commands but pipelines don't execute them:

**Example:** `border-raid.json` has:
```json
{
  "gameCommands": [
    { "type": "removeBorderHexes", "count": 1 }
  ]
}
```

But `border-raid.ts` doesn't execute it:
```typescript
execute: async (ctx) => {
  // Only applies modifiers, ignores game commands!
  await applyPipelineModifiers(borderRaidPipeline, ctx.outcome);
  return { success: true };
}
```

**Solution:** Import and execute game commands:
```typescript
import { executeGameCommands } from '../../shared/GameCommandHelpers';

execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);
  
  // Execute game commands from outcome
  const outcome = ctx.outcomeLookup?.[ctx.outcome];
  if (outcome?.gameCommands) {
    await executeGameCommands(outcome.gameCommands);
  }
  
  return { success: true };
}
```

**Affected:** 12 incidents with game commands

---

### Issue #3: Missing Game Commands

**Problem:** Incidents reference game commands that **do not exist**:

| Command | Used By | Priority | Estimated Effort |
|---------|---------|----------|------------------|
| `destroyWorksite` | bandit-activity, emigration-threat | HIGH | 2-3 hours |
| `consumePlayerAction` | assassination-attempt, noble-conspiracy | HIGH | 1-2 hours |
| `downgradeSettlement` | secession-crisis, settlement-collapse, settlement-crisis | HIGH | 2-3 hours |
| `releaseImprisonedUnrest` | prison-breaks | HIGH | 1-2 hours |
| `performMoraleCheck` | mass-desertion-threat | MEDIUM | 3-4 hours |
| `modifyFactionAttitude` | international-scandal | MEDIUM | 1-2 hours |
| `transferHexesToFaction` | guerrilla-movement | LOW | 3-4 hours |
| `spawnFactionArmy` | guerrilla-movement | LOW | 2-3 hours |
| `transferSettlementToFaction` | secession-crisis | LOW | 4-5 hours |

**Total Estimated Effort:** 19-28 hours

**Blocker:** Cannot fully test these incidents until commands are implemented.

---

### Issue #4: Choice Modifiers Not Handled

**Problem:** Production-strike and trade-war use choice modifiers but have no UI:

```typescript
modifiers: [
  { type: 'choice', resources: ["lumber", "ore", "stone"], value: '1d4-1' }
]
```

**Solution:** Need custom component `ResourceLossSelector.svelte`

**Affected:** 2 incidents (production-strike, trade-war)

**Estimated Effort:** 2-3 hours

---

## Incident-by-Incident Review

### Minor Incidents (8 total)

#### 1. ✅ Crime Wave
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH (good starter)

#### 2. ✅ Corruption Scandal
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH

#### 3. ✅ Protests
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH

#### 4. ✅ Rising Tensions
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH

#### 5. ✅ Work Stoppage
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH

#### 6. ⚠️ Diplomatic Incident
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Notes:** JSON has typo "kingdoms" → should be "factions"
- **Effort:** 20 min
- **Priority:** MEDIUM

#### 7. ⚠️ Bandit Activity
- **Pattern:** Dice + manual effect
- **Status:** Needs preview.calculate + game command
- **Blockers:** Missing `destroyWorksite` command
- **Manual Effect:** "Destroy one random worksite"
- **Effort:** 30 min (after command exists)
- **Priority:** LOW (blocked)

#### 8. ⚠️ Emigration Threat
- **Pattern:** Dice + manual effect
- **Status:** Needs preview.calculate + game command
- **Blockers:** Missing `destroyWorksite` command
- **Manual Effect:** "Destroy 1d3 worksites"
- **Effort:** 30 min (after command exists)
- **Priority:** LOW (blocked)

---

### Moderate Incidents (10 total)

#### 9. ⚠️ Disease Outbreak
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`damageStructure` exists)
- **Game Command:** Damage Medicine/Faith structure (random)
- **Effort:** 45 min
- **Priority:** HIGH

#### 10. ⚠️ Infrastructure Damage
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`damageStructure` exists)
- **Game Command:** Damage 1d3 structures (random)
- **Effort:** 30 min
- **Priority:** HIGH

#### 11. ⚠️ Mass Exodus
- **Pattern:** Game command (multiple)
- **Status:** Needs preview.calculate + game commands
- **Blockers:** Missing `destroyWorksite` command
- **Game Commands:** destroyWorksite + damageStructure
- **Effort:** 45 min (after command exists)
- **Priority:** MEDIUM (partial block)

#### 12. ⚠️ Riot
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`damageStructure`, `destroyStructure` exist)
- **Game Command:** Damage OR destroy structure
- **Effort:** 30 min
- **Priority:** HIGH

#### 13. ⚠️ Settlement Crisis
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`damageStructure` exists)
- **Game Command:** Damage random structure
- **Effort:** 30 min
- **Priority:** HIGH

#### 14. ⚠️ Tax Revolt
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH

#### 15. 🚨 Assassination Attempt
- **Pattern:** Game command (NEW)
- **Status:** Needs preview.calculate + NEW game command
- **Blockers:** Missing `consumePlayerAction` command
- **Game Command:** Mark one leader's action as used
- **Effort:** 1 hour (after command exists)
- **Priority:** LOW (blocked)

#### 16. ⚠️ Diplomatic Crisis
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`adjustFactionAttitude` exists)
- **Game Command:** Worsen relations with 1d4+1 factions
- **Effort:** 45 min
- **Priority:** MEDIUM

#### 17. 🚨 Production Strike
- **Pattern:** Custom component (choice)
- **Status:** Needs preview.calculate + custom component
- **Blockers:** Missing `ResourceLossSelector.svelte` component
- **Component:** Player chooses which resource to lose (1d4)
- **Effort:** 2 hours (component + integration)
- **Priority:** MEDIUM (needs component)

#### 18. 🚨 Trade Embargo
- **Pattern:** Custom component (choice)
- **Status:** Needs preview.calculate + custom component
- **Blockers:** Missing `ResourceLossSelector.svelte` component
- **Component:** Player chooses which resource to lose (1d4 or 2d4)
- **Effort:** 1 hour (reuse component from production-strike)
- **Priority:** LOW (depends on production-strike)

---

### Major Incidents (12 total)

#### 19. ⚠️ Border Raid
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`removeBorderHexes` exists)
- **Game Command:** Remove 1 or 1d3 border hexes
- **Effort:** 30 min
- **Priority:** HIGH

#### 20. ⚠️ Economic Crash
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`destroyStructure` exists)
- **Game Command:** Destroy highest tier commerce structure
- **Effort:** 45 min
- **Priority:** MEDIUM

#### 21. 🚨 Guerrilla Movement
- **Pattern:** Complex (multiple NEW commands)
- **Status:** Needs preview.calculate + NEW game commands
- **Blockers:** Missing `transferHexesToFaction`, `spawnFactionArmy`
- **Game Commands:** 
  - Transfer 1d3 or 2d6+3 hexes to Rebels faction
  - Spawn Rebel army (crit failure only)
- **Effort:** 3 hours (after commands exist)
- **Priority:** LOW (blocked)

#### 22. ✅ International Crisis
- **Pattern:** Simple (modifiers only)
- **Status:** Needs preview.calculate
- **Blockers:** None
- **Effort:** 15 min
- **Priority:** HIGH

#### 23. ⚠️ International Scandal
- **Pattern:** Game command (batch)
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** Missing `modifyFactionAttitude` (batch version)
- **Game Command:** Worsen relations with 1d4 factions by 1 level each
- **Effort:** 1 hour (after command exists)
- **Priority:** LOW (blocked)

#### 24. 🚨 Mass Desertion Threat
- **Pattern:** Game command (NEW + complex)
- **Status:** Needs preview.calculate + NEW game command
- **Blockers:** Missing `performMoraleCheck` command
- **Game Command:** 1 or 2 armies perform morale check
- **Notes:** Morale check is complex (DC based on level, skill choice, 4 outcomes)
- **Effort:** 2 hours (after command exists)
- **Priority:** LOW (blocked + complex)

#### 25. 🚨 Noble Conspiracy
- **Pattern:** Game command (NEW)
- **Status:** Needs preview.calculate + NEW game command
- **Blockers:** Missing `consumePlayerAction` command
- **Game Command:** Mark one random leader's action as used
- **Effort:** 1 hour (after command exists)
- **Priority:** LOW (blocked)

#### 26. 🚨 Prison Breaks
- **Pattern:** Game command (NEW + structure targeting)
- **Status:** Needs preview.calculate + NEW game command
- **Blockers:** Missing `releaseImprisonedUnrest` command
- **Game Commands:**
  - Target largest Justice structure
  - Damage or destroy it
  - Release all imprisoned unrest from that settlement
- **Effort:** 2 hours (after command exists)
- **Priority:** LOW (blocked)

#### 27. ⚠️ Religious Schism
- **Pattern:** Game command
- **Status:** Needs preview.calculate + game command execution
- **Blockers:** None (`destroyStructure` exists)
- **Game Command:** Destroy highest tier religious structure
- **Effort:** 45 min
- **Priority:** MEDIUM

#### 28. 🚨 Secession Crisis
- **Pattern:** Complex (multiple NEW commands)
- **Status:** Needs preview.calculate + NEW game commands
- **Blockers:** Missing `downgradeSettlement`, `transferSettlementToFaction`
- **Game Commands:**
  - Failure: Downgrade settlement + destroy structure
  - Crit Failure: Transfer entire settlement + adjacent hexes to Rebels
- **Notes:** Most complex incident - creates autonomous rebel kingdom
- **Effort:** 3 hours (after commands exist)
- **Priority:** LOW (blocked + very complex)

#### 29. 🚨 Settlement Collapse
- **Pattern:** Game command (NEW + dice)
- **Status:** Needs preview.calculate + NEW game command
- **Blockers:** Missing `downgradeSettlement` command
- **Game Commands:** Damage 1d3 structures OR (downgrade + destroy 1d3)
- **Effort:** 1.5 hours (after command exists)
- **Priority:** LOW (blocked)

#### 30. 🚨 Trade War
- **Pattern:** Custom component (choice)
- **Status:** Needs preview.calculate + custom component
- **Blockers:** Missing `ResourceLossSelector.svelte` component
- **Component:** Player chooses which resource to lose (2d4 or 4d4)
- **Effort:** 1 hour (reuse component from production-strike)
- **Priority:** LOW (depends on production-strike)

---

## Priority Matrix

### Tier 1: Can Do Now (No Blockers)

**8 incidents | ~4 hours total**

✅ **Simple Modifiers (6 incidents - 90 min):**
- crime-wave
- corruption-scandal
- protests
- rising-tensions
- work-stoppage
- international-crisis

⚠️ **Game Commands with Existing Commands (2 incidents - 1.5 hours):**
- disease-outbreak
- infrastructure-damage

---

### Tier 2: Need Minor Fixes (Existing Commands)

**6 incidents | ~4 hours total**

⚠️ **Execute Existing Game Commands (6 incidents):**
- border-raid (`removeBorderHexes`)
- riot (`damageStructure`, `destroyStructure`)
- settlement-crisis (`damageStructure`)
- economic-crash (`destroyStructure`)
- religious-schism (`destroyStructure`)
- diplomatic-crisis (`adjustFactionAttitude`)

**Fix Required:** Add game command execution to execute function

---

### Tier 3: Need New Game Commands (High Priority)

**2 incidents | ~3-4 hours (command creation) + 1 hour (integration)**

🚨 **Commands Needed:**
- `destroyWorksite` - For bandit-activity, emigration-threat
- `consumePlayerAction` - For assassination-attempt, noble-conspiracy

**Note:** These are referenced but not critical path. Can use manual effects temporarily.

---

### Tier 4: Need Custom Components

**3 incidents | ~3-4 hours total**

🚨 **ResourceLossSelector Component Needed:**
- production-strike (create component)
- trade-embargo (reuse component)
- trade-war (reuse component)

**Blocker:** Must create Svelte component for resource selection

---

### Tier 5: Complex (New Commands + Logic)

**11 incidents | ~15-25 hours (command creation) + 8-12 hours (integration)**

🚨 **High Complexity:**
- secession-crisis (most complex)
- guerrilla-movement (faction system)
- mass-desertion-threat (morale check system)
- prison-breaks (imprisoned unrest mechanics)
- settlement-collapse (multiple commands)
- mass-exodus (partial block)

**Blocker:** Requires 7 new game commands + complex logic

---

## Recommended Action Plan

### Phase 1A: Quick Wins (TODAY - 2 hours)

**Fix 6 simple incidents:**
1. Add proper `preview.calculate()` to all 6 simple incidents
2. Test each one in Foundry
3. Verify modifiers apply correctly

**Deliverable:** 6 incidents fully working (20% complete)

---

### Phase 1B: Game Command Integration (TODAY - 2 hours)

**Fix 8 incidents with existing commands:**
1. Add game command execution to execute functions
2. Test border-raid, disease-outbreak, riot, etc.
3. Verify commands execute properly

**Deliverable:** 14 incidents fully working (47% complete)

---

### Phase 2: Create destroyWorksite Command (DAY 2 - 3 hours)

**Implement new game command:**
1. Create `destroyWorksite` in GameCommandsResolver
2. Add to GameCommandHelpers routing
3. Test with bandit-activity and emigration-threat

**Deliverable:** 16 incidents fully working (53% complete)

---

### Phase 3: Custom Component (DAY 2-3 - 4 hours)

**Create ResourceLossSelector.svelte:**
1. Design component (dice roll + choice)
2. Register in ComponentRegistry
3. Integrate with production-strike, trade-embargo, trade-war

**Deliverable:** 19 incidents fully working (63% complete)

---

### Phase 4: Remaining Commands (WEEK 2 - 12-16 hours)

**Implement 7 remaining commands:**
1. `consumePlayerAction` (2 incidents)
2. `downgradeSettlement` (3 incidents)
3. `releaseImprisonedUnrest` (1 incident)
4. `performMoraleCheck` (1 incident)
5. `modifyFactionAttitude` (1 incident)
6. `transferHexesToFaction` (1 incident)
7. `spawnFactionArmy` (1 incident)
8. `transferSettlementToFaction` (1 incident)

**Deliverable:** All 30 incidents working (100% complete)

---

## Testing Checklist

### Per-Incident Testing

For each incident, test all 4 outcomes:

```javascript
// Browser console
const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
const handler = new UnifiedCheckHandler();

// Test all outcomes
await handler.executeCheck('crime-wave', 'incident', { outcome: 'criticalSuccess' });
await handler.executeCheck('crime-wave', 'incident', { outcome: 'success' });
await handler.executeCheck('crime-wave', 'incident', { outcome: 'failure' });
await handler.executeCheck('crime-wave', 'incident', { outcome: 'criticalFailure' });
```

**Verify:**
- ✅ No console errors
- ✅ OutcomeDisplay renders correctly
- ✅ Modifiers apply (check resources)
- ✅ Game commands execute (check kingdom state)
- ✅ Chat messages appear

---

## Blockers Summary

### Immediate Blockers (Prevents Testing)

**Missing Preview Implementation:**
- **Impact:** All 30 incidents will crash
- **Fix Time:** 15-30 min per incident
- **Total:** 8-15 hours
- **Priority:** CRITICAL

**Missing Game Command Execution:**
- **Impact:** 12 incidents won't work properly
- **Fix Time:** 10-15 min per incident
- **Total:** 2-3 hours
- **Priority:** HIGH

### Development Blockers (Prevents Full Implementation)

**Missing Game Commands:**
- **Impact:** 14 incidents can't be completed
- **Fix Time:** 19-28 hours (command creation)
- **Priority:** MEDIUM (can use manual effects temporarily)

**Missing Custom Component:**
- **Impact:** 3 incidents need workaround
- **Fix Time:** 3-4 hours (component creation)
- **Priority:** MEDIUM

---

## Recommendations

### 🎯 Start Here (Phase 1A - TODAY)

**Fix the 6 simple incidents first:**
1. They have no blockers
2. Quickest to complete (15 min each)
3. Validates the pattern works
4. Builds momentum

**Files to edit:**
- `src/pipelines/incidents/minor/crime-wave.ts`
- `src/pipelines/incidents/minor/corruption-scandal.ts`
- `src/pipelines/incidents/minor/protests.ts`
- `src/pipelines/incidents/minor/rising-tensions.ts`
- `src/pipelines/incidents/minor/work-stoppage.ts`
- `src/pipelines/incidents/major/international-crisis.ts`

### ⚡ Quick Win Template

Use this pattern for all simple incidents:

```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    const outcomeBadges = [];
    
    // Map outcome to resource changes
    if (ctx.outcome === 'failure') {
      resources.push({ resource: 'unrest', value: 1 });
    } else if (ctx.outcome === 'criticalFailure') {
      resources.push({ resource: 'unrest', value: 2 });
      // Add dice badge if needed
      outcomeBadges.push({
        icon: 'fa-coins',
        prefix: 'Lose',
        value: { type: 'dice', formula: '1d4' },
        suffix: 'Gold',
        variant: 'negative'
      });
    }
    
    return {
      resources,
      outcomeBadges,
      warnings: []
    };
  }
},
```

### 🚫 What NOT to Do Yet

**Don't start with:**
- Secession Crisis (most complex)
- Guerrilla Movement (needs 2 new commands)
- Mass Desertion Threat (needs morale system)
- Production Strike (needs custom component)

**Save these for last** after pattern is proven.

---

## Estimated Timeline

### Conservative Estimate

**Phase 1:** Fix previews + existing commands (TODAY) = 4 hours  
**Phase 2:** Create destroyWorksite (DAY 2) = 3 hours  
**Phase 3:** Create custom component (DAY 2-3) = 4 hours  
**Phase 4:** Create remaining commands (WEEK 2) = 16 hours  
**Phase 5:** Testing & polish (WEEK 3) = 8 hours  

**Total:** ~35 hours (5 days at 7 hrs/day)

### Optimistic Estimate

**Phase 1:** 3 hours  
**Phase 2:** 2 hours  
**Phase 3:** 3 hours  
**Phase 4:** 12 hours  
**Phase 5:** 4 hours  

**Total:** ~24 hours (3-4 days)

---

## Next Steps

**Immediate Actions:**

1. ✅ Review this document
2. 🔨 Fix crime-wave (test pattern)
3. 🔨 Fix remaining 5 simple incidents
4. 🔨 Add game command execution to 8 incidents
5. 📝 Create blockers tracking document
6. 🧪 Set up automated testing

**Decision Needed:**

Should I proceed with Phase 1A (fixing 6 simple incidents) or do you want to review the approach first?

---

**Status:** 📋 Ready for Implementation  
**Blockers Identified:** 23 out of 30 incidents  
**Quick Wins Available:** 6 incidents (no blockers)  
**Estimated Total Effort:** 24-35 hours

