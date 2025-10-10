#!/usr/bin/env node

/**
 * Development Setup Script for PF2e ReignMaker
 * 
 * This script helps set up the development environment for hot reloading
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Setting up PF2e ReignMaker for development...\n');

// Function to copy module.dev.json to Foundry modules directory
function setupDevModule() {
    // Try to find Foundry data path
    const possiblePaths = [
        process.env.FOUNDRY_DATA_PATH,
        path.join(process.env.HOME || process.env.USERPROFILE, 'FoundryVTT', 'Data'),
        path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'FoundryVTT', 'Data'),
        path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'FoundryVTT', 'Data'),
        '/Users/mark/FoundryVTT/Data',  // Your specific path
    ].filter(Boolean);
    
    let foundryDataPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            foundryDataPath = p;
            break;
        }
    }
    
    if (!foundryDataPath) {
        console.error('❌ Could not find Foundry data directory!');
        console.error('Please set FOUNDRY_DATA_PATH environment variable to your Foundry Data directory.');
        process.exit(1);
    }
    
    const modulesPath = path.join(foundryDataPath, 'modules', 'pf2e-reignmaker');
    
    console.log(`📁 Foundry modules path: ${modulesPath}`);
    
    // Create module directory if it doesn't exist
    if (!fs.existsSync(modulesPath)) {
        fs.mkdirSync(modulesPath, { recursive: true });
        console.log('✅ Created module directory');
    }
    
    // Copy module.dev.json as module.json
    const devModulePath = path.join(rootDir, 'module.dev.json');
    const targetModulePath = path.join(modulesPath, 'module.json');
    
    if (fs.existsSync(devModulePath)) {
        fs.copyFileSync(devModulePath, targetModulePath);
        console.log('✅ Copied module.dev.json to Foundry modules directory');
    } else {
        console.error('❌ module.dev.json not found!');
        process.exit(1);
    }
    
    // Copy other necessary files
    const filesToCopy = ['lang', 'macros', 'img', 'data'];
    
    filesToCopy.forEach(file => {
        const sourcePath = path.join(rootDir, file);
        const targetPath = path.join(modulesPath, file);
        
        if (fs.existsSync(sourcePath)) {
            // Copy directory recursively
            copyRecursiveSync(sourcePath, targetPath);
            console.log(`✅ Copied ${file} to module directory`);
        }
    });
    
    console.log('\n✨ Development setup complete!');
    console.log('\n📝 To start development:');
    console.log('1. Run: npm run dev');
    console.log('2. Start/Restart Foundry VTT');
    console.log('3. Enable the "PF2e ReignMaker (Dev)" module in your world');
    console.log('4. Use the macro or keyboard shortcut (Ctrl+Shift+K) to open the Kingdom UI');
    console.log('\n🔥 Hot reloading is now enabled! Changes will update automatically.');
    console.log('\n💡 If the macro gives an error:');
    console.log('   - Make sure the dev server is running (npm run dev)');
    console.log('   - Refresh Foundry (F5) after the dev server starts');
    console.log('   - Check the browser console for "PF2e ReignMaker | Setup complete"');
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(child => {
            copyRecursiveSync(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Run setup
setupDevModule();
