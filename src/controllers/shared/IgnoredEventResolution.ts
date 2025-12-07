/**
 * Ignored Event Resolution Builder
 * 
 * Builds complete resolution data for ignored events, including:
 * - Pre-rolled dice values
 * - Outcome badges generated from modifiers
 * - All state needed for OutcomeDisplay to render correctly
 * 
 * This centralizes the logic for ignoring events so it works consistently
 * regardless of where the ignore action is triggered.
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { convertModifiersToBadges } from '../../pipelines/shared/convertModifiersToBadges';

export interface IgnoredEventResolution {
  outcome: 'failure';
  actorName: string;
  skillName: string;
  effect: string;
  modifiers: any[];
  manualEffects: string[];
  gameCommands: any[];
  outcomeBadges: any[];
  effectsApplied: boolean;
  isIgnored: boolean;
  shortfallResources: string[];
}

export interface PreRolledDice {
  [index: number]: number;
}

export interface IgnoredEventResult {
  resolution: IgnoredEventResolution;
  resolvedDice: PreRolledDice;
}

/**
 * Build a complete resolution for an ignored event
 * 
 * Pre-rolls all dice modifiers and generates outcome badges so the
 * OutcomeDisplay can render the failure outcome correctly.
 * 
 * @param pipeline - The event pipeline being ignored
 * @param actorName - Name to show (typically "Event Ignored")
 * @returns Complete resolution and pre-rolled dice values
 */
export async function buildIgnoredEventResolution(
  pipeline: CheckPipeline,
  actorName: string = 'Event Ignored'
): Promise<IgnoredEventResult> {
  const outcomeData = pipeline.outcomes?.failure;
  
  if (!outcomeData) {
    // No failure outcome defined - return minimal resolution
    return {
      resolution: {
        outcome: 'failure',
        actorName,
        skillName: '',
        effect: 'Event ignored.',
        modifiers: [],
        manualEffects: [],
        gameCommands: [],
        outcomeBadges: [],
        effectsApplied: false,
        isIgnored: true,
        shortfallResources: []
      },
      resolvedDice: {}
    };
  }
  
  const modifiers = outcomeData.modifiers || [];
  const resolvedDice: PreRolledDice = {};
  
  // Pre-roll any dice modifiers
  for (let i = 0; i < modifiers.length; i++) {
    const mod = modifiers[i];
    if (mod.type === 'dice' && mod.formula) {
      try {
        const Roll = (globalThis as any).Roll;
        if (Roll) {
          const roll = new Roll(mod.formula);
          await roll.evaluate();
          resolvedDice[i] = roll.total || 0;
          console.log(`[IgnoredEventResolution] Pre-rolled dice ${i}: ${mod.formula} = ${roll.total}`);
        } else {
          // Fallback if Roll isn't available (shouldn't happen in Foundry)
          console.warn('[IgnoredEventResolution] Roll class not available, using fallback');
          resolvedDice[i] = 1;
        }
      } catch (error) {
        console.error(`[IgnoredEventResolution] Failed to roll dice for modifier ${i}:`, error);
        resolvedDice[i] = 1;
      }
    }
  }
  
  // Build outcome badges from modifiers
  // Pass the pre-rolled dice values as instance metadata
  const instanceMetadata = {
    resolvedDice: new Map(Object.entries(resolvedDice).map(([k, v]) => [parseInt(k), v]))
  };
  
  // Convert modifiers to badges (this shows the rolled values)
  let outcomeBadges = convertModifiersToBadges(modifiers, instanceMetadata);
  
  // Also include any explicit outcome badges from the pipeline
  if (outcomeData.outcomeBadges && outcomeData.outcomeBadges.length > 0) {
    outcomeBadges = [...outcomeBadges, ...outcomeData.outcomeBadges];
  }
  
  // Filter out any null/undefined badges
  outcomeBadges = outcomeBadges.filter(badge => badge !== null && badge !== undefined);
  
  const resolution: IgnoredEventResolution = {
    outcome: 'failure',
    actorName,
    skillName: '',
    effect: outcomeData.description || 'Event ignored.',
    modifiers,
    manualEffects: outcomeData.manualEffects || [],
    gameCommands: outcomeData.gameCommands || [],
    outcomeBadges,
    effectsApplied: false,
    isIgnored: true,
    shortfallResources: []
  };
  
  console.log('[IgnoredEventResolution] Built resolution:', {
    outcome: resolution.outcome,
    effect: resolution.effect,
    modifiersCount: resolution.modifiers.length,
    badgesCount: resolution.outcomeBadges.length,
    diceRolled: Object.keys(resolvedDice).length
  });
  
  return {
    resolution,
    resolvedDice
  };
}

