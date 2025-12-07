/**
 * Simulation Configuration Presets
 * 
 * Focused presets for iterative balance testing.
 * Run with: npm run simulate -- --config <name>
 */

import type { SimulationConfig } from './SimulationConfig';
import { DEFAULT_CONFIG } from './SimulationConfig';

// ============================================================================
// BALANCE VARIABLES
// ============================================================================

export interface BalanceSettings {
  /** Territory size before +1 unrest (8 = production, higher = easier) */
  hexesPerUnrest: number;
  
  /** What happens to unspent fame at end of turn */
  fameConversion: 'none' | 'gold' | 'unrest';
  
  /** Gold cost per structure tier (0 = no gold cost, 1 = tier gold, 2 = 2x tier) */
  structureGoldCostPerTier: number;
}

export interface ConfigPreset {
  name: string;
  description: string;
  balance: BalanceSettings;
  simulation?: Partial<SimulationConfig>;
}

// ============================================================================
// PRESETS
// ============================================================================

export const CONFIG_PRESETS: Record<string, ConfigPreset> = {

  // Baseline - current production rules
  'production': {
    name: 'Production Rules',
    description: 'Current game as implemented',
    balance: {
      hexesPerUnrest: 8,
      fameConversion: 'none',
      structureGoldCostPerTier: 0,
    },
  },

  // Current test variant - edit this one for iteration
  'test': {
    name: 'Test Variant',
    description: 'Current balance experiment',
    balance: {
      hexesPerUnrest: 20,
      fameConversion: 'gold',
      structureGoldCostPerTier: 2,
    },
  },

  // Quick 30-turn test
  'quick': {
    name: 'Quick Test',
    description: 'Fast 30-turn test',
    balance: {
      hexesPerUnrest: 8,
      fameConversion: 'none',
      structureGoldCostPerTier: 0,
    },
    simulation: {
      turns: 30,
      runs: 3,
    },
  },

};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function balanceToConfig(balance: BalanceSettings): Partial<SimulationConfig> {
  return {
    hexesPerUnrest: balance.hexesPerUnrest,
    fameConvertsToUnrest: balance.fameConversion === 'unrest',
    fameConvertsToGold: balance.fameConversion === 'gold',
    structureGoldCostPerTier: balance.structureGoldCostPerTier,
  };
}

export function getConfigPreset(name: string): ConfigPreset | undefined {
  return CONFIG_PRESETS[name];
}

export function getBalanceSettings(name: string): BalanceSettings | undefined {
  return CONFIG_PRESETS[name]?.balance;
}

export function listPresets(): void {
  console.log('\n  SIMULATION PRESETS\n');
  
  for (const [key, preset] of Object.entries(CONFIG_PRESETS)) {
    const b = preset.balance;
    const fame = b.fameConversion === 'none' ? '-' : b.fameConversion;
    console.log(`  ${key.padEnd(12)} │ hexes: ${String(b.hexesPerUnrest).padEnd(4)} │ fame: ${fame.padEnd(7)} │ gold: ${b.structureGoldCostPerTier}g/tier`);
    console.log(`  ${''.padEnd(12)} │ ${preset.description}`);
    console.log('');
  }
  
  console.log('  Usage: npm run simulate -- --config <name>\n');
}

export function applyPreset(
  presetName: string, 
  cliOverrides: Partial<SimulationConfig>
): SimulationConfig {
  const preset = CONFIG_PRESETS[presetName];
  
  if (!preset) {
    console.error(`Unknown preset: ${presetName}`);
    console.error('Use --list-configs to see available presets');
    process.exit(1);
  }
  
  const balanceConfig = balanceToConfig(preset.balance);
  
  return {
    ...DEFAULT_CONFIG,
    ...balanceConfig,
    ...(preset.simulation || {}),
    ...cliOverrides,
  };
}
