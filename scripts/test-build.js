#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing TypeScript build...\n');

try {
    // Run the build
    const output = execSync('npm run build 2>&1', { 
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
    });
    
    console.log('✅ Build successful!');
    console.log(output);
    
} catch (error) {
    const output = error.stdout || error.output?.toString() || '';
    
    // Parse errors by file
    const errorsByFile = new Map();
    const lines = output.split('\n');
    
    for (const line of lines) {
        const match = line.match(/ERROR in .*\/src-ts\/(.+\.ts)/);
        if (match) {
            const file = match[1];
            if (!errorsByFile.has(file)) {
                errorsByFile.set(file, 0);
            }
            errorsByFile.set(file, errorsByFile.get(file) + 1);
        }
    }
    
    // Count total errors
    const totalMatch = output.match(/webpack .* compiled with (\d+) errors?/);
    const totalErrors = totalMatch ? parseInt(totalMatch[1]) : '?';
    
    console.log('Build Status Report');
    console.log('='.repeat(50));
    console.log(`Total Errors: ${totalErrors}`);
    console.log('='.repeat(50));
    
    // Show top problem files
    const sortedFiles = Array.from(errorsByFile.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    console.log('\nTop Problem Files:');
    console.log('-'.repeat(50));
    
    for (const [file, count] of sortedFiles) {
        const bar = '█'.repeat(Math.min(50, Math.floor(count / 10)));
        console.log(`${file.padEnd(40)} ${count.toString().padStart(4)} ${bar}`);
    }
    
    // Check what's working
    const srcDir = path.join(__dirname, '..', 'src-ts');
    const allFiles = [];
    
    function findFiles(dir, files = []) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                findFiles(fullPath, files);
            } else if (item.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
        return files;
    }
    
    const totalFiles = findFiles(srcDir).length;
    const filesWithErrors = errorsByFile.size;
    const filesWorking = totalFiles - filesWithErrors;
    
    console.log('\n' + '='.repeat(50));
    console.log('File Statistics:');
    console.log('-'.repeat(50));
    console.log(`Total TypeScript files: ${totalFiles}`);
    console.log(`Files with errors: ${filesWithErrors}`);
    console.log(`Files without errors: ${filesWorking}`);
    console.log(`Success rate: ${((filesWorking / totalFiles) * 100).toFixed(1)}%`);
    
    // Check if main entry compiles
    const mainErrors = errorsByFile.get('index.ts') || 0;
    if (mainErrors === 0) {
        console.log('\n✅ Main entry point (index.ts) compiles successfully!');
    } else {
        console.log(`\n⚠️  Main entry point has ${mainErrors} errors`);
    }
    
    // Recommendations
    console.log('\n' + '='.repeat(50));
    console.log('Recommendations:');
    console.log('-'.repeat(50));
    
    if (totalErrors < 1000) {
        console.log('✅ Error count is manageable for manual fixes');
        console.log('   Focus on fixing the top problem files first');
    } else if (totalErrors < 10000) {
        console.log('⚠️  Significant errors remain but progress is good');
        console.log('   Consider focusing on one module at a time');
    } else {
        console.log('🔧 Many errors remain - systematic approach needed');
        console.log('   Start with core models and work outward');
    }
    
    if (filesWorking > 0) {
        console.log(`\n✨ ${filesWorking} files are already working!`);
    }
}
