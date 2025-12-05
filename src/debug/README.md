# Debug Utilities

This folder contains debugging tools for testing Reignmaker features in Foundry VTT.

## Debug Panels (UI)

In-game debug panels for systematic testing. Controlled by `debugConfig.ts`.

### Configuration

Edit `src/debug/debugConfig.ts` to enable/disable panels:

```typescript
export const DEBUG_PANELS = {
  events: true,      // Event testing panel (37 events)
  incidents: true,   // Incident testing panel (30 incidents)
  phaseProgression: false,
};

// Master switch to disable ALL panels at once
export const DEBUG_MODE = true;
```

### Available Panels

| Panel | Location | Used In | Description |
|-------|----------|---------|-------------|
| **EventDebugPanel** | `src/view/debug/EventDebugPanel.svelte` | EventsPhase | Test all 37 events by trait category |
| **IncidentDebugPanel** | `src/view/debug/IncidentDebugPanel.svelte` | UnrestPhase | Test all 30 incidents by severity |
| **PhaseProgressionDebug** | `src/view/debug/PhaseProgressionDebug.svelte` | - | View phase step states |

### Status Tracking Files

- `src/constants/migratedEvents.ts` - Track event testing progress
- `src/constants/migratedIncidents.ts` - Track incident testing progress
- `src/constants/migratedActions.ts` - Track action testing progress

---

## Console Utilities

Each TypeScript file (`.ts`) implements a debug utility, with corresponding markdown documentation.

### Available Utilities

- **[hex-inspector.md](./hex-inspector.md)** - Click hexes to view their properties from Kingdom Store
- **[checkHexData.md](./checkHexData.md)** - Compare hex data between Kingmaker and Kingdom Store
- **[armyMovement.md](./armyMovement.md)** - Test army pathfinding and movement system
- **[hex-center-test.md](./hex-center-test.md)** - Verify hex center calculations with visual markers
- **[hex-selector-test.md](./hex-selector-test.md)** - Test the hex selection UI in isolation

### Getting Started

1. Load Foundry VTT with Reignmaker enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)
4. Check the individual utility documentation for specific commands

### Usage

Each utility is registered in the browser console under `game.reignmaker.*` (or `globalThis.*` for some utilities). See the individual markdown files for detailed usage instructions, examples, and troubleshooting.

---

⚠️ **These are development tools only** - they bypass normal game flow and should not be used for actual gameplay.
