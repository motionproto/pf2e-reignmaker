#!/usr/bin/env node

/**
 * Package script for PF2e ReignMaker module
 * Creates a clean distribution package ready for server deployment
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

const PACKAGE_DIR = path.join(PROJECT_ROOT, 'package');
const MODULE_NAME = 'pf2e-reignmaker';

console.log('📦 PF2e ReignMaker - Package Distribution');
console.log('==========================================\n');

// Read module version from module.json
const moduleJsonPath = path.join(PROJECT_ROOT, 'module.json');
const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf-8'));
const version = moduleJson.version || '1.0.0';

const ZIP_NAME = `${MODULE_NAME}-v${version}.zip`;
const ZIP_PATH = path.join(PROJECT_ROOT, ZIP_NAME);

console.log(`📌 Version: ${version}`);
console.log(`📦 Package: ${ZIP_NAME}\n`);

// Build the module first
console.log('🔨 Building module...');
try {
    execSync('npm run build', { stdio: 'inherit', cwd: PROJECT_ROOT });
    console.log('✅ Build complete\n');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Clean up old package directory and zip
console.log('🧹 Cleaning old package artifacts...');
if (fs.existsSync(PACKAGE_DIR)) {
    fs.rmSync(PACKAGE_DIR, { recursive: true, force: true });
}
if (fs.existsSync(ZIP_PATH)) {
    fs.unlinkSync(ZIP_PATH);
}
console.log('✅ Cleanup complete\n');

// Create package directory
console.log(`📁 Creating package directory...`);
fs.mkdirSync(PACKAGE_DIR, { recursive: true });

// Files to copy
const filesToCopy = [
    'module.json',
    'LICENSE',
    'README.md'
];

// Directories to copy
const directoriesToCopy = [
    'dist',
    'data',
    'img',
    'lang',
    'macros'
];

console.log('📋 Copying files to package...\n');

// Copy individual files
filesToCopy.forEach(file => {
    const sourcePath = path.join(PROJECT_ROOT, file);
    const targetPath = path.join(PACKAGE_DIR, file);
    
    if (fs.existsSync(sourcePath)) {
        console.log(`   ✓ ${file}`);
        fs.copyFileSync(sourcePath, targetPath);
    } else {
        console.log(`   ⚠️  Skipping ${file} (not found)`);
    }
});

// Copy directories
directoriesToCopy.forEach(dir => {
    const sourcePath = path.join(PROJECT_ROOT, dir);
    const targetPath = path.join(PACKAGE_DIR, dir);
    
    if (fs.existsSync(sourcePath)) {
        console.log(`   ✓ ${dir}/`);
        copyDirectoryRecursive(sourcePath, targetPath);
    } else {
        console.log(`   ⚠️  Skipping ${dir}/ (not found)`);
    }
});

/**
 * Recursively copy a directory
 */
function copyDirectoryRecursive(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            copyDirectoryRecursive(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

/**
 * Create a zip archive from directory
 * Uses platform-specific commands
 */
function createZipArchive(sourceDir, zipPath) {
    const platform = process.platform;
    const sourceName = path.basename(sourceDir);
    const parentDir = path.dirname(sourceDir);
    
    try {
        if (platform === 'win32') {
            // Windows: Use PowerShell Compress-Archive
            const psCommand = `Compress-Archive -Path "${sourceDir}\\*" -DestinationPath "${zipPath}" -Force`;
            execSync(`powershell -Command "${psCommand}"`, { cwd: parentDir, stdio: 'inherit' });
        } else {
            // Unix-like (macOS, Linux): Use zip command
            execSync(`cd "${parentDir}" && zip -r "${zipPath}" "${sourceName}"`, { stdio: 'inherit' });
        }
        return true;
    } catch (error) {
        console.error('❌ Failed to create zip archive:', error.message);
        return false;
    }
}

console.log('\n🗜️  Creating zip archive...');
const zipSuccess = createZipArchive(PACKAGE_DIR, ZIP_PATH);

if (zipSuccess) {
    console.log(`✅ Zip created: ${ZIP_NAME}\n`);
    
    // Clean up package directory
    console.log('🧹 Cleaning up temporary files...');
    fs.rmSync(PACKAGE_DIR, { recursive: true, force: true });
    console.log('✅ Cleanup complete\n');
    
    // Get file size
    const stats = fs.statSync(ZIP_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('==========================================');
    console.log('✅ PACKAGING COMPLETE');
    console.log('==========================================');
    console.log(`📦 Package: ${ZIP_NAME}`);
    console.log(`📏 Size: ${sizeMB} MB`);
    console.log(`📍 Location: ${ZIP_PATH}`);
    console.log('\n📌 Next steps:');
    console.log('   1. Upload the zip file to your server');
    console.log('   2. Extract to: [foundry-data]/modules/');
    console.log('   3. Restart Foundry VTT');
    console.log('   4. Enable the module in your world\n');
} else {
    console.error('❌ Packaging failed - could not create zip archive');
    process.exit(1);
}
