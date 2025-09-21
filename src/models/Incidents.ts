// Incident management system for PF2e Kingdom Lite
// Auto-converted and fixed from Incidents.kt

/**
 * Incident levels corresponding to unrest tiers
 */
export enum IncidentLevel {
  MINOR = 'MINOR',    // Discontent (Unrest 3-5)
  MODERATE = 'MODERATE', // Turmoil (Unrest 6-8)
  MAJOR = 'MAJOR'     // Rebellion (Unrest 9+)
}

/**
 * A skill option for resolving an incident
 */
export interface IncidentSkillOption {
  skill: string;
  description: string;
}

/**
 * An unrest incident that can occur
 */
export interface Incident {
  id: string;
  name: string;
  description: string;
  level: IncidentLevel;
  percentileMin: number;
  percentileMax: number;
  skillOptions: IncidentSkillOption[];
  successEffect: string;
  failureEffect: string;
  criticalFailureEffect: string;
  imagePath: string | null;
}

/**
 * Result of resolving an incident
 */
export interface IncidentResult {
  success: boolean;
  criticalSuccess: boolean;
  criticalFailure: boolean;
  unrestChange: number;
  fameChange: number;
  goldLoss: number;
  message: string;
}

/**
 * Manages incidents and their resolution
 */
export const IncidentManager = {
  /**
   * Get the unrest tier based on current unrest level
   */
  getUnrestTier(unrest: number): number {
    if (unrest >= 0 && unrest <= 2) return 0; // Stable
    if (unrest >= 3 && unrest <= 5) return 1; // Discontent
    if (unrest >= 6 && unrest <= 8) return 2; // Turmoil
    return 3; // Rebellion
  },
  
  /**
   * Get the unrest tier name
   */
  getUnrestTierName(tier: number): string {
    switch (tier) {
      case 0: return 'Stable';
      case 1: return 'Discontent';
      case 2: return 'Turmoil';
      case 3: return 'Rebellion';
      default: return 'Unknown';
    }
  },
  
  /**
   * Get the unrest penalty for kingdom checks
   */
  getUnrestPenalty(unrest: number): number {
    if (unrest >= 0 && unrest <= 2) return 0;
    if (unrest >= 3 && unrest <= 5) return -1;
    if (unrest >= 6 && unrest <= 8) return -2;
    return -3;
  },
  
  /**
   * Get the incident level for a given unrest tier
   */
  getIncidentLevel(tier: number): IncidentLevel | null {
    switch (tier) {
      case 1: return IncidentLevel.MINOR;
      case 2: return IncidentLevel.MODERATE;
      case 3: return IncidentLevel.MAJOR;
      default: return null;
    }
  },
  
  /**
   * Roll for an incident based on unrest tier
   * Returns null if no incident occurs
   */
  rollForIncident(tier: number): Incident | null {
    const level = this.getIncidentLevel(tier);
    if (!level) return null;
    
    const roll = Math.floor(Math.random() * 100) + 1; // 1-100
    
    // Check for no incident
    let noIncidentThreshold: number;
    switch (level) {
      case IncidentLevel.MINOR: 
        noIncidentThreshold = 20; 
        break;
      case IncidentLevel.MODERATE: 
        noIncidentThreshold = 15; 
        break;
      case IncidentLevel.MAJOR: 
        noIncidentThreshold = 10; 
        break;
    }
    
    if (roll <= noIncidentThreshold) {
      return null;
    }
    
    // Get appropriate incident from the tables
    return this.getIncidentByRoll(level, roll);
  },
  
  /**
   * Get an incident by percentile roll
   */
  getIncidentByRoll(level: IncidentLevel, roll: number): Incident | null {
    let incidents: Incident[];
    switch (level) {
      case IncidentLevel.MINOR: 
        incidents = this.minorIncidents; 
        break;
      case IncidentLevel.MODERATE: 
        incidents = this.moderateIncidents; 
        break;
      case IncidentLevel.MAJOR: 
        incidents = this.majorIncidents; 
        break;
    }
    
    return incidents.find(inc => 
      roll >= inc.percentileMin && roll <= inc.percentileMax
    ) || null;
  },
  
  /**
   * Get the placeholder image for an incident level
   */
  getIncidentImage(level: IncidentLevel): string {
    switch (level) {
      case IncidentLevel.MINOR: 
        return 'img/incidents/minor_placeholder.webp';
      case IncidentLevel.MODERATE: 
        return 'img/incidents/mod_placeholder.webp';
      case IncidentLevel.MAJOR: 
        return 'img/incidents/major_placeholder.webp';
    }
  },
  
  // Incident definitions
  minorIncidents: [
    {
      id: 'crime_wave',
      name: 'Crime Wave',
      description: 'Organized crime spreads through your settlements',
      level: IncidentLevel.MINOR,
      percentileMin: 21,
      percentileMax: 30,
      skillOptions: [
        { skill: 'Intimidation', description: 'Crack down on criminals' }, { skill: 'Thievery', description: 'Infiltrate gangs' }, { skill: 'Society', description: 'Implement legal reform' }, { skill: 'Occultism', description: 'Divine the source' }
      ],
      successEffect: 'Crime suppressed, no effect',
      failureEffect: 'Lose 1d4 Gold',
      criticalFailureEffect: 'Lose 2d4 Gold, +1 Unrest',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'work_stoppage',
      name: 'Work Stoppage',
      description: 'Workers refuse to continue their labor',
      level: IncidentLevel.MINOR,
      percentileMin: 31,
      percentileMax: 40,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Negotiate with workers' }, { skill: 'Intimidation', description: 'Force them to work' }, { skill: 'Performance', description: 'Inspire them' }, { skill: 'Medicine', description: 'Address health concerns' }
      ],
      successEffect: 'Workers return, no effect',
      failureEffect: 'One random worksite produces nothing this turn',
      criticalFailureEffect: 'Two worksites produce nothing, +1 Unrest',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'emigration_threat',
      name: 'Emigration Threat',
      description: 'Citizens threaten to leave your kingdom',
      level: IncidentLevel.MINOR,
      percentileMin: 41,
      percentileMax: 50,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Convince them to stay' }, { skill: 'Society', description: 'Address their concerns' }, { skill: 'Religion', description: 'Appeal to faith' }, { skill: 'Nature', description: 'Improve local conditions' }
      ],
      successEffect: 'Population stays, no effect',
      failureEffect: 'Lose 1 random worksite permanently',
      criticalFailureEffect: 'Lose 1 random worksite permanently, +1 unrest',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'protests',
      name: 'Protests',
      description: 'Citizens take to the streets in protest',
      level: IncidentLevel.MINOR,
      percentileMin: 51,
      percentileMax: 60,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Address the crowd' }, { skill: 'Intimidation', description: 'Disperse protesters' }, { skill: 'Performance', description: 'Distract them' }, { skill: 'Arcana', description: 'Use magical calming' }
      ],
      successEffect: 'Peaceful resolution, no effect',
      failureEffect: 'Lose 1d4 Gold (property damage)',
      criticalFailureEffect: 'Lose 2d4 Gold, -1 Fame',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'corruption_scandal',
      name: 'Corruption Scandal',
      description: 'Officials are caught in corrupt activities',
      level: IncidentLevel.MINOR,
      percentileMin: 61,
      percentileMax: 70,
      skillOptions: [
        { skill: 'Society', description: 'Investigate thoroughly' }, { skill: 'Deception', description: 'Cover it up' }, { skill: 'Intimidation', description: 'Purge the corrupt' }, { skill: 'Diplomacy', description: 'Manage public relations' }
      ],
      successEffect: 'Scandal contained, no effect',
      failureEffect: 'Lose 1d4 Gold (embezzlement discovered)',
      criticalFailureEffect: 'Lose 2d4 Gold, -1 Fame',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'rising_tensions',
      name: 'Rising Tensions',
      description: 'General discontent grows among the populace',
      level: IncidentLevel.MINOR,
      percentileMin: 71,
      percentileMax: 80,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Calm the populace' }, { skill: 'Religion', description: 'Provide spiritual guidance' }, { skill: 'Performance', description: 'Entertain the people' }, { skill: 'Arcana', description: 'Create magical displays' }
      ],
      successEffect: 'Tensions ease, no effect',
      failureEffect: '+1 Unrest',
      criticalFailureEffect: '+2 Unrest',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'bandit_activity',
      name: 'Bandit Activity',
      description: 'Bandits raid your territory',
      level: IncidentLevel.MINOR,
      percentileMin: 81,
      percentileMax: 90,
      skillOptions: [
        { skill: 'Intimidation', description: 'Show force' }, { skill: 'Stealth', description: 'Infiltrate their ranks' }, { skill: 'Survival', description: 'Track to their lair' }, { skill: 'Occultism', description: 'Scry their location' }
      ],
      successEffect: 'Bandits deterred, no effect',
      failureEffect: 'Lose 1d4 Gold to raids',
      criticalFailureEffect: 'Lose 2d4 Gold, bandits destroy a random worksite',
      imagePath: 'img/incidents/minor_placeholder.webp'
    }, {
      id: 'minor_diplomatic_incident',
      name: 'Minor Diplomatic Incident',
      description: 'A diplomatic misstep threatens relations',
      level: IncidentLevel.MINOR,
      percentileMin: 91,
      percentileMax: 100,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Smooth over the issue' }, { skill: 'Society', description: 'Make formal apology' }, { skill: 'Deception', description: 'Deny involvement' }
      ],
      successEffect: 'Relations maintained, no effect',
      failureEffect: "One neighboring kingdom's attitude worsens by 1 step",
      criticalFailureEffect: "Two kingdoms' attitudes worsen by 1 step",
      imagePath: 'img/incidents/minor_placeholder.webp'
    }
  ] as Incident[],
  
  moderateIncidents: [
    {
      id: 'production_strike',
      name: 'Production Strike',
      description: 'Workers strike across multiple worksites',
      level: IncidentLevel.MODERATE,
      percentileMin: 16,
      percentileMax: 24,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Negotiate with strikers' }, { skill: 'Society', description: 'Arbitrate the dispute' }, { skill: 'Crafting', description: 'Work alongside them' }, { skill: 'Arcana', description: 'Automate production' }
      ],
      successEffect: 'Strike ends, no effect',
      failureEffect: 'Lose 1d4+1 of a random resource',
      criticalFailureEffect: 'Lose 2d4+1 of a random resource',
      imagePath: 'img/incidents/mod_placeholder.webp'
    }, {
      id: 'riot',
      name: 'Riot',
      description: 'Violence erupts in your settlements',
      level: IncidentLevel.MODERATE,
      percentileMin: 61,
      percentileMax: 69,
      skillOptions: [
        { skill: 'Intimidation', description: 'Suppress the riot' }, { skill: 'Diplomacy', description: 'Negotiate with leaders' }, { skill: 'Athletics', description: 'Contain the violence' }, { skill: 'Medicine', description: 'Treat the injured' }
      ],
      successEffect: 'Riot quelled, no effect',
      failureEffect: '+1 Unrest, 1 structure damaged',
      criticalFailureEffect: '+1 Unrest, 1 structure destroyed',
      imagePath: 'img/incidents/mod_placeholder.webp'
    }, {
      id: 'assassination_attempt',
      name: 'Assassination Attempt',
      description: "An attempt is made on a leader's life",
      level: IncidentLevel.MODERATE,
      percentileMin: 79,
      percentileMax: 87,
      skillOptions: [
        { skill: 'Athletics', description: 'Protect the target' }, { skill: 'Medicine', description: 'Treat wounds' }, { skill: 'Stealth', description: 'Avoid the assassin' }
      ],
      successEffect: 'Assassination prevented, no effect',
      failureEffect: 'Leader escapes; +1 Unrest',
      criticalFailureEffect: 'Leader wounded; +2 Unrest, PC cannot take Kingdom Action',
      imagePath: 'img/incidents/mod_placeholder.webp'
    }, {
      id: 'mass_exodus',
      name: 'Mass Exodus',
      description: 'Large groups prepare to leave the kingdom',
      level: IncidentLevel.MODERATE,
      percentileMin: 94,
      percentileMax: 100,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Convince them to stay' }, { skill: 'Performance', description: 'Inspire hope' }, { skill: 'Religion', description: 'Provide spiritual guidance' }
      ],
      successEffect: 'Population remains, no effect',
      failureEffect: 'Lose 1 worksite permanently, +1 Unrest',
      criticalFailureEffect: 'Lose 1 worksite permanently, +1 Unrest, -1 Fame',
      imagePath: 'img/incidents/mod_placeholder.webp'
    }
  ] as Incident[],
  
  majorIncidents: [
    {
      id: 'guerrilla_movement',
      name: 'Guerrilla Movement',
      description: 'Rebels organize to seize territory',
      level: IncidentLevel.MAJOR,
      percentileMin: 11,
      percentileMax: 17,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Negotiate with rebels' }, { skill: 'Intimidation', description: 'Crush the rebellion' }, { skill: 'Society', description: 'Address grievances' }, { skill: 'Religion', description: 'Appeal to faith' }
      ],
      successEffect: 'Rebellion dispersed',
      failureEffect: 'Rebels seize 1d3 hexes',
      criticalFailureEffect: 'Rebels seize 2d3 hexes and gain an army',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'secession_crisis',
      name: 'Secession Crisis',
      description: 'A settlement threatens to declare independence',
      level: IncidentLevel.MAJOR,
      percentileMin: 81,
      percentileMax: 87,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Negotiate autonomy' }, { skill: 'Intimidation', description: 'Suppress movement' }, { skill: 'Society', description: 'Address grievances' }, { skill: 'Performance', description: 'Inspire loyalty' }
      ],
      successEffect: 'Independence movement quelled, no effect',
      failureEffect: 'Settlement loses one level, structure destroyed, lose 2d4 Gold',
      criticalFailureEffect: 'Settlement declares independence with adjacent hexes, +2 Unrest',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'international_crisis',
      name: 'International Crisis',
      description: 'A major diplomatic crisis threatens war',
      level: IncidentLevel.MAJOR,
      percentileMin: 88,
      percentileMax: 100,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Damage control' }, { skill: 'Deception', description: 'Shift blame' }, { skill: 'Society', description: 'Formal reparations' }, { skill: 'Performance', description: 'Public relations' }
      ],
      successEffect: 'Crisis contained, no effect',
      failureEffect: "One kingdom's attitude worsens by 2 steps",
      criticalFailureEffect: "Two kingdoms' attitudes worsen by 2 steps, -1 Fame",
      imagePath: 'img/incidents/major_placeholder.webp'
    }
  ] as Incident[]
};
