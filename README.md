# PF2E ReignMaker

A Kingdom Building management system for Pathfinder 2e in Foundry VTT. This module provides a full implementation of the kingdom management rules with an intuitive UI built with Svelte and TypeScript.

## Features

- **Kingdom Management** - Complete kingdom sheet with all statistics, abilities, and resources
- **Turn-Based Gameplay** - Six-phase turn system (Status → Upkeep → Event → Action → Resource → Unrest)
- **Events & Incidents** - Dynamic kingdom events with skill checks and meaningful outcomes
- **Settlement Management** - Build and manage settlements with structures and upgrades
- **Territory Control** - Claim hexes, build roads, fortify borders
- **Faction System** - Track relationships with various factions
- **Army Management** - Recruit, train, and deploy military units
- **Type-Safe Architecture** - Full TypeScript implementation with auto-generated types from data

## Developer Requirements

- **Node.js** 18+ (tested with v24.11.0)
- **npm** 7+ (tested with 11.6.1)
- **Python** 3.8+ (for build scripts - uses only standard library)
- **Foundry VTT** v13+
- **PF2e System** 7.2.0+

## Installation

### For Players

Install directly from Foundry VTT's module browser, or use this manifest URL:
```
https://github.com/motionproto/pf2e-reignmaker/releases/latest/download/module.json
```

### For Developers

1. Clone the repository into your Foundry modules directory:
   ```bash
   cd /path/to/FoundryVTT/Data/modules/
   git clone https://github.com/motionproto/pf2e-reignmaker.git
   cd pf2e-reignmaker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the module:
   ```bash
   npm run build
   ```

4. Launch Foundry VTT and enable the module in your world.

## Development

### Quick Start

```bash
# Install dependencies (first time only)
npm install

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Generate TypeScript types from JSON data
npm run generate-types
```

### Development Workflow

1. **Start Foundry VTT** on `http://localhost:30000`
2. **Run development server**: `npm run dev`
3. The dev server runs on port `30001` and proxies to Foundry
4. Make changes to code - Vite will hot-reload automatically
5. **Build for production** when ready: `npm run build`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Full production build (combines data, generates types, builds bundle) |
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run dev:setup` | Setup development environment configuration |
| `npm run dev:start` | Setup + start dev server |
| `npm run generate-types` | Generate TypeScript types from JSON data files |
| `npm run clean` | Remove dist directory |
| `npm run preview` | Preview production build |

### Build Process

The build process involves three steps:

1. **Generate Types** (`python3 buildscripts/generate-types.py`)
   - Generates TypeScript types from structured data
   - Creates type-safe interfaces
   - Outputs to `src/types/`

2. **Compile Remaining JSON** (`python3 buildscripts/combine-data.py`)
   - Combines individual JSON files for factions and structures
   - Outputs to `src/data-compiled/`
   - **Note:** Actions, events, and incidents are now pure TypeScript (no JSON compilation)

3. **Vite Build** (`vite build`)
   - Compiles TypeScript and Svelte components
   - Bundles all TypeScript pipelines (actions, events, incidents)
   - Processes and bundles CSS
   - Outputs to `dist/`

## Project Structure

```
pf2e-reignmaker/
├── src/
│   ├── index.ts                 # Module entry point
│   ├── actors/                  # Kingdom and Army actor definitions
│   ├── controllers/             # Phase controllers and business logic
│   ├── pipelines/               # Self-contained TypeScript pipelines (ACTIVE)
│   │   ├── PipelineRegistry.ts  # Central registry
│   │   ├── actions/             # 29 action pipelines (TypeScript only)
│   │   ├── events/              # Event pipelines (TypeScript only)
│   │   └── incidents/           # Incident pipelines (TypeScript only)
│   ├── data-compiled/           # Generated JSON data (factions, structures only)
│   ├── models/                  # Data models (Kingdom, Settlement, etc)
│   ├── services/                # Business logic services
│   ├── stores/                  # Svelte stores for reactive state
│   ├── styles/                  # CSS and TailwindCSS styles
│   ├── types/                   # TypeScript type definitions
│   ├── ui/                      # Reusable UI components
│   ├── utils/                   # Utility functions
│   └── view/                    # Svelte components (main UI)
│       └── kingdom/
│           ├── KingdomSheet.svelte      # Main kingdom sheet
│           ├── turnPhases/              # Phase-specific UI components
│           └── components/              # Reusable kingdom UI components
├── archived-implementations/    # Historical reference
│   └── data-json/               # Archived JSON data (reference only)
│       ├── events/              # Legacy event JSON files
│       ├── incidents/           # Legacy incident JSON files
│       ├── player-actions/      # Legacy action JSON files
│       └── README.md            # Explains migration to TypeScript
├── buildscripts/                # Python build scripts
│   ├── combine-data.py          # Combines remaining JSON (factions, structures)
│   └── generate-types.py        # Generates TypeScript types
├── docs/                        # Architecture documentation
│   ├── ARCHITECTURE.md          # Complete system overview
│   └── systems/                 # System-specific documentation
├── dist/                        # Build output (gitignored)
├── img/                         # Module images and assets
├── module.json                  # Foundry module manifest
├── package.json                 # Node.js dependencies
├── vite.config.ts               # Vite configuration
├── vite.config.dev.ts           # Development server config
└── tsconfig.json                # TypeScript configuration
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete system architecture overview
- **[Check Instance System](docs/systems/check-instance-system.md)** - Unified check architecture
- **[Turn and Phase System](docs/systems/turn-and-phase-system.md)** - Turn progression system
- **[Typed Modifiers System](docs/systems/typed-modifiers-system.md)** - Type-safe resource modifications
- **[Game Commands System](docs/systems/game-commands-system.md)** - Structured gameplay commands
- **[Phase Controllers](docs/systems/phase-controllers.md)** - Phase-specific business logic

## Technology Stack

- **TypeScript** - Type-safe JavaScript with full type inference
- **Svelte 4** - Reactive UI framework
- **Vite 5** - Fast build tool with hot module reload
- **TyphonJS Runtime** - Foundry VTT framework utilities
- **Python 3** - Build scripts for data processing

## Architecture Principles

1. **Single Source of Truth** - `KingdomActor` is the only persistent data source
2. **Reactive Bridge Pattern** - Svelte stores provide reactive access to actor data
3. **Type Safety** - Explicit TypeScript types, auto-generated from JSON data
4. **Clean Separation** - Components (UI) → Controllers (Logic) → Services (Utilities)
5. **Self-Executing Phases** - Phase components auto-start their controllers on mount

## Data Files

Game data is stored in two ways:

**TypeScript Pipelines (Active):**
- **Actions** - 29 player actions defined in `src/pipelines/actions/`
- **Events** - Kingdom events defined in `src/pipelines/events/`
- **Incidents** - Unrest-triggered events defined in `src/pipelines/incidents/`

All pipelines are self-contained TypeScript files with full game logic, outcomes, and effects.

**JSON Data (Legacy):**
- **Factions** - Faction definitions with relationships and benefits
- **Structures** - Buildings and improvements for settlements

JSON data for actions, events, and incidents has been archived to `archived-implementations/data-json/` for historical reference.

## Contributing

Contributions are welcome! Please:

1. Follow the existing architectural patterns (see [ARCHITECTURE.md](docs/ARCHITECTURE.md))
2. Use TypeScript strict mode - no `any` types
3. Write reactive Svelte components that respond to store changes
4. Add/update data files in `data/` directory, not `src/data-compiled/`
5. Run `npm run generate-types` after modifying JSON data
6. Test in Foundry VTT before submitting PRs

### Adding New Content

**To add a new event:**
1. Create a TypeScript file in `src/pipelines/events/`
2. Define the event as a `CheckPipeline` object
3. Register it in `PipelineRegistry.ts`
4. Run `npm run build`
5. The event will automatically appear in-game

**To add a new player action:**
1. Create a TypeScript file in `src/pipelines/actions/`
2. Define the action as a `CheckPipeline` object
3. Register it in `PipelineRegistry.ts`
4. Implement any custom execution logic if needed
5. Run `npm run build`

See existing pipeline files for schema examples.

## License

- **Source Code**: MIT License (except TyphonJS components which are Apache 2.0)
- **Game Content**: Open Gaming License (OGL) for Pathfinder 2e content
- **Images**: CC0 Public Domain (see individual folders for attribution)

## Support

- **Issues**: [GitHub Issues](https://github.com/motionproto/pf2e-reignmaker/issues)
- **Discord**: [PF2e Discord](https://discord.com/invite/pf2e) - #reignmaker channel

## Credits

Created by **Mark Pearce & Anthropic Claude**

Built with the [TyphonJS Runtime Library](https://github.com/typhonjs-fvtt/runtime) for Foundry VTT.

Images generated and retouched using MidJourney (licensed CC0 by Mark Pearce).
