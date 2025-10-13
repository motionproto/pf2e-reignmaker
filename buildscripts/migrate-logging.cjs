#!/usr/bin/env node
/**
 * Migration script to replace console.log with logger calls
 * Usage: node buildscripts/migrate-logging.js
 */

const fs = require('fs');
const path = require('path');

// Files to process
const directories = [
  'src/controllers',
  'src/services'
];

// Files we've already updated (skip these)
const skipFiles = [
  'src/actors/KingdomActor.ts',
  'src/controllers/shared/PhaseControllerHelpers.ts',
  'src/controllers/StatusPhaseController.ts',
  'src/utils/Logger.ts'
];

let filesProcessed = 0;
let replacementsMade = 0;

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function shouldSkipFile(filePath) {
  return skipFiles.some(skip => filePath.endsWith(skip.replace('src/', '')));
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if already has logger import
  const hasLoggerImport = content.includes("import { logger } from");
  
  // Count console statements
  const consoleCount = (content.match(/console\.(log|warn|error|info|debug)/g) || []).length;
  
  if (consoleCount === 0) {
    return; // No console statements to replace
  }
  
  // Replace console statements with logger
  let replaced = 0;
  
  // Replace console.error -> logger.error
  const errorMatches = content.match(/console\.error/g);
  if (errorMatches) {
    content = content.replace(/console\.error/g, 'logger.error');
    replaced += errorMatches.length;
  }
  
  // Replace console.warn -> logger.warn  
  const warnMatches = content.match(/console\.warn/g);
  if (warnMatches) {
    content = content.replace(/console\.warn/g, 'logger.warn');
    replaced += warnMatches.length;
  }
  
  // Replace console.log -> logger.debug (most logs are verbose debug logs)
  const logMatches = content.match(/console\.log/g);
  if (logMatches) {
    content = content.replace(/console\.log/g, 'logger.debug');
    replaced += logMatches.length;
  }
  
  // Replace console.info -> logger.info (rare, but handle it)
  const infoMatches = content.match(/console\.info/g);
  if (infoMatches) {
    content = content.replace(/console\.info/g, 'logger.info');
    replaced += infoMatches.length;
  }
  
  // Replace console.debug -> logger.debug (rare, but handle it)
  const debugMatches = content.match(/console\.debug/g);
  if (debugMatches) {
    content = content.replace(/console\.debug/g, 'logger.debug');
    replaced += debugMatches.length;
  }
  
  // Add logger import if not present
  if (!hasLoggerImport && replaced > 0) {
    // Find the last import statement
    const importRegex = /^import\s+.*?;$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      // Determine relative path to Logger
      const relativePath = filePath.split('/').filter(p => p !== 'src').length - 1;
      const relativePrefix = '../'.repeat(relativePath);
      
      content = 
        content.slice(0, insertPosition) +
        `\nimport { logger } from '${relativePrefix}utils/Logger';` +
        content.slice(insertPosition);
    } else {
      // No imports found, add at top after comments
      const firstLineIndex = content.search(/^[^\/\s]/m);
      if (firstLineIndex !== -1) {
        content = 
          content.slice(0, firstLineIndex) +
          `import { logger } from '../utils/Logger';\n\n` +
          content.slice(firstLineIndex);
      }
    }
  }
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath} (${replaced} replacements)`);
    filesProcessed++;
    replacementsMade += replaced;
  }
}

// Main execution
console.log('🔄 Starting logging migration...\n');

directories.forEach(dir => {
  const files = getAllFiles(dir);
  
  files.forEach(file => {
    if (shouldSkipFile(file)) {
      console.log(`⏭️  Skipped ${file} (already migrated)`);
      return;
    }
    
    try {
      migrateFile(file);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
});

console.log(`\n✅ Migration complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Replacements made: ${replacementsMade}`);
