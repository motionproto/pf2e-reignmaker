#!/usr/bin/env node

/**
 * Deploy script for PF2e Kingdom Lite module
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

// Foundry VTT modules directory - adjust this path if needed
const FOUNDRY_MODULES_PATH = path.join(
    process.env.HOME || process.env.USERPROFILE,
    'Library/Application Support/FoundryVTT/Data/modules'
);

const MODULE_NAME = 'pf2e-kingdom-lite';
const TARGET_DIR = path.join(FOUNDRY_MODULES_PATH, MODULE_NAME);

console.log('🏰 PF2e Kingdom Lite - Deploy Script');
console.log('=====================================');

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
    'README.md',
    'OpenGameLicense.md'
];

const directoriesToCopy = [
    'dist',
    'lang',
    'data',
    'img'
];

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
        console.log(`   📁 Copying ${dir}/...`);
        copyDirectoryRecursive(sourcePath, targetPath);
    } else {
        console.log(`   ⚠️  Skipping ${dir}/ (not found)`);
    }
});

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
