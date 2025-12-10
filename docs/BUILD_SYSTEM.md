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
2. Run `npm run build` (which runs Python scripts and Vite build)
3. Copy built files to your FoundryVTT modules directory
4. Clean old build artifacts from target directory

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
- **File:** `pf2e-reignmaker-v{version}.zip` (e.g., `pf2e-reignmaker-v1.0.0.zip`)
- **Location:** `releases/` folder (created automatically)
- **Contents:**
  - `module.json`
  - `LICENSE`
  - `README.md`
  - `dist/` - Compiled module code
  - `data/` - Compiled factions and structures
  - `img/` - Module images
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

### Data Architecture (January 2026)
- **TypeScript pipelines as single source**: All actions, events, and incidents fully defined in `src/pipelines/` TypeScript files
- **PipelineRegistry as runtime source**: Controllers load from `PipelineRegistry` at runtime
- **Legacy JSON data archived**: Source JSON files moved to `archived-implementations/data-json/` for reference
- **Build simplified**: Only compiles factions and structures JSON (via `combine-data.py`)
- **Legacy loaders removed**: `action-loader.ts`, `event-loader.ts`, and `incident-loader.ts` deleted
- **Benefits**: 
  - Single source of truth (no sync issues between JSON and TypeScript)
  - Full TypeScript features (outcomeBadges, custom execute, postApplyInteractions)
  - Better type safety and IDE support
  - Easier to maintain and extend

### `buildscripts/deploy.js`
- Added `getFoundryModulesPath()` function that detects the OS
- Automatically selects the correct path for Windows, macOS, and Linux
- Supports environment variable override for custom paths
- Shows platform and target path in console output

### `package.json`
- Uses `node buildscripts/run-python.js` wrapper to detect Python binary (cross-platform)
- Uses Node.js-based directory deletion: `node -e "require('fs').rmSync('dist', { recursive: true, force: true })"`
- All scripts use ES modules (type: "module" in package.json)

## Switching Between Operating Systems

The system automatically adapts when you move between operating systems. No configuration changes needed. Just run:

```bash
npm run deploy
```

And it will deploy to the correct location for your current OS.
