# Stage 2: Legacy Code Removal & Simplification Plan

## Current State
The renderer refactoring (Stage 1) has been partially completed with the following achieved:
- Manager pattern implemented in KingdomSheet
- Major systems identified for removal (ruin, leaders, heartlands, supernatural/creative solutions)
- Initial file deletions completed (Leaders.kt, KingdomHeartland.kt, etc.)
- Build currently failing with 21 compilation errors

## Strategy
**Priority: Remove legacy code FIRST, then fix compilation errors**

This approach will:
1. Reduce the codebase complexity immediately
2. Eliminate cascading dependencies
3. Make fixing compilation errors simpler
4. Create a clean slate for implementing Reignmaker-lite features

## Phase 1: Complete Legacy System Removal

### 1.1 Ruin System Removal
- [ ] Delete files:
  - `src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/data/RawRuin.kt`
  - Any ruin-related context/renderer files
- [ ] Remove from KingdomData interface:
  - `ruin` property
  - All corruption, crime, decay, strife references
- [ ] Update all references to use simple `unrest: Int` instead

### 1.2 Leader System Removal
- [x] Already deleted: Leaders.kt, PickLeader.kt, ConfigureLeaderKingdomSkills.kt
- [ ] Remove from KingdomData interface:
  - `leaders` property
  - All leader-related fields
- [ ] Remove leader-related imports from all files
- [ ] Clean up vacancy calculations
- [ ] Remove leader skill bonuses/modifiers

### 1.3 Heartland System Removal  
- [x] Already deleted: KingdomHeartland.kt
- [ ] Remove from KingdomData interface:
  - `heartland` property
  - `heartlandBlacklist` property
- [ ] Remove HeartlandManagement dialog
- [ ] Clean up all heartland references in KingdomSheet

### 1.4 Supernatural/Creative Solutions Removal
- [ ] Remove from KingdomData interface:
  - `supernaturalSolutions` property
  - `creativeSolutions` property
- [ ] Remove all UI elements related to these

### 1.5 Additional Deprecated Systems
- [ ] Remove milestone system files if not used in Reignmaker-lite
- [ ] Remove complex feat system files
- [ ] Remove government type files if simplified
- [ ] Remove charter system files if simplified

## Phase 2: Create Stubs for Required Systems

### 2.1 Simplified Data Interfaces
Create minimal interfaces for Reignmaker-lite:
- [ ] `RawKingdomDataLite.kt` - Simplified kingdom data
- [ ] `RawUnrest.kt` - Simple integer-based unrest (0-15)
- [ ] `RawGold.kt` - Already created ✅
- [ ] `RawCommodities.kt` - Food, Lumber, Stone, Ore
- [ ] `RawWorksites.kt` - Resource production sites

### 2.2 Manager Stubs
Ensure all managers have proper interfaces:
- [x] FameManager ✅
- [x] UnrestIncidentManager ✅
- [x] KingdomEventsManager ✅
- [x] ResourceManager ✅
- [x] WorksiteManager ✅
- [x] StorageManager ✅
- [x] ConstructionManager ✅
- [x] TurnManager ✅

## Phase 3: Fix Compilation Errors

### 3.1 Property Access Fixes
- [ ] Fix dataset access in CreateWorksiteHandler (use proper Kotlin/JS syntax)
- [ ] Fix property names in ActionCategoryRenderer (actionId vs id, etc.)
- [ ] Fix invested property type in ConstructionManager

### 3.2 Type Conversion Fixes
- [ ] Replace all `mapOf()` with `recordOf()` for JS interop
- [ ] Fix all Map<String, String> to ReadonlyRecord<String, Any?>

### 3.3 Interface Updates
- [ ] Add missing properties to KingdomData:
  - `gold: RawGold?`
  - `worksites: RawWorksites?`
- [ ] Remove deprecated properties from KingdomData:
  - `ruin`
  - `leaders`
  - `heartland`
  - `supernaturalSolutions`
  - `creativeSolutions`

### 3.4 JSON Schema Updates
- [ ] Fix create-worksite.json validation
- [ ] Update player-action.json schema
- [ ] Remove deprecated action schemas

## Phase 4: Verification & Testing

### 4.1 Build Verification
- [ ] Run `./gradlew clean build`
- [ ] Ensure no compilation errors
- [ ] Verify all tests pass

### 4.2 Runtime Verification
- [ ] Test kingdom sheet opens without errors
- [ ] Verify managers initialize correctly
- [ ] Test basic kingdom operations

## File Deletion List (Priority Order)

### Immediate Deletions
```
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/data/RawRuin.kt
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/dialogs/HeartlandManagement.kt
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/dialogs/MilestoneManagement.kt
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/dialogs/GovernmentManagement.kt
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/dialogs/CharterManagement.kt
```

### Secondary Deletions (after verification)
```
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/modifiers/penalties/*
src/jsMain/kotlin/at/posselt/pfrpg2e/kingdom/modifiers/bonuses/leader*
Any files with "Ruin", "Leader", "Heartland" in the name
```

## Success Metrics
- [ ] Build compiles successfully
- [ ] Codebase reduced by ~50%
- [ ] No references to deprecated systems remain
- [ ] All managers functional
- [ ] Kingdom sheet renders without errors

## Next Steps After This Stage
1. Implement missing Reignmaker-lite features
2. Update UI templates for simplified system
3. Create documentation for new simplified system
4. Performance optimization
5. User testing

## Notes
- Keep backward compatibility stubs where absolutely necessary
- Document any temporary workarounds
- Prioritize deletion over fixing - it's easier to fix a smaller codebase
- Create feature flags for any transitional code

## Estimated Timeline
- Phase 1: 2-3 hours (aggressive deletion)
- Phase 2: 1-2 hours (create minimal stubs)
- Phase 3: 2-3 hours (fix remaining errors)
- Phase 4: 1 hour (verification)

Total: ~6-9 hours of focused work

## Risk Mitigation
- Create a backup branch before mass deletions
- Test after each major deletion phase
- Keep a list of all deleted files for reference
- Use git history to recover any accidentally deleted required code
