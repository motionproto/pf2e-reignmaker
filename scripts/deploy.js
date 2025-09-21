#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FOUNDRY_MODULES_DIR = '/Users/mark/Library/Application Support/FoundryVTT/Data/modules/pf2e-kingdom-lite';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function copyRecursive(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursive(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

async function deploy() {
    log('\n🚀 Starting deployment to Foundry VTT...', colors.bright);
    
    try {
        // Step 1: Build the project
        log('\n📦 Building project...', colors.blue);
        execSync('npm run build', { stdio: 'inherit' });
        
        // Step 2: Combine data files
        log('\n🔧 Combining data files...', colors.blue);
        execSync('python3 data/combine_all_json.py', { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        // Step 3: Clean the target directory
        if (fs.existsSync(FOUNDRY_MODULES_DIR)) {
            log(`\n🧹 Cleaning existing module directory...`, colors.yellow);
            fs.rmSync(FOUNDRY_MODULES_DIR, { recursive: true, force: true });
        }
        
        // Step 4: Create the module directory
        log('\n📁 Creating module directory...', colors.blue);
        fs.mkdirSync(FOUNDRY_MODULES_DIR, { recursive: true });
        
        // Step 5: Copy files to Foundry
        log('\n📤 Copying files to Foundry...', colors.blue);
        
        const filesToCopy = [
            { src: 'dist', dest: 'dist' },
            { src: 'img', dest: 'img' },
            { src: 'lang', dest: 'lang' },
            { src: 'module.json', dest: 'module.json' },
            { src: 'LICENSE', dest: 'LICENSE' },
            { src: 'README.md', dest: 'README.md' }
        ];
        
        for (const file of filesToCopy) {
            const srcPath = path.join(process.cwd(), file.src);
            const destPath = path.join(FOUNDRY_MODULES_DIR, file.dest);
            
            if (fs.existsSync(srcPath)) {
                log(`  • Copying ${file.src}...`);
                if (fs.statSync(srcPath).isDirectory()) {
                    copyRecursive(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            } else {
                log(`  ⚠️  Skipping ${file.src} (not found)`, colors.yellow);
            }
        }
        
        log('\n✅ Deployment successful!', colors.green);
        log(`📍 Module deployed to: ${FOUNDRY_MODULES_DIR}`, colors.bright);
        log('\n💡 Reload your Foundry VTT world to see the changes.', colors.blue);
        
    } catch (error) {
        log(`\n❌ Deployment failed: ${error.message}`, colors.red);
        process.exit(1);
    }
}

// Run deployment
deploy();
