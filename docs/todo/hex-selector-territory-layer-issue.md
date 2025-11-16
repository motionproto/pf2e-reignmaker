# Hex Selector Territory Layer Issue

**Date:** 2025-11-16  
**Status:** 🔴 Bug - Needs Investigation  
**Priority:** Medium  
**Related Action:** claim-hexes

## Issue Description

The hex selector for the claim-hexes action is not properly revealing the territory layer during hex selection.

**Expected Behavior:**
- When hex selection is triggered (post-apply interaction), territory layer should be revealed
- Hex validation rules should be applied (e.g., adjacent to claimed hexes)
- Visual feedback should show valid/invalid hexes

**Actual Behavior:**
- Territory layer is not showing during hex selection
- Hex validation may not be working correctly

## Context

This issue was discovered during PipelineCoordinator implementation (Phase 2), but is **unrelated** to that work since:
- PipelineCoordinator is infrastructure only (not yet integrated)
- Current system still uses old fragmented approach
- This is a pre-existing issue with the hex selection UI/map interaction

## Files to Investigate

1. `src/view/kingdom/turnPhases/ActionsPhase.svelte`
   - Check `applyActionEffects()` method
   - Look for territory layer reveal logic

2. `src/services/UnifiedCheckHandler.ts`
   - Check `executePostApplyInteractions()` method
   - Verify hex selection interaction setup

3. `src/pipelines/actions/claimHexes.ts`
   - Review `postApplyInteractions` configuration
   - Check if `onComplete` handler is properly saving selected hexes

4. Map overlay services in `src/services/map/overlays/`
   - Verify territory layer reveal mechanism
   - Check hex validation overlay

## Possible Root Causes

1. **Territory layer not being activated**
   - Missing call to reveal territory layer before hex selection
   - Map service not properly initialized

2. **Hex validation overlay missing**
   - Validation rules not being applied during selection
   - Adjacent hex logic not working

3. **Event timing issue**
   - Territory layer reveal happening after hex selection completes
   - Race condition between UI and map updates

## Recommended Approach

1. **Debug current flow:**
   - Add console logs to trace hex selection flow
   - Check if territory layer reveal is being called
   - Verify hex validation rules are being applied

2. **Review recent changes:**
   - Check if any recent map refactoring broke this
   - Look for missing territory layer initialization

3. **Test fix:**
   - Manually trigger territory layer reveal before hex selection
   - Verify hex validation overlay is applied

## Action Items

- [ ] Investigate territory layer reveal in hex selection flow
- [ ] Check hex validation overlay application
- [ ] Test with claim-hexes action
- [ ] Fix territory layer reveal timing
- [ ] Verify hex validation rules work correctly

---

**Note:** This should be addressed AFTER Phase 3 (PipelineCoordinator integration) is complete to avoid conflicts with the refactoring work.
