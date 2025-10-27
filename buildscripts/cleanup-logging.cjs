#!/usr/bin/env node
/**
 * Aggressive logging cleanup - removes all non-critical logs
 * Keeps only: logger.error() and logger.warn()
 * Removes: console.log, logger.debug, logger.info, and most success/progress logs
 * 
 * Usage: node buildscripts/cleanup-logging.cjs
 */

const fs = require('fs');
const path = require('path');

// Directories to process
const directories = [
  'src/services',
  'src/controllers',
  'src/view',
  'src/hooks',
  'src/actions',
  'src/ui',
  'src/stores',
  'src/types',
  'src/utils',
  'src/models'
];

// Skip debug utilities and the logger itself
const skipPatterns = [
  'Logger.ts',
  'debug/',
  'test.ts',
  'test.svelte'
];

let filesProcessed = 0;
let linesRemoved = 0;

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if ((file.endsWith('.ts') || file.endsWith('.svelte')) && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function shouldSkipFile(filePath) {
  return skipPatterns.some(pattern => filePath.includes(pattern));
}

function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const originalLines = content.split('\n').length;
  
  // Pattern to match logging statements (single or multi-line)
  const patterns = [
    // Single-line console.log/info/debug
    /^\s*console\.(log|info|debug)\([^;]*\);?\s*$/gm,
    
    // Single-line logger.debug/info
    /^\s*logger\.(debug|info)\([^;]*\);?\s*$/gm,
    
    // Multi-line console.log/info/debug
    /^\s*console\.(log|info|debug)\(\s*\n[\s\S]*?\n\s*\);?\s*$/gm,
    
    // Multi-line logger.debug/info
    /^\s*logger\.(debug|info)\(\s*\n[\s\S]*?\n\s*\);?\s*$/gm,
    
    // Reactive Svelte debug statements like: $: console.log(...)
    /^\s*\$:\s*console\.(log|info|debug)\([^;]*\);?\s*$/gm,
    
    // Comments that are just debug logs
    /^\s*\/\/\s*console\.(log|info|debug|warn|error)\([^;]*\);?\s*$/gm,
  ];
  
  // Remove all matching patterns
  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });
  
  // Clean up console.error and console.warn - convert to logger equivalents
  const hasConsoleError = /console\.error/.test(content);
  const hasConsoleWarn = /console\.warn/.test(content);
  
  if (hasConsoleError || hasConsoleWarn) {
    content = content.replace(/console\.error/g, 'logger.error');
    content = content.replace(/console\.warn/g, 'logger.warn');
    
    // Add logger import if needed
    if (!content.includes("import { logger }")) {
      const importRegex = /^import\s+.*?;$/gm;
      const imports = content.match(importRegex);
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;
        
        // Calculate relative path
        const depth = filePath.split('/').filter(p => p !== 'src' && p !== '').length - 1;
        const relativePrefix = depth > 0 ? '../'.repeat(depth) : './';
        
        content = 
          content.slice(0, insertPosition) +
          `\nimport { logger } from '${relativePrefix}utils/Logger';` +
          content.slice(insertPosition);
      }
    }
  }
  
  // Remove empty lines (more than 2 consecutive blank lines)
  content = content.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n\n');
  
  // Clean up unused logger imports if no logger calls remain
  if (!content.includes('logger.')) {
    content = content.replace(/^import { logger } from ['"].*?['"];?\s*\n/gm, '');
  }
  
  // Only write if content changed
  if (content !== originalContent) {
    const newLines = content.split('\n').length;
    const removed = originalLines - newLines;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath} (removed ${removed} lines)`);
    filesProcessed++;
    linesRemoved += removed;
  }
}

// Main execution
console.log('🧹 Starting aggressive logging cleanup...\n');
console.log('   Keeping: logger.error(), logger.warn()');
console.log('   Removing: console.log, logger.debug, logger.info\n');

directories.forEach(dir => {
  const files = getAllFiles(dir);
  
  files.forEach(file => {
    if (shouldSkipFile(file)) {
      return;
    }
    
    try {
      cleanupFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
});

console.log(`\n✅ Cleanup complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Lines removed: ${linesRemoved}`);
console.log(`\n💡 Next steps:`);
console.log(`   1. Review changes: git diff`);
console.log(`   2. Test the application`);
console.log(`   3. Adjust log levels in Foundry settings if needed`);
