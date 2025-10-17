# Hex Selection Feature - Implementation Guide

## Overview

This document outlines the technical approach for implementing a hex selector feature that allows users to click on the Kingmaker map and return hex coordinates to the Reignmaker module.

**Use Cases:**
- Creating settlements by clicking map hexes
- Assigning hex locations to existing settlements
- Quick hex coordinate selection for any kingdom feature

**Estimated Effort:** 1-4 days (depending on approach)

---

## Current State

### ✅ What We Have

1. **Bidirectional Kingmaker Integration**
   - ✅ Reading hex data from Kingmaker module
   - ✅ Writing settlement data back to Kingmaker map
   - ✅ Coordinate transformation working (fixed bug: `(100 * x) + y`)

2. **Hex Coordinate System**
   - Numeric format: `6019` (internal storage)
   - Display format: `60:19` or `60.19` (x:y coordinates)
   - Conversion logic exists in `TerritoryService`

3. **Existing UI Components**
   - `SettlementLocationPicker.svelte` - Dropdown hex selector
   - Lists hexes with settlement features from Kingmaker
   - Manual coordinate entry not yet available

### ❌ What We Need

- Interactive map-based hex selection
- Communication channel from Kingmaker map → Reignmaker module
- UI trigger/button to activate selection mode

---

## Technical Approaches

### Option 1: Hook into Kingmaker's Events (EASIEST - 1-2 days)

**Concept:** Listen for Kingmaker module's hex selection events.

**Prerequisites to Investigate:**
1. Check if Kingmaker exposes hex selection hooks
2. Look in `_pf2e-kingmaker-module/pf2e-km-compiled.mjs` for:
   - `Hooks.call('kingmaker.hexSelected', ...)`
   - `Hooks.call('kingmaker.hexClicked', ...)`
   - Public API methods

**Implementation:**
```typescript
// src/services/hex-selector/index.ts
export class HexSelectorService {
  private callback: ((coords: { x: number, y: number }) => void) | null = null;
  private hookId: number | null = null;

  /**
   * Start listening for hex selections from Kingmaker map
   */
  startListening(callback: (coords: { x: number, y: number }) => void): void {
    this.callback = callback;
    
    // Hook into Kingmaker's hex selection event (if it exists)
    this.hookId = Hooks.on('kingmaker.hexSelected', (hexId: number) => {
      const coords = this.convertHexId(hexId);
      callback(coords);
    });
    
    console.log('Hex selector listening for Kingmaker hex selections');
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.hookId !== null) {
      Hooks.off('kingmaker.hexSelected', this.hookId);
      this.hookId = null;
    }
    this.callback = null;
  }

  /**
   * Convert numeric hex ID to coordinates
   */
  private convertHexId(numericId: number): { x: number, y: number } {
    const x = Math.floor(numericId / 100);
    const y = numericId % 100;
    return { x, y };
  }
}

export const hexSelectorService = new HexSelectorService();
```

**UI Integration:**
```svelte
<!-- In settlement creation dialog -->
<script>
import { hexSelectorService } from '../../services/hex-selector';
import { onMount, onDestroy } from 'svelte';

let isSelectingFromMap = false;

function startMapSelection() {
  isSelectingFromMap = true;
  
  hexSelectorService.startListening((coords) => {
    settlement.location = coords;
    isSelectingFromMap = false;
    hexSelectorService.stopListening();
    
    ui.notifications.info(`Selected hex ${coords.x}:${coords.y}`);
  });
  
  ui.notifications.info('Click a hex on the Kingmaker map...');
}

onDestroy(() => {
  hexSelectorService.stopListening();
});
</script>

<button on:click={startMapSelection}>
  <i class="fas fa-map-pin"></i>
  {isSelectingFromMap ? 'Selecting from map...' : 'Select from map'}
</button>
```

**Pros:**
- Clean integration using Foundry's hook system
- No UI injection required
- Works with Kingmaker's native interactions

**Cons:**
- Depends on Kingmaker exposing the right hooks (unknown)
- May need to request feature from Kingmaker module author

---

### Option 2: Canvas Click Integration (MODERATE - 2-3 days)

**Concept:** Listen to Foundry canvas clicks and calculate hex coordinates.

**Prerequisites:**
1. Understand Kingmaker's hex grid layout (size, offset, orientation)
2. Access to canvas layer where hex grid is drawn
3. Pixel-to-hex coordinate math

**Implementation:**
```typescript
export class CanvasHexSelector {
  private active = false;
  private callback: ((coords: { x: number, y: number }) => void) | null = null;

  startSelecting(callback: (coords: { x: number, y: number }) => void): void {
    this.active = true;
    this.callback = callback;
    
    // Hook into canvas clicks
    canvas.stage.on('click', this.handleCanvasClick.bind(this));
    
    // Change cursor to indicate selection mode
    canvas.app.renderer.view.style.cursor = 'crosshair';
  }

  private handleCanvasClick(event: PIXI.InteractionEvent): void {
    if (!this.active) return;
    
    const position = event.data.getLocalPosition(canvas.stage);
    const hexCoords = this.pixelToHex(position.x, position.y);
    
    if (hexCoords && this.callback) {
      this.callback(hexCoords);
      this.stopSelecting();
    }
  }

  private pixelToHex(x: number, y: number): { x: number, y: number } | null {
    // Would need to reverse-engineer Kingmaker's hex grid math
    // This is pseudocode - actual implementation depends on grid system
    
    const hexSize = 50; // Need to determine this
    const hexX = Math.floor(x / hexSize);
    const hexY = Math.floor(y / hexSize);
    
    // Validate hex exists in Kingmaker state
    const hexId = (hexX * 100) + hexY;
    const km = globalThis.kingmaker;
    
    if (km?.state?.hexes?.[hexId]) {
      return { x: hexX, y: hexY };
    }
    
    return null;
  }

  stopSelecting(): void {
    this.active = false;
    canvas.stage.off('click', this.handleCanvasClick);
    canvas.app.renderer.view.style.cursor = 'default';
  }
}
```

**Pros:**
- Independent of Kingmaker's internal APIs
- Full control over selection UX

**Cons:**
- Need to reverse-engineer hex grid calculations
- Potential precision issues
- May break if Kingmaker changes grid rendering

---

### Option 3: Inject UI into Kingmaker HexHUD (CLEANEST - 3-4 days)

**Concept:** Add a "Send to Reignmaker" button to Kingmaker's hex editing interface.

**Implementation:**
```typescript
export function injectHexSelectorButton(): void {
  // Hook into Kingmaker's HexHUD rendering
  Hooks.on('renderKingmakerHexHUD', (app: Application, html: JQuery) => {
    // Find the hex ID from the HUD
    const hexId = app.object?.hexId;
    if (!hexId) return;
    
    // Create button
    const button = $(`
      <button class="reignmaker-select-hex" title="Send to Reignmaker">
        <i class="fas fa-crown"></i> Select for Settlement
      </button>
    `);
    
    button.on('click', () => {
      const coords = convertHexId(hexId);
      
      // Broadcast selection via Foundry hook
      Hooks.call('reignmaker.hexSelected', coords);
      
      ui.notifications.info(`Selected hex ${coords.x}:${coords.y}`);
      app.close();
    });
    
    // Inject into HexHUD
    html.find('.hex-actions').append(button);
  });
}

// In your settlement UI
Hooks.on('reignmaker.hexSelected', (coords) => {
  // Auto-populate settlement location
  updateSettlementLocation(coords);
});
```

**Pros:**
- Clear UX - users know exactly what they're doing
- Uses Kingmaker's existing hex interaction
- No coordinate calculation needed

**Cons:**
- UI injection can be fragile
- May break with Kingmaker updates
- Requires knowing HexHUD structure

---

## Investigation Steps

### 1. Check Kingmaker's Available Hooks

```bash
# Search for exposed hooks in Kingmaker module
cd _pf2e-kingmaker-module
grep -r "Hooks.call" pf2e-km-compiled.mjs

# Look for hex-related events
grep -i "hex" pf2e-km-compiled.mjs | grep -i "hook\|event\|call"
```

### 2. Test Hex Selection in Browser

1. Open Kingmaker map in Foundry
2. Open browser console (F12)
3. Run: `Hooks.on('*', (event, ...args) => console.log(event, args))`
4. Click various hexes
5. Look for hex-related events in console

### 3. Explore Kingmaker Global

```javascript
// In browser console
console.log(kingmaker);
console.log(kingmaker.region?.hexes);
console.log(kingmaker.state?.hexes);

// Check for selection methods
console.dir(kingmaker);
```

### 4. Check HexHUD Template

```bash
# View HexHUD structure
cat _pf2e-kingmaker-module/templates/hex-hud.hbs
```

---

## Recommended Approach

**Phase 1: Investigation (2-4 hours)**
1. Search Kingmaker code for exposed hooks
2. Test hex clicking behavior in browser
3. Document available integration points

**Phase 2: Implementation (Based on findings)**

**If Kingmaker exposes hooks:**
→ Use Option 1 (1-2 days) ✅

**If no hooks available:**
→ Use Option 3 (3-4 days) - More reliable than Option 2

**Phase 3: UI Integration (4-8 hours)**
1. Add "Select from Map" button to settlement dialogs
2. Show visual feedback during selection
3. Handle edge cases (invalid hexes, cancellation)

---

## Code Structure

```
src/
├── services/
│   └── hex-selector/
│       ├── index.ts              # Main service
│       ├── KingmakerHexHooks.ts  # Hook listeners
│       └── CanvasHexSelector.ts  # Canvas-based fallback
├── view/
│   └── kingdom/
│       └── tabs/
│           └── settlements/
│               └── HexSelectorButton.svelte  # Reusable button component
```

---

## Alternative: Simple Manual Entry

**Quickest Solution (1-2 hours):**

Add manual coordinate entry to `SettlementLocationPicker`:

```svelte
<input 
  type="text" 
  placeholder="60:19"
  pattern="[0-9]{1,3}:[0-9]{1,2}"
  on:change={handleManualEntry}
/>
```

Users can:
1. Click hex in Kingmaker to see coordinates in HexHUD
2. Type coordinates manually into Reignmaker
3. Not elegant, but works immediately

---

## Next Steps

1. ⬜ Search `pf2e-km-compiled.mjs` for available hooks
2. ⬜ Test hex clicking with browser console logging
3. ⬜ Choose implementation approach based on findings
4. ⬜ Create prototype in separate branch
5. ⬜ Test with actual Kingmaker map
6. ⬜ Document any Kingmaker APIs discovered

---

## Resources

- **Kingmaker Module Path:** `_pf2e-kingmaker-module/`
- **Hex Coordinate Format:** `(100 * x) + y = hexId`
- **Current Integration:** `src/services/territory/index.ts`
- **Existing UI:** `src/view/kingdom/tabs/settlements/SettlementLocationPicker.svelte`

---

*Last Updated: 2025-10-17*
*Status: Research & Planning Phase*
