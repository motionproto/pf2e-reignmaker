# Known Issues and Technical Debt

This document tracks intentional naming inconsistencies and technical debt decisions made for backward compatibility or other practical reasons.

## Structure ID/Name Mismatches

Many structures have internal IDs that don't match their display names. This is intentional to maintain backward compatibility with existing saved game data. The IDs are used internally for data persistence, while the names are what players see in the UI.

### Skill Structures

#### Civic & Governance
- `town-hall` → "Meeting House"
- `city-hall` → "Town Hall"
- `diplomatic-quarter` → "Council Chambers"
- `grand-forum` → "Royal Court"

#### Faith & Nature
- `shrine` → "Sacred Grove"
- `temple` → "Shrine"
- `temple-district` → "Temple"
- `grand-basilica` → "Cathedral"

#### Knowledge & Magic
- `scholars-table` → "Schoolhouse"
- `university` → "Mage's Tower"
- `arcane-academy` → "Arcane University"

#### Medicine & Healing
- `medical-college` → "Medical Academy"

#### Military & Training
- `gymnasium` → "Sparring Ring"
- `warriors-hall` → "Champions Hall"
- `military-academy` → "Grand Coliseum"

#### Hospitality (formerly Performance & Culture)
- **Category:** `performance-culture` → "Hospitality"
- **Enum:** `PERFORMANCE_CULTURE` → "Hospitality"
- **Data File:** `skill-performance-culture.json`
- **Structures:**
  - `buskers-alley` → "Busker's Row"
  - `famous-tavern` → "Minstrel's Stage"
  - `performance-hall` → "Theater"
  - `grand-amphitheater` → "Grand Opera House"

### Support Structures

#### Culture
- `open-stage` → "Dive Bar"
- `amphitheater` → "Public House"
- `playhouse` → "Respectable Tavern"
- `auditorium` → "Pleasure Palace"

#### Diplomacy
- `diplomatic-quarter-support` → "Diplomatic Quarter"

## Why These Mismatches Exist

**Reason for Inconsistencies:**  
These structures were renamed during development to better reflect their actual game function and thematic content. The internal identifiers were intentionally kept unchanged to maintain backward compatibility with existing saved game data.

**Impact:**
- No functional impact on gameplay
- Display names correctly show updated names in all UI elements
- Saved game data remains compatible across versions
- Code references use the old IDs internally

**Resolution:**  
This is a permanent design decision. **Do not rename internal identifiers without a comprehensive data migration strategy** that updates all existing saved games.

## Development Guidelines

When working with structures:

1. **Adding new structures:** Use matching IDs and names (e.g., `id: "hunters-lodge"`, `name: "Hunter's Lodge"`)
2. **Renaming existing structures:** Only update the display name, leave the ID unchanged
3. **Refactoring:** Document any new mismatches in this file
4. **Data migration:** If IDs must change, implement a migration script that updates all saved game data

---

## Future Items

### Fame Reroll Bonus Duplication

**Issue:** When spending fame to reroll a check, skill bonuses and stat bonuses are being duplicated in the reroll calculation.

**Impact:** Rerolls with fame produce incorrect results with inflated bonuses, giving players an unintended advantage.

**Status:** Needs investigation and fix

---

## Architecture Improvements

### Dual Storage Pattern in EventsPhase (Non-critical)

**Issue:** `EventsPhase.svelte` uses a dual storage pattern for event resolutions:
- Local UI state: `eventResolution` + `eventResolved` (current event only)
- Kingdom state: `currentEventInstance.appliedOutcome` (ongoing events)

**Why it exists:** The local state provides instant UI updates, while kingdom state ensures persistence and multi-client sync.

**Improvement opportunity:** Eliminate `eventResolution`/`eventResolved` and use only `currentEventInstance.appliedOutcome` for both current and ongoing events. This would:
- ✅ Single source of truth (kingdom state only)
- ✅ Consistent behavior for current & ongoing events
- ✅ Simpler code (~50 lines removed)
- ⚠️ Might have tiny delay for UI updates (waiting for kingdom state)

**Priority:** Low - System works correctly as-is. This is purely a code simplification.

**References:** 
- File: `src/view/kingdom/turnPhases/EventsPhase.svelte`
- Lines: 48-62 (local state variables)

---

Additional known issues and technical debt items will be documented here as they arise.
