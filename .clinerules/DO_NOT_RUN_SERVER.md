# ⚠️ IMPORTANT: This is a Foundry VTT Module

## DO NOT RUN AS STANDALONE APPLICATION

This project is a **Foundry VTT module**, not a standalone web application. It should NOT be run with server commands like:

❌ `npm start`
❌ `npm run dev` (unless using HMR for development)
❌ `vite`
❌ `vite preview`
❌ Any other localhost server commands for standalone viewing

## Correct Usage

### For Development with Hot Module Replacement:
```bash
npm run dev
```
This runs the Vite dev server with HMR configured specifically for Foundry VTT development.

### To Build the Module:
```bash
npm run build
```

### To Deploy to Foundry:
The built files are output to the `dist` directory. You can:
- Manually copy to your Foundry modules directory
- Use the deployment scripts if configured
- Or symlink the dist folder to your Foundry modules

## Development Workflow

1. Make your code changes
2. If using HMR: Changes auto-reload in Foundry
3. Otherwise: Run `npm run build` to compile
4. Refresh your Foundry VTT world to see changes

## Why This Matters

Running the module as a standalone web application:
- Doesn't have access to the Foundry API
- Won't test the actual module integration
- Creates confusion about how the module works
- May lead to code that works standalone but fails in Foundry

## If You Accidentally Started a Server

Kill any running Vite processes:
```bash
pkill -f "vite"
