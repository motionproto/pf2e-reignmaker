#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix common TypeScript conversion issues
function fixTypeScriptIssues(tsCode, fileName) {
  let fixed = tsCode;
  
  // Fix function declarations - remove leftover 'fun' keywords
  fixed = fixed.replace(/\bfun\s+(\w+)/gm, 'function $1');
  fixed = fixed.replace(/^(\s*)fun\s+/gm, '$1function ');
  
  // Fix lambda/arrow functions
  fixed = fixed.replace(/\{\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*->/gm, '($1) =>');
  fixed = fixed.replace(/\{\s*->/gm, '() =>');
  
  // Fix HTML template literals - common in UI components
  fixed = fixed.replace(/<(\w+)>([^<]*)<\/\1>/gm, (match) => {
    // Preserve HTML tags but wrap in template literals if needed
    return '`' + match + '`';
  });
  
  // Fix when/switch statements more thoroughly
  fixed = fixed.replace(/when\s*\{/gm, 'switch (true) {');
  fixed = fixed.replace(/(\w+|"[^"]+"|'[^']+')\s*->\s*/gm, 'case $1: ');
  fixed = fixed.replace(/else\s*->\s*/gm, 'default: ');
  
  // Fix string interpolation
  fixed = fixed.replace(/"\$(\w+)"/gm, '`${$1}`');
  fixed = fixed.replace(/'\$(\w+)'/gm, '`${$1}`');
  fixed = fixed.replace(/"\$\{([^}]+)\}"/gm, '`${$1}`');
  
  // Fix property access with safe navigation
  fixed = fixed.replace(/(\w+)\?\./gm, '$1?.');
  
  // Fix elvis operator
  fixed = fixed.replace(/(\w+)\s*\?\:\s*/gm, '$1 ?? ');
  
  // Fix range expressions
  fixed = fixed.replace(/for\s*\((\w+)\s+in\s+(\d+)\.\.(\d+)\)/gm, 
    'for (let $1 = $2; $1 <= $3; $1++)');
  fixed = fixed.replace(/for\s*\((\w+)\s+in\s+(\d+)\s+until\s+(\d+)\)/gm,
    'for (let $1 = $2; $1 < $3; $1++)');
    
  // Fix list operations
  fixed = fixed.replace(/\.forEach\s*\{/gm, '.forEach((');
  fixed = fixed.replace(/\.map\s*\{/gm, '.map((');
  fixed = fixed.replace(/\.filter\s*\{/gm, '.filter((');
  fixed = fixed.replace(/\.find\s*\{/gm, '.find((');
  
  // Fix companion object patterns
  fixed = fixed.replace(/companion\s+object/gm, 'static');
  
  // Fix nullable type syntax
  fixed = fixed.replace(/:\s*(\w+)\?/gm, ': $1 | null');
  
  // Fix lateinit var
  fixed = fixed.replace(/lateinit\s+var\s+/gm, 'let ');
  
  // Fix const val
  fixed = fixed.replace(/const\s+val\s+/gm, 'const ');
  
  // Fix override keyword
  fixed = fixed.replace(/override\s+/gm, '');
  
  // Fix init blocks
  fixed = fixed.replace(/init\s*\{/gm, 'constructor() {');
  
  // Fix 'is' type checks
  fixed = fixed.replace(/(\w+)\s+is\s+(\w+)/gm, '$1 instanceof $2');
  
  // Fix casting
  fixed = fixed.replace(/as\s+(\w+)/gm, 'as $1');
  fixed = fixed.replace(/as\?/gm, 'as');
  
  // Fix require/check functions
  fixed = fixed.replace(/require\(/gm, 'if (!(');
  fixed = fixed.replace(/check\(/gm, 'if (!(');
  
  // Fix listOf, mapOf, etc.
  fixed = fixed.replace(/listOf\(/gm, '[');
  fixed = fixed.replace(/mutableListOf\(/gm, '[');
  fixed = fixed.replace(/arrayOf\(/gm, '[');
  fixed = fixed.replace(/setOf\(/gm, 'new Set([');
  fixed = fixed.replace(/mapOf\(/gm, 'new Map([');
  fixed = fixed.replace(/\)\s*\.toTypedArray\(\)/gm, ']');
  
  // Fix common Kotlin stdlib functions
  fixed = fixed.replace(/\.let\s*\{/gm, ' && ((');
  fixed = fixed.replace(/\.also\s*\{/gm, ' && ((');
  fixed = fixed.replace(/\.apply\s*\{/gm, ' && Object.assign(');
  fixed = fixed.replace(/\.run\s*\{/gm, ' && ((');
  
  // Fix this@ references
  fixed = fixed.replace(/this@\w+/gm, 'this');
  
  // Fix backticks in identifiers
  fixed = fixed.replace(/`([^`]+)`/gm, '$1');
  
  // Fix JSName decorator
  fixed = fixed.replace(/@JsName\([^)]+\)\s*/gm, '');
  
  // Fix external declarations
  fixed = fixed.replace(/external\s+(class|interface|fun|val|var)/gm, 'declare $1');
  
  // Remove remaining Kotlin annotations
  fixed = fixed.replace(/@\w+(\([^)]*\))?\s*/gm, '');
  
  // Fix return@label
  fixed = fixed.replace(/return@\w+/gm, 'return');
  
  // Fix object declarations
  fixed = fixed.replace(/^object\s+(\w+)\s*\{/gm, 'export const $1 = {');
  fixed = fixed.replace(/^(\s+)object\s+(\w+)\s*\{/gm, '$1const $2 = {');
  
  // Fix trailing lambdas
  fixed = fixed.replace(/\)\s*\{([^}]+)\}/gm, ', ($1))');
  
  return fixed;
}

// Function to fix a single file
async function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const fixed = fixTypeScriptIssues(content, fileName);
    
    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed);
      console.log(`✓ Fixed ${fileName}`);
      return true;
    } else {
      console.log(`⚬ No changes needed for ${fileName}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Function to recursively find all TypeScript files
function findTypeScriptFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findTypeScriptFiles(fullPath, files);
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main function
async function main() {
  console.log('Fixing TypeScript conversion issues...\n');
  
  const srcDir = path.join(__dirname, '..', 'src-ts');
  
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Directory ${srcDir} does not exist`);
    process.exit(1);
  }
  
  const files = findTypeScriptFiles(srcDir);
  console.log(`Found ${files.length} TypeScript files\n`);
  
  let fixedCount = 0;
  
  for (const file of files) {
    const wasFixed = await fixFile(file);
    if (wasFixed) fixedCount++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Fixed ${fixedCount} files`);
  console.log('='.repeat(50));
  
  // Now create additional helper files
  console.log('\nCreating helper type definitions...');
  
  // Create global types
  const globalTypes = `// Global type definitions for PF2e Kingdom Lite

declare global {
  interface Window {
    Hooks: typeof Hooks;
    game: Game;
    CONFIG: any;
    ui: any;
  }
  
  const Hooks: {
    once(hook: string, callback: Function): void;
    on(hook: string, callback: Function): void;
    off(hook: string, callback: Function): void;
    callAll(hook: string, ...args: any[]): void;
    call(hook: string, ...args: any[]): boolean;
  };
  
  interface Game {
    settings: ClientSettings;
    user: User;
    users: Users;
    modules: Map<string, Module>;
    system: System;
    i18n: Localization;
    [key: string]: any;
  }
  
  interface ClientSettings {
    register(module: string, key: string, data: any): void;
    get(module: string, key: string): any;
    set(module: string, key: string, value: any): Promise<any>;
  }
  
  interface User {
    id: string;
    name: string;
    isGM: boolean;
  }
  
  interface Users {
    current: User;
  }
  
  interface Module {
    id: string;
    active: boolean;
    [key: string]: any;
  }
  
  interface System {
    id: string;
    version: string;
    [key: string]: any;
  }
  
  interface Localization {
    localize(key: string): string;
    format(key: string, data: any): string;
  }
}

export {};
`;
  
  fs.writeFileSync(path.join(srcDir, 'types', 'global.d.ts'), globalTypes);
  console.log('✓ Created global.d.ts');
  
  // Create HTML helper functions
  const htmlHelpers = `// HTML Helper functions for UI components

export function html(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((result, str, i) => {
    const value = values[i] !== undefined ? values[i] : '';
    return result + str + value;
  }, '');
}

export function div(className?: string, content?: string): string {
  return \`<div\${className ? \` class="\${className}"\` : ''}>\${content || ''}</div>\`;
}

export function span(className?: string, content?: string): string {
  return \`<span\${className ? \` class="\${className}"\` : ''}>\${content || ''}</span>\`;
}

export function button(className?: string, onclick?: string, content?: string): string {
  return \`<button\${className ? \` class="\${className}"\` : ''}\${onclick ? \` onclick="\${onclick}"\` : ''}>\${content || ''}</button>\`;
}

export function i(className?: string): string {
  return \`<i class="\${className || ''}"></i>\`;
}

export function img(src: string, alt?: string, className?: string): string {
  return \`<img src="\${src}"\${alt ? \` alt="\${alt}"\` : ''}\${className ? \` class="\${className}"\` : ''}>\`;
}

export function ul(className?: string, content?: string): string {
  return \`<ul\${className ? \` class="\${className}"\` : ''}>\${content || ''}</ul>\`;
}

export function li(className?: string, content?: string): string {
  return \`<li\${className ? \` class="\${className}"\` : ''}>\${content || ''}</li>\`;
}

export function h1(content?: string, className?: string): string {
  return \`<h1\${className ? \` class="\${className}"\` : ''}>\${content || ''}</h1>\`;
}

export function h2(content?: string, className?: string): string {
  return \`<h2\${className ? \` class="\${className}"\` : ''}>\${content || ''}</h2>\`;
}

export function h3(content?: string, className?: string): string {
  return \`<h3\${className ? \` class="\${className}"\` : ''}>\${content || ''}</h3>\`;
}

export function p(content?: string, className?: string): string {
  return \`<p\${className ? \` class="\${className}"\` : ''}>\${content || ''}</p>\`;
}
`;
  
  if (!fs.existsSync(path.join(srcDir, 'ui', 'html-helpers.ts'))) {
    fs.writeFileSync(path.join(srcDir, 'ui', 'html-helpers.ts'), htmlHelpers);
    console.log('✓ Created html-helpers.ts');
  }
}

// Run the fixer
main().catch(console.error);
