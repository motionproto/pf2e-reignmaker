# Manual Effects Automation - Analysis and Recommendations

**Date:** 2025-11-06  
**Status:** In Progress (Structure Damage/Destruction: ✅ Complete)

## Overview

Analysis of all 37 events revealed several **manual effects** that can now be automated with our improved system. This document prioritizes these automation opportunities.

---

## High Priority: Structure Damage/Destruction ✅ COMPLETED

**Status:** ✅ Fully Implemented (2025-11-06)

**Affected Events (8):**
- `monster-attack` (failure: damage, critical failure: destroy)
- `local-disaster` (failure: damage, critical failure: destroy)
- `undead-uprising` (failure: damage, critical failure: destroy + damage)
- `raiders` (critical failure: damage)
- `military-exercises` (critical failure: damage)
- `magical-discovery` (critical failure: damage)
- `drug-den` (critical failure: damage)
- `inquisition` (critical failure: destroy)

**Implementation Details:**

**Files Created:**
1. `src/services/structures/targeting.ts` - StructureTargetingService
   - Intelligent structure selection with category preferences
   - Tier safety constraint (only targets highest tier per category)
   - Fallback to random selection when preferred categories unavailable

2. `src/data-compiled/event-structure-targeting.ts`
   - Targeting configurations for each event
   - Maps event IDs to category preferences (e.g., raiders target commerce/logistics)

**Files Modified:**
1. `src/services/GameCommandsService.ts`
   - Implemented `damageStructure()` - marks structures as damaged
   - Implemented `destroyStructure()` - handles tier-based destruction/downgrade
   - Chat messages for both operations

**Key Features:**
- ✅ Filters undamaged structures only
- ✅ Category-based targeting (e.g., magical-discovery targets knowledge-magic structures)
- ✅ Tier safety (only damages highest tier per category to prevent cascade failures)
- ✅ Tier 1 destroyed = removed entirely
- ✅ Tier 2+ destroyed = downgrade to previous tier (damaged)
- ✅ Chat notifications with settlement and structure names
- ✅ Automatic fallback to random selection if preferred categories unavailable

**Design Decisions:**
- ✅ Damages structures across all settlements (kingdom-wide)
- ✅ No structure immunity (all are eligible)
- ✅ Destroyed structures tracked via downgrade system or removal
- ✅ Damaged structures provide NO bonuses (already implemented in structuresService)

---

## Medium Priority: Hex Claiming ✅ COMPLETED

**Status:** ✅ Fully Implemented (2025-11-06)

**Affected Events (1):**
- `land-rush` (success: +1 hex, critical success: +2 hexes)

**Implementation Details:**
- Updated event to use `claim_hex` resource type (routed to special effect handler)
- Interactive hex selection using existing `hexSelectorService`
- Validation: Uses `validateClaimHex()` (must be adjacent to existing territory)
- Applies to kingdom.hexes array (sets claimedBy = PLAYER_KINGDOM)
- Chat notification with claimed hex IDs
- Player can cancel selection if desired

**Files Modified:**
1. `src/services/GameCommandsService.ts` - Added `claimHex()` method with interactive selection
2. `data/events/land-rush.json` - Changed `"hex"` to `"claim_hex"` resource type

**Key Features:**
- ✅ Interactive hex selection (player chooses specific hexes)
- ✅ Full validation (adjacency, not already claimed)
- ✅ Reuses existing hex selection UI from Claim Hexes action
- ✅ Can cancel selection without penalty
- ✅ Chat notifications show which hexes were claimed

---

## Low Priority: Worksite Removal

**Affected Events (1):**
- `natural-disaster` (critical failure: "Any worksites are removed from the hex unrest")

**Current Implementation:**
Just a message in the effect description - no automated removal.

**Automation Requirements:**
1. Identify which hex(es) were affected by the disaster
2. Remove worksites from those hexes
3. Potentially prompt player to select hex if multiple disasters occur
4. Log which worksites were lost

**Design Considerations:**
- How to determine which hex? Random? Player choice?
- Should farmlands/mines be different from generic worksites?

---

## Low Priority: Structure Demand Tracking

**Affected Events (1):**
- `demand-structure` (citizens demand a specific structure be built)

**Current Implementation:**
Applies unrest penalties but doesn't specify which structure or track if demand is met.

**Automation Requirements:**
1. Randomly select a structure type the kingdom doesn't have (or has fewer than demand)
2. Store "demanded structure" in event instance
3. Display prominently in UI
4. Auto-resolve event if that structure is built before event expires
5. Apply ongoing penalties until resolved

**Design Considerations:**
- Should demands be realistic (only affordable structures)?
- Should demands consider settlement tier requirements?
- How to track if demand is satisfied?

---

## Low Priority: Territory Expansion Demand

**Affected Events (1):**
- `demand-expansion` (citizens demand new territory)

**Current Implementation:**
Applies ongoing unrest penalties but doesn't track if demand is met.

**Automation Requirements:**
1. Store current territory size when event triggers
2. Track territory growth during event lifetime
3. Auto-resolve if X hexes claimed (what's the threshold?)
4. Apply ongoing penalties until resolved

**Design Considerations:**
- How many hexes constitute "satisfying expansion demand"?
- Should it be based on percentage growth or absolute numbers?

---

## Low Priority: Diplomatic Relations

**Affected Events (1):**
- `diplomatic-overture` (improve relations by one step, max Friendly without diplomatic structures)

**Current Implementation:**
Message describes the effect but no automation to actually change faction relations.

**Automation Requirements:**
1. Prompt player to select which faction
2. Check current relationship level
3. Improve by one step (Hostile → Unfriendly → Neutral → Friendly → Helpful)
4. Respect "Friendly" cap if kingdom lacks diplomatic structures
5. Display notification of relationship change

**Design Considerations:**
- How to integrate with faction system (if it exists)?
- Should some factions be ineligible (already Helpful, etc.)?
- What counts as a "diplomatic structure"?

---

## Implementation Summary: Structure Damage/Destruction ✅

**Completed Steps:**
1. ✅ Designed structure damage system (uses existing StructureCondition.DAMAGED flag)
2. ✅ Implemented `damageStructure()` in GameCommandsService
3. ✅ Implemented `destroyStructure()` in GameCommandsService
4. ✅ Added chat notifications for structure damage/destruction
5. ⏳ Test with affected events (ready for testing)
6. ⏳ Update event descriptions if needed (pending testing)

**Next Recommendation: Hex Claiming**
- Affects 1 event (`land-rush`)
- Moderate complexity
- Requires hex selection UI
- Integrates with territory system

---

## Future Considerations

As we implement these automations, consider:
- Creating a generic "player selection" pattern for effects requiring choices
- Building a notification system for complex automated effects
- Tracking which effects were automated vs. manual for GM override
- Adding "undo" functionality for automated effects (if GM disagrees with random selection)
