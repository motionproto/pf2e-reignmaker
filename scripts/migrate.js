#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Kotlin to TypeScript migration mappings
const typeMapping = {
  'String': 'string',
  'Boolean': 'boolean',
  'Int': 'number',
  'Double': 'number',
  'Float': 'number',
  'Long': 'number',
  'Unit': 'void',
  'Any': 'any',
  'dynamic': 'any',
  'Nothing': 'never',
  'Array<': 'Array<',
  'List<': 'Array<',
  'MutableList<': 'Array<',
  'Set<': 'Set<',
  'Map<': 'Map<',
  'Pair<': '[',
};

// Function to convert Kotlin code to TypeScript
function convertKotlinToTypeScript(kotlinCode, fileName) {
  let tsCode = kotlinCode;

  // Remove package declarations
  tsCode = tsCode.replace(/^package\s+[\w.]+\s*$/gm, '');

  // Convert imports
  tsCode = tsCode.replace(/^import\s+([\w.]+)/gm, (match, p1) => {
    if (p1.includes('kotlin.')) return ''; // Remove Kotlin stdlib imports
    if (p1.includes('kotlinx.')) return ''; // Remove Kotlinx imports
    return `// TODO: Review import - ${match}`;
  });

  // Convert data classes to interfaces
  tsCode = tsCode.replace(/data\s+class\s+(\w+)\s*\(([\s\S]*?)\)/gm, (match, className, params) => {
    const fields = parseDataClassFields(params);
    return `export interface ${className} {\n${fields}\n}`;
  });

  // Convert regular classes
  tsCode = tsCode.replace(/class\s+(\w+)(?:\s*:\s*([\w<>,\s]+))?\s*\{/gm, (match, className, extends_) => {
    if (extends_) {
      return `export class ${className} extends ${extends_.trim()} {`;
    }
    return `export class ${className} {`;
  });

  // Convert companion objects
  tsCode = tsCode.replace(/companion\s+object\s*\{([\s\S]*?)\n\s*\}/gm, (match, content) => {
    return `// Static members\n${content.trim()}`;
  });

  // Convert functions
  tsCode = tsCode.replace(/fun\s+(\w+)\s*\((.*?)\)\s*:\s*([\w<>]+)/gm, (match, funcName, params, returnType) => {
    const tsParams = convertParameters(params);
    const tsReturnType = convertType(returnType);
    return `${funcName}(${tsParams}): ${tsReturnType}`;
  });

  // Convert suspend functions to async
  tsCode = tsCode.replace(/suspend\s+fun\s+(\w+)/gm, 'async $1');

  // Convert variables
  tsCode = tsCode.replace(/val\s+(\w+)\s*:\s*([\w<>]+)/gm, (match, varName, type) => {
    const tsType = convertType(type);
    return `const ${varName}: ${tsType}`;
  });

  tsCode = tsCode.replace(/var\s+(\w+)\s*:\s*([\w<>]+)/gm, (match, varName, type) => {
    const tsType = convertType(type);
    return `let ${varName}: ${tsType}`;
  });

  // Convert nullable types
  tsCode = tsCode.replace(/([\w<>]+)\?/gm, '$1 | null');

  // Convert string templates
  tsCode = tsCode.replace(/\$\{([^}]+)\}/gm, '${$1}');
  tsCode = tsCode.replace(/\$(\w+)/gm, '${$1}');

  // Convert when expressions to switch
  tsCode = tsCode.replace(/when\s*\((.*?)\)\s*\{([\s\S]*?)\n\s*\}/gm, (match, expr, cases) => {
    return `switch (${expr}) {${convertWhenCases(cases)}\n}`;
  });

  // Convert if expressions
  tsCode = tsCode.replace(/=\s*if\s*\((.*?)\)\s*(.*?)\s*else\s*(.*?)$/gm, 
    '= $1 ? $2 : $3');

  // Convert external declarations
  tsCode = tsCode.replace(/external\s+(class|interface|fun)/gm, 'declare $1');

  // Convert @JsName annotations
  tsCode = tsCode.replace(/@JsName\("(.*?)"\)/gm, '// @ts-ignore: JsName("$1")');

  // Remove Kotlin-specific annotations
  tsCode = tsCode.replace(/@\w+(\([^)]*\))?/gm, '');

  // Convert object declarations to const
  tsCode = tsCode.replace(/object\s+(\w+)\s*\{/gm, 'export const $1 = {');

  // Add file header
  const header = `// Auto-converted from ${fileName}\n// TODO: Review and fix TypeScript-specific issues\n\n`;
  
  return header + tsCode;
}

function parseDataClassFields(params) {
  const fields = params.split(',').map(field => {
    const match = field.trim().match(/(val|var)?\s*(\w+)\s*:\s*([\w<>?]+)(\s*=\s*.+)?/);
    if (match) {
      const [, , name, type, defaultValue] = match;
      const tsType = convertType(type.replace('?', ' | null'));
      return `  ${name}: ${tsType};`;
    }
    return '';
  }).filter(Boolean);
  
  return fields.join('\n');
}

function convertParameters(params) {
  if (!params.trim()) return '';
  
  return params.split(',').map(param => {
    const match = param.trim().match(/(\w+)\s*:\s*([\w<>?]+)(\s*=\s*.+)?/);
    if (match) {
      const [, name, type, defaultValue] = match;
      const tsType = convertType(type.replace('?', ' | null'));
      const optional = defaultValue ? '?' : '';
      return `${name}${optional}: ${tsType}`;
    }
    return param;
  }).join(', ');
}

function convertType(kotlinType) {
  let tsType = kotlinType;
  
  // Apply type mappings
  for (const [kotlin, ts] of Object.entries(typeMapping)) {
    tsType = tsType.replace(new RegExp(kotlin, 'g'), ts);
  }
  
  // Handle Pair specifically
  tsType = tsType.replace(/\[([^,]+),\s*([^\]]+)\]/g, '[$1, $2]');
  
  return tsType;
}

function convertWhenCases(cases) {
  return cases.replace(/(\w+|"[^"]+"|'[^']+')\s*->\s*(.*?)(?=\n|$)/gm, 
    '\n  case $1: $2; break;');
}

// Function to process a single file
async function processFile(inputPath, outputPath) {
  try {
    const kotlinCode = fs.readFileSync(inputPath, 'utf8');
    const fileName = path.basename(inputPath);
    const tsCode = convertKotlinToTypeScript(kotlinCode, fileName);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, tsCode);
    console.log(`✓ Converted ${fileName}`);
    return true;
  } catch (error) {
    console.error(`✗ Error converting ${inputPath}:`, error.message);
    return false;
  }
}

// Main migration function
async function migrate() {
  console.log('Starting TypeScript migration...\n');
  
  const sourceDir = path.join(__dirname, '..', 'src', 'jsMain', 'kotlin');
  const targetDir = path.join(__dirname, '..', 'src-ts');
  
  // File mapping for migration
  const fileMappings = [
    // Main entry
    { from: 'Main.kt', to: 'index.ts' },
    
    // Models
    { from: 'kingdom/lite/model/KingdomState.kt', to: 'models/KingdomState.ts' },
    { from: 'kingdom/lite/model/Events.kt', to: 'models/Events.ts' },
    { from: 'kingdom/lite/model/Incidents.kt', to: 'models/Incidents.ts' },
    { from: 'kingdom/lite/model/PlayerActions.kt', to: 'models/PlayerActions.ts' },
    { from: 'kingdom/lite/model/Structures.kt', to: 'models/Structures.ts' },
    { from: 'kingdom/lite/model/BuildProject.kt', to: 'models/BuildProject.ts' },
    { from: 'kingdom/lite/model/Hex.kt', to: 'models/Hex.ts' },
    { from: 'kingdom/lite/model/TurnManager.kt', to: 'models/TurnManager.ts' },
    
    // API
    { from: 'kingdom/lite/api/FoundryApi.kt', to: 'api/foundry.ts' },
    { from: 'kingdom/lite/api/KingmakerApi.kt', to: 'api/kingmaker.ts' },
    
    // Core
    { from: 'kingdom/lite/fresh/DataLoader.kt', to: 'core/DataLoader.ts' },
    { from: 'kingdom/lite/fresh/KingdomCore.kt', to: 'core/KingdomCore.ts' },
    { from: 'kingdom/lite/fresh/KingdomManager.kt', to: 'core/KingdomManager.ts' },
    { from: 'kingdom/lite/fresh/SimpleKingdomUI.kt', to: 'core/SimpleKingdomUI.ts' },
    
    // UI Base
    { from: 'kingdom/lite/ui/Application.kt', to: 'ui/Application.ts' },
    { from: 'kingdom/lite/ui/KingdomSheet.kt', to: 'ui/KingdomSheet.ts' },
    { from: 'kingdom/lite/ui/KingdomDialog.kt', to: 'ui/KingdomDialog.ts' },
    { from: 'kingdom/lite/ui/KingdomApplicationV2.kt', to: 'ui/KingdomApplicationV2.ts' },
    { from: 'kingdom/lite/ui/KingdomDialogV2.kt', to: 'ui/KingdomDialogV2.ts' },
    { from: 'kingdom/lite/ui/KingdomIcon.kt', to: 'ui/KingdomIcon.ts' },
    
    // Components
    { from: 'kingdom/lite/ui/components/ActionCard.kt', to: 'ui/components/ActionCard.ts' },
    { from: 'kingdom/lite/ui/components/ActionListItem.kt', to: 'ui/components/ActionListItem.ts' },
    { from: 'kingdom/lite/ui/components/ContentComponent.kt', to: 'ui/components/ContentComponent.ts' },
    { from: 'kingdom/lite/ui/components/ContentFactions.kt', to: 'ui/components/ContentFactions.ts' },
    { from: 'kingdom/lite/ui/components/ContentModifiers.kt', to: 'ui/components/ContentModifiers.ts' },
    { from: 'kingdom/lite/ui/components/ContentNotes.kt', to: 'ui/components/ContentNotes.ts' },
    { from: 'kingdom/lite/ui/components/ContentSelector.kt', to: 'ui/components/ContentSelector.ts' },
    { from: 'kingdom/lite/ui/components/ContentSettings.kt', to: 'ui/components/ContentSettings.ts' },
    { from: 'kingdom/lite/ui/components/ContentSettlements.kt', to: 'ui/components/ContentSettlements.ts' },
    { from: 'kingdom/lite/ui/components/ContentTurn.kt', to: 'ui/components/ContentTurn.ts' },
    { from: 'kingdom/lite/ui/components/KingdomStats.kt', to: 'ui/components/KingdomStats.ts' },
    { from: 'kingdom/lite/ui/components/StructurePicker.kt', to: 'ui/components/StructurePicker.ts' },
    { from: 'kingdom/lite/ui/components/TurnController.kt', to: 'ui/components/TurnController.ts' },
    
    // Turn phases
    { from: 'kingdom/lite/ui/turn/ActionsPhase.kt', to: 'ui/turn/ActionsPhase.ts' },
    { from: 'kingdom/lite/ui/turn/EventsPhase.kt', to: 'ui/turn/EventsPhase.ts' },
    { from: 'kingdom/lite/ui/turn/ResolutionPhase.kt', to: 'ui/turn/ResolutionPhase.ts' },
    { from: 'kingdom/lite/ui/turn/ResourcesPhase.kt', to: 'ui/turn/ResourcesPhase.ts' },
    { from: 'kingdom/lite/ui/turn/StatusPhase.kt', to: 'ui/turn/StatusPhase.ts' },
    { from: 'kingdom/lite/ui/turn/UnrestPhase.kt', to: 'ui/turn/UnrestPhase.ts' },
    
    // Styles
    { from: 'kingdom/lite/ui/styles/ActionStyles.kt', to: 'ui/styles/ActionStyles.ts' },
    { from: 'kingdom/lite/ui/styles/BaseStyles.kt', to: 'ui/styles/BaseStyles.ts' },
    { from: 'kingdom/lite/ui/styles/ContentStyles.kt', to: 'ui/styles/ContentStyles.ts' },
    { from: 'kingdom/lite/ui/styles/ControlStyles.kt', to: 'ui/styles/ControlStyles.ts' },
    { from: 'kingdom/lite/ui/styles/EventStyles.kt', to: 'ui/styles/EventStyles.ts' },
    { from: 'kingdom/lite/ui/styles/HeaderStyles.kt', to: 'ui/styles/HeaderStyles.ts' },
    { from: 'kingdom/lite/ui/styles/KingdomStatsStyles.kt', to: 'ui/styles/KingdomStatsStyles.ts' },
    { from: 'kingdom/lite/ui/styles/ResourceStyles.kt', to: 'ui/styles/ResourceStyles.ts' },
    { from: 'kingdom/lite/ui/styles/StructureStyles.kt', to: 'ui/styles/StructureStyles.ts' },
    { from: 'kingdom/lite/ui/styles/TurnStyles.kt', to: 'ui/styles/TurnStyles.ts' },
    { from: 'kingdom/lite/ui/styles/UnrestStyles.kt', to: 'ui/styles/UnrestStyles.ts' },
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  // Process files in batches
  console.log(`Converting ${fileMappings.length} files...\n`);
  
  for (const mapping of fileMappings) {
    const inputPath = path.join(sourceDir, mapping.from);
    const outputPath = path.join(targetDir, mapping.to);
    
    if (fs.existsSync(inputPath)) {
      const success = await processFile(inputPath, outputPath);
      if (success) successCount++;
      else failCount++;
    } else {
      console.log(`⚠ Skipping ${mapping.from} (not found)`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Migration complete!`);
  console.log(`✓ Successfully converted: ${successCount} files`);
  if (failCount > 0) {
    console.log(`✗ Failed: ${failCount} files`);
  }
  console.log('='.repeat(50));
  
  // Create a stub index.ts if Main.kt wasn't found
  const indexPath = path.join(targetDir, 'index.ts');
  if (!fs.existsSync(indexPath)) {
    const stubIndex = `// Entry point for the PF2e Kingdom Lite module

console.log('PF2e Kingdom Lite module loading...');

// Register with Foundry
Hooks.once('init', async () => {
  console.log('PF2e Kingdom Lite | Initializing');
  // TODO: Initialize module
});

Hooks.once('ready', async () => {
  console.log('PF2e Kingdom Lite | Ready');
  // TODO: Module ready logic
});

export {};
`;
    fs.writeFileSync(indexPath, stubIndex);
    console.log('\n✓ Created stub index.ts');
  }
}

// Run migration
migrate().catch(console.error);
