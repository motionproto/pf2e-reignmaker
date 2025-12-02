Continue incident pipeline testing.

**Context:**

- **TypeScript-Only Architecture**: All incidents now fully defined in self-contained TypeScript files (`src/pipelines/incidents/`)
- **No JSON Dependencies**: All data (name, description, skills, outcomes) embedded in TypeScript
- Incidents follow 9-step pipeline (docs/systems/core/pipeline-coordinator.md)
- Incidents do NOT use pre-roll or post-apply interactions (by design - see docs/refactoring/INCIDENT_PIPELINE_AUDIT.md)
- Most incidents auto-convert modifiers to badges (no custom preview needed)
- Data flows: Pipeline → Execute Roll → Display Outcome → Apply → execute()
- **Testing uses Debug Panel** in Unrest Phase (not "Roll for Incident" button)
- **Runtime Access**: Controllers load from `PipelineRegistry.getPipelinesByType('incident')`

**Files:**

- Status tracker: `src/constants/migratedIncidents.ts`
- Testing guide: `docs/refactoring/TESTING_GUIDE.md`
- Debugging: `docs/refactoring/DEBUGGING_GUIDE.md`
- Architecture audit: `docs/refactoring/INCIDENT_PIPELINE_AUDIT.md`
- Migration summary: `docs/data/typescript-migration-summary.md`
- Working example: `src/pipelines/incidents/minor/bandit-raids.ts` (uses destroyWorksite game command)
- Pipeline documentation: `docs/systems/core/pipeline-coordinator.md`
- Pipeline patterns: `docs/systems/core/pipeline-patterns.md`
- Debug Panel: `src/view/kingdom/components/IncidentDebugPanel.svelte`
- Pipeline Registry: `src/pipelines/PipelineRegistry.ts` (single source of truth)

**Testing Flow:**

1. Open Kingdom Sheet → Unrest Phase
2. Debug panel now opens by default (changed from closed)
3. IncidentDebugPanel shows all incidents organized by severity
4. Click any skill button on an incident card
5. Pipeline executes: Roll → Display Outcome → Apply button appears
6. Click "Apply Result" to execute Steps 7-9
7. **Expected Result**: Outcome display disappears (instance deleted from pendingOutcomes)
8. Card returns to initial state, ready for next test
9. Check migratedIncidents.ts status (testing → tested/failed)

**Note:** For reliable testing, use **full page reload (F5)** rather than HMR after making code changes. HMR can cause duplicate event handlers during development.

**Pre-Test Verification:**

1. Read `migratedIncidents.ts` to identify incident marked 'testing'

2. Verify pipeline file structure (TypeScript-only):
   - Located in `src/pipelines/incidents/{minor|moderate|major}/`
   - Self-contained with all data embedded (name, description, skills, outcomes)
   - Has correct tier (1=minor, 2=moderate, 3=major)
   - NO JSON dependencies or imports
   - Exports `CheckPipeline` object (e.g., `export const myIncidentPipeline: CheckPipeline = {...}`)

3. Verify outcome structure:
   - Each outcome has `description` field (not `msg`)
   - Modifiers array present (can be empty)
   - Optional `gameCommands` array for automated effects
   - Optional `outcomeBadges` for static preview badges
   - Optional `endsEvent` field (for ongoing incidents)

4. Check for custom execution logic (if needed):
   - Optional `execute` function for game commands or complex logic
   - Uses GameCommandsResolver for structure/army operations
   - Handles undefined parameters correctly (random selection)
   - Returns `{ success: true }` on completion
   - Remember: modifiers are applied BEFORE execute runs (execute-first pattern)

5. Check preview badges (optional):
   - Simple incidents: Auto-convert modifiers (no preview needed)
   - Complex incidents: Define `outcomeBadges` in outcomes for static preview
   - Dynamic badges: Use `preview.calculate()` function
   - Example: `bandit-raids.ts` uses destroyWorksite with dynamic preview

6. Check common issues:
   □ Pipeline registered in `PipelineRegistry.ts`
   □ Tier matches incident severity (minor=1, moderate=2, major=3)
   □ All data embedded (no JSON imports except for legacy fortification data)
   □ Outcome descriptions use `description` field (not `msg`)
   □ Modifiers use correct format (resource, value)
   □ Execute function returns `{ success: true }`
   □ No syntax errors

7. Compare with tier grouping:
   - Minor (Tier 1): Simple resource penalties, basic modifiers only
   - Moderate (Tier 2): Structure damage, entity selection, simple game commands
   - Major (Tier 3): Complex game commands, multiple effects, custom interactions

8. Verify registry integration:
   □ Pipeline exported with correct name (e.g., `banditRaidsPipeline`)
   □ Imported in `PipelineRegistry.ts`
   □ Added to appropriate severity array (minor/moderate/major incidents)
   □ Runtime access via `pipelineRegistry.getPipeline('incident-id')`

9. Confirm readiness:
   □ Pipeline registered and accessible
   □ Correct tier assignment
   □ Self-contained (all data in TypeScript)
   □ Correct outcome structure (description, modifiers)
   □ Execute function returns success (if present)
   □ No syntax errors
   □ No JSON dependencies

**Common Issues:**

- **❌ CRITICAL: Never re-roll dice in execute functions**
  - Dice are rolled ONCE in the UI (OutcomeBadges.svelte)
  - Rolled values stored in resolvedDice map
  - ResolutionDataBuilder extracts these to numericModifiers
  - UnifiedCheckHandler applies BEFORE execute runs
  - Re-rolling in execute means displayed ≠ applied values
  - **Solution:** Remove execute function - badges auto-apply
  - See: docs/systems/core/pipeline-patterns.md (Anti-Patterns section)

- **❌ CRITICAL: Never manually apply resources in execute**
  - JSON modifiers and dice badges auto-apply via UnifiedCheckHandler
  - Manual updateKingdom() in execute causes double-application
  - **Solution:** Remove manual application - use badges/modifiers only
  - Execute should ONLY contain game commands (structures, armies, hexes)

- **Outcome doesn't display after roll**: Fixed - Svelte reactivity issue with array mutations
  - Previously: Data stored but UI didn't update until reload
  - Root cause: `.push()` and direct mutations don't trigger Svelte reactivity
  - Fixed: All array updates now use reassignment (spread operator)
  - Files: OutcomePreviewService.createInstance(), storeOutcome(), createMinimalOutcomePreview()
  
- **Pipeline runs twice**: Check for double-clicks or reactive statement loops
  - cleanupOldInstances runs at pipeline start and deletes old previews
  - Second execution will delete first execution's preview

- **Apply button doesn't work**: Check execute() returns `{ success: true }`

- **Context reconstruction error after reload**: Fixed - context now properly initializes required fields (checkType, userId, logs)
  - Previously: "TypeError: Cannot read properties of undefined (reading 'push')"
  - Also fixed: Wrong method name `step8_execute` → `step8_executeAction`
  - Fixed in PipelineCoordinator.resumeFromPersistedPreview()

- **Missing await in IncidentDebugPanel**: Fixed - handleApplyResult now awaits confirmApply
  - Previously: Errors were silently failing
  - Fixed in IncidentDebugPanel.handleApplyResult()
  
- **Debug panel defaults to open**: Changed for easier incident testing workflow

- **Triple event firing during development**: HMR artifact - use F5 (full reload) for testing instead of HMR

- **Outcome descriptions not showing**: Fixed - All components now use `outcome.description` field
  - Previously: Some components looked for legacy `outcome.msg` field
  - Fixed in: EventsPhase.svelte, UnrestPhase.svelte, IncidentDebugPanel.svelte, OngoingEventCard.svelte
  - All UI components now consistently use TypeScript `CheckPipeline` structure

- **Pipelines not loading**: Verify pipeline is registered in `PipelineRegistry.ts`
  - Must be imported and added to appropriate array
  - Controllers load from registry, not from JSON files
  - Check console for "Pipeline not found" errors

- **Preview badges not showing**: 
  - For static badges: Add `outcomeBadges` array to outcome definition
  - For dynamic badges: Implement `preview.calculate()` function
  - Check that badges follow correct format (see `bandit-raids.ts` for examples)

**Output:**

- List of issues found during verification
- Description of fixes applied (if any)
- Readiness status (ready/not ready + specific reasons)
- Note any manual effects that require GM intervention
- Confirm pipeline is properly registered and accessible
- Verify TypeScript structure is correct and self-contained

**Key Improvements Since Migration:**

- ✅ **Single Source of Truth**: All data in TypeScript, no JSON sync issues
- ✅ **Type Safety**: Full compile-time validation with `CheckPipeline` interface
- ✅ **Feature Parity**: All incidents now support preview badges, game commands, custom execution
- ✅ **Consistent Access**: All loaded via `PipelineRegistry`, not from JSON files
- ✅ **Easier Maintenance**: Self-contained files, no split between data and logic
- ✅ **Better Testing**: Debug panel improved, outcome display fixed, reactivity issues resolved

Proceed with systematic pre-test verification.