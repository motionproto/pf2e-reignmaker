#!/usr/bin/env node

/**
 * Deploy script for PF2e ReignMaker module
 * Copies built files to Foundry VTT modules directory
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Foundry VTT modules directory - automatically detects OS
function getFoundryModulesPath() {
    // Check for custom path via environment variable first
    if (process.env.FOUNDRY_MODULES_PATH) {
        return process.env.FOUNDRY_MODULES_PATH;
    }

    const platform = process.platform;
    const homeDir = process.env.HOME || process.env.USERPROFILE;

    switch (platform) {
        case 'win32':
            // Windows: C:\Users\username\AppData\Local\FoundryVTT\Data\modules
            return path.join(process.env.LOCALAPPDATA, 'FoundryVTT', 'Data', 'modules');
        
        case 'darwin':
            // macOS: ~/Library/Application Support/FoundryVTT/Data/modules
            return path.join(homeDir, 'Library', 'Application Support', 'FoundryVTT', 'Data', 'modules');
        
        case 'linux':
            // Linux: ~/.local/share/FoundryVTT/Data/modules
            return path.join(homeDir, '.local', 'share', 'FoundryVTT', 'Data', 'modules');
        
        default:
            console.error(`❌ Unsupported platform: ${platform}`);
            process.exit(1);
    }
}

const FOUNDRY_MODULES_PATH = getFoundryModulesPath();

const MODULE_NAME = 'pf2e-reignmaker';
const TARGET_DIR = path.join(FOUNDRY_MODULES_PATH, MODULE_NAME);

console.log('🏰 PF2e ReignMaker - Deploy Script');
console.log('=====================================');
console.log(`📍 Platform: ${process.platform}`);
console.log(`📂 Target: ${FOUNDRY_MODULES_PATH}\n`);

// Check if Foundry modules directory exists
if (!fs.existsSync(FOUNDRY_MODULES_PATH)) {
    console.error('❌ Foundry modules directory not found at:', FOUNDRY_MODULES_PATH);
    console.error('   Please update the FOUNDRY_MODULES_PATH in scripts/deploy.js');
    process.exit(1);
}

// Build the module first
console.log('📦 Building module...');
try {
    execSync('npm run build', { stdio: 'inherit', cwd: PROJECT_ROOT });
    console.log('✅ Build complete');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Create target directory if it doesn't exist
if (!fs.existsSync(TARGET_DIR)) {
    console.log(`📁 Creating module directory: ${TARGET_DIR}`);
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Files and directories to copy
const filesToCopy = [
    'module.json',
    'LICENSE',
    'README.md'
];

const directoriesToCopy = [
    'dist',
    'data',
    'img'
];

console.log(`\n🧹 Cleaning old build artifacts from target directory...\n`);

// Clean old build artifacts (hash-named JS/CSS files and their maps)
// Keep important files like module.json, LICENSE, data/, img/, etc.
cleanBuildArtifacts(TARGET_DIR);

console.log(`\n📋 Deploying to: ${TARGET_DIR}\n`);

// Copy individual files
filesToCopy.forEach(file => {
    const sourcePath = path.join(PROJECT_ROOT, file);
    const targetPath = path.join(TARGET_DIR, file);
    
    if (fs.existsSync(sourcePath)) {
        console.log(`   📄 Copying ${file}...`);
        fs.copyFileSync(sourcePath, targetPath);
    } else {
        console.log(`   ⚠️  Skipping ${file} (not found)`);
    }
});

// Copy directories
directoriesToCopy.forEach(dir => {
    const sourcePath = path.join(PROJECT_ROOT, dir);
    const targetPath = path.join(TARGET_DIR, dir);
    
    if (fs.existsSync(sourcePath)) {
        // Remove existing directory to avoid accumulating old files
        if (fs.existsSync(targetPath)) {
            console.log(`   🗑️  Removing old ${dir}/ directory...`);
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
        console.log(`   📁 Copying ${dir}/...`);
        copyDirectoryRecursive(sourcePath, targetPath);
    } else {
        console.log(`   ⚠️  Skipping ${dir}/ (not found)`);
    }
});

/**
 * Clean old build artifacts from the target directory
 * Removes hash-named JS files, source maps, and CSS files
 */
function cleanBuildArtifacts(targetDir) {
    if (!fs.existsSync(targetDir)) {
        return; // Nothing to clean if directory doesn't exist
    }

    const files = fs.readdirSync(targetDir);
    let cleanedCount = 0;

    files.forEach(file => {
        const filePath = path.join(targetDir, file);
        const stat = fs.statSync(filePath);

        // Only process files in the root directory, not subdirectories
        if (stat.isFile()) {
            // Match hash-named build artifacts (e.g., GameCommandsResolver-ABC123.js)
            // Pattern: name-hash.js or name-hash.js.map or name-hash.css
            const isHashedFile = /^[A-Za-z0-9_-]+-[A-Za-z0-9_-]+\.(js|js\.map|css)$/.test(file);
            
            // Also match the main CSS file
            const isMainCSS = file === 'pf2e-reignmaker.css';
            
            // Also match the main JS file and map
            const isMainJS = file === 'pf2e-reignmaker.js' || file === 'pf2e-reignmaker.js.map';

            if (isHashedFile || isMainCSS || isMainJS) {
                console.log(`   🗑️  Removing old artifact: ${file}`);
                fs.unlinkSync(filePath);
                cleanedCount++;
            }
        }
    });

    console.log(`✅ Cleaned ${cleanedCount} old build artifact${cleanedCount !== 1 ? 's' : ''}`);
}

/**
 * Recursively copy a directory
 */
function copyDirectoryRecursive(source, target) {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    
    // Read all files/subdirectories
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            // Recursively copy subdirectory
            copyDirectoryRecursive(sourcePath, targetPath);
        } else {
            // Copy file
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

console.log('\n✅ Deployment complete!');
console.log(`🎮 Module deployed to: ${TARGET_DIR}`);
console.log('\n📌 Next steps:');
console.log('   1. Restart Foundry VTT or reload the browser');
console.log('   2. Enable the module in your world');
console.log('   3. Look for the castle icon on party actors in the sidebar');
console.log('\n🚀 For development with hot reload, run: npm run dev');
