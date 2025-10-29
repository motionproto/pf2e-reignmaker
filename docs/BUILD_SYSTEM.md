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

### Build and Deploy
```bash
npm run deploy
```
This will:
1. Clean the `dist` folder
2. Run Python build scripts to combine data files
3. Build the module with Vite
4. Copy everything to your FoundryVTT modules directory

### Development (with HMR)
```bash
npm run dev
```
Starts the development server with hot module reload.

### Build Only
```bash
npm run build
```
Builds the module without deploying.

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
