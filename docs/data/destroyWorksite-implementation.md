# Destroy Worksite Implementation

**Feature:** Automated worksite destruction with visual map feedback  
**Implemented:** 2025-01-30  
**Example Usage:** Bandit Raids incident (critical failure)

---

## Overview

The `destroyWorksite` game command provides a complete solution for randomly selecting and destroying worksites, with full visual feedback on the map.

## Architecture

### 1. Game Command Handler

**File:** `src/services/gameCommands/handlers/DestroyWorksiteHandler.ts`

**Features:**
- Randomly selects worksites from claimed hexes
- Generates preview badge with worksite details
- Stores metadata for map display
- Returns `PreparedCommand` with commit function

**Usage:**
```typescript
const handler = new DestroyWorksiteHandler();
const preparedCommand = await handler.prepare(
  { type: 'destroyWorksite', count: 1 },
  context
);

// Preview badge shows selected worksite
const badge = preparedCommand.outcomeBadge;

// Metadata contains hex IDs and worksite details
const { destroyedHexIds, destroyedWorksites } = preparedCommand.metadata;

// Commit to actually destroy the worksite
await preparedCommand.commit();
```

### 2. Pipeline Integration

**File:** `src/pipelines/incidents/minor/bandit-raids.ts`

**Key Components:**

#### A. Static Preview Badge (Before Roll)
```typescript
outcomes: {
  criticalFailure: {
    description: 'Major bandit raids devastate the area.',
    modifiers: [...],
    outcomeBadges: [
      textBadge('1 random worksite destroyed', 'fa-hammer-war', 'negative')
    ]
  }
}
```

Shows in "Possible Outcomes" display when check card first opens.

#### B. Dynamic Outcome Badge (After Roll)
```typescript
preview: {
  calculate: async (ctx) => {
    if (ctx.outcome !== 'criticalFailure') {
      return { resources: [], outcomeBadges: [], warnings: [] };
    }

    // Call handler to select worksite and generate badge
    const handler = new DestroyWorksiteHandler();
    const preparedCommand = await handler.prepare(
      { type: 'destroyWorksite', count: 1 },
      ctx
    );

    // Store metadata for postApplyInteractions
    Object.assign(ctx.metadata, preparedCommand.metadata);
    ctx.metadata._preparedDestroyWorksite = preparedCommand;

    return {
      resources: [],
      outcomeBadges: [preparedCommand.outcomeBadge],  // "Worksite Destroyed: Quarry"
      warnings: []
    };
  }
}
```

Updates badge after roll with specific worksite name.

#### C. Execute Function
```typescript
execute: async (ctx) => {
  if (ctx.outcome !== 'criticalFailure') {
    return { success: true };
  }

  // Retrieve prepared command from metadata
  const preparedCommand = ctx.metadata._preparedDestroyWorksite;
  
  // Commit the destruction
  if (preparedCommand?.commit) {
    await preparedCommand.commit();
  }

  return { success: true };
}
```

Actually destroys the worksite when user clicks "Apply Result".

#### D. Post-Apply Map Display
```typescript
postApplyInteractions: [
  {
    type: 'map-selection',
    id: 'affectedHexes',
    mode: 'display',  // Display-only, no interaction
    colorType: 'destroyed',  // Red highlighting
    
    title: (ctx) => {
      const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
      const count = instance?.metadata?.destroyedHexIds?.length || 0;
      return count === 1
        ? 'Worksite Destroyed by Bandits'
        : `${count} Worksites Destroyed by Bandits`;
    },
    
    existingHexes: (ctx) => {
      const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
      return instance?.metadata?.destroyedHexIds || [];
    },
    
    getHexInfo: (hexId, ctx) => {
      const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
      const worksite = instance?.metadata?.destroyedWorksites?.find((w: any) => w.id === hexId);
      if (worksite) {
        return `<p style="color: #FF4444;"><strong>Destroyed:</strong> ${worksite.worksiteType}</p><p style="color: #999;">${worksite.name}</p>`;
      }
      return '<p style="color: #FF4444;"><strong>Worksite destroyed</strong></p>';
    },
    
    condition: (ctx) => {
      if (ctx.outcome !== 'criticalFailure') return false;
      const instance = ctx.kingdom?.pendingOutcomes?.find(i => i.previewId === ctx.instanceId);
      return instance?.metadata?.destroyedHexIds?.length > 0;
    }
  }
]
```

Shows map with destroyed worksites highlighted in red.

### 3. Hex Selector Display Mode

**Files:**
- `src/services/hex-selector/HexSelectorService.ts`
- `src/services/hex-selector/SelectionPanelManager.ts`
- `src/services/hex-selector/SceneManager.ts`

**Features:**
- `mode: 'display'` - No user interaction, just shows information
- Custom title support
- Pre-populated hex list with custom info
- Worksites layer automatically visible
- Red color scheme for destroyed hexes
- Larger font size for worksite names
- No "Selected X hexes" label in display mode

**Color Configuration:**
```typescript
// types.ts
export const HEX_HIGHLIGHT_COLORS = {
  existingDestroyed: { color: 0x8B0000, alpha: 0.3 },  // Dark red
  newDestroyed: { color: 0xFF4444, alpha: 0.7 },        // Bright red
  hoverDestroyed: { color: 0xFF6666, alpha: 0.4 }       // Light red
};
```

## User Experience Flow

1. **Check Card Opens**
   - Shows "Possible Outcomes" with static badge: "1 random worksite destroyed"

2. **User Rolls Critical Failure**
   - Badge updates to show specific worksite: "Worksite Destroyed: Quarry"
   - Badge shows hex location and worksite type

3. **User Clicks "Apply Result"**
   - Map minimizes Reignmaker app
   - Worksites layer becomes visible
   - Affected hex(es) highlighted in red
   - Panel shows: "Worksite Destroyed by Bandits" with worksite details
   - No hover effects (display mode)

4. **User Clicks "OK"**
   - Map returns to normal
   - Reignmaker app restores
   - Worksite is permanently removed from kingdom data

## Preview Badges System

This implementation demonstrates the new **dual-badge system**:

### Static Preview Badges
- Defined in `outcomes` section of pipeline
- Show in "Possible Outcomes" before rolling
- Use for predictable effects

```typescript
outcomes: {
  criticalFailure: {
    outcomeBadges: [
      textBadge('1 random worksite destroyed', 'fa-hammer-war', 'negative')
    ]
  }
}
```

### Dynamic Outcome Badges
- Generated by `preview.calculate()`
- Show after rolling with specific details
- Use for state-dependent effects

```typescript
preview: {
  calculate: async (ctx) => {
    const preparedCommand = await handler.prepare(...);
    return {
      outcomeBadges: [preparedCommand.outcomeBadge]  // "Worksite Destroyed: Quarry"
    };
  }
}
```

### Technical Implementation

**Type Updates:**
- `Outcome` interface: Added `outcomeBadges?: any[]`
- `OutcomeEffects` interface: Added `outcomeBadges` to all outcome types
- `PossibleOutcome` interface: Already had `outcomeBadges` field

**Helper Function:**
- `buildPossibleOutcomes()` now extracts `outcomeBadges` from outcomes
- Automatically included in check card display

**Badge Helpers:**
```typescript
import { textBadge, valueBadge, diceBadge } from '../../types/OutcomeBadge';

textBadge(message, icon, variant)
valueBadge(template, icon, amount, variant)
diceBadge(template, icon, formula, variant)
```

## Files Modified

### Core Implementation
- `src/services/gameCommands/handlers/DestroyWorksiteHandler.ts` - Game command handler
- `src/services/GameCommandsResolver.ts` - Added destroyWorksite method
- `src/services/gameCommands/GameCommandHandlerRegistry.ts` - Registered handler
- `src/types/game-commands.ts` - Added metadata field to PreparedCommand

### Pipeline Integration
- `src/pipelines/incidents/minor/bandit-raids.ts` - Example usage
- `src/types/CheckPipeline.ts` - Added outcomeBadges to Outcome interface
- `src/controllers/shared/PossibleOutcomeHelpers.ts` - Extract outcomeBadges

### Hex Selector Display Mode
- `src/services/hex-selector/HexSelectorService.ts` - Display mode support
- `src/services/hex-selector/SelectionPanelManager.ts` - Custom panel display
- `src/services/hex-selector/SceneManager.ts` - Overlay management
- `src/services/hex-selector/HexRenderer.ts` - Color mapping for 'destroyed'
- `src/services/hex-selector/types.ts` - Mode property, color definitions

### Documentation
- `docs/systems/core/pipeline-patterns.md` - Preview badges section
- `docs/systems/core/pipeline-coordinator.md` - Static badges documentation
- `docs/data/destroyWorksite-implementation.md` - This file

## Testing

**Test Case:** Bandit Raids (critical failure)

1. ✅ Static badge shows before roll
2. ✅ Dynamic badge shows after critical failure roll
3. ✅ Map displays with worksites layer visible
4. ✅ Destroyed hexes highlighted in red
5. ✅ Panel shows worksite details at larger font
6. ✅ No "Selected X hexes" label in display mode
7. ✅ No hover effects on map
8. ✅ Worksite actually removed from kingdom data
9. ✅ Works across multiple worksites
10. ✅ Handles zero worksites gracefully

## Future Applications

This pattern can be used for:
- Structure damage (earthquakes, fires)
- Settlement destruction (major disasters)
- Army casualties (battles, disease)
- Resource loss (theft, spoilage)
- Any negative effect requiring visual map feedback

## Notes

- Metadata persists across steps via `instance.metadata`
- PreparedCommand pattern ensures preview accuracy
- Display mode prevents accidental user interaction
- Worksites layer automatically shown for context
- Red color scheme indicates negative outcome
- Badge system provides consistent preview UX
