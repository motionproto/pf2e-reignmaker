# Deal with Unrest

**ID:** `deal-with-unrest`  
**Category:** Uphold Stability  
**Data File:** `data/player-actions/deal-with-unrest.json`

---

## Current Implementation Status

### ✅ Implemented
- Typed modifier system for unrest reduction
- Skill variety (8 skills: performance, religion, intimidation, diplomacy, arcana, medicine, occultism, acrobatics)
- Correct outcome modifiers matching Actions.md rules

**Verification:**
- Critical Success: -3 unrest ✅
- Success: -2 unrest ✅
- Failure: -1 unrest ✅
- Critical Failure: 0 unrest ✅

### ⏳ Not Implemented
- None required - this action is complete for basic functionality

---

## What Needs to Be Done

### 1. Game Effects
**Status:** Not needed - resource modifiers handle everything

This action only reduces unrest directly via modifiers. No additional game effects required.

### 2. Custom UI
**Status:** Not needed - standard action outcome display is sufficient

No special UI required. The action:
- Rolls a skill check
- Applies unrest reduction based on success level
- No choices, selections, or multi-step processes

### 3. Data File Review
**Status:** ✅ Correct

The data file accurately reflects the Actions.md rules. No changes needed.

---

## Complexity Rating

**🟢 Simple**
- Resource modifiers only
- No custom UI needed
- No game effects required
- Already fully functional

---

## Dependencies

None

---

## Implementation Priority

**Phase 1** (Already Complete) - This action is fully implemented using typed modifiers

---

## Notes

This is one of the simplest actions in the system. It's a good reference example for:
- Multiple skill options (8 different approaches)
- Clean modifier application
- End-of-turn timing (noted in Actions.md but doesn't affect implementation)
- Even failure provides benefit (reduces unrest by 1)
