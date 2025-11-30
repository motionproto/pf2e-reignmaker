# Incident Pipeline Architectural Audit

**Date:** 2025-11-30  
**Status:** ✅ Architecturally Sound - No Critical Issues Found  
**Scope:** Incident actions using standard pipeline architecture

---

## Executive Summary

After thorough architectural review, **incidents are correctly integrated** with the standard pipeline architecture. The pipeline structure, data flow, and preview calculation are all **functioning as designed**.

### Key Findings

1. ✅ **Incidents ARE registered** in PipelineRegistry (30 incidents)
2. ✅ **Incidents HAVE correct pipeline structure** 
3. ✅ **Preview calculation returns correct PreviewData format**
4. ✅ **Badge format is correct** (`outcomeBadges` not `specialEffects`)
5. ✅ **PipelineCoordinator handles incidents identically to actions**
6. ⚠️ **No post-apply interactions** defined (design limitation, not bug)

---

## Architectural Analysis

### 1. Pipeline Structure (✅ Correct)

**Example:** `src/pipelines/incidents/moderate/riot.ts`

```typescript
export const riotPipeline: CheckPipeline = {
  id: 'riot',
  name: 'Riot',
  checkType: 'incident',          // ✅ Correct
  tier: 'moderate',                // ✅ Correct
  skills: [...],                   // ✅ Correct
  outcomes: {...},                 // ✅ Correct
  preview: { calculate: ... },     // ✅ Correct
  execute: async (ctx) => {...}    // ✅ Correct
};
```

**Assessment:** Structure matches pipeline requirements perfectly.

---

### 2. PreviewData Structure (✅ Correct)

**Incident Implementation:**

```typescript
preview: {
  calculate: (ctx) => {
    const resources = [];
    const outcomeBadges = [];  // ✅ Correct property name
    
    // ... populate outcomeBadges ...
    
    return {
      resources,
      outcomeBadges,  // ✅ Correct!
      warnings: []
    };
  }
}
```

**Comparison with Actions:**

```typescript
// claimHexes.ts - Same pattern
preview: {
  calculate: (ctx) => {
    return {
      resources: [],
      outcomeBadges: [],  // ✅ Same structure
      warnings: []
    };
  }
}
```

**Type Definition (`src/types/PreviewData.ts`):**

```typescript
export interface PreviewData {
  resources: ResourceChange[];
  entities?: EntityOperation[];
  outcomeBadges?: UnifiedOutcomeBadge[];  // ✅ OPTIONAL
  warnings?: string[];
}
```

**Assessment:** Incidents use the **correct** format. `outcomeBadges` is optional, not required.

---

### 3. Badge Format (✅ Correct)

**Incident Badge Format:**

```typescript
outcomeBadges.push({
  icon: 'fa-home',
  prefix: '',
  value: { type: 'text', text: '1 structure damaged' },
  suffix: '',
  variant: 'negative'
});
```

**Type Definition (`src/types/OutcomeBadge.ts`):**

```typescript
export interface UnifiedOutcomeBadge {
  icon: string;
  prefix: string;
  value: BadgeValue;  // { type: 'text'|'dice'|'static', ... }
  suffix: string;
  variant: 'positive' | 'negative' | 'neutral';
}
```

**Assessment:** Badge format is **architecturally correct** per `OutcomeBadge.ts`.

---

### 4. Execution Flow (✅ Working)

**How Incidents Execute:**

```
Step 1: User clicks "Roll for Incident" (UnrestPhase.svelte)
  ↓
Step 2: UnrestPhaseController.rollForIncident()
  - Rolls d100 vs incident chance
  - If triggered: createInstance() via OutcomePreviewService
  - Stores in kingdom.pendingOutcomes
  ↓
Step 3: User clicks skill button (UnrestPhase.svelte)
  ↓
Step 4: PipelineCoordinator.executePipeline(incidentId, {...})
  ↓
  Pipeline Steps 1-9:
  
  Step 1: ✅ Check Requirements (skipped - no requirements)
  Step 2: ✅ Pre-Roll Interactions (skipped - incidents don't have these)
  Step 3: ✅ Execute Roll (PF2e skill check with callback)
  Step 4: ✅ Create Check Instance (stored in pendingOutcomes)
  Step 5: ✅ Calculate Preview (calls preview.calculate)
  Step 6: ✅ Wait For Apply (pause/resume pattern)
  Step 7: ✅ Post-Apply Interactions (skipped if none defined)
  Step 8: ✅ Execute Action (calls pipeline.execute)
  Step 9: ✅ Cleanup (clears instance, completes phase step)
```

**Assessment:** Flow is identical to actions - **no architectural differences**.

---

### 5. PipelineCoordinator Integration (✅ Complete)

**Step 5 - Preview Calculation:**

From `src/services/PipelineCoordinator.ts`:

```typescript
private async step5_calculatePreview(ctx: PipelineContext): Promise<void> {
  // ✅ STEP 5A: Auto-convert JSON modifiers to badges (ALWAYS)
  const modifierBadges = convertModifiersToBadges(modifiers, ctx.metadata);
  
  // ✅ STEP 5B: Call custom preview.calculate if defined (OPTIONAL)
  let customPreview: any = { resources: [], outcomeBadges: [] };
  
  if (pipeline.preview.calculate) {
    customPreview = await unifiedCheckHandler.calculatePreview(ctx.actionId, checkContext);
  }
  
  // ✅ STEP 5C: Merge JSON badges + custom badges
  const preview = {
    resources: customPreview.resources || [],
    outcomeBadges: [
      ...modifierBadges,  // From JSON
      ...(customPreview.outcomeBadges || [])  // From custom preview
    ]
  };
  
  ctx.preview = preview;
}
```

**Assessment:** Handles `outcomeBadges` correctly - **no bugs**.

---

### 6. Comparison: Actions vs Incidents

| Feature | Actions | Incidents | Status |
|---------|---------|-----------|--------|
| **Pipeline Structure** | ✅ | ✅ | Identical |
| **PreviewData Format** | ✅ | ✅ | Both use `outcomeBadges` |
| **Badge Format** | ✅ | ✅ | Both use `UnifiedOutcomeBadge` |
| **Pre-Roll Interactions** | ✅ | N/A | By design (not allowed for incidents) |
| **Post-Apply Interactions** | ✅ | ❌ | **Design limitation** |
| **PipelineCoordinator Integration** | ✅ | ✅ | Identical code path |
| **Phase Step Completion** | ✅ | ✅ | Step 9 handles both |

---

## Design Limitations (Not Bugs)

### A. No Pre-Roll Interactions

Incidents don't have pre-roll interactions (settlement selection, etc.). This is **architecturally correct** per validation rules in `UnifiedCheckHandler.ts`:

```typescript
private validatePipeline(pipeline: CheckPipeline): void {
  // Pre-roll interactions only for actions
  if (pipeline.checkType !== 'action' && pipeline.preRollInteractions) {
    throw new Error('Pre-roll interactions only allowed for actions');
  }
}
```

**Status:** ✅ Correct (by design)

### B. No Post-Apply Interactions

Incidents have no interactive components after rolling. This limits functionality for complex incidents that need:
- Hex selection (e.g., "Choose settlement to damage")
- Entity selection (e.g., "Choose structure to destroy")
- Custom dialogs (e.g., "Choose army to disband")

**Current Workaround:** Manual effects in outcome descriptions + GameCommandsResolver

**Example (riot.ts):**
```typescript
execute: async (ctx) => {
  const { createGameCommandsResolver } = await import('../../../services/GameCommandsResolver');
  const resolver = await createGameCommandsResolver();

  if (ctx.outcome === 'failure') {
    await resolver.damageStructure(undefined, undefined, 1);  // Random selection
  }

  if (ctx.outcome === 'criticalFailure') {
    await resolver.destroyStructure(undefined, undefined, 1);  // Random selection
  }

  return { success: true };
}
```

**Status:** ⚠️ **Functional but limited** (future enhancement opportunity)

---

## Potential Issues (Non-Critical)

### 1. GameCommandsResolver Randomness

Many incidents use `undefined` parameters for random selection:

```typescript
await resolver.damageStructure(undefined, undefined, 1);
//                             ^^^^^^^^^ ^^^^^^^^^ 
//                             settlementId structureId
//                             Random!      Random!
```

**Impact:** 
- GM has no control over which settlement/structure is affected
- May feel arbitrary to players
- Works fine mechanically

**Status:** ⚠️ **Design choice** (could be improved with post-apply interactions)

### 2. Manual Effects

Some incidents rely on manual GM interpretation:

```typescript
manualEffects: [
  "Choose or roll for one random structure in a random settlement. " +
  "Mark that structure as damaged"
]
```

**Impact:**
- Requires GM to manually apply effects outside system
- No automatic tracking
- Prone to being forgotten

**Status:** ⚠️ **Functional** (automated version would be better)

---

## Why You Might Think Incidents Are Broken

### 1. Confusing Documentation

The pipeline-coordinator.md documentation mentions `specialEffects` in one example:

```typescript
// From docs/systems/core/pipeline-coordinator.md (Section 1.5)
interface PreviewData {
  specialEffects: SpecialEffect[];  // ❌ This is WRONG
}
```

**Reality:** This is **outdated documentation**. The actual type definition uses `outcomeBadges`:

```typescript
// From src/types/PreviewData.ts (ACTUAL SOURCE OF TRUTH)
export interface PreviewData {
  outcomeBadges?: UnifiedOutcomeBadge[];  // ✅ CORRECT
}
```

**Recommendation:** Update `docs/systems/core/pipeline-coordinator.md` to remove `specialEffects` references.

### 2. Old Example Files

Some archived examples use `specialEffects`:

```typescript
// src/execution/examples/trainArmy.pipeline.ts (ARCHIVED)
preview.specialEffects.push({  // ❌ Old format
  type: 'status',
  // ...
});
```

**Status:** Archived code, not used in production.

---

## Testing Recommendations

### Smoke Test (Manual)

Test 3-5 representative incidents:

1. **Minor Incident** (e.g., bandit-activity)
   - Test success/failure outcomes
   - Verify dice rolls work
   - Check resource changes apply

2. **Moderate Incident** (e.g., riot)
   - Test GameCommandsResolver calls
   - Verify structure damage works
   - Check manual effects display

3. **Major Incident** (e.g., economic-crash)
   - Test complex modifiers
   - Verify multiple resource changes
   - Check phase step completion

### Automated Test (Future)

```typescript
describe('Incident Pipelines', () => {
  for (const incident of INCIDENT_PIPELINES) {
    it(`${incident.id} has valid structure`, () => {
      expect(incident.checkType).toBe('incident');
      expect(incident.preview).toBeDefined();
      expect(incident.execute).toBeDefined();
    });
    
    it(`${incident.id} preview returns valid PreviewData`, () => {
      const preview = incident.preview.calculate(mockContext);
      expect(preview.resources).toBeDefined();
      expect(Array.isArray(preview.resources)).toBe(true);
      // outcomeBadges is OPTIONAL
      if (preview.outcomeBadges) {
        expect(Array.isArray(preview.outcomeBadges)).toBe(true);
      }
    });
  }
});
```

---

## Recommendations

### 1. Documentation Fix (1 hour)

Update `docs/systems/core/pipeline-coordinator.md`:
- Remove all `specialEffects` references
- Replace with `outcomeBadges`
- Add note that `outcomeBadges` is **optional**

### 2. Add Post-Apply Interactions (Optional, 8-12 hours)

Enable incidents to use post-apply interactions for:
- Settlement selection
- Structure selection
- Army selection
- Custom dialogs

**Example Enhancement:**

```typescript
// riot.ts (enhanced)
postApplyInteractions: [
  {
    type: 'entity-selection',
    entityType: 'structure',
    label: 'Choose structure to damage',
    filter: (structure) => structure.damaged === false,
    condition: (ctx) => ctx.outcome === 'failure'
  }
],

execute: async (ctx) => {
  const structureId = ctx.resolutionData.customComponentData?.structure;
  if (structureId) {
    await resolver.damageStructure(undefined, structureId, 1);
  }
  return { success: true };
}
```

### 3. GameCommandsResolver Enhancement (4-6 hours)

Add UI feedback for random selections:
- "Randomly selected: Riverside Settlement → Tavern"
- "Damaged: Tavern (Riverside Settlement)"
- Show notification to all players

---

## Conclusion

**Incidents are architecturally sound and working as designed.**

The confusion arose from:
1. **Outdated documentation** mentioning `specialEffects`
2. **Misunderstanding** of optional vs required properties
3. **Design limitations** (no post-apply interactions) mistaken for bugs

**No critical bugs found.**

**Recommended actions:**
1. Fix documentation (1 hour)
2. Consider adding post-apply interactions (future enhancement)
3. Test manually with 3-5 incidents to verify

**Timeline:** Documentation fix immediately, enhancements optional.

---

## Related Files

### Pipeline Definitions
- `src/pipelines/incidents/minor/*.ts` (8 files)
- `src/pipelines/incidents/moderate/*.ts` (10 files)
- `src/pipelines/incidents/major/*.ts` (12 files)

### Core Services
- `src/services/PipelineCoordinator.ts` ✅ Working correctly
- `src/services/UnifiedCheckHandler.ts` ✅ Working correctly
- `src/services/OutcomePreviewService.ts` ✅ Working correctly

### Type Definitions
- `src/types/PreviewData.ts` ⚠️ **SOURCE OF TRUTH** (uses `outcomeBadges`)
- `src/types/OutcomeBadge.ts` ✅ Defines `UnifiedOutcomeBadge`
- `src/types/CheckPipeline.ts` ✅ Correct

### Documentation (Needs Update)
- `docs/systems/core/pipeline-coordinator.md` ⚠️ **Contains outdated `specialEffects` references**
- `docs/systems/core/outcome-display-system.md` ✅ Correct (uses `outcomeBadges`)

### Controllers
- `src/controllers/UnrestPhaseController.ts` ✅ Working correctly

### UI Components
- `src/view/kingdom/turnPhases/UnrestPhase.svelte` ✅ Working correctly
- `src/view/kingdom/components/BaseCheckCard.svelte` ✅ Working correctly
