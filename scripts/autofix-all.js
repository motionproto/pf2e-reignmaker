#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Enhanced automatic fixer that will iteratively fix TypeScript issues
 */
class TypeScriptAutoFixer {
    constructor(srcDir) {
        this.srcDir = srcDir;
        this.fixCount = 0;
        this.iterations = 0;
        this.maxIterations = 10;
    }
    
    /**
     * Fix common patterns that appear in error messages
     */
    fixCommonErrors(content, filePath) {
        let fixed = content;
        const fileName = path.basename(filePath);
        
        // Fix function syntax issues
        fixed = fixed.replace(/function\s+(\w+)\s*\(\s*,\s*\(/gm, 'function $1(');
        fixed = fixed.replace(/function\s+(\w+)\s*\)\s*:/gm, 'function $1():');
        
        // Fix arrow function issues
        fixed = fixed.replace(/\)\s*=>\s*\)/gm, ') => {}');
        fixed = fixed.replace(/\(\s*_\s*\)\s*=>/gm, '() =>');
        fixed = fixed.replace(/\{\s*\(/gm, '{ (');
        fixed = fixed.replace(/\)\s*\)\s*$/gm, ') }');
        
        // Fix HTML in template literals
        fixed = fixed.replace(/<(\w+)([^>]*)>([^<]*)<\/\1>/gm, (match) => {
            if (!match.startsWith('`')) {
                return '`' + match + '`';
            }
            return match;
        });
        
        // Fix external/declare issues
        fixed = fixed.replace(/^external\s+/gm, 'declare ');
        fixed = fixed.replace(/declare\s+function/gm, 'declare function');
        fixed = fixed.replace(/declare\s+val\s+/gm, 'declare const ');
        fixed = fixed.replace(/declare\s+var\s+/gm, 'declare let ');
        
        // Fix if statement issues
        fixed = fixed.replace(/if\s*\(!\(/gm, 'if (!(');
        fixed = fixed.replace(/\)\)\s*\{/gm, ')) {');
        
        // Fix type annotations
        fixed = fixed.replace(/:\s*any\s+\|/gm, ': any |');
        fixed = fixed.replace(/\|\s+null\s+null/gm, '| null');
        
        // Fix object/array literals
        fixed = fixed.replace(/\[\s*\)/gm, ']');
        fixed = fixed.replace(/new\s+Set\(\[\s*\)/gm, 'new Set([])');
        fixed = fixed.replace(/new\s+Map\(\[\s*\)/gm, 'new Map([])');
        
        // Fix method calls
        fixed = fixed.replace(/\)\)\s*\)/gm, '))');
        fixed = fixed.replace(/\(\(\s*\)/gm, '(() => {})');
        
        // Fix class issues
        fixed = fixed.replace(/export\s+class\s+(\w+)\s+extends\s+$/gm, 'export class $1 {');
        fixed = fixed.replace(/export\s+interface\s+(\w+)\s+extends\s+$/gm, 'export interface $1 {');
        
        // Fix incomplete statements
        fixed = fixed.replace(/,\s*\(/gm, ' {');
        fixed = fixed.replace(/\)\s*,\s*$/gm, ');');
        
        // Remove double semicolons
        fixed = fixed.replace(/;;/gm, ';');
        
        // Fix switch case issues
        fixed = fixed.replace(/case\s+(\w+):\s*([^;]+);?\s*break;/gm, 'case $1: $2; break;');
        
        // Clean up trailing commas in function params
        fixed = fixed.replace(/\(([^)]*),\s*\)/gm, '($1)');
        
        // Fix incomplete let/const declarations
        fixed = fixed.replace(/^(\s*)(let|const|var)\s+(\w+)\s*$/gm, '$1$2 $3: any;');
        
        return fixed;
    }
    
    /**
     * Parse build errors and attempt to fix them
     */
    parseBuildErrors() {
        try {
            const output = execSync('npm run build 2>&1', { 
                cwd: path.dirname(this.srcDir),
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024 
            });
            
            // Extract error locations
            const errorPattern = /ERROR in ([^\n]+)\n([^\n]+)\n\[tsl\] ERROR in ([^(]+)\((\d+),(\d+)\)/g;
            const errors = [];
            let match;
            
            while ((match = errorPattern.exec(output)) !== null) {
                errors.push({
                    file: match[3],
                    line: parseInt(match[4]),
                    column: parseInt(match[5]),
                    message: match[0]
                });
            }
            
            return errors;
        } catch (error) {
            // Build failed, which is expected - parse the error output
            const output = error.stdout || error.output?.toString() || '';
            
            const errorPattern = /ERROR in ([^\n]+)\n([^\n]+)\n\[tsl\] ERROR in ([^(]+)\((\d+),(\d+)\)/g;
            const errors = [];
            let match;
            
            while ((match = errorPattern.exec(output)) !== null) {
                errors.push({
                    file: match[3],
                    line: parseInt(match[4]),
                    column: parseInt(match[5]),
                    message: match[0]
                });
            }
            
            return errors;
        }
    }
    
    /**
     * Fix a specific file based on error information
     */
    fixFile(filePath, errors) {
        try {
            if (!fs.existsSync(filePath)) {
                return false;
            }
            
            let content = fs.readFileSync(filePath, 'utf8');
            const originalContent = content;
            
            // Apply common fixes
            content = this.fixCommonErrors(content, filePath);
            
            // Apply specific fixes based on errors
            for (const error of errors) {
                if (error.message.includes('Parameter declaration expected')) {
                    // Fix function parameter issues
                    const lines = content.split('\n');
                    if (lines[error.line - 1]) {
                        lines[error.line - 1] = lines[error.line - 1]
                            .replace(/\(\s*,\s*\(/g, '(')
                            .replace(/\)\s*,\s*\)/g, ')')
                            .replace(/function\s+(\w+)\s*\(/g, 'function $1(');
                    }
                    content = lines.join('\n');
                }
                
                if (error.message.includes('Expression expected')) {
                    const lines = content.split('\n');
                    if (lines[error.line - 1]) {
                        lines[error.line - 1] = lines[error.line - 1]
                            .replace(/=>\s*\)/g, '=> {}')
                            .replace(/\{\s*\)/g, '{}');
                    }
                    content = lines.join('\n');
                }
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content);
                console.log(`✓ Fixed ${path.basename(filePath)}`);
                this.fixCount++;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`✗ Error fixing ${filePath}:`, error.message);
            return false;
        }
    }
    
    /**
     * Run the auto-fix process
     */
    async run() {
        console.log('Starting automated TypeScript fix process...\n');
        
        while (this.iterations < this.maxIterations) {
            this.iterations++;
            console.log(`\nIteration ${this.iterations}:`);
            console.log('=' .repeat(50));
            
            // Get current errors
            const errors = this.parseBuildErrors();
            
            if (errors.length === 0) {
                console.log('✅ No errors found - build successful!');
                break;
            }
            
            console.log(`Found ${errors.length} errors to fix...`);
            
            // Group errors by file
            const errorsByFile = {};
            for (const error of errors) {
                if (!errorsByFile[error.file]) {
                    errorsByFile[error.file] = [];
                }
                errorsByFile[error.file].push(error);
            }
            
            // Fix each file
            let fixedInIteration = 0;
            for (const [file, fileErrors] of Object.entries(errorsByFile)) {
                if (this.fixFile(file, fileErrors)) {
                    fixedInIteration++;
                }
                
                // Limit fixes per iteration to avoid infinite loops
                if (fixedInIteration >= 10) {
                    break;
                }
            }
            
            if (fixedInIteration === 0) {
                console.log('\n⚠️  No automatic fixes could be applied.');
                console.log('Manual intervention may be required for remaining errors.');
                break;
            }
            
            console.log(`Fixed ${fixedInIteration} files in this iteration.`);
        }
        
        console.log('\n' + '=' .repeat(50));
        console.log(`Auto-fix complete!`);
        console.log(`Total fixes applied: ${this.fixCount}`);
        console.log(`Iterations: ${this.iterations}`);
        console.log('=' .repeat(50));
        
        // Run final build to show status
        console.log('\nRunning final build...\n');
        try {
            execSync('npm run build', { 
                cwd: path.dirname(this.srcDir),
                stdio: 'inherit'
            });
            console.log('\n✅ Build successful!');
        } catch (error) {
            console.log('\n⚠️  Build still has errors. Manual fixes may be needed.');
        }
    }
}

// Main execution
async function main() {
    const srcDir = path.join(__dirname, '..', 'src-ts');
    const fixer = new TypeScriptAutoFixer(srcDir);
    await fixer.run();
}

main().catch(console.error);
