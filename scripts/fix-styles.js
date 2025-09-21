#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Fixing UI style files...\n');

const stylesDir = path.join(__dirname, '..', 'src-ts', 'ui', 'styles');

// Get all style files
const styleFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('Styles.ts'));

let filesFixed = 0;

for (const file of styleFiles) {
    const filePath = path.join(stylesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has the broken pattern
    if (content.includes('getStyles(): string = """')) {
        console.log(`Fixing ${file}...`);
        
        // Fix the method syntax
        content = content.replace(/getStyles\(\): string = """/g, 'getStyles(): string {');
        content = content.replace(/getStyles\(\): string = `/g, 'getStyles(): string {');
        
        // Find the closing triple quotes and replace with proper syntax
        const lines = content.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === '"""' || lines[i].trim() === '```') {
                // Replace with proper return statement closing
                lines[i] = '        `;';
                lines.splice(i, 0, '        return `');
                break;
            }
        }
        content = lines.join('\n');
        
        // Ensure proper closing
        if (!content.includes('return `')) {
            // Fallback: wrap the entire CSS in return statement
            content = content.replace(/getStyles\(\): string \{/g, 'getStyles(): string {\n        return `');
            if (!content.trim().endsWith('`;')) {
                if (!content.trim().endsWith('}')) {
                    content = content.trim() + '\n        `;\n    }\n};\n';
                } else {
                    // Insert before the closing braces
                    const lastBrace = content.lastIndexOf('}');
                    const secondLastBrace = content.lastIndexOf('}', lastBrace - 1);
                    content = content.substring(0, secondLastBrace) + '`;\n    }\n};\n';
                }
            }
        }
        
        // Write the fixed content
        fs.writeFileSync(filePath, content);
        filesFixed++;
        console.log(`  ✓ Fixed ${file}`);
    } else {
        // Check if already fixed or different pattern
        if (content.includes('getStyles(): string {')) {
            console.log(`  ✓ ${file} already fixed`);
        }
    }
}

console.log(`\n✅ Fixed ${filesFixed} style files`);
console.log(`Total style files processed: ${styleFiles.length}`);
