#!/usr/bin/env node

/**
 * Apply skill updates from event-skills-mapping.json to event pipeline TypeScript files
 * 
 * This script:
 * 1. Reads the mapping JSON
 * 2. For each event file, updates the skills array in each approach's strategicChoice options
 * 3. Corrects known typos (theivery -> thievery, sociery -> society, perfromance -> performance)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Fix known typos in the mapping
const SKILL_CORRECTIONS = {
  'theivery': 'thievery',
  'sociery': 'society',
  'perfromance': 'performance'
};

function correctSkills(skills) {
  return skills.map(skill => SKILL_CORRECTIONS[skill] || skill);
}

function updateEventFile(filePath, approachUpdates) {
  console.log(`\nUpdating ${filePath}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let updated = false;
  
  // For each approach that needs updating
  for (const [approachId, skillData] of Object.entries(approachUpdates)) {
    // Skip if no changes needed (empty add array and not a replacement)
    if (!skillData.replace && skillData.add.length === 0) {
      console.log(`  - ${approachId}: no changes needed`);
      continue;
    }
    
    // Correct any typos in the final skills list
    const finalSkills = correctSkills(skillData.final);
    
    // Build the skills array string
    const skillsArrayStr = `['${finalSkills.join("', '")}']`;
    
    // Find the approach in the file
    // Look for: id: 'virtuous', 'practical', or 'ruthless'
    const approachPattern = new RegExp(
      `(\\{[^}]*id:\\s*'${approachId}'[^}]*skills:\\s*)\\[[^\\]]*\\]`,
      's'
    );
    
    const match = content.match(approachPattern);
    if (match) {
      const before = match[1];
      const newContent = content.replace(
        approachPattern,
        `${before}${skillsArrayStr}`
      );
      
      if (newContent !== content) {
        content = newContent;
        updated = true;
        const action = skillData.replace ? 'REPLACED' : 'ADDED';
        console.log(`  - ${approachId}: ${action} skills -> ${skillsArrayStr}`);
      } else {
        console.log(`  - ${approachId}: WARNING - pattern matched but no change made`);
      }
    } else {
      console.log(`  - ${approachId}: WARNING - could not find approach in file`);
    }
  }
  
  if (updated) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ File updated successfully`);
    return true;
  } else {
    console.log(`  - No changes made to file`);
    return false;
  }
}

function main() {
  // Read the mapping
  const mappingPath = 'buildscripts/event-skills-mapping.json';
  const mapping = JSON.parse(readFileSync(mappingPath, 'utf-8'));
  
  const eventsDir = 'src/pipelines/events';
  
  console.log('Applying skill updates to event pipeline files...\n');
  
  let filesUpdated = 0;
  let totalChanges = 0;
  
  // Process each event file
  for (const [filename, approachUpdates] of Object.entries(mapping)) {
    const filePath = join(eventsDir, filename);
    
    // Count how many approaches have actual changes
    const changesInFile = Object.values(approachUpdates).filter(
      data => data.replace || data.add.length > 0
    ).length;
    
    if (changesInFile === 0) {
      console.log(`\nSkipping ${filename} (no changes needed)`);
      continue;
    }
    
    try {
      const wasUpdated = updateEventFile(filePath, approachUpdates);
      if (wasUpdated) {
        filesUpdated++;
        totalChanges += changesInFile;
      }
    } catch (error) {
      console.error(`  ✗ Error updating ${filename}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Summary:`);
  console.log(`  Files updated: ${filesUpdated}`);
  console.log(`  Total skill changes: ${totalChanges}`);
  console.log('='.repeat(60));
}

main();
