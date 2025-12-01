# Incident & Event Outcome Clarifications

**Purpose**: Implementation notes for incident/event enhancements and missing game commands.

**Status**: Post-Migration Review (January 2025)

**Architecture Context**: All incidents now use the execute-first pattern. Resource modifiers from JSON are applied automatically. These notes focus on:
1. Missing game commands needed for complex outcomes
2. UI/UX enhancements for random selections
3. Future feature implementations

---

## Implementation Status Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Resource Modifiers** | ✅ Complete | Execute-first pattern handles all JSON modifiers automatically |
| **Structure Damage/Destroy** | ✅ Complete | `damageStructure()` and `destroyStructure()` exist |
| **Faction Attitude** | ✅ Complete | `adjustFactionAttitude()` exists |
| **Worksite Destruction** | ✅ Complete | `destroyWorksite()` game command implemented |
| **Hex Transfer** | ❌ Missing | Need `transferHexesToFaction()` and `removeHexes()` |
| **Player Action Consumption** | ❌ Missing | Need `consumePlayerAction()` |
| **Settlement Downgrade** | ⚠️ Partial | Need `downgradeSettlement()` game command |
| **Morale Checks** | ❌ Missing | Need `performMoraleCheck()` system |
| **Faction Army Spawn** | ❌ Missing | Need `spawnFactionArmy()` |
| **Settlement Transfer** | ❌ Missing | Need `transferSettlementToFaction()` |

---

## Incidents (30 Total)

**Legend:**
- ✅ = Fully implemented (resource modifiers work via execute-first)
- ⚠️ = Partially implemented (manual effects documented)
- ❌ = Missing implementation (game command needed)

### 1. Bandit Activity
**ID**: `bandit-activity` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers (gold loss) handled by execute-first pattern
- ✅ **Critical Failure**: `destroyWorksite(1)` game command implemented
  - Randomly selects and destroys one worksite
  - Recalculates production automatically
  - Shows chat notification with destroyed worksite details

---

### 2. Corruption Scandal
**ID**: `corruption-scandal` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ All outcomes use resource modifiers only (unrest penalties)
- ✅ Execute-first pattern handles everything automatically
- No custom logic needed

---

### 3. Crime Wave
**ID**: `crime-wave` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ All outcomes use resource modifiers only (unrest penalties)
- ✅ Execute-first pattern handles everything automatically
- No custom logic needed

---

### 4. Diplomatic Incident
**ID**: `diplomatic-incident` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Faction attitude adjustments implemented via `adjustFactionAttitude()`
- ✅ Custom execute function handles faction selection logic
- ✅ Dice modifiers for number of factions work via execute-first
- Note: Description uses "kingdoms" for flavor, but code uses factions correctly

---

### 5. Emigration Threat
**ID**: `emigration-threat` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers handled by execute-first pattern
- ✅ **Failure**: `destroyWorksite(1)` - Destroy 1 worksite
- ✅ **Critical Failure**: `destroyWorksite('1d3')` - Destroy 1d3 worksites with dice formula support 

---

### 6. Protests
**ID**: `protests` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ All outcomes use resource modifiers only (unrest penalties)
- ✅ Execute-first pattern handles everything automatically

---

### 7. Rising Tensions
**ID**: `rising-tensions` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ All outcomes use resource modifiers only (unrest penalties)
- ✅ Execute-first pattern handles everything automatically

---

### 8. Work Stoppage
**ID**: `work-stoppage` | **Tier**: Minor | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ All outcomes use resource modifiers only (unrest penalties)
- ✅ Execute-first pattern handles everything automatically

---

### 9. Assassination Attempt
**ID**: `assassination-attempt` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers handled by execute-first pattern
- ✅ **Critical Failure**: `spendPlayerAction(random)` game command implemented
  - Randomly selects one leader who hasn't acted yet
  - Marks their action as spent in the turn's actionLog
  - Prevents them from taking a Kingdom Action for the remainder of the turn
  - Shows chat notification with affected character name
  - Automatically clears at next turn
- Also used by: Noble Conspiracy (#25)

---

### 10. Diplomatic Crisis
**ID**: `diplomatic-crisis` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Faction attitude adjustments via `adjustFactionAttitude()`
- ✅ Custom execute function handles multi-faction logic
- ✅ Dice modifiers for number of factions work via execute-first
- Note: Uses "factions" correctly in implementation

---

### 11. Disease Outbreak
**ID**: `disease-outbreak` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ `damageStructure()` command exists and supports category filtering
- ✅ Random selection implemented (Medicine or Faith structures)
- ✅ Gracefully handles case where no eligible structures exist
- Future enhancement: Show which structure was damaged in UI notification

---

### 12. Infrastructure Damage
**ID**: `infrastructure-damage` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ `damageStructure()` command exists with count parameter
- ✅ Random structure selection implemented
- ✅ Supports both fixed counts and dice formulas
- Future enhancement: Show list of damaged structures in UI

---

### 13. Mass Exodus
**ID**: `mass-exodus` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers handled by execute-first pattern
- ✅ Structure damage via `damageStructure(1)` works
- ✅ **Failure**: `destroyWorksite(1)` - Destroy 1 worksite
- ✅ **Critical Failure**: `destroyWorksite(1)` + `damageStructure(1)` - Destroy 1 worksite and damage 1 structure

---

### 14. Production Strike
**ID**: `production-strike` | **Tier**: Moderate | **Status**: ⚠️ Enhancement Opportunity

**Implementation Notes**:
- ✅ Currently uses manual effects (GM selects resource)
- 💡 **Future Enhancement**: Post-roll interaction for resource selection
  - User selects which resource to lose (gold/food/lumber/stone/ore/luxuries)
  - Dice values rolled in UI (1d4 or 2d4 depending on outcome)
  - Applied via execute-first pattern
- Current workaround: Manual resource deduction
- Priority: Low (works but not elegant)

---

### 15. Riot
**ID**: `riot` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ `damageStructure(1)` for failure outcome
- ✅ `destroyStructure(1)` for critical failure
- ✅ Multi-tier logic: destroys top tier, damages next tier
- ✅ Single-tier structures completely removed
- ✅ Random selection implemented
- Future enhancement: Show affected structure in notification

---

### 16. Settlement Crisis
**ID**: `settlement-crisis` | **Tier**: Moderate | **Status**: ⚠️ Partial

**Implementation Notes**:
- ✅ **Failure**: `damageStructure(1)` works
- ⚠️ **Critical Failure**: Partially implemented
  - ✅ `damageStructure("1d3")` works for multiple structures
  - ❌ Need `downgradeSettlement(settlementId, levels)` game command
    - Reduce settlement level/tier by specified amount
    - Update capacity limits
    - Handle edge case: Can't downgrade below minimum tier
  - Current workaround: Manual settlement level adjustment
  - Priority: Medium (affects 2-3 incidents)

---

### 17. Tax Revolt
**ID**: `tax-revolt` | **Tier**: Moderate | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ All outcomes use resource modifiers (gold loss, unrest)
- ✅ Execute-first pattern handles everything automatically

---

### 18. Trade Embargo
**ID**: `trade-embargo` | **Tier**: Moderate | **Status**: ⚠️ Enhancement Opportunity

**Implementation Notes**:
- ✅ Currently uses manual effects
- 💡 **Future Enhancement**: Same as Production Strike (#14)
  - Post-roll interaction for resource selection
  - Dice rolled in UI (1d4 or 2d4)
- Current workaround: Manual resource deduction
- Priority: Low (same as #14)

---

### 19. Border Raid
**ID**: `border-raid` | **Tier**: Major | **Status**: ❌ Missing

**Implementation Notes**:
- ✅ Resource modifiers handled by execute-first pattern
- ❌ **Need Game Command**: `removeHexes(count: number | string, filter: 'border')`
  - **Failure**: Remove 1 border hex
  - **Critical Failure**: Remove 1d3 border hexes
  - Requirements:
    - Identify border hexes (adjacent to unclaimed or enemy territory)
    - Random selection from border hexes only
    - Update kingdom territory
    - Recalculate resource production
  - 💡 **UI Enhancement**: Visual feedback showing which hexes were lost
    - Red highlight on lost hexes
    - Confirmation dialog (view-only, not selection)
  - Current workaround: Manual hex removal
  - Priority: Medium (complex but rarely triggered)

---

### 20. Economic Crash
**ID**: `economic-crash` | **Tier**: Major | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers (massive gold loss) handled by execute-first
- ✅ **Critical Failure**: `destroyStructure(category: 'commerce', target: 'highest_tier')`
  - Targets Commerce category only
  - Automatically selects highest tier structure
  - Works correctly with multi-tier structures
- Future enhancement: Notification showing which structure was destroyed

---

### 21. Guerrilla Movement
**ID**: `guerrilla-movement` | **Tier**: Major | **Status**: ❌ Missing (Complex)

**Implementation Notes**:
- ✅ "Rebels" faction can be created manually or auto-created
- ❌ **Need Game Commands**: Multiple systems required
  
  1. `transferHexesToFaction(factionId, count, restrictions)`
     - **Failure**: Transfer 1d3 adjacent hexes to Rebels
     - **Critical Failure**: Transfer 2d6+3 hexes to Rebels
     - Requirements:
       - Select adjacent hexes only (contiguous territory)
       - Exclude hexes with settlements
       - Update hex ownership
       - Recalculate kingdom territory
     - Priority: High (major mechanical impact)
  
  2. `spawnFactionArmy(factionId, armyType, location)`
     - **Critical Failure**: Spawn Rebel infantry army
     - Requirements:
       - Create army entity controlled by faction
       - Place in transferred territory
       - Set appropriate stats for faction
     - Priority: High (affects military system)

- Current workaround: Manual hex transfer + army creation
- Priority: High (major incident, complex mechanical effects)
- Note: Also needed for Secession Crisis (#28)

---

### 22. International Crisis
**ID**: `international-crisis` | **Tier**: Major | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Faction attitude adjustments via `adjustFactionAttitude()`
- ✅ Resource modifiers handled by execute-first pattern
- ✅ All outcomes implemented

---

### 23. International Scandal
**ID**: `international-scandal` | **Tier**: Major | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Fame loss handled by execute-first pattern
- ✅ Faction attitude adjustments via `adjustFactionAttitude()`
- ✅ Dice modifiers for number of factions work correctly
- ✅ Multi-faction logic implemented in custom execute
- Note: Uses simplified fame penalty (flat -1)

---

### 24. Mass Desertion Threat
**ID**: `mass-desertion-threat` | **Tier**: Major | **Status**: ❌ Missing (Complex)

**Implementation Notes**:
- ✅ Structure damage/destroy via existing commands
- ❌ **Need Morale Check System**: `performMoraleCheck(armyCount, options)`
  
  **Morale Check Mechanics** (from Kingmaker Military rules):
  - DC: Level-based DC for army's level
  - Skill: Kingdom rolls Diplomacy (rally) or Intimidation (discipline)
  - Results:
    - Critical Success: Army rallies, no desertion
    - Success: Army intact, +1 Unrest
    - Failure: Army disbands, +1 Unrest
    - Critical Failure: Army disbands/mutiny, +2 Unrest
  
  **Implementation Requirements**:
  - Random army selection (or specific armies)
  - Kingdom skill check (Diplomacy or Intimidation)
  - Auto-apply results (disband army, add unrest)
  - UI for skill selection
  - Works in both incidents and Upkeep phase
  
  **Failure**: 1 army morale check + damage 1 military structure
  **Critical Failure**: 2 army morale checks + destroy 1 military structure
  
- Current workaround: Manual morale checks + GM adjudication
- Priority: High (military system integration, used in multiple places)
- Scope: Large (new subsystem, not just a command)

---

### 25. Noble Conspiracy
**ID**: `noble-conspiracy` | **Tier**: Major | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers (unrest, gold loss) via execute-first
- ✅ **Critical Failure**: `spendPlayerAction(random)` game command implemented
  - Same as Assassination Attempt (#9)
  - Randomly select leader and mark action as used
  - Shows in turn tracker UI as consumed
  - Automatically clears on next turn

---

### 26. Prison Breaks
**ID**: `prison-breaks` | **Tier**: Major | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ **Failure**: `damageStructure(category: 'justice', target: 'highest_tier')`
- ✅ **Critical Failure**: `destroyStructure(category: 'justice', target: 'highest_tier')`
- ✅ Imprisoned Unrest conversion handled by existing system
  - Imprisoned Unrest stored separately in kingdom data
  - Automatically converted to normal Unrest when prison damaged/destroyed
  - Increases active Unrest (can trigger more incidents)
- ✅ Structure targeting by category and tier works correctly
- Future enhancement: Notification showing which prison was affected

---

### 27. Religious Schism
**ID**: `religious-schism` | **Tier**: Major | **Status**: ✅ Complete

**Implementation Notes**:
- ✅ Resource modifiers via execute-first pattern
- ✅ **Critical Failure**: `destroyStructure(category: 'faith', target: 'highest_tier')`
  - Targets Faith/Religious category structures only
  - Automatically selects highest tier structure
  - Works correctly
- Future enhancement: Notification showing which structure was destroyed

---

### 28. Secession Crisis
**ID**: `secession-crisis` | **Tier**: Major | **Status**: ❌ Missing (Very Complex)

**Implementation Notes**:
- ⚠️ **Failure**: Partially implemented
  - ✅ `destroyStructure(1, settlement: target)` works
  - ❌ Need `downgradeSettlement(settlementId, levels)` game command
  - Random non-capital settlement selection implemented
  
- ❌ **Critical Failure**: Most complex incident in game
  - **Creates Independent Rebel Kingdom!**
  - Need game command: `transferSettlementToFaction(settlementId, factionId, options)`
    - Transfer entire settlement to Rebels faction
    - Transfer all adjacent hexes
    - Settlement becomes rebel stronghold with full infrastructure
    - All structures, population, resources now belong to Rebels
    - Creates autonomous enemy kingdom within borders
  
  **Difference from Guerrilla Movement (#21)**:
  - #21: Rebels get empty hexes + 1 army (nuisance)
  - #28: Rebels get functioning settlement + territory + economy (existential threat)
  
  **Implementation Requirements**:
  - Settlement ownership transfer system
  - Hex bulk transfer with adjacency checking
  - Faction capital designation
  - Handle structure ownership
  - Handle population transfer
  - Update kingdom boundaries
  - UI showing seceded territory
  
- Current workaround: Manual settlement/hex transfer + GM adjudication
- Priority: High (dramatic narrative event, complex systems)
- Scope: Very Large (affects settlement, hex, faction, and economy systems)
- Note: Most ambitious incident in the game

---

### 29. Settlement Collapse
**ID**: `settlement-collapse` | **Tier**: Major | **Status**: ⚠️ Partial

**Implementation Notes**:
- ✅ Random settlement selection implemented
- ✅ **Failure**: `damageStructure("1d3", settlement: target)` works
  - Dice formula supported
  - Targets specific settlement
  
- ⚠️ **Critical Failure**: Partially implemented
  - ✅ `destroyStructure("1d3", settlement: target)` works
  - ❌ Need `downgradeSettlement(settlementId, levels)` game command
    - Reduces settlement level/tier
    - Reduces capacity limits
    - May cause settlement to exceed new limits
  
- Current workaround: Manual settlement downgrade
- Priority: Medium (same command needed for 3+ incidents)

---

### 30. Trade War
**ID**: `trade-war` | **Tier**: Major | **Status**: ⚠️ Enhancement Opportunity

**Implementation Notes**:
- ✅ Currently uses manual effects
- 💡 **Future Enhancement**: Same as Production Strike (#14) and Trade Embargo (#18)
  - Post-roll interaction for resource selection
  - Dice rolled in UI (2d4 or 4d4 - Major tier amounts)
  - Strategic player choice on which resource to sacrifice
- Current workaround: Manual resource deduction
- Priority: Low (same pattern as #14 and #18)

---

## Events (38 Total)

**Status**: All events use execute-first pattern. Most events use only resource modifiers and require no custom logic.

**Note**: Events have been fully migrated and work correctly. No known issues with event implementations. They benefit from the same execute-first pattern as incidents - resource modifiers from JSON are applied automatically.

**Future Enhancement Opportunities**:
- Some events could benefit from post-roll interactions (similar to incidents)
- Enhanced UI feedback for complex events
- Visual effects for particularly impactful events

---

## Missing Game Commands - Priority List

### High Priority (Complex, High Impact)

1. **`transferHexesToFaction(factionId, count, restrictions)`**
   - Needed for: Guerrilla Movement (#21), Secession Crisis (#28)
   - Impact: Major territory changes
   - Complexity: High (adjacency checking, settlement exclusion)

2. **`spawnFactionArmy(factionId, armyType, location)`**
   - Needed for: Guerrilla Movement (#21)
   - Impact: New enemy armies
   - Complexity: Medium (army creation, faction control)

3. **`transferSettlementToFaction(settlementId, factionId, options)`**
   - Needed for: Secession Crisis (#28)
   - Impact: Settlement secession (most dramatic incident)
   - Complexity: Very High (multi-system integration)

4. **Morale Check System** `performMoraleCheck(armyCount, options)`
   - Needed for: Mass Desertion Threat (#24), Upkeep phase
   - Impact: Army management
   - Complexity: Very High (new subsystem, not just a command)

### Medium Priority (Affects Multiple Incidents)

5. **`downgradeSettlement(settlementId, levels)`**
   - Needed for: Settlement Crisis (#16), Settlement Collapse (#29), Secession Crisis (#28)
   - Impact: Settlement level reduction
   - Complexity: Medium (capacity recalculation, limit checking)

6. **`removeHexes(count, filter)`**
   - Needed for: Border Raid (#19)
   - Impact: Territory loss
   - Complexity: Medium (border identification, production recalc)

### Low Priority (Quality of Life)

7. **`spendPlayerAction(characterSelection)`** ✅ **IMPLEMENTED**
   - Needed for: Assassination Attempt (#9), Noble Conspiracy (#25)
   - Impact: Action tracker (prevents character from acting)
   - Complexity: Low (adds entry to actionLog)
   - Implementation: Complete - marks character as having acted without taking action

### Enhancement Opportunities (Not Blocking)

8. **Resource Selection Interaction**
   - Needed for: Production Strike (#14), Trade Embargo (#18), Trade War (#30)
   - Impact: Better UX for player choice
   - Complexity: Low (post-roll interaction component)
   - Note: Currently works with manual effects

---

## Testing Recommendations

### Fully Automated (Ready to Test)
- All minor incidents (#1-8) with only resource modifiers
- Structure damage incidents (#11, #12, #15, #20, #26, #27)
- Faction attitude incidents (#4, #10, #22, #23)
- All events (38 events)

### Partially Automated (Test Core, Manual Effects)
- Settlement Crisis (#16) - structure damage automated, downgrade manual
- Mass Exodus (#13) - structure damage automated, worksite manual
- Settlement Collapse (#29) - structure operations automated, downgrade manual

### Manual Testing Required (Complex Game Commands Missing)
- Guerrilla Movement (#21) - needs hex/army commands
- Mass Desertion Threat (#24) - needs morale check system
- Secession Crisis (#28) - needs settlement transfer system
- Border Raid (#19) - needs hex removal system

---

## Related Documentation

- [Incident Pipeline Audit](./INCIDENT_PIPELINE_AUDIT.md) - Architectural analysis
- [Resource Modification Audit](./resource-modification-audit.md) - Execute-first pattern details
- [Pipeline Patterns](../systems/core/pipeline-patterns.md) - Implementation guide
- [Pipeline Coordinator](../systems/core/pipeline-coordinator.md) - Pipeline flow documentation

