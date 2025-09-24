/**
 * Bonus Calculations
 * 
 * Handles leadership bonuses and other economic modifiers
 */

import type { LeadershipBonus, EconomicModifier } from './types';

/**
 * Calculate leadership bonuses for resource production
 * 
 * This is a placeholder for future leadership system integration
 * 
 * @param leadershipSkills - Map of skill to modifier value
 * @returns List of leadership bonuses to apply
 */
export function calculateLeadershipBonuses(
  leadershipSkills: Map<string, number>
): LeadershipBonus[] {
  const bonuses: LeadershipBonus[] = [];
  
  // Example leadership bonuses (expand based on game rules)
  leadershipSkills.forEach((value, skill) => {
    switch (skill.toLowerCase()) {
      case 'agriculture':
        if (value > 0) {
          bonuses.push({
            source: 'Agriculture Leadership',
            resource: 'food',
            amount: Math.floor(value / 5) // +1 per 5 skill points
          });
        }
        break;
        
      case 'mining':
        if (value > 0) {
          bonuses.push({
            source: 'Mining Leadership',
            resource: 'ore',
            amount: Math.floor(value / 5)
          });
        }
        break;
        
      case 'forestry':
        if (value > 0) {
          bonuses.push({
            source: 'Forestry Leadership',
            resource: 'lumber',
            amount: Math.floor(value / 5)
          });
        }
        break;
        
      // Add more skills as needed
    }
  });
  
  return bonuses;
}

/**
 * Convert leadership bonuses to economic modifiers
 * 
 * @param bonuses - Leadership bonuses to convert
 * @returns Economic modifiers that can be applied to production
 */
export function bonusesToModifiers(bonuses: LeadershipBonus[]): EconomicModifier[] {
  return bonuses.map(bonus => ({
    name: bonus.source,
    type: 'production' as const,
    affectedResources: [bonus.resource],
    flatBonus: bonus.amount
  }));
}

/**
 * Create a modifier for war-time production penalties
 * 
 * @param isAtWar - Whether the kingdom is at war
 * @returns Economic modifier or null if not at war
 */
export function getWarModifier(isAtWar: boolean): EconomicModifier | null {
  if (!isAtWar) return null;
  
  return {
    name: 'War Effort',
    type: 'both',
    affectedResources: [], // Affects all resources
    multiplier: 0.9 // -10% to all production/consumption efficiency
  };
}

/**
 * Create a modifier for seasonal effects
 * 
 * @param season - Current season (if applicable)
 * @returns Economic modifier or null
 */
export function getSeasonalModifier(season?: string): EconomicModifier | null {
  if (!season) return null;
  
  switch (season.toLowerCase()) {
    case 'winter':
      return {
        name: 'Winter',
        type: 'production',
        affectedResources: ['food'],
        multiplier: 0.75 // -25% food production
      };
      
    case 'summer':
      return {
        name: 'Summer',
        type: 'production',
        affectedResources: ['food'],
        multiplier: 1.25 // +25% food production
      };
      
    default:
      return null;
  }
}

/**
 * Calculate total economic efficiency based on kingdom stats
 * 
 * @param economy - Economy stat value
 * @param unrest - Current unrest level
 * @returns Efficiency multiplier (1.0 = normal)
 */
export function calculateEconomicEfficiency(
  economy: number = 0,
  unrest: number = 0
): number {
  // Base efficiency
  let efficiency = 1.0;
  
  // Economy stat bonus (each point = +1% efficiency, max +50%)
  efficiency += Math.min(economy * 0.01, 0.5);
  
  // Unrest penalty (each point = -2% efficiency)
  efficiency -= unrest * 0.02;
  
  // Clamp between 0.1 and 2.0
  return Math.max(0.1, Math.min(2.0, efficiency));
}

/**
 * Get all active modifiers for a kingdom state
 * 
 * @param state - Current kingdom state object
 * @returns List of active economic modifiers
 */
export function getActiveModifiers(state: {
  isAtWar?: boolean;
  season?: string;
  economy?: number;
  unrest?: number;
}): EconomicModifier[] {
  const modifiers: EconomicModifier[] = [];
  
  // War modifier
  const warMod = getWarModifier(state.isAtWar || false);
  if (warMod) modifiers.push(warMod);
  
  // Seasonal modifier
  const seasonMod = getSeasonalModifier(state.season);
  if (seasonMod) modifiers.push(seasonMod);
  
  // Economy efficiency modifier
  if (state.economy !== undefined && state.unrest !== undefined) {
    const efficiency = calculateEconomicEfficiency(state.economy, state.unrest);
    if (efficiency !== 1.0) {
      modifiers.push({
        name: 'Economic Efficiency',
        type: 'production',
        affectedResources: [], // All resources
        multiplier: efficiency
      });
    }
  }
  
  return modifiers;
}
