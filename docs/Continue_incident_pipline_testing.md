Continue incident pipeline testing.

**Context:**

- Incidents follow 9-step pipeline (docs/systems/core/pipeline-coordinator.md)
- Incidents do NOT use pre-roll or post-apply interactions (by design - see docs/refactoring/INCIDENT_PIPELINE_AUDIT.md)
- Most incidents auto-convert JSON modifiers to badges (no custom preview needed)
- Data flows: Pipeline → Execute Roll → Display Outcome → Apply → execute()
- **Testing uses Debug Panel** in Unrest Phase (not "Roll for Incident" button)

**Files:**

- Status tracker: src/constants/migratedIncidents.ts
- Testing guide: docs/refactoring/TESTING_GUIDE.md
- Debugging: docs/refactoring/DEBUGGING_GUIDE.md
- Architecture audit: docs/refactoring/INCIDENT_PIPELINE_AUDIT.md
- Working example: src/pipelines/incidents/minor/bandit-raids.ts
- Pipeline documentation: docs/systems/core/pipeline-coordinator.md
- Debug Panel: src/view/kingdom/components/IncidentDebugPanel.svelte

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

1. Read migratedIncidents.ts to identify incident marked 'testing'

2. Verify pipeline file exists and follows pattern:
   - Located in src/pipelines/incidents/{minor|moderate|major}/
   - Has correct tier (1=minor, 2=moderate, 3=major)
   - Uses applyPipelineModifiers for resource changes
   - NO pre-roll or post-apply interactions (incidents don't support these)
   - Preview is undefined (auto-converts JSON modifiers) OR has custom calculate function

3. Check for GameCommandsResolver usage (if needed):
   - Used for structure/army operations
   - Handles undefined parameters correctly (random selection)
   - Returns { success: true } on completion

4. Check common issues:
   □ Pipeline registered in PipelineRegistry.ts
   □ Tier matches incident severity (minor=1, moderate=2, major=3)
   □ Modifiers use correct format (type, resource, formula, negative, duration)
   □ Manual effects documented if automation not implemented
   □ No syntax errors

5. Compare with tier grouping:
   - Minor (Tier 1): Simple resource penalties
   - Moderate (Tier 2): Structure damage, entity selection
   - Major (Tier 3): Complex gameCommands, multiple effects

6. Confirm readiness:
   □ Pipeline registered
   □ Correct tier assignment
   □ Correct modifier format
   □ Execute function returns success
   □ No syntax errors

**Common Issues:**

- **Outcome doesn't display after roll**: Fixed - Svelte reactivity issue with array mutations
  - Previously: Data stored but UI didn't update until reload
  - Root cause: `.push()` and direct mutations don't trigger Svelte reactivity
  - Fixed: All array updates now use reassignment (spread operator)
  - Files: OutcomePreviewService.createInstance(), storeOutcome(), createMinimalOutcomePreview()
  
- **Pipeline runs twice**: Check for double-clicks or reactive statement loops
  - cleanupOldInstances runs at pipeline start and deletes old previews
  - Second execution will delete first execution's preview

- **Apply button doesn't work**: Check execute() returns { success: true }

- **Context reconstruction error after reload**: Fixed - context now properly initializes required fields (checkType, userId, logs)
  - Previously: "TypeError: Cannot read properties of undefined (reading 'push')"
  - Also fixed: Wrong method name `step8_execute` → `step8_executeAction`
  - Fixed in PipelineCoordinator.resumeFromPersistedPreview()

- **Missing await in IncidentDebugPanel**: Fixed - handleApplyResult now awaits confirmApply
  - Previously: Errors were silently failing
  - Fixed in IncidentDebugPanel.handleApplyResult()
  
- **Debug panel defaults to open**: Changed for easier incident testing workflow

- **Triple event firing during development**: HMR artifact - use F5 (full reload) for testing instead of HMR

**Output:**

- List of issues found
- Description of fixes applied
- Readiness status (ready/not ready + reasons)
- Note any manual effects that require GM intervention

Proceed with systematic pre-test verification.