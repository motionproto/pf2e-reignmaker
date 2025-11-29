# Incident Migration Implementation Task - Handoff Document

**For:** Claude (Code Implementation Agent)  
**From:** Mark (via AI Assistant)  
**Date:** 2025-11-29  
**Task:** Implement pipeline enhancements for 30 incident files

---

## 🎯 Task Overview

**Goal:** Fix 30 incident pipeline files by adding proper `preview.calculate()` functions and game command execution.

**Current State:**
- ✅ All 30 incidents have skeleton pipeline files (created, registered)
- ❌ All have empty `preview: {}` objects (will crash)
- ❌ Game commands defined in JSON but not executed in TypeScript
- ❌ No proper OutcomeDisplay integration

**Target State:**
- ✅ All incidents have proper `preview.calculate()` returning `{ resources, outcomeBadges, warnings }`
- ✅ Game commands from JSON are executed in `execute()` function
- ✅ Custom components integrated where needed
- ✅ All incidents tested and working

---

## 📚 Essential Documentation

**Read these first (in order):**

1. **[INCIDENT_MIGRATION_REVISED_BLOCKERS.md](docs/guides/INCIDENT_MIGRATION_REVISED_BLOCKERS.md)** - Current state analysis (MOST IMPORTANT)
2. **[INCIDENT_QUICK_REFERENCE.md](docs/guides/INCIDENT_QUICK_REFERENCE.md)** - Code templates and patterns
3. **[INCIDENT_MIGRATION_GUIDE.md](docs/guides/INCIDENT_MIGRATION_GUIDE.md)** - Complete implementation guide

**Reference as needed:**
- Action implementations in `src/pipelines/actions/` (27 working examples)
- Game Commands: `src/services/GameCommandsResolver.ts`
- Components: `src/view/kingdom/components/OutcomeDisplay/components/`

---

## 🚀 Implementation Priority

### Phase 1: Quick Wins (23 incidents - START HERE)

**These have NO blockers - fix immediately using existing patterns.**

**Group A: Simple Modifiers (6 incidents - 90 min)**

1. `crime-wave` - Simple unrest modifiers
2. `corruption-scandal` - Simple unrest modifiers
3. `protests` - Simple unrest modifiers
4. `rising-tensions` - Simple unrest modifiers
5. `work-stoppage` - Simple unrest modifiers
6. `international-crisis` - Simple unrest modifiers

**Pattern:** Copy from `deal-with-unrest` action

---

**Group B: Existing Game Commands (8 incidents - 2 hours)**

7. `disease-outbreak` - Use `damageStructure()`
8. `infrastructure-damage` - Use `damageStructure()` with dice
9. `riot` - Use `damageStructure()` OR `destroyStructure()`
10. `settlement-crisis` - Use `damageStructure()`
11. `border-raid` - Use `removeBorderHexes()`
12. `economic-crash` - Use `destroyStructure()` with category filter
13. `religious-schism` - Use `destroyStructure()` with category filter
14. `tax-revolt` - Simple modifiers

**Pattern:** Import GameCommandsResolver and call methods

---

**Group C: Resource Selection (3 incidents - 90 min)**

15. `production-strike` - Use `ResourceChoiceSelector` component
16. `trade-embargo` - Use `ResourceChoiceSelector` component
17. `trade-war` - Use `ResourceChoiceSelector` component

**Pattern:** Copy from `harvest-resources` action (exact same pattern)

---

**Group D: Special Cases (6 incidents - 2 hours)**

18. `prison-breaks` - Use `releaseImprisoned()` + `destroyStructure()`
19. `diplomatic-crisis` - Use `adjustFactionAttitude()` in loop
20. `international-scandal` - Use `adjustFactionAttitude()` in loop
21. `assassination-attempt` - Manual effect for now
22. `noble-conspiracy` - Manual effect for now
23. `diplomatic-incident` - Simple modifiers

---

### Phase 2: Minor Blocker (3 incidents - SKIP FOR NOW)

24. `bandit-activity` - Needs `destroyWorksite` command (not implemented)
25. `emigration-threat` - Needs `destroyWorksite` command (not implemented)
26. `mass-exodus` - Needs `destroyWorksite` command (not implemented)

**Use manual effects temporarily** - these can be fixed later

---

### Phase 3: Complex (4 incidents - SKIP FOR NOW)

27. `guerrilla-movement` - Needs multiple new commands
28. `secession-crisis` - Needs new commands
29. `mass-desertion-threat` - Needs morale check system
30. `settlement-collapse` - Needs downgrade command

**Use manual effects temporarily** - save for later

---

## 📝 Code Patterns & Examples

### Pattern 1: Simple Modifier Preview

**Use for:** crime-wave, corruption-scandal, protests, rising-tensions, work-stoppage, international-crisis, tax-revolt, diplomatic-incident

**Template:**
```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    const outcomeBadges = [];
    
    // Map outcomes to resource changes
    if (ctx.outcome === 'failure') {
      resources.push({ resource: 'unrest', value: 1 });
    } else if (ctx.outcome === 'criticalFailure') {
      resources.push({ resource: 'unrest', value: 2 });
    }
    
    return {
      resources,
      outcomeBadges,
      warnings: []
    };
  }
},
```

**Example:** See `src/pipelines/actions/dealWithUnrest.ts`

---

### Pattern 2: Game Command Execution

**Use for:** disease-outbreak, infrastructure-damage, riot, settlement-crisis, border-raid, economic-crash, religious-schism

**Template:**
```typescript
execute: async (ctx) => {
  // Apply modifiers first
  await applyPipelineModifiers(pipelineName, ctx.outcome);
  
  // Then execute game commands
  if (ctx.outcome === 'criticalFailure') {
    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Example: Damage structure
    await resolver.damageStructure(undefined, undefined, 1);
    
    // Example: Destroy structure
    await resolver.destroyStructure('commerce', 'highest', 1);
    
    // Example: Remove hexes
    await resolver.removeBorderHexes('dice', '1d3');
  }
  
  return { success: true };
}
```

**Reference:** `src/services/GameCommandsResolver.ts` (lines 510-528)

---

### Pattern 3: Dice Badges in Preview

**Use for:** Any incident with dice modifiers in JSON

**Template:**
```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    const outcomeBadges = [];
    
    if (ctx.outcome === 'criticalFailure') {
      // Dice modifier example
      outcomeBadges.push({
        icon: 'fa-coins',
        prefix: 'Lose',
        value: { type: 'dice', formula: '2d4' },
        suffix: 'Gold',
        variant: 'negative'
      });
      
      // Static modifier example
      resources.push({ resource: 'unrest', value: 1 });
    }
    
    return {
      resources,
      outcomeBadges,
      warnings: []
    };
  }
}
```

**Example:** See `src/pipelines/actions/infiltration.ts` (lines 42-81)

---

### Pattern 4: Resource Selection Component

**Use for:** production-strike, trade-embargo, trade-war

**Template:**
```typescript
postRollInteractions: [
  {
    type: 'configuration',
    id: 'resourceSelection',
    component: 'ResourceChoiceSelector',  // Component already exists!
    condition: (ctx) => ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
  }
],

preview: {
  calculate: (ctx) => ({
    resources: [],
    outcomeBadges: [],
    warnings: ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
      ? ['Choose which resource to lose']
      : []
  })
},

execute: async (ctx) => {
  // Apply other modifiers first
  await applyPipelineModifiers(pipelineName, ctx.outcome);
  
  // Get user selection from component
  const customData = ctx.resolutionData?.customComponentData;
  if (!customData?.selectedResource) {
    return { success: true };  // User cancelled
  }
  
  // Apply resource loss
  const { applyResourceChanges } = await import('../shared/InlineActionHelpers');
  await applyResourceChanges([
    { resource: customData.selectedResource, amount: -customData.amount }
  ], 'incident-id');
  
  return { success: true };
}
```

**Example:** See `src/pipelines/actions/harvestResources.ts` (lines 14-75)

---

### Pattern 5: Multiple Game Commands

**Use for:** prison-breaks, mass-exodus

**Template:**
```typescript
execute: async (ctx) => {
  await applyPipelineModifiers(pipelineName, ctx.outcome);
  
  if (ctx.outcome === 'criticalFailure') {
    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Execute multiple commands in sequence
    await resolver.destroyStructure('justice', 'highest', 1);
    await resolver.releaseImprisoned('all');
  }
  
  return { success: true };
}
```

---

## 🔧 Specific Implementation Examples

### Example 1: crime-wave.ts (SIMPLEST - START HERE)

**File:** `src/pipelines/incidents/minor/crime-wave.ts`

**Current code:**
```typescript
preview: {
  // Empty - WILL CRASH!
},
```

**Fix to:**
```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    const outcomeBadges = [];
    
    // Failure: 1d4 gold loss
    if (ctx.outcome === 'failure') {
      outcomeBadges.push({
        icon: 'fa-coins',
        prefix: 'Lose',
        value: { type: 'dice', formula: '1d4' },
        suffix: 'Gold',
        variant: 'negative'
      });
    }
    
    // Critical Failure: 2d4 gold loss + 1 unrest
    if (ctx.outcome === 'criticalFailure') {
      outcomeBadges.push({
        icon: 'fa-coins',
        prefix: 'Lose',
        value: { type: 'dice', formula: '2d4' },
        suffix: 'Gold',
        variant: 'negative'
      });
      resources.push({ resource: 'unrest', value: 1 });
    }
    
    return {
      resources,
      outcomeBadges,
      warnings: []
    };
  }
},
```

**No execute changes needed** - modifiers already handled

---

### Example 2: disease-outbreak.ts (GAME COMMAND)

**File:** `src/pipelines/incidents/moderate/disease-outbreak.ts`

**Current execute:**
```typescript
execute: async (ctx) => {
  // Apply modifiers from outcome
  await applyPipelineModifiers(diseaseOutbreakPipeline, ctx.outcome);
  return { success: true };
}
```

**Fix to:**
```typescript
execute: async (ctx) => {
  // Apply modifiers first
  await applyPipelineModifiers(diseaseOutbreakPipeline, ctx.outcome);
  
  // Critical failure: damage Medicine or Faith structure
  if (ctx.outcome === 'criticalFailure') {
    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    
    // Damage one random structure
    // Note: Category filtering not fully implemented, but service will pick random
    await resolver.damageStructure(undefined, undefined, 1);
  }
  
  return { success: true };
}
```

**And add preview:**
```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    const outcomeBadges = [];
    
    if (ctx.outcome === 'failure') {
      outcomeBadges.push({
        icon: 'fa-apple-alt',
        prefix: 'Lose',
        value: { type: 'dice', formula: '1d4' },
        suffix: 'Food',
        variant: 'negative'
      });
      resources.push({ resource: 'unrest', value: 1 });
    }
    
    if (ctx.outcome === 'criticalFailure') {
      outcomeBadges.push({
        icon: 'fa-apple-alt',
        prefix: 'Lose',
        value: { type: 'dice', formula: '2d4' },
        suffix: 'Food',
        variant: 'negative'
      });
      resources.push({ resource: 'unrest', value: 1 });
    }
    
    return {
      resources,
      outcomeBadges,
      warnings: ctx.outcome === 'criticalFailure' 
        ? ['One Medicine or Faith structure will be damaged']
        : []
    };
  }
},
```

---

### Example 3: production-strike.ts (COMPONENT)

**File:** `src/pipelines/incidents/moderate/production-strike.ts`

**Current code:**
```typescript
outcomes: {
  failure: {
    description: 'The strike causes resource losses.',
    modifiers: [
      { type: 'choice', resources: ["lumber", "ore", "stone"], value: '1d4-1', negative: true }
    ]
  }
},

preview: {
  // Empty
},

execute: async (ctx) => {
  await applyPipelineModifiers(productionStrikePipeline, ctx.outcome);
  return { success: true };
}
```

**Fix to:**
```typescript
// Add this BEFORE preview
postRollInteractions: [
  {
    type: 'configuration',
    id: 'resourceLoss',
    component: 'ResourceChoiceSelector',
    condition: (ctx) => ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
  }
],

preview: {
  calculate: (ctx) => {
    return {
      resources: [],
      outcomeBadges: [],
      warnings: ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure'
        ? ['Choose which resource to lose']
        : []
    };
  }
},

execute: async (ctx) => {
  // Get user selection
  const customData = ctx.resolutionData?.customComponentData;
  
  if (!customData?.selectedResource) {
    return { success: true };  // User cancelled
  }
  
  // Apply resource loss
  const { applyResourceChanges } = await import('../shared/InlineActionHelpers');
  await applyResourceChanges([
    { resource: customData.selectedResource, amount: -customData.amount }
  ], 'production-strike');
  
  return { success: true };
}
```

---

## 🧪 Testing Instructions

### Test Each Incident

**In browser console:**
```javascript
// Test script for one incident
const { UnifiedCheckHandler } = await import('./src/controllers/shared/UnifiedCheckHandler');
const handler = new UnifiedCheckHandler();

// Test all 4 outcomes
await handler.executeCheck('crime-wave', 'incident', { outcome: 'criticalSuccess' });
await handler.executeCheck('crime-wave', 'incident', { outcome: 'success' });
await handler.executeCheck('crime-wave', 'incident', { outcome: 'failure' });
await handler.executeCheck('crime-wave', 'incident', { outcome: 'criticalFailure' });
```

**Verify:**
- ✅ No console errors
- ✅ OutcomeDisplay renders correctly
- ✅ Preview shows resources/badges
- ✅ Modifiers apply when "Apply Result" clicked
- ✅ Game commands execute
- ✅ Chat messages appear

---

## 📋 Implementation Checklist

**For each incident:**

- [ ] Read current JSON to understand outcomes
- [ ] Add `preview.calculate()` function
  - [ ] Map outcomes to resources/badges
  - [ ] Include warnings if needed
  - [ ] Return `{ resources, outcomeBadges, warnings }`
- [ ] Update `execute()` function
  - [ ] Keep `applyPipelineModifiers()` call
  - [ ] Add game command execution if needed
  - [ ] Add component handling if needed
- [ ] Add `postRollInteractions` if component needed
- [ ] Test all 4 outcomes in Foundry
- [ ] Check console for errors
- [ ] Verify resources change correctly
- [ ] Move to next incident

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T: Forget outcomeBadges array
```typescript
// WRONG - will crash!
return { resources: [{ resource: 'unrest', value: 1 }] };

// CORRECT
return { 
  resources: [{ resource: 'unrest', value: 1 }],
  outcomeBadges: [],  // REQUIRED!
  warnings: []
};
```

### ❌ DON'T: Apply modifiers twice
```typescript
// WRONG - applies twice!
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);  // ← Applies modifiers
  await updateKingdom(k => k.unrest += 1);  // ← Applies again!
}

// CORRECT - only apply once
execute: async (ctx) => {
  await applyPipelineModifiers(pipeline, ctx.outcome);
  return { success: true };
}
```

### ❌ DON'T: Use wrong component timing
```typescript
// WRONG - shows after Apply clicked
postApplyInteractions: [...]

// CORRECT - shows before Apply clicked
postRollInteractions: [...]
```

---

## 📊 Progress Tracking

**Track your progress here:**

### Phase 1: Quick Wins (23 incidents)

**Group A: Simple (6)**
- [ ] crime-wave
- [ ] corruption-scandal
- [ ] protests
- [ ] rising-tensions
- [ ] work-stoppage
- [ ] international-crisis

**Group B: Game Commands (8)**
- [ ] disease-outbreak
- [ ] infrastructure-damage
- [ ] riot
- [ ] settlement-crisis
- [ ] border-raid
- [ ] economic-crash
- [ ] religious-schism
- [ ] tax-revolt

**Group C: Components (3)**
- [ ] production-strike
- [ ] trade-embargo
- [ ] trade-war

**Group D: Special (6)**
- [ ] prison-breaks
- [ ] diplomatic-crisis
- [ ] international-scandal
- [ ] assassination-attempt
- [ ] noble-conspiracy
- [ ] diplomatic-incident

---

## 🎯 Success Criteria

**Definition of Done:**

1. ✅ All 23 Phase 1 incidents have proper previews
2. ✅ All game commands execute correctly
3. ✅ All components work properly
4. ✅ No console errors
5. ✅ All outcomes tested manually
6. ✅ Resources apply correctly
7. ✅ Chat messages appear

**Quality Checks:**
- No empty `preview: {}` objects
- All use proper TypeScript types
- Follow existing action patterns
- Include helpful console logs
- Handle edge cases (cancelled selections, etc.)

---

## 📁 File Locations

**Incidents to fix:**
```
src/pipelines/incidents/
├── minor/
│   ├── crime-wave.ts           [START HERE]
│   ├── corruption-scandal.ts
│   ├── protests.ts
│   ├── rising-tensions.ts
│   ├── work-stoppage.ts
│   ├── diplomatic-incident.ts
│   ├── bandit-activity.ts      [SKIP - blocked]
│   └── emigration-threat.ts    [SKIP - blocked]
├── moderate/
│   ├── disease-outbreak.ts
│   ├── infrastructure-damage.ts
│   ├── riot.ts
│   ├── settlement-crisis.ts
│   ├── tax-revolt.ts
│   ├── production-strike.ts
│   ├── trade-embargo.ts
│   ├── assassination-attempt.ts
│   └── diplomatic-crisis.ts
└── major/
    ├── border-raid.ts
    ├── economic-crash.ts
    ├── religious-schism.ts
    ├── international-crisis.ts
    ├── international-scandal.ts
    ├── prison-breaks.ts
    ├── trade-war.ts
    ├── noble-conspiracy.ts
    ├── guerrilla-movement.ts    [SKIP - complex]
    ├── secession-crisis.ts      [SKIP - complex]
    ├── mass-desertion-threat.ts [SKIP - complex]
    └── settlement-collapse.ts   [SKIP - complex]
```

**Reference files:**
- `src/pipelines/actions/` - 27 working examples
- `src/services/GameCommandsResolver.ts` - Game command methods
- `src/view/kingdom/components/OutcomeDisplay/components/` - Existing components

---

## 🚀 Getting Started

**Recommended workflow:**

1. **Start with crime-wave** (simplest, validates pattern)
2. **Do all Group A** (simple modifiers, builds momentum)
3. **Do disease-outbreak** (validates game command pattern)
4. **Do all Group B** (game commands, uses same pattern)
5. **Do production-strike** (validates component pattern)
6. **Do all Group C** (components, uses same pattern)
7. **Do remaining Group D** (mix of patterns)

**Time estimate:** 6-8 hours for all 23 incidents

---

## 💡 Tips for Success

1. **Copy liberally** - Actions have solved all these patterns
2. **Test frequently** - Test each incident as you fix it
3. **Use console logs** - Add logs to debug issues
4. **Reference docs** - Quick Reference has all templates
5. **Ask questions** - If stuck, review action examples
6. **Go in order** - Start simple, build to complex
7. **Take breaks** - This is repetitive work

---

## 📞 Questions?

**If you get stuck:**
1. Check the Quick Reference for templates
2. Look at action examples for the same pattern
3. Review the Migration Guide for detailed explanations
4. Check existing incident files for structure

**Common issues:**
- Preview crashes → Missing `outcomeBadges: []`
- Modifiers don't apply → Not calling `applyPipelineModifiers()`
- Game commands don't work → Check import and method call
- Components don't show → Check `postRollInteractions` vs `postApplyInteractions`

---

## 🎉 Good Luck!

**You have everything you need:**
- ✅ Complete documentation
- ✅ Working examples (27 actions)
- ✅ Code templates
- ✅ Testing instructions
- ✅ Clear success criteria

**This is straightforward implementation work** - just copy patterns from actions and apply to incidents.

**Estimated completion:** 6-8 hours for 23 incidents (77% of total)

---

**Last Updated:** 2025-11-29  
**Status:** Ready for Implementation  
**Owner:** Claude (Code Implementation Agent)

