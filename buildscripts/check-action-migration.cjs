#!/usr/bin/env node

/**
 * Action Migration Progress Checker
 * 
 * Validates that actions are properly migrated from the old system to the pipeline system.
 * 
 * Checks:
 * 1. Actions with pipeline configs (src/pipelines/actions/)
 * 2. Actions in MIGRATED_ACTIONS set (ActionsPhase.svelte)
 * 3. Legacy actions still in src/actions/
 * 4. Legacy action registrations in implementations/index.ts
 * 
 * Usage:
 *   npm run check-migration
 *   npm run check-migration --verbose
 */

const fs = require('fs');
const path = require('path');

const VERBOSE = process.argv.includes('--verbose');

// Paths
const ACTIONS_DIR = path.join(__dirname, '../src/actions');
const PIPELINES_DIR = path.join(__dirname, '../src/pipelines/actions');
const ACTIONS_PHASE_FILE = path.join(__dirname, '../src/view/kingdom/turnPhases/ActionsPhase.svelte');
const IMPLEMENTATIONS_FILE = path.join(__dirname, '../src/controllers/actions/implementations/index.ts');
const PLAYER_ACTIONS_DIR = path.join(__dirname, '../data/player-actions');

/**
 * Get all action IDs from data/player-actions/*.json
 */
function getAllActionIds() {
  if (!fs.existsSync(PLAYER_ACTIONS_DIR)) {
    console.error(`❌ Data directory not found: ${PLAYER_ACTIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PLAYER_ACTIONS_DIR);
  const actionIds = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  return actionIds;
}

/**
 * Get all pipeline configs from src/pipelines/actions/*.ts
 */
function getPipelineActions() {
  if (!fs.existsSync(PIPELINES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(PIPELINES_DIR);
  return files
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .map(f => {
      // Convert camelCase filename to kebab-case action ID
      const name = f.replace('.ts', '');
      return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    });
}

/**
 * Get MIGRATED_ACTIONS set from ActionsPhase.svelte
 */
function getMigratedActions() {
  if (!fs.existsSync(ACTIONS_PHASE_FILE)) {
    console.error(`❌ ActionsPhase.svelte not found: ${ACTIONS_PHASE_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(ACTIONS_PHASE_FILE, 'utf8');
  
  // Extract MIGRATED_ACTIONS set
  const match = content.match(/const MIGRATED_ACTIONS = new Set\(\[([\s\S]*?)\]\);/);
  if (!match) {
    return [];
  }

  // Parse action IDs from the set
  const setContent = match[1];
  const actions = setContent
    .split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith("'") || s.startsWith('"'))
    .map(s => s.replace(/['"]/g, ''));

  return actions;
}

/**
 * Get legacy action folders from src/actions/
 */
function getLegacyActions() {
  if (!fs.existsSync(ACTIONS_DIR)) {
    return [];
  }

  const items = fs.readdirSync(ACTIONS_DIR);
  return items.filter(item => {
    const itemPath = path.join(ACTIONS_DIR, item);
    const stats = fs.statSync(itemPath);
    // Skip shared folder and non-directories
    return stats.isDirectory() && item !== 'shared';
  });
}

/**
 * Get registered actions from implementations/index.ts
 */
function getRegisteredActions() {
  if (!fs.existsSync(IMPLEMENTATIONS_FILE)) {
    return [];
  }

  const content = fs.readFileSync(IMPLEMENTATIONS_FILE, 'utf8');
  
  // Find all actionImplementations.set() calls
  const matches = content.matchAll(/actionImplementations\.set\(([\w]+)\.id,\s*\1\);/g);
  const actions = [];
  
  for (const match of matches) {
    const varName = match[1];
    // Convert variable name to action ID
    // E.g., ClaimHexesAction -> claim-hexes
    const actionId = varName
      .replace('Action', '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    actions.push(actionId);
  }

  return actions;
}

/**
 * Main validation function
 */
function checkMigration() {
  console.log('🔍 Checking Action Migration Progress...\n');

  // Gather data
  const allActions = getAllActionIds();
  const pipelineActions = getPipelineActions();
  const migratedActions = getMigratedActions();
  const legacyActions = getLegacyActions();
  const registeredActions = getRegisteredActions();

  // Calculate progress
  const totalActions = allActions.length;
  const migratedCount = migratedActions.length;
  const progress = Math.round((migratedCount / totalActions) * 100);

  // Report summary
  console.log('📊 Summary:');
  console.log(`   Total Actions: ${totalActions}`);
  console.log(`   Migrated: ${migratedCount} (${progress}%)`);
  console.log(`   Remaining: ${totalActions - migratedCount}\n`);

  // Progress bar
  const barLength = 40;
  const filled = Math.round((migratedCount / totalActions) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(`   [${bar}] ${progress}%\n`);

  // Validation checks
  let hasErrors = false;

  // Check 1: Actions with pipelines but not in MIGRATED_ACTIONS
  const pipelinesNotMarked = pipelineActions.filter(a => !migratedActions.includes(a));
  if (pipelinesNotMarked.length > 0) {
    console.log('⚠️  Actions with pipelines but NOT in MIGRATED_ACTIONS:');
    pipelinesNotMarked.forEach(a => console.log(`   - ${a}`));
    console.log('   → Add these to MIGRATED_ACTIONS in ActionsPhase.svelte\n');
    hasErrors = true;
  }

  // Check 2: Actions in MIGRATED_ACTIONS but no pipeline
  const markedNoPipeline = migratedActions.filter(a => !pipelineActions.includes(a));
  if (markedNoPipeline.length > 0) {
    console.log('❌ Actions in MIGRATED_ACTIONS but NO pipeline config:');
    markedNoPipeline.forEach(a => console.log(`   - ${a}`));
    console.log('   → Create pipeline configs or remove from MIGRATED_ACTIONS\n');
    hasErrors = true;
  }

  // Check 3: Legacy actions that should be deleted
  const legacyToDelete = legacyActions.filter(a => migratedActions.includes(a));
  if (legacyToDelete.length > 0) {
    console.log('🗑️  Legacy action folders safe to DELETE:');
    legacyToDelete.forEach(a => console.log(`   - src/actions/${a}/`));
    console.log('   → rm -rf ' + legacyToDelete.map(a => `src/actions/${a}`).join(' ') + '\n');
  }

  // Check 4: Actions still registered in implementations but migrated
  const registeredButMigrated = registeredActions.filter(a => migratedActions.includes(a));
  if (registeredButMigrated.length > 0 && VERBOSE) {
    console.log('📋 Actions still registered in implementations/ (can remove after all migrated):');
    registeredButMigrated.forEach(a => console.log(`   - ${a}`));
    console.log('   → Will be cleaned up in final phase\n');
  }

  // List migrated actions
  if (VERBOSE && migratedActions.length > 0) {
    console.log('✅ Migrated Actions:');
    migratedActions.forEach(a => console.log(`   - ${a}`));
    console.log('');
  }

  // List remaining actions
  const remaining = allActions.filter(a => !migratedActions.includes(a));
  if (remaining.length > 0) {
    console.log(`📝 Remaining Actions (${remaining.length}/${totalActions}):`);
    remaining.forEach(a => {
      const hasLegacy = legacyActions.includes(a);
      const hasRegistered = registeredActions.includes(a);
      const status = hasRegistered ? '🔧' : hasLegacy ? '📁' : '📄';
      console.log(`   ${status} ${a}`);
    });
    console.log('');
    console.log('   Legend:');
    console.log('   🔧 = Has custom implementation (complex)');
    console.log('   📁 = Has legacy folder (moderate)');
    console.log('   📄 = Data-only (simple)');
    console.log('');
  }

  // Final status
  if (migratedCount === totalActions) {
    console.log('🎉 All actions migrated! Ready for cleanup phase.');
    console.log('\nNext steps:');
    console.log('1. Delete src/actions/ folder');
    console.log('2. Delete src/controllers/actions/implementations/ folder');
    console.log('3. Delete or simplify src/controllers/actions/action-resolver.ts');
    console.log('4. Update documentation');
  } else if (hasErrors) {
    console.log('❌ Migration validation failed. Please fix the issues above.');
    process.exit(1);
  } else {
    console.log(`✅ Migration in progress: ${migratedCount}/${totalActions} actions complete`);
  }
}

// Run check
checkMigration();
