# Hot Reload Development Setup for PF2e Kingdom Lite

You have **THREE options** for hot reload development:

## Option 1: Full Development Proxy (NEW - Recommended) 🚀🔥

The easiest way to get started with complete hot reloading!

### Quick Start

```bash
# Start the full proxy server (includes setup)
npm run proxy
```

This single command:
- ✅ Copies dev module to Foundry automatically
- ✅ Starts Vite dev server with hot reload
- ✅ Sets up proxy to Foundry for API calls
- ✅ Enables instant Svelte component updates
- ✅ No page refresh needed!

### What It Does
- Runs the setup script to install dev module
- Starts Vite on http://localhost:5173
- Proxies Foundry API calls to http://localhost:30000
- Handles WebSocket connections
- Manages CORS headers automatically

### In Foundry
1. Start/restart Foundry VTT
2. Enable "PF2e Kingdom Lite (Dev)" module
3. Use macro or press Ctrl+Shift+K to open UI
4. Make changes - see them instantly!

## Option 2: TyphonJS Proxy Mode 🚀

This uses the existing TyphonJS configuration which proxies through Foundry VTT, giving you real Foundry API access with hot reloading.

### Prerequisites
1. Foundry VTT must be running on port 30000 (default)
2. The module must be installed in Foundry

### How to Use

```bash
# Start the development server with Foundry proxy
npm run dev
```

This will:
- Start a Vite dev server on http://localhost:30001
- Automatically open http://localhost:30001/game in your browser
- Proxy all Foundry API calls to your running Foundry instance
- Provide **hot module replacement** for Svelte components
- **Changes to your Svelte files will update instantly** without page reload

### Benefits
- ✅ Real Foundry API access
- ✅ Hot module replacement for instant updates
- ✅ Access to actual game data
- ✅ Can test with real user permissions
- ✅ Socket.io support for multiplayer testing

## Option 2: Standalone Development Mode

For UI-only development without needing Foundry running.

### How to Use

```bash
# Start standalone dev server
npm run dev:standalone
```

This will:
- Start a Vite dev server on http://localhost:5173
- Use mock Foundry API and data
- Store state in browser localStorage
- Provide hot module replacement

### When to Use Standalone Mode
- Quick UI prototyping
- Working offline
- Testing component layouts
- When Foundry isn't available

## Hot Reload Features 🔥

Both modes provide:

### Instant Updates
- **Svelte component changes** - Updates without page reload
- **CSS/Tailwind changes** - Applied immediately
- **TypeScript changes** - Fast refresh with type checking

### What Triggers Hot Reload
- Editing any `.svelte` file
- Modifying styles in components
- Changing TypeScript logic
- Updating Tailwind classes

### What Requires Page Reload
- Changes to `vite.config.ts`
- Installing new npm packages
- Major structural changes

## Development Workflow

### Recommended Setup (with Foundry)

1. **Start Foundry VTT** on default port 30000
2. **Install the module** in your Foundry world
3. **Run dev server**: `npm run dev`
4. **Make changes** to Svelte components
5. **See updates instantly** in the browser

### File Watching
The dev server watches:
- `/src/**/*.svelte` - Svelte components
- `/src/**/*.ts` - TypeScript files
- `/src/styles/**/*.css` - Stylesheets
- All imported modules

### Browser DevTools

When using the TyphonJS proxy mode, you can access:
- Real Foundry `game` object
- Actual module settings
- Live game state
- WebSocket connections

In standalone mode, access development tools:
```javascript
// Available in browser console
devTools.kingdom      // Access kingdom state
devTools.clearState()  // Clear saved state
devTools.exportState() // Export current state
```

## Troubleshooting

### Hot reload not working?

1. **Check browser console** for WebSocket errors
2. **Ensure Vite server is running** without errors
3. **Try hard refresh** (Ctrl+Shift+R / Cmd+Shift+R)
4. **Clear Vite cache**: `rm -rf node_modules/.vite-cache`

### Foundry proxy issues?

1. **Verify Foundry is running** on port 30000
2. **Check module is installed** in Foundry
3. **Ensure no firewall blocking** localhost connections
4. **Check for port conflicts**

### Styles not updating?

1. **Check PostCSS config** is loaded
2. **Verify Tailwind is processing**
3. **Clear browser cache**
4. **Check for CSS syntax errors**

## Performance Tips

- **Keep browser DevTools closed** when not debugging (can slow HMR)
- **Use Chrome/Edge** for best HMR performance
- **Avoid large file changes** while server is running
- **Close unnecessary browser tabs** to reduce memory usage

## Summary

- **For full development**: Use `npm run dev` with Foundry running
- **For UI-only work**: Use `npm run dev:standalone`
- **Both provide instant hot reloading** of Svelte components
- **No need to rebuild or redeploy** for most changes
