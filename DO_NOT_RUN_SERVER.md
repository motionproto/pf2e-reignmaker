# ⚠️ IMPORTANT: This is a Foundry VTT Module

## DO NOT RUN AS STANDALONE APPLICATION

This project is a **Foundry VTT module**, not a standalone web application. It should NOT be run with server commands like:

❌ `./gradlew jsBrowserRun`
❌ `./gradlew jsBrowserDevelopmentRun`  
❌ `npm start`
❌ Any other localhost server commands

## Correct Usage

### To Build the Module:
```bash
./gradlew build
```

### To Deploy to Foundry:
```bash
./gradlew deployToFoundry
```

The module will be deployed to your Foundry VTT modules directory and should be loaded through Foundry VTT itself.

## Development Workflow

1. Make your code changes
2. Run `./gradlew build` to compile
3. Run `./gradlew deployToFoundry` to deploy to Foundry
4. Reload your Foundry VTT world to see changes

## Why This Matters

Running browser tasks creates unnecessary server processes that:
- Consume system resources
- Create locked file handles that prevent cleaning builds
- Are completely unnecessary for Foundry VTT module development
- Can cause confusion about how the module should be used

## If You Accidentally Started a Server

Kill any running processes:
```bash
pkill -f "gradlew.*jsBrowser"
pkill -f "gradle.*jsBrowser"
