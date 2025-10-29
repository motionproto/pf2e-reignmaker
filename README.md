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

1. **Combine Data** (`python3 buildscripts/combine-data.py`)
   - Combines individual JSON files from `data/` into monolithic files
   - Organizes events, incidents, factions, and player actions
   - Outputs to `src/data-compiled/`

2. **Generate Types** (`python3 buildscripts/generate-types.py`)
   - Generates TypeScript types from combined JSON data
   - Creates type-safe interfaces for events, incidents, and actions
   - Outputs to `src/types/`

3. **Vite Build** (`vite build`)
   - Compiles TypeScript and Svelte components
   - Processes and bundles CSS
   - Bundles everything to `dist/`

## Project Structure

```
pf2e-reignmaker/
├── src/
│   ├── index.ts                 # Module entry point
│   ├── actors/                  # Kingdom and Army actor definitions
│   ├── controllers/             # Phase controllers and business logic
│   ├── data-compiled/           # Generated JSON data (from data/)
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
├── data/                        # Source JSON data files
│   ├── events/                  # Kingdom events
│   ├── incidents/               # Kingdom incidents
│   ├── factions/                # Faction definitions
│   ├── player-actions/          # Player action definitions
│   └── structures/              # Structure definitions
├── buildscripts/                # Python build scripts
│   ├── combine-data.py          # Combines JSON files
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

Game data is stored as individual JSON files in the `data/` directory:

- **Events** - Random kingdom events that occur during the Event Phase
- **Incidents** - Triggered events based on kingdom unrest levels
- **Factions** - Faction definitions with relationships and benefits
- **Player Actions** - Available actions during the Action Phase
- **Structures** - Buildings and improvements for settlements

These files are combined during the build process into monolithic files in `src/data-compiled/`, which are then used to generate TypeScript types.

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
1. Create a JSON file in `data/events/`
2. Run `npm run build` to combine data and regenerate types
3. The event will automatically appear in-game

**To add a new player action:**
1. Create a JSON file in `data/player-actions/`
2. Create the action implementation in `src/actions/`
3. Run `npm run build`

See the existing files for schema examples.

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
