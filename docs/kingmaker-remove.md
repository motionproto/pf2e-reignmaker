# Kingmaker Module Integration - Removal Plan

## Overview

This document tracks the integration points between PF2E ReignMaker and the PF2E Kingmaker module. The goal is to make ReignMaker fully independent, using Kingmaker only for optional initial data import.

## Current Architecture (2025-10-22)

### ✅ Completed: Read Independence
- **Map Overlays** - Use only `$kingdomData` (completed)
- **Territory/Border/Roads/Terrain** - All read from kingdom data
- **All UI Components** - Use `$kingdomData` from KingdomStore

### 🔄 In Progress: Kingmaker as Optional Import
- **Initial Import** - Import hex data, settlements, features from Kingmaker once during setup
- **Runtime** - All operations use our kingdom data as canonical source
- **Write-back** - Optional write operations to Kingmaker (if installed)

## Kingmaker Integration Points

### 1. Incoming Sync Hooks (❌ TO BE REMOVED)

**Location:** `src/api/kingmaker.ts`

These hooks listen for changes FROM Kingmaker and sync TO our data:

```typescript
Hooks.on('pf2e.kingmaker.hexClaimed', syncHandler);
Hooks.on('pf2e.kingmaker.hexUpdated', syncHandler);
Hooks.on('pf2e.kingmaker.settlementBuilt', syncHandler);
Hooks.on('pf2e.kingmaker.worksiteBuilt', syncHandler);
Hooks.on('pf2e.kingmaker.stateChanged', syncHandler);
```

**Reason for removal:** We want kingdom data to be the canonical source, not synced from Kingmaker at runtime.

**When to remove:** After we implement our own claim hex/build settlement workflows.

---

### 2. Outgoing Write Operations (✅ KEEP AS OPTIONAL)

**Location:** `src/services/territory/index.ts`

These functions write TO Kingmaker state (optional write-back):

#### a. `updateKingmakerMapForSettlement(settlement)`
Writes settlement features back to Kingmaker hex map.

#### b. `syncRoadsToKingmaker()`
Syncs road data to Kingmaker hex state.

#### c. `syncHexesToKingmaker()`
Syncs hex claims to Kingmaker state.

**Reason to keep:** Allows users to see updates on Kingmaker's hex map (if they use both modules).

**Make optional:** Check if Kingmaker is installed before calling these functions.

---

### 3. Action Write Operations (✅ KEEP AS OPTIONAL)

**Location:** `src/actions/claim-hexes/ClaimHexesAction.ts`

```typescript
// Marks hex as claimed in Kingmaker state
const km = (globalThis as any).kingmaker;
if (km?.state) {
  km.state.setHexClaimed(hexId, true);
}
```

**Reason to keep:** Writes back to Kingmaker if module is present.

**Make optional:** Already checks if Kingmaker exists before writing.

---

### 4. Initial Import (✅ KEEP)

**Location:** `src/view/kingdom/components/WelcomeDialog.svelte`

Imports hex data, settlements, features from Kingmaker during initial setup.

**Reason to keep:** This is the one-time import that seeds our kingdom data.

**Already optional:** Only runs when user selects "Stolen Lands" import option.

---

## Manual Workflows Currently Needed

Until ReignMaker implements these features natively, users must use Kingmaker module:

1. **Claim Hex** - Use Kingmaker hex editing tools to claim hexes
2. **Build Worksites** - Use Kingmaker to add worksite features to hexes
3. **Edit Hex Features** - Use Kingmaker to modify hex terrain/features
4. **Settlement Placement** - Use Kingmaker to place settlement on map

## Removal Timeline

### Phase 1: ✅ COMPLETED (2025-10-22)
- Remove Kingmaker as read source for map overlays
- All overlays use `$kingdomData` exclusively

### Phase 2: 🔄 CURRENT
- Document integration points (this file)
- Keep Kingmaker in place for manual workflows
- Keep write-back operations as optional

### Phase 3: 📋 FUTURE
**When:** After implementing ReignMaker's claim hex workflow

- Disable incoming sync hooks
- Make write-back operations optional via setting
- Add setting: "Sync to Kingmaker Map" (default: true if installed)

### Phase 4: 📋 FUTURE  
**When:** After implementing all hex editing features

- Remove all Kingmaker dependencies
- Keep only import code for initial setup
- Kingmaker becomes 100% optional

## Property Names

The following property names contain "kingmaker" but are just field names in our data structure (not module dependencies):

- `kingmakerLocation` - Settlement property storing original map coordinates
- `kingmakerFeatures` - Hex property storing imported feature data
- `kingmakerIdToOffset()` - Coordinate conversion utility function
- `createKingmakerSettlementId()` - ID generation function

**Decision:** Keep these names for now as they reference the coordinate system, not the module.

## Settings

Current settings that reference Kingmaker:

- `hideKingmakerHexControls` - Hide Kingmaker's hex controls button
- `hideKingmakerShowRegions` - Hide Kingmaker's show regions button

**Purpose:** UI cleanup to avoid duplicate buttons.

**Keep:** Yes, these are helpful for users running both modules.

## Testing Checklist

Before removing Kingmaker hooks:

- [ ] Implement Claim Hex action in ReignMaker
- [ ] Implement Build Worksite action in ReignMaker
- [ ] Implement Hex Feature editing in ReignMaker
- [ ] Test that all map overlays work without Kingmaker installed
- [ ] Test that initial import still works from Kingmaker
- [ ] Test that write-back operations are truly optional
- [ ] Verify kingdom data is canonical source for all operations

## Summary

**Current State (2025-10-22):**
- ✅ Read operations: Fully independent (use kingdom data)
- 🔄 Write operations: Optional write-back to Kingmaker
- 🔄 Manual workflows: Still require Kingmaker for some operations
- 📋 Future: Remove hooks after implementing ReignMaker workflows

**Architecture Goal:**
```
Import:   Kingmaker → (one-time) → Kingdom Data
Runtime:  Kingdom Data (canonical source)
Optional: Kingdom Data → (write-back) → Kingmaker (if installed)
