// Player Actions data model for PF2e Kingdom Lite
// Loads data from dist/player-actions.json

import playerActionsData from '../../dist/player-actions.json';

/**
 * Represents a skill option for an action
 */
export interface SkillOption {
  skill: string;
  description: string;
}

/**
 * Represents the effect of an action outcome
 */
export interface ActionEffect {
  description: string;
  modifiers?: any; // Can be Map or object
}

/**
 * Raw JSON structure for action effects
 */
interface ActionEffectJson {
  description: string;
  modifiers?: any;
}

/**
 * Raw JSON structure for player actions
 */
interface PlayerActionJson {
  id: string;
  name: string;
  category: string;
  brief?: string;
  description: string;
  skills: SkillOption[];
  effects: {
    criticalSuccess?: ActionEffectJson;
    success?: ActionEffectJson;
    failure?: ActionEffectJson;
    criticalFailure?: ActionEffectJson;
  };
  proficiencyScaling?: Record<string, number>;
  special?: string;
  costs?: Record<string, number>;
  failureCausesUnrest?: boolean;
  requirements?: string[];
}

/**
 * Represents a player action that can be taken during the kingdom turn
 */
export interface PlayerAction {
  id: string;
  name: string;
  category: string;
  brief?: string; // Brief one-line description
  description: string; // Full description
  skills: SkillOption[];
  criticalSuccess: ActionEffect;
  success: ActionEffect;
  failure: ActionEffect;
  criticalFailure: ActionEffect;
  proficiencyScaling?: Map<string, number> | null;
  special?: string | null;
  cost?: Map<string, number> | null; // For actions that have resource costs
  failureCausesUnrest?: boolean;
  requirements?: string[];
}

/**
 * Player Actions data management
 */
export const PlayerActionsData = {
  // Category display names
  categoryNames: new Map([
    ['uphold-stability', 'Uphold Stability'],
    ['military-operations', 'Military Operations'],
    ['expand-borders', 'Expand the Borders'],
    ['urban-planning', 'Urban Planning'],
    ['foreign-affairs', 'Foreign Affairs'],
    ['economic-actions', 'Economic Actions']
  ]),
  
  // Category descriptions
  categoryDescriptions: new Map([
    ['uphold-stability', "Maintain the kingdom's cohesion by resolving crises and quelling unrest."],
    ['military-operations', 'War must be waged with steel and strategy.'],
    ['expand-borders', 'Seize new territory to grow your influence and resources.'],
    ['urban-planning', 'Your people need places to live, work, trade, and worship.'],
    ['foreign-affairs', 'No kingdom stands alone.'],
    ['economic-actions', 'Manage trade and personal wealth.']
  ]),
  
  /**
   * Convert JSON action to PlayerAction interface
   */
  convertJsonToAction(json: PlayerActionJson): PlayerAction {
    const action: PlayerAction = {
      id: json.id,
      name: json.name,
      category: json.category,
      brief: json.brief,
      description: json.description,
      skills: json.skills,
      criticalSuccess: json.effects.criticalSuccess || { description: 'No effect' },
      success: json.effects.success || { description: 'No effect' },
      failure: json.effects.failure || { description: 'No effect' },
      criticalFailure: json.effects.criticalFailure || { description: 'No effect' },
      special: json.special || null,
      failureCausesUnrest: json.failureCausesUnrest,
      requirements: json.requirements
    };
    
    // Convert proficiencyScaling if present
    if (json.proficiencyScaling) {
      action.proficiencyScaling = new Map(Object.entries(json.proficiencyScaling));
    }
    
    // Convert costs if present
    if (json.costs) {
      action.cost = new Map(Object.entries(json.costs));
    }
    
    return action;
  },
  
  /**
   * Get all available player actions from JSON data
   */
  getAllActions(): PlayerAction[] {
    // Convert JSON data to PlayerAction format
    return (playerActionsData as PlayerActionJson[]).map(json => this.convertJsonToAction(json));
  },
  
  /**
   * Get actions by category - now using JSON data
   */
  getActionsByCategory(category: string): PlayerAction[] {
    return this.getAllActions().filter(action => {
      // Map category variations to standard names
      const normalizedCategory = this.normalizeCategoryId(action.category);
      const requestedCategory = this.normalizeCategoryId(category);
      return normalizedCategory === requestedCategory;
    });
  },
  
  /**
   * Normalize category IDs to handle variations
   */
  normalizeCategoryId(category: string): string {
    // Handle variations in category names
    const categoryMap: Record<string, string> = {
      'borders': 'expand-borders',
      'economic-resources': 'economic-actions',
      'military': 'military-operations',
      'expand-the-borders': 'expand-borders',
      'economic': 'economic-actions'
    };
    
    return categoryMap[category] || category;
  },
  
  /**
   * DEPRECATED: Old hardcoded actions - kept for reference only
   * This method is no longer used as we load from JSON now
   */
  _getAllActionsOld(): PlayerAction[] {
    return [
      // Uphold Stability actions
      {
        id: 'coordinated-effort',
        name: 'Provide Support',
        category: 'uphold-stability',
        brief: 'Aid another PC\'s Kingdom Action',
        description: 'When two leaders form a partnership on a single action, their combined expertise ensures the best possible outcome',
        skills: [
          { skill: 'varies', description: 'uses skill of the coordinated action' }
        ],
        criticalSuccess: { description: 'No risk of failure for coordination itself' },
        success: { description: 'Both PCs roll with +1 bonus, take highest result' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' },
        special: 'Exactly TWO PCs may use this together, once per Kingdom Turn. Other PCs may take any action independently.'
      },
      {
        id: 'resolve-kingdom-event',
        name: 'Resolve a Kingdom Event',
        category: 'uphold-stability',
        brief: 'Rise to meet disasters, uprisings, or opportunities',
        description: 'Disaster, uprisings, opportunities—rise to meet them',
        skills: [
          { skill: 'varies', description: 'depends on the specific event' }
        ],
        criticalSuccess: { description: 'Event resolved with best outcome' },
        success: { description: 'Event resolved successfully' },
        failure: { description: 'Event continues or worsens' },
        criticalFailure: { description: 'Event worsens, +1 Unrest' }
      },
      {
        id: 'arrest-dissidents',
        name: 'Arrest Dissidents',
        category: 'uphold-stability',
        brief: 'Convert current unrest to imprisoned unrest',
        description: 'Round up troublemakers and malcontents, converting unrest into imprisoned unrest',
        skills: [
          { skill: 'intimidation', description: 'show of force' },
          { skill: 'society', description: 'legal procedures' },
          { skill: 'stealth', description: 'covert operations' },
          { skill: 'deception', description: 'infiltration tactics' },
          { skill: 'athletics', description: 'physical pursuit' }
        ],
        criticalSuccess: { description: 'Convert 4 Unrest to imprisoned Unrest (up to structure capacity)' },
        success: { description: 'Convert 2 Unrest to imprisoned Unrest (up to structure capacity)' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Botched arrests cause riots; gain 1 Unrest' },
        special: 'Requires Justice structure with available capacity'
      },
      {
        id: 'execute-pardon-prisoners',
        name: 'Execute or Pardon Prisoners',
        category: 'uphold-stability',
        brief: 'Deal with imprisoned unrest through justice',
        description: 'Pass judgment on those who have threatened the kingdom\'s stability',
        skills: [
          { skill: 'intimidation', description: 'harsh justice (execute)' },
          { skill: 'society', description: 'legal proceedings (execute)' },
          { skill: 'diplomacy', description: 'clemency (pardon)' },
          { skill: 'religion', description: 'divine forgiveness (pardon)' },
          { skill: 'performance', description: 'public ceremony (pardon)' }
        ],
        criticalSuccess: { description: 'Remove all imprisoned Unrest in the settlement and reduce Unrest by 1' },
        success: { description: 'Remove 1d4 imprisoned Unrest from the settlement' },
        failure: { description: 'Remove none' },
        criticalFailure: { description: 'Remove none; gain 1 current Unrest (riot, scandal, martyrdom)' },
        special: 'T1-T2 structures: Execute only. T3-T4: Execute or Pardon'
      },
      {
        id: 'deal-with-unrest',
        name: 'Deal with Unrest',
        category: 'uphold-stability',
        brief: 'Directly reduce unrest by 1-3 based on success',
        description: 'Address grievances and calm tensions through various approaches (End of Turn Only)',
        skills: [
          { skill: 'performance', description: 'entertainment and festivities' },
          { skill: 'religion', description: 'religious ceremonies' },
          { skill: 'intimidation', description: 'shows of force' },
          { skill: 'diplomacy', description: 'diplomatic engagement' },
          { skill: 'arcana', description: 'magical persuasion' },
          { skill: 'medicine', description: 'public health initiatives' },
          { skill: 'occultism', description: 'mystical demonstrations' },
          { skill: 'acrobatics', description: 'impressive physical feats' }
        ],
        criticalSuccess: { description: 'Reduce Unrest by 3' },
        success: { description: 'Reduce Unrest by 2' },
        failure: { description: 'Reduce Unrest by 1' },
        criticalFailure: { description: 'No effect' }
      },
      // Military Operations
      {
        id: 'recruit-unit',
        name: 'Recruit a Unit',
        category: 'military-operations',
        brief: 'Raise new troops for your armies',
        description: 'Rally citizens to arms, drawing from the population to form new military units',
        skills: [
          { skill: 'diplomacy', description: 'inspire patriotism' },
          { skill: 'intimidation', description: 'conscription' },
          { skill: 'society', description: 'civic duty' },
          { skill: 'performance', description: 'recruitment rallies' },
          { skill: 'athletics', description: 'demonstrations of prowess' }
        ],
        criticalSuccess: { description: 'Recruit a troop equal to party level and reduce unrest by 1' },
        success: { description: 'Recruit a troop equal to party level' },
        failure: { description: 'No recruits' },
        criticalFailure: { description: 'No recruit; +1 Unrest' }
      },
      {
        id: 'outfit-army',
        name: 'Outfit Army',
        category: 'military-operations',
        brief: 'Equip troops with armor, weapons, runes, or equipment',
        description: 'Equip your troops with superior arms, armour, and supplies',
        skills: [
          { skill: 'crafting', description: 'forge equipment' },
          { skill: 'society', description: 'requisition supplies' },
          { skill: 'intimidation', description: 'commandeer resources' },
          { skill: 'thievery', description: 'acquire through subterfuge' },
          { skill: 'warfare lore', description: 'military procurement' }
        ],
        criticalSuccess: { description: 'Outfit a troop with two upgrades, or 2 soldiers with the same upgrade' },
        success: { description: 'Outfit troop' },
        failure: { description: 'No gear' },
        criticalFailure: { description: 'No gear' },
        special: '4 types: armour (+1 AC), runes (+1 to hit), weapons (+1 damage dice), equipment (+1 saves)'
      },
      {
        id: 'deploy-army',
        name: 'Deploy Army',
        category: 'military-operations',
        brief: 'Move troops to strategic positions',
        description: 'Mobilize and maneuver your military forces across the kingdom\'s territory',
        skills: [
          { skill: 'nature', description: 'natural pathways' },
          { skill: 'survival', description: 'wilderness navigation' },
          { skill: 'athletics', description: 'forced march' },
          { skill: 'stealth', description: 'covert movement' },
          { skill: 'warfare lore', description: 'military tactics' }
        ],
        criticalSuccess: { description: 'Move, claim hex after battle' },
        success: { description: 'Move' },
        failure: { description: 'Move but -2 initiative, and troop is fatigued' },
        criticalFailure: { description: 'Troop lost to random hex; -2 initiative, fatigued and enfeebled 1; +1 Unrest' }
      },
      {
        id: 'recover-army',
        name: 'Recover Army',
        category: 'military-operations',
        brief: 'Heal and restore damaged units',
        description: 'Tend to wounded troops, restore morale, and replenish ranks after battle losses',
        skills: [
          { skill: 'medicine', description: 'heal the wounded' },
          { skill: 'performance', description: 'boost morale' },
          { skill: 'religion', description: 'spiritual restoration' },
          { skill: 'nature', description: 'natural remedies' },
          { skill: 'crafting', description: 'repair equipment' },
          { skill: 'warfare lore', description: 'veteran experience' }
        ],
        criticalSuccess: { description: 'Troop recovers completely' },
        success: { description: 'Troop recovers 1 segment' },
        failure: { description: 'No recovery' },
        criticalFailure: { description: 'No recovery' }
      },
      {
        id: 'train-army',
        name: 'Train Army',
        category: 'military-operations',
        brief: 'Improve unit levels up to party level',
        description: 'Drill your troops in tactics and discipline to improve their combat effectiveness',
        skills: [
          { skill: 'intimidation', description: 'harsh discipline' },
          { skill: 'athletics', description: 'physical conditioning' },
          { skill: 'acrobatics', description: 'agility training' },
          { skill: 'survival', description: 'endurance exercises' },
          { skill: 'warfare lore', description: 'tactical doctrine' }
        ],
        criticalSuccess: { description: 'Troop is promoted up to party level' },
        success: { description: '+1 level (max party level)' },
        failure: { description: 'No change' },
        criticalFailure: { description: 'No change' }
      },
      {
        id: 'disband-army',
        name: 'Disband Army',
        category: 'military-operations',
        brief: 'Decommission troops and return soldiers home',
        description: 'Release military units from service, returning soldiers to civilian life',
        skills: [
          { skill: 'intimidation', description: 'stern dismissal' },
          { skill: 'diplomacy', description: 'honorable discharge' },
          { skill: 'society', description: 'reintegration programs' },
          { skill: 'performance', description: 'farewell ceremony' },
          { skill: 'warfare lore', description: 'military protocol' }
        ],
        criticalSuccess: { description: 'People welcome them home with honours!, -2 Unrest' },
        success: { description: 'Army disbands, -1 Unrest' },
        failure: { description: 'Army disbands' },
        criticalFailure: { description: 'Army disbands, +1 Unrest' }
      },
      // Expand Borders actions
      {
        id: 'claim-hexes',
        name: 'Claim Hexes',
        category: 'expand-borders',
        brief: 'Add new territory to your kingdom',
        description: 'Assert sovereignty over new territories, expanding your kingdom\'s borders into unclaimed lands',
        skills: [
          { skill: 'nature', description: 'harmonize with the land' },
          { skill: 'survival', description: 'establish frontier camps' },
          { skill: 'intimidation', description: 'force submission' },
          { skill: 'occultism', description: 'mystical claiming rituals' },
          { skill: 'religion', description: 'divine mandate' }
        ],
        criticalSuccess: { description: 'Claim all targeted hexes +1 extra hex' },
        success: { description: 'Claim targeted hexes (based on proficiency)' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' },
        proficiencyScaling: new Map([['trained', 1], ['expert', 1], ['master', 2], ['legendary', 3]]),
        special: '+2 circumstance bonus when claiming hexes adjacent to 3+ controlled hexes'
      },
      {
        id: 'build-roads',
        name: 'Build Roads',
        category: 'expand-borders',
        brief: 'Connect your territory with infrastructure',
        description: 'Construct pathways between settlements to improve trade, travel, and military movement',
        skills: [
          { skill: 'crafting', description: 'engineering expertise' },
          { skill: 'survival', description: 'pathfinding routes' },
          { skill: 'athletics', description: 'manual labor' },
          { skill: 'nature', description: 'work with terrain' }
        ],
        criticalSuccess: { description: 'Build roads +1 hex' },
        success: { description: 'Build roads' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'send-scouts',
        name: 'Send Scouts',
        category: 'expand-borders',
        brief: 'Learn about unexplored hexes',
        description: 'Dispatch explorers to gather intelligence about neighboring territories and potential threats',
        skills: [
          { skill: 'stealth', description: 'covert reconnaissance' },
          { skill: 'survival', description: 'wilderness expertise' },
          { skill: 'nature', description: 'read the land' },
          { skill: 'society', description: 'gather local information' },
          { skill: 'athletics', description: 'rapid exploration' },
          { skill: 'acrobatics', description: 'navigate obstacles' }
        ],
        criticalSuccess: { description: 'Learn about 2 hexes' },
        success: { description: 'Learn about 1 hex' },
        failure: { description: 'No report' },
        criticalFailure: { description: 'Scouts lost' }
      },
      {
        id: 'fortify-hex',
        name: 'Fortify Hex',
        category: 'expand-borders',
        brief: 'Strengthen defensive positions',
        description: 'Construct defensive structures and preparations in a hex to improve its resistance against invasion',
        skills: [
          { skill: 'crafting', description: 'build fortifications' },
          { skill: 'athletics', description: 'manual construction' },
          { skill: 'intimidation', description: 'defensive displays' },
          { skill: 'thievery', description: 'trap placement' },
          { skill: 'warfare lore', description: 'strategic defenses' }
        ],
        criticalSuccess: { description: 'Fortify, reduce Unrest by 1' },
        success: { description: 'Fortify' },
        failure: { description: 'Fail' },
        criticalFailure: { description: 'No effect' },
        special: 'Fortified hexes grant +1 AC and +2 initiative to defending troops'
      },
      // Urban Planning
      {
        id: 'establish-settlement',
        name: 'Establish a Settlement',
        category: 'urban-planning',
        brief: 'Found a new village',
        description: 'Found a new community where settlers can establish homes and begin building infrastructure',
        skills: [
          { skill: 'society', description: 'organized settlement' },
          { skill: 'survival', description: 'frontier establishment' },
          { skill: 'diplomacy', description: 'attract settlers' },
          { skill: 'religion', description: 'blessed founding' },
          { skill: 'medicine', description: 'healthy community planning' }
        ],
        criticalSuccess: { description: 'Found village +1 Structure' },
        success: { description: 'Found village' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'upgrade-settlement',
        name: 'Upgrade a Settlement',
        category: 'urban-planning',
        brief: 'Advance tiers (requires both level and structure prerequisites)',
        description: 'Expand an existing settlement\'s size and capabilities, transforming villages into thriving centers',
        skills: [
          { skill: 'crafting', description: 'infrastructure expansion' },
          { skill: 'society', description: 'urban planning' },
          { skill: 'performance', description: 'inspire growth' },
          { skill: 'arcana', description: 'magical enhancement' },
          { skill: 'medicine', description: 'public health improvements' }
        ],
        criticalSuccess: { description: 'Increase Level +1 Structure' },
        success: { description: 'Increase Level' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' },
        special: 'Village→Town: Level 2+ with 2 structures. Town→City: Level 5+ with 4 structures. City→Metropolis: Level 10+ with 6 structures'
      },
      {
        id: 'build-structure',
        name: 'Develop a Settlement',
        category: 'urban-planning',
        brief: 'Add markets, temples, barracks, and other structures',
        description: 'Construct new buildings and infrastructure within a settlement to enhance its capabilities',
        skills: [
          { skill: 'crafting', description: 'construction expertise' },
          { skill: 'society', description: 'organize workforce' },
          { skill: 'athletics', description: 'physical labor' },
          { skill: 'acrobatics', description: 'specialized construction' },
          { skill: 'stealth', description: 'discrete building' }
        ],
        criticalSuccess: { description: 'Build Structures for half cost' },
        success: { description: 'Build 1 Structure' },
        failure: { description: 'No progress' },
        criticalFailure: { description: 'No progress' }
      },
      {
        id: 'repair-structure',
        name: 'Repair Structure',
        category: 'urban-planning',
        brief: 'Fix damaged buildings to restore functionality',
        description: 'Repair damaged structures within a settlement to restore its capabilities',
        skills: [
          { skill: 'crafting', description: 'construction expertise' },
          { skill: 'society', description: 'organize workforce' },
          { skill: 'athletics', description: 'physical labor' },
          { skill: 'acrobatics', description: 'specialized construction' },
          { skill: 'stealth', description: 'discrete building' }
        ],
        criticalSuccess: { description: 'The structure is repaired for free' },
        success: { description: 'Pay 1d4 gold OR 1/2 the build cost for the structure\'s tier' },
        failure: { description: 'Remains damaged' },
        criticalFailure: { description: 'Lose 1 gold' }
      },
      // Foreign Affairs
      {
        id: 'establish-diplomatic-relations',
        name: 'Establish Diplomatic Relations',
        category: 'foreign-affairs',
        brief: 'Form alliances with other nations',
        description: 'Open formal channels of communication with neighboring powers to enable future cooperation',
        skills: [
          { skill: 'diplomacy', description: 'formal negotiations' },
          { skill: 'society', description: 'cultural exchange' },
          { skill: 'performance', description: 'diplomatic ceremonies' },
          { skill: 'deception', description: 'strategic positioning' },
          { skill: 'occultism', description: 'mystical bonds' },
          { skill: 'religion', description: 'sacred alliances' }
        ],
        criticalSuccess: { description: 'Allies + request aid' },
        success: { description: 'Allies' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'request-economic-aid',
        name: 'Request Economic Aid',
        category: 'foreign-affairs',
        brief: 'Ask allies for resources or gold',
        description: 'Appeal to allied nations for material support in times of need',
        skills: [
          { skill: 'diplomacy', description: 'formal request' },
          { skill: 'society', description: 'leverage connections' },
          { skill: 'performance', description: 'emotional appeal' },
          { skill: 'thievery', description: 'creative accounting' },
          { skill: 'medicine', description: 'humanitarian aid' }
        ],
        criticalSuccess: { description: 'Gain 3 Resources of your choice OR 3 Gold' },
        success: { description: 'Gain 2 Resources of your choice OR 2 Gold' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Ally refuses' }
      },
      {
        id: 'request-military-aid',
        name: 'Request Military Aid',
        category: 'foreign-affairs',
        brief: 'Call for allied troops in battle',
        description: 'Call upon allies to provide troops or military support during conflicts',
        skills: [
          { skill: 'diplomacy', description: 'alliance obligations' },
          { skill: 'intimidation', description: 'pressure tactics' },
          { skill: 'society', description: 'mutual defense' },
          { skill: 'arcana', description: 'magical pacts' },
          { skill: 'warfare lore', description: 'strategic necessity' }
        ],
        criticalSuccess: { description: 'Gain 2 allied troops or a powerful special detachment for 1 battle' },
        success: { description: 'Gain 1 allied troop for 1 battle' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Ally is offended' }
      },
      {
        id: 'infiltration',
        name: 'Infiltration',
        category: 'foreign-affairs',
        brief: 'Gather intelligence through espionage',
        description: 'Deploy spies and agents to gather intelligence on rival kingdoms or potential threats',
        skills: [
          { skill: 'deception', description: 'false identities' },
          { skill: 'stealth', description: 'covert operations' },
          { skill: 'thievery', description: 'steal secrets' },
          { skill: 'society', description: 'social infiltration' },
          { skill: 'arcana', description: 'magical espionage' },
          { skill: 'acrobatics', description: 'daring infiltration' }
        ],
        criticalSuccess: { description: 'Valuable intel' },
        success: { description: 'Broad intel' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Spies are captured' }
      },
      {
        id: 'hire-adventurers',
        name: 'Hire Adventurers',
        category: 'foreign-affairs',
        brief: 'Pay gold to resolve events (2 Gold cost)',
        description: 'Contract independent heroes and mercenaries to handle dangerous tasks or resolve kingdom events',
        skills: [
          { skill: 'diplomacy', description: 'negotiate contracts' },
          { skill: 'society', description: 'use connections' },
          { skill: 'deception', description: 'exaggerate rewards' },
          { skill: 'performance', description: 'inspire heroes' },
          { skill: 'thievery', description: 'recruit rogues' }
        ],
        criticalSuccess: { description: 'The adventurers resolve one ongoing Event entirely' },
        success: { description: 'Roll to resolve an Event with a +2 circumstance bonus' },
        failure: { description: 'The adventurers cause trouble. Gain +1 Unrest' },
        criticalFailure: { description: 'The adventurers vanish or turn rogue. Gain +2 Unrest' },
        cost: new Map([['gold', 2]]),
        special: 'Pay 2 Gold when attempted. May only be attempted once per Kingdom Turn'
      },
      // Economic Actions
      {
        id: 'sell-surplus',
        name: 'Sell Surplus',
        category: 'economic-actions',
        brief: 'Trade 2 resources for gold',
        description: 'Convert excess resources into gold through trade with merchants and neighboring kingdoms',
        skills: [
          { skill: 'society', description: 'market knowledge' },
          { skill: 'diplomacy', description: 'trade negotiations' },
          { skill: 'deception', description: 'inflate value' },
          { skill: 'performance', description: 'showcase goods' },
          { skill: 'thievery', description: 'black market' },
          { skill: 'occultism', description: 'mystical trade' },
          { skill: 'mercantile lore', description: 'trade expertise' }
        ],
        criticalSuccess: { description: 'Trade 2 Resources → 2 Gold' },
        success: { description: 'Trade 2 Resources → 1 Gold' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'purchase-resources',
        name: 'Purchase Resources',
        category: 'economic-actions',
        brief: 'Spend 2 gold for resources',
        description: 'Use the kingdom\'s treasury to acquire needed materials from trade partners',
        skills: [
          { skill: 'society', description: 'find suppliers' },
          { skill: 'diplomacy', description: 'negotiate deals' },
          { skill: 'intimidation', description: 'demand better prices' },
          { skill: 'deception', description: 'misleading negotiations' },
          { skill: 'mercantile lore', description: 'market expertise' }
        ],
        criticalSuccess: { description: 'Spend 2 Gold → Gain 1 Resource, +1 free resource of the same type' },
        success: { description: 'Spend 2 Gold → Gain 1 Resource' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Lose 2 Gold' },
        cost: new Map([['gold', 2]])
      },
      {
        id: 'create-worksite',
        name: 'Create Worksite',
        category: 'economic-actions',
        brief: 'Establish farms, mines, quarries, or lumber camps',
        description: 'Establish resource extraction operations to harness the natural wealth of your territories',
        skills: [
          { skill: 'crafting', description: 'build infrastructure' },
          { skill: 'nature', description: 'identify resources' },
          { skill: 'survival', description: 'frontier operations' },
          { skill: 'athletics', description: 'manual labor' },
          { skill: 'arcana', description: 'magical extraction' },
          { skill: 'religion', description: 'blessed endeavors' }
        ],
        criticalSuccess: { description: 'Immediately gain 1 Resource of the appropriate type, worksite established' },
        success: { description: 'The Worksite is established and produces next turn' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'collect-resources',
        name: 'Collect Resources',
        category: 'economic-actions',
        brief: 'Gather from hexes with or without worksites',
        description: 'Harvest materials from your territories, either through established worksites or direct extraction',
        skills: [
          { skill: 'nature', description: 'natural harvesting' },
          { skill: 'survival', description: 'efficient extraction' },
          { skill: 'crafting', description: 'process materials' },
          { skill: 'athletics', description: 'physical labor' },
          { skill: 'occultism', description: 'mystical gathering' },
          { skill: 'medicine', description: 'herb collection' }
        ],
        criticalSuccess: { description: 'Gain an additional +1 Resource of the same type' },
        success: { description: 'Collect resources from hex or worksite' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'collect-stipend',
        name: 'Collect Stipend',
        category: 'economic-actions',
        brief: 'Extract personal income (requires Counting House)',
        description: 'Draw personal funds from the kingdom\'s treasury as compensation for your service',
        skills: [
          { skill: 'intimidation', description: 'demand payment' },
          { skill: 'deception', description: 'creative accounting' },
          { skill: 'diplomacy', description: 'formal request' },
          { skill: 'society', description: 'proper procedures' },
          { skill: 'performance', description: 'justify worth' },
          { skill: 'acrobatics', description: 'impressive service' },
          { skill: 'thievery', description: 'skim the treasury' }
        ],
        criticalSuccess: { description: 'Gain double the listed amount' },
        success: { description: 'Gain the listed amount' },
        failure: { description: 'Gain half the listed amount, and the kingdom gains +1 Unrest' },
        criticalFailure: { description: 'Gain nothing, and the kingdom gains +1d4 Unrest' },
        special: 'Requires settlement with Counting House (T2) or higher Taxation structure'
      }
    ];
  },
  
  /**
   * Get category display name
   */
  getCategoryName(category: string): string {
    return this.categoryNames.get(category) || category;
  },
  
  /**
   * Get category description
   */
  getCategoryDescription(category: string): string {
    return this.categoryDescriptions.get(category) || '';
  }
};
