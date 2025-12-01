# Build System - Cross-Platform Support

The build system now automatically detects your operating system and deploys to the correct FoundryVTT location.

## Supported Platforms

### Windows
- **Path:** `C:\Users\[username]\AppData\Local\FoundryVTT\Data\modules`
- **Detected as:** `win32`

### macOS
- **Path:** `~/Library/Application Support/FoundryVTT/Data/modules`
- **Detected as:** `darwin`

### Linux
- **Path:** `~/.local/share/FoundryVTT/Data/modules`
- **Detected as:** `linux`

## Commands

### Development (with HMR)
```bash
npm run dev
```
Starts the development server with hot module reload.

### Build and Deploy (Local Testing)
```bash
npm run deploy
```
This will:
1. Clean the `dist` folder
2. Run Python build scripts to combine data for factions and structures (from archive)
3. Generate TypeScript types
4. Build the module with Vite
5. Copy everything to your FoundryVTT modules directory

Use this for local testing in Foundry VTT.

**Note on Data Architecture:**
As of December 2025, all Action, Event, and Incident data is now defined directly in TypeScript pipeline files (`src/pipelines/`). The legacy JSON data files have been moved to `archived-implementations/data-json/` for historical reference. The build process only compiles factions and structures JSON (which remain in use).

### Build Only
```bash
npm run build
```
Builds the module without deploying.

### Create Release Package (Production)
```bash
npm run package
```
**Use this when preparing a release for distribution.**

This will:
1. Clean old build artifacts
2. Run Python build scripts to combine data for factions and structures and generate types
3. Build the module with Vite (production mode, **no source maps**)
4. Create a clean distribution package
5. Generate a versioned zip file: `pf2e-reignmaker-v{version}.zip`

**Output:**
- **File:** `pf2e-reignmaker-v{version}.zip` (e.g., `pf2e-reignmaker-v0.0.1.zip`)
- **Size:** ~4-5 MB (optimized, no debug files)
- **Location:** `releases/` folder (created automatically)
- **Contents:**
  - `module.json`
  - `LICENSE`
  - `README.md`
  - `dist/` - Compiled module code (no source maps)
  - `lang/` - Language files
  - `macros/` - Helper macros

**Notes:**
- Source maps are disabled for production releases (configured in `vite.config.ts`)
- The version number is read from `module.json`
- Output is organized in the `releases/` folder (ignored by git)
- This zip file is ready for upload to release platforms or manual installation
- All game data (actions, events, incidents) is compiled into the TypeScript bundle

## Custom Path Override

If your FoundryVTT installation is in a non-standard location, set the `FOUNDRY_MODULES_PATH` environment variable:

**Windows (CMD):**
```cmd
set FOUNDRY_MODULES_PATH=D:\MyCustomPath\FoundryVTT\Data\modules
npm run deploy
```

**Windows (PowerShell):**
```powershell
$env:FOUNDRY_MODULES_PATH="D:\MyCustomPath\FoundryVTT\Data\modules"
npm run deploy
```

**macOS/Linux:**
```bash
export FOUNDRY_MODULES_PATH="/custom/path/to/modules"
npm run deploy
```

## Changes Made

### Data Architecture (December 2025)
- **JSON data archived to `archived-implementations/data-json/`**: Source JSON files for actions, events, and incidents moved to archive directory
- **TypeScript pipelines as single source**: All actions, events, and incidents now fully defined in `src/pipelines/` TypeScript files
- **PipelineRegistry as runtime source**: Controllers load from `PipelineRegistry` instead of JSON loaders
- **Legacy loaders removed**: `action-loader.ts`, `event-loader.ts`, and `incident-loader.ts` deleted
- **Build simplified**: No longer compiles actions/events/incidents JSON (only factions and structures)
- **Benefits**: 
  - No sync issues between JSON and TypeScript
  - Full TypeScript features (outcomeBadges, custom execute, postApplyInteractions)
  - Easier to maintain and extend
  - Single source of truth at runtime

### `buildscripts/deploy.js`
- Added `getFoundryModulesPath()` function that detects the OS
- Automatically selects the correct path for Windows, macOS, and Linux
- Supports environment variable override for custom paths
- Shows platform and target path in console output

### `package.json`
- Changed `python3` → `python` (works on both Windows and macOS)
- Changed `rm -rf dist` → Node.js-based deletion (cross-platform)

## Switching Between Operating Systems

The system automatically adapts when you move between operating systems. No configuration changes needed. Just run:

```bash
npm run deploy
```

And it will deploy to the correct location for your current OS.
