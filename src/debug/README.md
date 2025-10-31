# Debug Utilities

This folder contains console-based debugging tools for testing Reignmaker features in Foundry VTT.

## What's Here

Each TypeScript file (`.ts`) implements a debug utility, and each has a corresponding markdown file (`.md`) with detailed documentation on how to use it.

## Available Utilities

- **[hex-inspector.md](./hex-inspector.md)** - Click hexes to view their properties from Kingdom Store
- **[checkHexData.md](./checkHexData.md)** - Compare hex data between Kingmaker and Kingdom Store
- **[armyMovement.md](./armyMovement.md)** - Test army pathfinding and movement system
- **[hex-center-test.md](./hex-center-test.md)** - Verify hex center calculations with visual markers
- **[hex-selector-test.md](./hex-selector-test.md)** - Test the hex selection UI in isolation

## Getting Started

1. Load Foundry VTT with Reignmaker enabled
2. Open a scene with the Kingmaker map
3. Open browser console (F12 → Console tab)
4. Check the individual utility documentation for specific commands

## Usage

Each utility is registered in the browser console under `game.reignmaker.*` (or `globalThis.*` for some utilities). See the individual markdown files for detailed usage instructions, examples, and troubleshooting.

---

⚠️ **These are development tools only** - they bypass normal game flow and should not be used for actual gameplay.
