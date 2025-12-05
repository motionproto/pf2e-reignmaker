Continue event pipeline testing.

**Context:**

- **TypeScript-Only Architecture**: All events now fully defined in self-contained TypeScript files (`src/pipelines/events/`)
- **No JSON Dependencies**: All data (name, description, skills, outcomes) embedded in TypeScript
- Events follow 9-step pipeline (docs/systems/core/pipeline-coordinator.md)
- Events do NOT use pre-roll or post-apply interactions (by design)
- Most events auto-convert modifiers to badges (no custom preview needed)
- Data flows: Pipeline → Execute Roll → Display Outcome → Apply → execute()
- **Testing uses Event Debug Panel** in Events Phase (not regular event selector)
- **Runtime Access**: Controllers load from `PipelineRegistry.getPipelinesByType('event')`

**Files:**

- Status tracker: `src/constants/migratedEvents.ts`
- Testing guide: `docs/refactoring/TESTING_GUIDE.md`
- Debugging: `docs/refactoring/DEBUGGING_GUIDE.md`
- Event workflow: `docs/todo/Event_Testing_Workflow.md`
- Working examples: `src/pipelines/events/food-surplus.ts` (simple), `src/pipelines/events/bandit-activity.ts` (ongoing)
- Pipeline documentation: `docs/systems/core/pipeline-coordinator.md`
- Pipeline patterns: `docs/systems/core/pipeline-patterns.md`
- Debug Panel: `src/view/debug/EventDebugPanel.svelte`
- Pipeline Registry: `src/pipelines/PipelineRegistry.ts` (single source of truth)
- Events Phase: `src/view/kingdom/turnPhases/EventsPhase.svelte`

**Testing Flow:**

1. Open Kingdom Sheet → Events Phase
2. Toggle "Event Debug Panel" to show (if enabled in debug config)
3. EventDebugPanel shows all events organized by category:
   - **Priority Testing**: 9 core events (simplest to most complex)
   - **Beneficial Events**: Events with positive effects
   - **Dangerous Events**: Events with negative effects
   - **Neutral Events**: Mixed or situational effects
4. Toggle "Show Tested Events" to view all events or only untested
5. Click any skill button on an event card
6. Pipeline executes: Roll → Display Outcome → Apply button appears
7. Click "Apply Result" to execute Steps 7-9
8. **Expected Result**: Outcome display disappears (instance deleted from pendingOutcomes)
9. Card returns to initial state, ready for next test
10. Update migratedEvents.ts status (untested → tested)

**Note:** For reliable testing, use **full page reload (F5)** rather than HMR after making code changes. HMR can cause duplicate event handlers during development.

**Pre-Test Verification:**

1. Read `migratedEvents.ts` to identify next untested event

2. Verify pipeline file structure (TypeScript-only):
   - Located in `src/pipelines/events/`
   - Self-contained with all data embedded (name, description, skills, outcomes)
   - Has `checkType: 'event'` (not 'incident')
   - Has `tier: 1` (events typically use tier 1)
   - NO JSON dependencies or imports
   - Exports `CheckPipeline` object (e.g., `export const myEventPipeline: CheckPipeline = {...}`)

3. Verify outcome structure:
   - Each outcome has `description` field (not `msg`)
   - Modifiers array present (can be empty)
   - Optional `gameCommands` array for automated effects
   - Optional `outcomeBadges` for static preview badges
   - **For ongoing events**: `endsEvent` field (true = event ends, false = continues)

4. Verify traits array:
   - `["beneficial"]` - Positive events (success gives bonuses)
   - `["dangerous"]` - Negative events (failure gives penalties)
   - `["dangerous", "ongoing"]` - Ongoing dangerous events
   - No trait or mixed - Neutral events

5. Check for custom execution logic (if needed):
   - Optional `execute` function for game commands or complex logic
   - Uses GameCommandsResolver for structure/army operations
   - Handles undefined parameters correctly (random selection)
   - Returns `{ success: true }` on completion
   - Remember: modifiers are applied BEFORE execute runs (execute-first pattern)

6. Check preview badges (optional):
   - Simple events: Auto-convert modifiers (no preview needed)
   - Complex events: Define `outcomeBadges` in outcomes for static preview
   - Dynamic badges: Use `preview.calculate()` function

7. Check common issues:
   □ Pipeline registered in `PipelineRegistry.ts`
   □ `checkType: 'event'` (NOT 'incident')
   □ All data embedded (no JSON imports)
   □ Outcome descriptions use `description` field (not `msg`)
   □ Modifiers use correct format (resource, value, duration)
   □ Execute function returns `{ success: true }`
   □ Ongoing events have `endsEvent` on all outcomes
   □ No syntax errors

8. Verify registry integration:
   □ Pipeline exported with correct name (e.g., `foodSurplusPipeline`)
   □ Imported in `PipelineRegistry.ts`
   □ Added to events array
   □ Runtime access via `pipelineRegistry.getPipeline('event-id')`

9. Confirm readiness:
   □ Pipeline registered and accessible
   □ Correct checkType (event)
   □ Self-contained (all data in TypeScript)
   □ Correct outcome structure (description, modifiers)
   □ Traits match event category
   □ Execute function returns success (if present)
   □ No syntax errors
   □ No JSON dependencies

**Priority Testing Order:**

The debug panel shows events in recommended testing order:

**Priority Events (Test First):**
1. `assassination-attempt` - Static only (simplest case)
2. `food-surplus` - Positive dice rolls
3. `food-shortage` - Negative dice formula
4. `grand-tournament` - Fame resource
5. `land-rush` - claim_hex special effect
6. `notorious-heist` - imprisoned_unrest
7. `bandit-activity` - Ongoing event
8. `archaeological-find` - Choice-buttons (gain commodity)
9. `natural-disaster` - Choice-buttons (lose commodity)

**Beneficial Events (10-23):**
Simple positive effects, test after priority events.

**Dangerous Events (24-37):**
Negative effects and ongoing events, may need special handling.

**Current Progress (from migratedEvents.ts):**
- Priority #1-9: All tested ✅
- Beneficial #10-23: All tested ✅
- Dangerous #24-25: Tested (cult-activity, demand-expansion)
- Remaining: 12 dangerous events untested

**Common Issues:**

- **❌ CRITICAL: Missing criticalSuccess outcome**
  - ALL events must define all four outcomes: `criticalSuccess`, `success`, `failure`, `criticalFailure`
  - Missing `criticalSuccess` causes errors when players roll natural 20s
  - Critical success typically has slightly better effect than regular success
  - Description should be more positive than regular success
  - Example: If success = "The event ends", criticalSuccess = "The event ends with bonus"

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

- **❌ Ongoing events missing endsEvent field**
  - Events with `["ongoing"]` or `["dangerous", "ongoing"]` traits
  - MUST have `endsEvent: true` or `endsEvent: false` on each outcome
  - `endsEvent: true` = event resolves and is removed
  - `endsEvent: false` = event continues to next turn
  - Missing field causes ongoing events to behave incorrectly

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

- **Triple event firing during development**: HMR artifact - use F5 (full reload) for testing instead of HMR

- **Outcome descriptions not showing**: Fixed - All components now use `outcome.description` field
  - Previously: Some components looked for legacy `outcome.msg` field
  - Fixed in: EventsPhase.svelte, EventDebugPanel.svelte, OngoingEventCard.svelte
  - All UI components now consistently use TypeScript `CheckPipeline` structure

- **Pipelines not loading**: Verify pipeline is registered in `PipelineRegistry.ts`
  - Must be imported and added to appropriate array
  - Controllers load from registry, not from JSON files
  - Check console for "Pipeline not found" errors

- **Event shows in wrong category**: Check `traits` array
  - `["beneficial"]` → Beneficial section
  - `["dangerous"]` → Dangerous section
  - No trait or mixed → Neutral section
  - `["ongoing"]` → Persists across turns

**Event vs Incident Differences:**

| Aspect | Events | Incidents |
|--------|--------|-----------|
| checkType | `'event'` | `'incident'` |
| Location | `src/pipelines/events/` | `src/pipelines/incidents/` |
| Debug Panel | `EventDebugPanel.svelte` | `IncidentDebugPanel.svelte` |
| Phase | Events Phase | Unrest Phase |
| Traits | beneficial, dangerous, ongoing | tier-based (minor, moderate, major) |
| Ongoing Support | Yes (`endsEvent` field) | Yes (`endsEvent` field) |
| Complexity | Generally simpler | Often more complex game commands |

**Output:**

- List of issues found during verification
- Description of fixes applied (if any)
- Readiness status (ready/not ready + specific reasons)
- Note any manual effects that require GM intervention
- Confirm pipeline is properly registered and accessible
- Verify TypeScript structure is correct and self-contained
- For ongoing events: confirm endsEvent behavior is correct

**Key Improvements Since Migration:**

- ✅ **Single Source of Truth**: All data in TypeScript, no JSON sync issues
- ✅ **Type Safety**: Full compile-time validation with `CheckPipeline` interface
- ✅ **Feature Parity**: All events now support preview badges, game commands, custom execution
- ✅ **Consistent Access**: All loaded via `PipelineRegistry`, not from JSON files
- ✅ **Easier Maintenance**: Self-contained files, no split between data and logic
- ✅ **Better Testing**: Debug panel improved, outcome display fixed, reactivity issues resolved
- ✅ **Ongoing Events**: Proper `endsEvent` support for events that persist across turns

**Next Steps:**

1. Open EventDebugPanel in Events Phase
2. Filter to show only untested events (toggle off "Show Tested Events")
3. Test next untested dangerous event (starting with `demand-structure`)
4. Verify all 4 outcomes work correctly
5. For ongoing events: verify endsEvent behavior
6. Update migratedEvents.ts status to 'tested'
7. Repeat for remaining untested events

Proceed with systematic pre-test verification for the next untested event.

