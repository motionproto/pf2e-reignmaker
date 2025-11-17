# Build Scripts

This directory contains build scripts for the pf2e-reignmaker module.

## Cross-Platform Python Support

The project uses Python scripts for data processing and type generation. To support both Windows (which typically uses `python`) and macOS/Linux (which typically uses `python3`), we use a Node.js wrapper script.

### How It Works

**`run-python.js`** - Automatically detects the available Python command:
1. First tries `python3` (common on macOS/Linux)
2. Falls back to `python` (common on Windows)
3. Exits with helpful error if neither is found

### Usage

In `package.json` scripts, use:
```json
"script-name": "node buildscripts/run-python.js buildscripts/your-script.py"
```

Instead of:
```json
"script-name": "python buildscripts/your-script.py"  // ❌ Fails on macOS
"script-name": "python3 buildscripts/your-script.py" // ❌ Fails on Windows
```

### Developer Setup

**No special setup required!** Just run:
```bash
npm install
npm run dev
```

The wrapper will automatically use the correct Python command for your platform.

### Requirements

- Python 3.x installed and available in PATH
- Node.js (for running the wrapper)

## Python Scripts

- **`combine-data.py`** - Combines JSON data files from `/data` into monolithic files in `/src/data-compiled`
- **`generate-types.py`** - Generates TypeScript types from the compiled data files
- Other utility scripts for migrations, cleanup, etc.
