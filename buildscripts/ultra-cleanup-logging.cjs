#!/usr/bin/env node
/**
 * Ultra-aggressive logging cleanup - removes ALL but catastrophic failures
 * Keeps only: Data corruption, missing actors, critical initialization failures
 * 
 * Usage: node buildscripts/ultra-cleanup-logging.cjs
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

// Catastrophic errors to KEEP (everything else gets removed)
const keepPatterns = [
  /No kingdom actor/i,
  /data corruption/i,
  /Invalid hex ID detected.*rendering issues/i,
  /Actor not found/i,
  /Failed to load kingdom data/i
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

function shouldKeepLog(line) {
  // Check if this is a catastrophic error that should be kept
  return keepPatterns.some(pattern => pattern.test(line));
}

function cleanupFile(filePath) {
  // Skip the logger itself
  if (filePath.includes('Logger.ts')) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const lines = content.split('\n');
  const newLines = [];
  const originalLineCount = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line contains logger.error or logger.warn
    if (/logger\.(error|warn)/.test(line)) {
      // Keep only catastrophic errors
      if (shouldKeepLog(line)) {
        newLines.push(line);
      }
      // Otherwise, skip this line (remove it)
    } else {
      // Keep all non-logging lines
      newLines.push(line);
    }
  }
  
  const newContent = newLines.join('\n');
  
  // Only write if content changed
  if (newContent !== originalContent) {
    const removed = originalLineCount - newLines.length;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${filePath} (removed ${removed} lines)`);
    filesProcessed++;
    linesRemoved += removed;
  }
}

// Main execution
console.log('🔥 Starting ULTRA-aggressive logging cleanup...\n');
console.log('   Keeping: ONLY catastrophic failures (no actor, data corruption)');
console.log('   Removing: ALL other logger.error() and logger.warn() calls\n');

directories.forEach(dir => {
  const files = getAllFiles(dir);
  
  files.forEach(file => {
    try {
      cleanupFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
});

console.log(`\n✅ Ultra-cleanup complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Lines removed: ${linesRemoved}`);
console.log(`\n💡 Remaining logs should be < 10 (only catastrophic failures)`);
