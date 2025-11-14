# AI Execution Readiness Assessment

**Purpose:** Evaluate if UNIFIED_CHECK_ARCHITECTURE.md and MIGRATION_GUIDE.md are suitable for AI-driven migration execution

**Assessment Date:** 2025-11-14

---

## Executive Summary

**Overall Assessment: NOT YET READY for autonomous AI execution**

**Readiness Score: 4/10**

The documents provide excellent **conceptual architecture** and **high-level migration strategy**, but lack the **concrete implementation details** and **decision criteria** needed for an AI agent to autonomously execute a 12-week migration.

---

## Document Analysis

### UNIFIED_CHECK_ARCHITECTURE.md

**Strengths:**
- ✅ Clear conceptual model (9-step pipeline)
- ✅ Well-defined data structures (CheckPipeline, CheckContext, PreviewData)
- ✅ Excellent "before/after" examples
- ✅ Comprehensive interaction system taxonomy
- ✅ Clear benefits and success metrics

**Gaps for AI Execution:**
- ❌ No concrete file locations for existing code
- ❌ Missing current implementation patterns to identify
- ❌ No code search patterns to find affected files
- ❌ Lacks specific integration points with existing systems
- ❌ No error handling or edge case guidance
- ❌ Missing validation criteria for each step

**What's Missing:**
1. **File Inventory:** List of all files to be created/modified/deleted
2. **Search Patterns:** Regex patterns to find code that needs changes
3. **Integration Details:** How UnifiedCheckHandler integrates with existing ActionExecutionHelpers, CheckInstanceService, etc.
4. **Type Definitions:** Complete TypeScript interfaces (currently only partial)
5. **Error Scenarios:** What to do when things go wrong

---

### MIGRATION_GUIDE.md

**Strengths:**
- ✅ Clear phase structure (6 phases over 12 weeks)
- ✅ Good dependency reasoning (why game commands first)
- ✅ Concrete "before/after" code examples
- ✅ Testing checklists for each phase
- ✅ Rollback plans

**Gaps for AI Execution:**
- ❌ Phase 1-2: Implementation details too vague
- ❌ Missing file-by-file migration instructions
- ❌ No decision trees for handling edge cases
- ❌ Lacks "how to identify" patterns for each command type
- ❌ No concrete test execution steps
- ❌ Missing intermediate validation checkpoints

**What's Missing:**
1. **Detailed Phase 1 Implementation:**
   - Exact files to create
   - Full method implementations (not just signatures)
   - Integration with existing ActionExecutionHelpers
   
2. **Game Commands Audit:**
   - Complete list of 25+ commands with current locations
   - Classification: prepare/commit vs immediate-execute
   - Extraction patterns for each type
   
3. **Action-by-Action Migration:**
   - 26 actions with specific migration steps
   - Current implementation locations
   - Testing procedures for each
   
4. **Automated Testing:**
   - How to run tests programmatically
   - What outputs indicate success/failure
   - Regression test suite location

---

## Critical Gaps for AI Execution

### Gap 1: No Concrete Starting Point

**Problem:** AI doesn't know where to begin.

**Missing:**
- Location of current ActionPhaseController
- Location of existing game commands (GameCommandsResolver.ts)
- Location of action JSON files
- Location of custom action implementations

**Needed:**
```markdown
### Phase 0.5: Code Inventory (Week 0)

**Audit existing codebase:**
1. List all files in `src/controllers/actions/`
2. Identify all game commands in `src/services/GameCommandsResolver.ts`
3. Map action JSONs in `data/player-actions/` to implementations in `src/actions/*/`
4. Document global variable usage patterns (search for `globalThis.__pending`)
5. Identify all CheckInstance usage locations
```

### Gap 2: Vague Phase 1 Implementation

**Problem:** "Create UnifiedCheckHandler" is too high-level.

**Current:** "Create `src/services/UnifiedCheckHandler.ts` - Main handler class"

**Needed:**
```typescript
// COMPLETE implementation template with TODO markers

/**
 * UnifiedCheckHandler.ts
 * Location: src/services/UnifiedCheckHandler.ts
 * 
 * Dependencies:
 * - CheckInstanceService (src/services/CheckInstanceService.ts)
 * - ActionExecutionHelpers (src/controllers/actions/ActionExecutionHelpers.ts)
 * - GameCommandsService (src/services/GameCommandsService.ts)
 */

import { CheckPipeline } from '../types/CheckPipeline';
import { CheckContext } from '../types/CheckContext';
import { PreviewData } from '../types/PreviewData';
import { CheckInstanceService } from './CheckInstanceService';
import { ActionExecutionHelpers } from '../controllers/actions/ActionExecutionHelpers';

export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  private checkInstanceService: CheckInstanceService;
  private executionHelpers: ActionExecutionHelpers;
  
  constructor() {
    // TODO: Initialize services
    this.checkInstanceService = new CheckInstanceService();
    this.executionHelpers = new ActionExecutionHelpers();
  }
  
  registerCheck(id: string, pipeline: CheckPipeline): void {
    if (this.pipelines.has(id)) {
      console.warn(`[UnifiedCheckHandler] Overwriting existing pipeline: ${id}`);
    }
    this.pipelines.set(id, pipeline);
  }
  
  getCheck(id: string): CheckPipeline | undefined {
    return this.pipelines.get(id);
  }
  
  async executeSkillCheck(
    checkId: string,
    skill: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    // TODO: Get pipeline
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }
    
    // TODO: Delegate to ActionExecutionHelpers for now (Phase 1 only)
    // This creates the roll, stores check instance, returns instanceId
    const instanceId = await this.executionHelpers.executeRoll(/* ... */);
    return instanceId;
  }
  
  // TODO: Add remaining methods in Week 2
  async calculatePreview(instanceId: string, resolutionData: ResolutionData): Promise<PreviewData> {
    // IMPLEMENTATION NEEDED
  }
  
  formatPreview(preview: PreviewData): SpecialEffect[] {
    // IMPLEMENTATION NEEDED
  }
  
  async executeCheck(instanceId: string, preview: PreviewData): Promise<void> {
    // IMPLEMENTATION NEEDED
  }
}

// TODO: Export singleton instance
export const unifiedCheckHandler = new UnifiedCheckHandler();
```

### Gap 3: No Game Commands Identification Guide

**Problem:** AI can't identify which commands need refactoring.

**Current:** "Commands to refactor (25+): claimHexes, buildRoads, ..."

**Needed:**
```markdown
### Game Commands Audit Procedure

**Step 1: Locate all game commands**
```bash
# Search for command definitions
grep -r "async.*Command" src/services/GameCommandsResolver.ts
```

**Step 2: Classify each command**

| Command | Type | Location | Global Vars? | Preview Logic? |
|---------|------|----------|--------------|----------------|
| recruitArmy | prepare/commit | Line 65-121 | No | Yes (in prepare) |
| claimHexes | immediate | Line 200-230 | Yes (__pendingHexes) | No |
| giveActorGold | prepare/commit | Line 169-252 | Yes (__pendingSettlement) | Yes (in prepare) |
| ... | ... | ... | ... | ... |

**Step 3: For each PREPARE/COMMIT command:**
1. Locate the `async [name]()` method
2. Identify the `prepare()` closure (contains preview logic)
3. Identify the `commit()` closure (contains execution logic)
4. Extract execution logic to new file: `src/execution/[name]Execution.ts`
5. Move preview logic to pipeline config (in action migration)

**Step 4: For each IMMEDIATE-EXECUTE command:**
1. Locate the `async [name]()` method
2. Refactor to accept structured parameters (not context objects)
3. Extract to new file: `src/execution/[name]Execution.ts`
4. Create preview logic in pipeline configs (during action migration)
```

### Gap 4: No Action-by-Action Migration Guide

**Problem:** "Convert 26 actions" is too broad.

**Current:** "Week 5: Simple Actions (No Custom Logic) - Convert (9 actions): deal-with-unrest, ..."

**Needed:**
```markdown
### Week 5: Detailed Action Migration

**For EACH of the 9 actions, follow this procedure:**

#### Action 1: deal-with-unrest

**Current Location:** `data/player-actions/deal-with-unrest.json`

**Current Implementation:** JSON-only (no custom code)

**Migration Steps:**
1. Read current JSON structure
2. Create pipeline config at `src/pipelines/actions/dealWithUnrest.ts`
3. Map JSON fields to pipeline structure:
   - `effects.success.modifiers` → `outcomes.success.modifiers`
   - Add `preview.calculate()` function
   - Add `preview.format()` function
4. Register in `src/pipelines/index.ts`
5. Test: Execute action, verify preview shows, verify state changes match old version

**Pipeline Config:**
```typescript
// src/pipelines/actions/dealWithUnrest.ts
export const dealWithUnrestPipeline: CheckPipeline = {
  id: 'deal-with-unrest',
  checkType: 'action',
  skills: [{ skill: 'diplomacy', description: 'diplomatic engagement' }],
  outcomes: {
    success: {
      description: 'The People Listen',
      modifiers: [{ type: 'static', resource: 'unrest', value: -2, duration: 'immediate' }]
    }
  },
  preview: {
    calculate: (ctx) => ({
      resources: [{ resource: 'unrest', value: -2 }],
      specialEffects: []
    }),
    format: (prev) => [{
      type: 'resource',
      message: 'Will reduce unrest by 2',
      icon: 'fa-heart',
      variant: 'positive'
    }]
  }
};
```

**Testing:**
```bash
# Manual test procedure
1. Launch Foundry VTT
2. Open kingdom sheet
3. Go to Actions phase
4. Click "Deal with Unrest" action
5. Verify preview shows "Will reduce unrest by 2"
6. Click "Apply Result"
7. Verify unrest decreased by 2
8. Compare with old implementation behavior
```

**Success Criteria:**
- [ ] Pipeline config created
- [ ] Registered in pipeline index
- [ ] Preview displays correctly
- [ ] State changes match old version
- [ ] No console errors
- [ ] Action can be executed multiple times

**Repeat for remaining 8 actions in Week 5:**
- [ ] Action 2: sell-surplus (similar pattern)
- [ ] Action 3: purchase-resources (has configuration)
- [ ] Action 4: harvest-resources (has choice-buttons)
- [ ] Action 5: build-roads (has hex selection)
- [ ] Action 6: claim-hexes (has hex selection)
- [ ] Action 7: fortify-hex (has hex selection)
- [ ] Action 8: create-worksite (has hex selection)
- [ ] Action 9: send-scouts (has dice)
```

### Gap 5: No Validation/Testing Automation

**Problem:** AI can't verify correctness programmatically.

**Current:** Testing checklists (manual)

**Needed:**
```typescript
// test/migration-validation.ts

/**
 * Automated validation suite for migration phases
 */

export async function validatePhase1(): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Check files exist
  if (!fs.existsSync('src/services/UnifiedCheckHandler.ts')) {
    errors.push('UnifiedCheckHandler.ts not created');
  }
  
  if (!fs.existsSync('src/types/CheckPipeline.ts')) {
    errors.push('CheckPipeline.ts not created');
  }
  
  // Check exports
  try {
    const handler = require('../src/services/UnifiedCheckHandler');
    if (!handler.UnifiedCheckHandler) {
      errors.push('UnifiedCheckHandler not exported');
    }
    if (!handler.unifiedCheckHandler) {
      errors.push('Singleton instance not exported');
    }
  } catch (e) {
    errors.push(`Import error: ${e.message}`);
  }
  
  // Check methods exist
  const handler = new UnifiedCheckHandler();
  if (!handler.registerCheck) {
    errors.push('registerCheck method missing');
  }
  if (!handler.getCheck) {
    errors.push('getCheck method missing');
  }
  
  return {
    phase: 'Phase 1',
    passed: errors.length === 0,
    errors
  };
}

export async function validatePhase2(): Promise<ValidationResult> {
  // Validate game commands refactoring
  // ...
}

// CLI runner
if (require.main === module) {
  const phase = process.argv[2];
  const validator = {
    '1': validatePhase1,
    '2': validatePhase2,
    // ...
  }[phase];
  
  if (!validator) {
    console.error(`Unknown phase: ${phase}`);
    process.exit(1);
  }
  
  validator().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.passed ? 0 : 1);
  });
}
```

### Gap 6: No Edge Case Handling

**Problem:** AI will encounter unexpected situations.

**Needed:**
```markdown
### Common Edge Cases and Solutions

#### Edge Case 1: Action Uses Both Pre-Roll Dialog AND Post-Roll Interaction

**Example:** `deploy-army` (entity selection + map path + post-roll compound)

**Problem:** How to structure pipeline with multiple interaction types?

**Solution:**
```typescript
{
  preRollInteractions: [
    { type: 'entity-selection', entityType: 'army' },
    { type: 'map-selection', mode: 'army-path' }
  ],
  postRollInteractions: [
    { type: 'compound', components: [/* ... */] }
  ],
  preview: {
    providedByInteraction: true,  // Map path provides preview
    calculate: (ctx) => (/* additional preview from compound */)
  }
}
```

#### Edge Case 2: Game Command Not Found in GameCommandsResolver

**Problem:** Expected command doesn't exist in documented location

**Solution:**
1. Search entire codebase: `grep -r "commandName" src/`
2. Check if implemented elsewhere (ActionPhaseController, custom action files)
3. If found in controller, extract to execution function
4. If not found, may be JSON-only (no complex logic needed)
5. Document findings in migration log

#### Edge Case 3: Action Has Custom Component

**Example:** `arrest-dissidents` (custom UI for allocation)

**Problem:** Can't convert to simple pipeline config

**Solution:**
1. Keep custom component in place
2. Create pipeline config with `customComponent: true`
3. Component provides preview through event emission
4. Pipeline execute() calls component's apply method
5. Document as "hybrid pattern" in migration notes
```

---

## Recommendations for AI Execution Readiness

### Priority 1: Add Concrete Implementation Details

**Phase 1 Enhancement:**
1. Complete UnifiedCheckHandler implementation (full methods, not stubs)
2. Complete CheckPipeline type definitions (no partial interfaces)
3. Integration guide with ActionExecutionHelpers
4. Example of registering first pipeline

**Phase 2 Enhancement:**
1. Complete audit of 25+ game commands (table with all details)
2. Command-by-command extraction guide
3. Code search patterns for identification
4. Validation script for each command

**Phase 3 Enhancement:**
1. Action-by-action migration procedure (all 26)
2. Current location → new location mapping
3. Testing procedure for each action
4. Rollback procedure if action migration fails

### Priority 2: Add Automated Validation

**Create:** `test/migration-validation.ts`
- Phase-by-phase validation functions
- File existence checks
- Export validation
- Type checking
- Runtime validation

**Create:** `scripts/run-migration-tests.sh`
- Automated test runner
- JSON output for AI parsing
- Exit codes for success/failure

### Priority 3: Add Decision Trees

**For ambiguous situations:**
- How to handle actions with both pre-roll and post-roll?
- What if game command not found in documented location?
- How to handle actions with custom components?
- What if preview calculation needs async operations?

### Priority 4: Add Incremental Checkpoints

**Instead of:** "Week 1: Core Handler Structure"

**Use:** 
- Day 1: Create type definitions
- Day 2: Create handler skeleton
- Day 3: Implement registerCheck + getCheck
- Day 4: Implement executeSkillCheck (delegation only)
- Day 5: Integration testing

Each day has concrete deliverable + validation

---

## Estimated AI Execution Feasibility

### With Current Documents: 30% feasible

**What AI Could Do:**
- Create file stubs based on examples
- Write type definitions from interfaces shown
- Create simple pipeline configs for JSON-only actions
- Refactor obvious game commands

**What AI Would Struggle With:**
- Finding existing code locations
- Handling edge cases
- Validating correctness
- Deciding between multiple approaches
- Integrating with existing systems

### With Enhanced Documents: 75% feasible

**If we add:**
- Complete code inventory
- Detailed implementation templates
- Automated validation scripts
- Decision trees for edge cases
- Incremental checkpoints

**AI Could Execute:**
- Phases 1-2: With guidance, ~80% autonomous
- Phase 3: Simple actions ~90% autonomous, complex ~60%
- Phases 4-5: Events/incidents ~85% autonomous (simpler than actions)
- Phase 6: Cleanup ~70% autonomous (needs human review)

---

## Next Steps to Achieve AI Execution Readiness

### Immediate (1-2 days):
1. **Code Inventory:** Complete audit of existing files
2. **Game Commands Table:** Detailed classification of all 25+ commands
3. **Action Migration Matrix:** All 26 actions with current locations

### Short-term (1 week):
1. **Complete Phase 1 Template:** Full UnifiedCheckHandler implementation
2. **Validation Scripts:** Automated testing for each phase
3. **Decision Trees:** Edge case handling guides

### Medium-term (2 weeks):
1. **Action-by-Action Guides:** Detailed migration for all 26
2. **Example Migrations:** 2-3 complete action migrations as reference
3. **Rollback Procedures:** Concrete steps to undo each phase

---

## Conclusion

The current documents provide **excellent conceptual guidance** for a human developer but lack the **concrete implementation details** and **validation mechanisms** needed for autonomous AI execution.

**Recommendation:** Enhance documents with Priority 1-2 items before attempting AI-driven migration. With these enhancements, the migration becomes **75% AI-executable** with human oversight at key decision points.

**Alternative Approach:** Execute migration with **AI assistance** (human-led, AI-supported) rather than **AI autonomous** (AI-led, human oversight). This is feasible with current documents.
