#!/usr/bin/env node

/**
 * Apply Event Skills from CSV to TypeScript Pipeline Files
 * 
 * This script:
 * 1. Reads EVENT_SKILLS_TABLE.csv
 * 2. For each event, extracts the 3 skills per approach (excluding "applicable lore")
 * 3. Updates the TypeScript pipeline files to include these skills + "applicable lore"
 * 
 * Usage:
 *   node buildscripts/apply-event-skills.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CSV_PATH = path.join(__dirname, '../docs/planning/EVENT_SKILLS_TABLE.csv');
const EVENTS_DIR = path.join(__dirname, '../src/pipelines/events');
const OUTPUT_JSON = path.join(__dirname, 'event-skills-mapping.json');

// Parse CSV (simple parser for this specific format)
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Convert event name to pipeline ID (kebab-case)
function eventNameToId(name) {
  // Remove number prefix (e.g., "1. Criminal Trial" -> "Criminal Trial")
  const withoutNumber = name.replace(/^\d+\.\s*/, '');
  
  // Convert to kebab-case
  return withoutNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Convert approach name to ID
function approachToId(approach) {
  const map = {
    'Virtuous': 'virtuous',
    'Practical': 'practical',
    'Ruthless': 'ruthless'
  };
  return map[approach] || approach.toLowerCase();
}

// Main execution
console.log('📖 Reading CSV...');
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const rows = parseCSV(csvContent);

console.log(`✅ Parsed ${rows.length} rows from CSV`);

// Build mapping: eventId -> { virtuous: [...], practical: [...], ruthless: [...] }
const eventSkills = {};
let lastEventName = null;

for (const row of rows) {
  let eventName = row['Name'];
  const approach = row['Approach'];
  const skillsStr = row['Skills'];
  
  // Track last valid event name (for rows where Name is empty)
  if (eventName) {
    lastEventName = eventName;
  } else if (lastEventName) {
    eventName = lastEventName;
  }
  
  if (!eventName || !approach || !skillsStr) continue;
  
  const eventId = eventNameToId(eventName);
  const approachId = approachToId(approach);
  
  // Parse skills (remove quotes and split by comma)
  const skills = skillsStr
    .split(',')
    .map(s => s.trim().replace(/^"|"$/g, ''))
    .filter(s => s && s !== 'applicable lore');  // Exclude "applicable lore"
  
  if (!eventSkills[eventId]) {
    eventSkills[eventId] = {};
  }
  
  eventSkills[eventId][approachId] = skills;
}

console.log(`✅ Built skill mapping for ${Object.keys(eventSkills).length} events`);

// Write mapping to JSON for reference
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(eventSkills, null, 2));
console.log(`📝 Wrote mapping to ${OUTPUT_JSON}`);

// Apply to TypeScript files
console.log('\n🔧 Updating TypeScript pipeline files...');

let updatedCount = 0;
let errorCount = 0;

for (const [eventId, approaches] of Object.entries(eventSkills)) {
  const filePath = path.join(EVENTS_DIR, `${eventId}.ts`);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${eventId}.ts`);
    errorCount++;
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Update each approach's skills array
  for (const [approachId, skills] of Object.entries(approaches)) {
    // Build new skills array with "applicable lore" added
    const newSkills = [...skills, 'applicable lore'];
    const newSkillsStr = newSkills.map(s => `'${s}'`).join(', ');
    
    // Pattern to match: id: 'approach', ... skills: [...]
    const pattern = new RegExp(
      `(id:\\s*'${approachId}'[^}]+skills:\\s*\\[)([^\\]]+)(\\])`,
      'gs'
    );
    
    const newContent = content.replace(pattern, (match, before, oldSkills, after) => {
      modified = true;
      return `${before}${newSkillsStr}${after}`;
    });
    
    if (newContent !== content) {
      content = newContent;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${eventId}.ts`);
    updatedCount++;
  } else {
    console.log(`⏭️  No changes: ${eventId}.ts`);
  }
}

console.log(`\n✅ Updated ${updatedCount} files`);
if (errorCount > 0) {
  console.log(`⚠️  ${errorCount} files not found`);
}
console.log('✨ Done!');
