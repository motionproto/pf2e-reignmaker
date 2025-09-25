#!/usr/bin/env node

/**
 * Development Proxy Server for PF2e ReignMaker
 *
 * This script starts a full proxy server that enables complete hot reloading
 * between Vite and Foundry VTT
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function startDevProxy() {
    log('🚀 Starting PF2e ReignMaker Development Proxy...', 'bright');
    
    // First, run the setup to ensure module is in place
    log('\n📦 Setting up development module...', 'cyan');
    const setupProcess = spawn('node', ['scripts/setup-dev.js'], {
        cwd: rootDir,
        stdio: 'inherit'
    });
    
    await new Promise((resolve) => {
        setupProcess.on('close', resolve);
    });
    
    // Start the Vite dev server with proxy
    log('\n🔥 Starting Vite development server with full proxy...', 'yellow');
    
    const viteProcess = spawn('npx', ['vite', '--config', 'vite.config.dev.ts'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true
    });
    
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    log('\n✨ Development proxy server is running!', 'green');
    log('\n📝 Instructions:', 'bright');
    log('1. The Vite dev server is running on http://localhost:5173', 'cyan');
    log('2. Start/restart Foundry VTT', 'cyan');
    log('3. Enable the "PF2e ReignMaker (Dev)" module in your world', 'cyan');
    log('4. Open the Kingdom UI using:', 'cyan');
    log('   - The macro in Foundry', 'blue');
    log('   - Keyboard shortcut: Ctrl+Shift+K', 'blue');
    log('   - Party actor sheet kingdom icon', 'blue');
    
    log('\n🔄 Hot Reload Features:', 'bright');
    log('- ✅ Svelte components update instantly', 'green');
    log('- ✅ CSS/Tailwind changes apply immediately', 'green');
    log('- ✅ TypeScript changes reload on save', 'green');
    log('- ✅ No need to refresh Foundry!', 'green');
    
    log('\n⚡ Proxy Features:', 'bright');
    log('- Proxies Foundry API calls', 'magenta');
    log('- Handles WebSocket connections', 'magenta');
    log('- Manages CORS headers automatically', 'magenta');
    log('- Preserves module state during reloads', 'magenta');
    
    log('\n💡 Tips:', 'yellow');
    log('- If you see connection errors, make sure Foundry is running', 'yellow');
    log('- The proxy assumes Foundry is on http://localhost:30000', 'yellow');
    log('- Set FOUNDRY_URL env variable to change Foundry address', 'yellow');
    
    log('\n🛑 Press Ctrl+C to stop the development server', 'red');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        log('\n👋 Shutting down development server...', 'yellow');
        viteProcess.kill();
        process.exit(0);
    });
    
    // Keep process alive
    viteProcess.on('close', (code) => {
        log(`\nVite process exited with code ${code}`, 'red');
        process.exit(code);
    });
}

// Run the proxy server
startDevProxy().catch((error) => {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
});
