#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Fixing all UI style files...\n');

const stylesDir = path.join(__dirname, '..', 'src-ts', 'ui', 'styles');

// Get all style files
const styleFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('Styles.ts'));

let filesFixed = 0;

for (const file of styleFiles) {
    const filePath = path.join(stylesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix various broken patterns
    if (content.includes('val styles = """')) {
        console.log(`Fixing ${file}...`);
        
        // Replace val styles = """ pattern with proper method
        content = content.replace(/val styles = """/g, 'getStyles(): string {\n        return `');
        
        // Replace .trimIndent() at the end
        content = content.replace(/""".trimIndent\(\)/g, '`;\n    }');
        
        // Fix @keyframes that might have been broken
        content = content.replace(/\s+pulse-danger\s*{/g, '\n        @keyframes pulse-danger {');
        content = content.replace(/\s+dice-roll\s*{/g, '\n        @keyframes dice-roll {');
        
        filesFixed++;
        
    } else if (content.includes('getStyles(): string = """')) {
        console.log(`Fixing ${file}...`);
        
        // Fix the method syntax with triple quotes
        content = content.replace(/getStyles\(\): string = """/g, 'getStyles(): string {\n        return `');
        content = content.replace(/"""\s*$/m, '`;\n    }');
        
        filesFixed++;
        
    } else if (content.includes('getStyles(): string = `')) {
        console.log(`Fixing ${file}...`);
        
        // Fix the method syntax with backticks
        content = content.replace(/getStyles\(\): string = `/g, 'getStyles(): string {\n        return `');
        
        // Ensure proper closing
        if (!content.includes('return `')) {
            content = content.replace(/getStyles\(\): string {/g, 'getStyles(): string {\n        return `');
        }
        
        filesFixed++;
    }
    
    // Ensure the style object is properly exported
    if (!content.includes('export const')) {
        content = content.replace(/const (\w+Styles) = {/, 'export const $1 = {');
    }
    
    // Fix any remaining syntax issues
    if (content !== originalContent) {
        // Ensure proper closing of the styles object
        if (!content.trim().endsWith('};')) {
            // Find the last closing brace and ensure proper structure
            const lines = content.split('\n');
            let depth = 0;
            let lastObjectClose = -1;
            
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                if (line.includes('}')) {
                    depth++;
                    if (depth === 2) {
                        lastObjectClose = i;
                        break;
                    }
                }
                if (line.includes('{')) {
                    depth--;
                }
            }
            
            if (lastObjectClose === -1) {
                // Add proper closing
                content = content.trim() + '\n    }\n};\n';
            }
        }
        
        // Write the fixed content
        fs.writeFileSync(filePath, content);
        console.log(`  ✓ Fixed ${file}`);
    } else if (content.includes('getStyles(): string {') && content.includes('return `')) {
        console.log(`  ✓ ${file} already properly formatted`);
    } else {
        console.log(`  ⚠️  ${file} has unknown format, skipping`);
    }
}

console.log(`\n✅ Fixed ${filesFixed} style files`);
console.log(`Total style files processed: ${styleFiles.length}`);
