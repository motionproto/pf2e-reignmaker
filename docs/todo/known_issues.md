# Known Issues and Technical Debt

This document tracks intentional naming inconsistencies and technical debt decisions made for backward compatibility or other practical reasons.

## Critical Architecture Issues

### Svelte Reactivity - Mutation Anti-Pattern

**Status:** Partially Fixed (OutcomePreviewService only)  
**Priority:** HIGH - Affects core stability  
**Discovered:** 2025-11-30

**Problem:**

Service layer was using imperative mutations (`.push()`, direct assignment) which breaks fine-grained Svelte reactivity. This is an **architectural issue**, not a phase-specific bug.

**Impact:**

- Incidents: Outcome display didn't appear after roll (const reactive statements)
- Potential: Any feature using derived stores or const reactive statements
- Hidden: Actions/Events worked due to top-level subscriptions masking the issue

**Root Cause:**

```typescript
// ❌ Mutation doesn't change array reference
await updateKingdom(kingdom => {
  kingdom.pendingOutcomes.push(preview);  // No reference change
});
```

Svelte's fine-grained reactivity (const statements, derived stores) requires **reassignment**:

```typescript
// ✅ Reassignment changes reference, triggers all reactive patterns
await updateKingdom(kingdom => {
  kingdom.pendingOutcomes = [...kingdom.pendingOutcomes, preview];
});
```

**Fixes Applied:**

- ✅ OutcomePreviewService.createInstance()
- ✅ OutcomePreviewService.storeOutcome()
- ✅ OutcomePreviewService.createMinimalOutcomePreview()

**Remaining Work:**

- [ ] Full codebase audit for mutations
- [ ] Fix all service layer mutations
- [ ] Update coding standards
- [ ] Add linting rules
- [ ] Create helper utilities

**See:** `docs/todo/svelte-reactivity-audit.md` for complete audit plan  
**See:** `docs/coding-standards/svelte-reactivity.md` for standards

---

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

#### Economy & Trade
- `market` → "General Store"
- `market-hall` → "Market"
- `commercial-district` → "Merchants' Quarter"
- `grand-exchange` → "Trade Hub"

#### Military & Defense
- `barracks` → "Garrison"
- `training-grounds` → "Military Academy"

#### Entertainment & Culture
- `theater` → "Theater"
- `opera-house` → "Grand Theater"

#### Industry & Crafts
- `smithy` → "Smithy"
- `craftsmen-quarter` → "Artisan District"
- `industrial-complex` → "Manufactory"

### Resource Structures

#### Luxury Goods
- `jeweler` → "Jeweler"
- `exotic-artisan` → "Luxury Store"

#### Food & Drink
- `brewery` → "Brewery"

#### Utility & Special
- `waterway` → "Waterway"
- `lumber-mill` → "Sawmill"
- `granary` → "Granary"
- `tannery` → "Tannery"

### Military Structures

- `wall` → "Wall"
- `watchtower` → "Watchtower"
- `castle` → "Castle"

### Upgrades

- `fortification` → "Fortification"

---

## Hex Selector Territory Layer Issue

**Status:** Investigating  
**Priority:** Medium  
**Details:** See `docs/todo/hex-selector-territory-layer-issue.md`

**Summary:** The hex selector doesn't properly handle territory layer state and needs refactoring to:
- Track selected hexes independently of territory layer
- Validate selections against current kingdom data
- Handle edge cases (kingdom boundaries, existing claims, roads, settlements)

---

## Legacy Incidents Without Pipeline Implementations

**Status:** Won't Fix (by design)  
**Priority:** Low  

Some incidents in `data/incidents/*.json` don't have corresponding pipeline implementations in `src/pipelines/incidents/`. These are **intentionally omitted** because:

1. They require complex UI not yet built (e.g., "Choose random hex and roll for its terrain feature")
2. They're redundant with other incidents
3. They're from the source material but don't fit our game model

**Note:** All implemented incidents are tracked in `src/constants/migratedIncidents.ts`.

---

## Modifier Duration Display

**Status:** Cosmetic Issue  
**Priority:** Low  

Some modifiers display duration as "Until Next Turn" when they should say "Next [Phase]" or "Ongoing". This is a display-only issue and doesn't affect functionality. The actual duration tracking works correctly.

---

## Kingdom Data Migration Warnings

**Status:** Expected Behavior  
**Priority:** Informational  

When loading older saved games, you may see console warnings about missing kingdom data fields. This is expected - the system will automatically upgrade the data structure to the current version. These warnings are informational and do not indicate a problem.

---

## Army Consumption Calculation Edge Cases

**Status:** Known Limitation  
**Priority:** Low  

Army consumption calculations have some edge cases with very large armies (50+ units) where rounding errors can accumulate. This is acceptable for gameplay purposes and would require significant refactoring to address perfectly.

---

## Settlement Skill Bonus Display

**Status:** Visual Polish  
**Priority:** Low  

Settlement skill bonuses aren't always immediately visible in the UI without hovering or clicking. This is a UX polish item, not a functional bug. The bonuses are correctly applied to rolls.

---

## Event/Incident JSON Format Evolution

**Status:** Tech Debt  
**Priority:** Low  

Events and incidents have gone through several format iterations. Some older files use slightly different field names (e.g., `msg` vs `description`). The loader handles both formats, but ideally all data files should be migrated to the newest format.

**See:** `docs/refactoring/INCIDENT_PIPELINE_AUDIT.md` for format standards

---

## Missing Tooltips

**Status:** UI Polish  
**Priority:** Low  

Some UI elements lack tooltips or help text. This is ongoing UX improvement work. Core functionality is complete, but discoverability could be improved.

---

## Browser Compatibility

**Status:** Known Limitation  

This module is tested primarily in Chrome/Edge. Firefox and Safari should work but may have minor CSS rendering differences. WebGL features (hex rendering) require a modern browser with WebGL support.

---

## Performance with Very Large Kingdoms

**Status:** Acceptable  
**Priority:** Monitor  

Kingdoms with 100+ hexes, 20+ settlements, and 50+ structures may see some performance degradation in the kingdom sheet. This is acceptable for typical gameplay (most kingdoms will be much smaller) but could be optimized if needed.

**Mitigation:** Use pagination/virtualization for large lists (already implemented for most views)

---

