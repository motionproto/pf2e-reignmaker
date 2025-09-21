// Player Actions data model for PF2e Kingdom Lite
// Auto-converted and fixed from PlayerActions.kt

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
  modifiers?: Map<string, number | string>;
}

/**
 * Represents a player action that can be taken during the kingdom turn
 */
export interface PlayerAction {
  id: string;
  name: string;
  category: string;
  description: string;
  skills: SkillOption[];
  criticalSuccess: ActionEffect;
  success: ActionEffect;
  failure: ActionEffect;
  criticalFailure: ActionEffect;
  proficiencyScaling?: Map<string, number> | null;
  special?: string | null;
  cost?: Map<string, number> | null; // For actions that have resource costs
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
   * Get all available player actions
   */
  getAllActions(): PlayerAction[] {
    // This will be replaced with actual JSON loading
    return [
      // Expand Borders actions
      {
        id: 'claim-hexes',
        name: 'Claim Hexes',
        category: 'expand-borders',
        description: "Assert sovereignty over new territories, expanding your kingdom's borders into unclaimed lands",
        skills: [
          { skill: 'nature', description: 'harmonize with the land' },
          { skill: 'survival', description: 'establish frontier camps' },
          { skill: 'intimidation', description: 'force submission' },
          { skill: 'occultism', description: 'mystical claiming rituals' },
          { skill: 'religion', description: 'divine mandate' }
        ],
        criticalSuccess: { 
          description: 'Claim all targeted hexes +1 extra hex', 
          modifiers: new Map([['hexesClaimed', 'proficiency+1']]) 
        },
        success: { 
          description: 'Claim targeted hexes (based on proficiency)', 
          modifiers: new Map([['hexesClaimed', 'proficiency']]) 
        },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' },
        proficiencyScaling: new Map([['trained', 1], ['expert', 1], ['master', 2], ['legendary', 3]]),
        special: '+2 circumstance bonus when claiming hexes adjacent to 3+ controlled hexes'
      },
      {
        id: 'build-roads',
        name: 'Build Roads',
        category: 'expand-borders',
        description: 'Construct pathways between settlements to improve trade, travel, and military movement',
        skills: [
          { skill: 'crafting', description: 'engineering expertise' },
          { skill: 'survival', description: 'pathfinding routes' },
          { skill: 'athletics', description: 'manual labor' },
          { skill: 'nature', description: 'work with terrain' }
        ],
        criticalSuccess: { 
          description: 'Build roads +1 hex', 
          modifiers: new Map([['roadsBuilt', 2]]) 
        },
        success: { 
          description: 'Build roads', 
          modifiers: new Map([['roadsBuilt', 1]]) 
        },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'send-scouts',
        name: 'Send Scouts',
        category: 'expand-borders',
        description: 'Learn about unexplored hexes',
        skills: [
          { skill: 'survival', description: 'wilderness navigation' },
          { skill: 'nature', description: 'track and explore' }
        ],
        criticalSuccess: { description: 'Scout 2 hexes' },
        success: { description: 'Scout 1 hex' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'fortify-hex',
        name: 'Fortify Hex',
        category: 'expand-borders',
        description: 'Strengthen defensive positions',
        skills: [
          { skill: 'crafting', description: 'build fortifications' },
          { skill: 'warfare', description: 'strategic placement' }
        ],
        criticalSuccess: { description: 'Fortify hex with bonus' },
        success: { description: 'Fortify hex' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'create-worksite',
        name: 'Create Worksite',
        category: 'expand-borders',
        description: 'Establish farms, mines, quarries, or lumber camps',
        skills: [
          { skill: 'crafting', description: 'build infrastructure' },
          { skill: 'survival', description: 'identify resources' }
        ],
        criticalSuccess: { description: 'Create worksite with bonus' },
        success: { description: 'Create worksite' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      // Uphold Stability actions
      {
        id: 'coordinated-effort',
        name: 'Coordinated Effort',
        category: 'uphold-stability',
        description: 'Two PCs work together on a single action with a bonus',
        skills: [
          { skill: 'diplomacy', description: 'coordinate efforts' },
          { skill: 'society', description: 'organize teamwork' }
        ],
        criticalSuccess: { description: 'Action succeeds with major bonus' },
        success: { description: 'Action succeeds with bonus' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'arrest-dissidents',
        name: 'Arrest Dissidents',
        category: 'uphold-stability',
        description: 'Convert unrest into imprisoned unrest',
        skills: [
          { skill: 'intimidation', description: 'suppress dissent' },
          { skill: 'society', description: 'identify troublemakers' }
        ],
        criticalSuccess: { description: 'Convert 2 unrest to imprisoned' },
        success: { description: 'Convert 1 unrest to imprisoned' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Gain 1 unrest' }
      },
      {
        id: 'deal-with-unrest',
        name: 'Deal with Unrest',
        category: 'uphold-stability',
        description: 'Directly reduce unrest by 1-3 based on success',
        skills: [
          { skill: 'diplomacy', description: 'calm the populace' },
          { skill: 'performance', description: 'inspire the people' },
          { skill: 'intimidation', description: 'quell dissent' }
        ],
        criticalSuccess: { description: 'Reduce unrest by 3' },
        success: { description: 'Reduce unrest by 1' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Gain 1 unrest' }
      },
      // Military Operations
      {
        id: 'recruit-unit',
        name: 'Recruit a Unit',
        category: 'military-operations',
        description: 'Raise new troops for your armies',
        skills: [
          { skill: 'warfare', description: 'military recruitment' },
          { skill: 'intimidation', description: 'conscription' }
        ],
        criticalSuccess: { description: 'Recruit unit with bonus' },
        success: { description: 'Recruit unit' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'deploy-army',
        name: 'Deploy Army',
        category: 'military-operations',
        description: 'Move troops to strategic positions',
        skills: [
          { skill: 'warfare', description: 'tactical deployment' },
          { skill: 'survival', description: 'logistics' }
        ],
        criticalSuccess: { description: 'Deploy with extra movement' },
        success: { description: 'Deploy army' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      // Urban Planning
      {
        id: 'establish-settlement',
        name: 'Establish a Settlement',
        category: 'urban-planning',
        description: 'Found a new village',
        skills: [
          { skill: 'society', description: 'urban planning' },
          { skill: 'crafting', description: 'construction' }
        ],
        criticalSuccess: { description: 'Found village with bonus structure' },
        success: { description: 'Found village' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      },
      {
        id: 'build-structure',
        name: 'Build Structure',
        category: 'urban-planning',
        description: 'Add markets, temples, barracks, and other structures',
        skills: [
          { skill: 'crafting', description: 'construction' },
          { skill: 'society', description: 'urban development' }
        ],
        criticalSuccess: { description: 'Build with reduced cost' },
        success: { description: 'Build structure' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Waste resources' }
      },
      // Foreign Affairs
      {
        id: 'establish-diplomatic-relations',
        name: 'Establish Diplomatic Relations',
        category: 'foreign-affairs',
        description: 'Form alliances with other nations',
        skills: [
          { skill: 'diplomacy', description: 'negotiation' },
          { skill: 'society', description: 'cultural exchange' }
        ],
        criticalSuccess: { description: 'Strong alliance formed' },
        success: { description: 'Alliance formed' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Diplomatic incident' }
      },
      {
        id: 'hire-adventurers',
        name: 'Hire Adventurers',
        category: 'foreign-affairs',
        description: 'Pay gold to resolve events (2 Gold cost)',
        skills: [
          { skill: 'diplomacy', description: 'negotiate terms' },
          { skill: 'society', description: 'find adventurers' }
        ],
        criticalSuccess: { description: 'Resolve event for 1 Gold' },
        success: { description: 'Resolve event for 2 Gold' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Lose 2 Gold, no effect' },
        cost: new Map([['gold', 2]])
      },
      // Economic Actions
      {
        id: 'sell-surplus',
        name: 'Sell Surplus',
        category: 'economic-actions',
        description: 'Trade resources for gold',
        skills: [
          { skill: 'diplomacy', description: 'trade negotiations' },
          { skill: 'society', description: 'market knowledge' }
        ],
        criticalSuccess: { description: 'Sell at premium prices' },
        success: { description: 'Sell at market prices' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'Bad deal, lose resources' }
      },
      {
        id: 'collect-resources',
        name: 'Collect Resources',
        category: 'economic-actions',
        description: 'Gather from hexes with or without worksites',
        skills: [
          { skill: 'survival', description: 'resource gathering' },
          { skill: 'nature', description: 'identify resources' }
        ],
        criticalSuccess: { description: 'Collect double resources' },
        success: { description: 'Collect resources' },
        failure: { description: 'No effect' },
        criticalFailure: { description: 'No effect' }
      }
    ];
  },
  
  /**
   * Get actions by category
   */
  getActionsByCategory(category: string): PlayerAction[] {
    return this.getAllActions().filter(action => action.category === category);
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
