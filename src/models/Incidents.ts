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
      case 2: return 'Unrest';  // Changed from 'Turmoil' to 'Unrest' to match UI
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
   * @param tier The unrest tier (0-3)
   */
  rollForIncident(tier: number): Incident | null {
    if (tier === 0) return null; // Stable - no incidents
    
    console.log('Rolling for incident. Tier:', tier);
    
    // Determine chance of no incident based on tier
    let noIncidentChance: number;
    switch (tier) {
      case 1: // Discontent
        noIncidentChance = 0.20; // 20% chance of no incident
        break;
      case 2: // Turmoil
        noIncidentChance = 0.15; // 15% chance of no incident
        break;
      case 3: // Rebellion
        noIncidentChance = 0.10; // 10% chance of no incident
        break;
      default:
        return null;
    }
    
    // Roll to see if incident occurs
    const roll = Math.random();
    console.log('Roll:', roll, 'vs no-incident chance:', noIncidentChance);
    
    if (roll < noIncidentChance) {
      console.log('No incident (rolled under threshold)');
      return null; // No incident
    }
    
    // An incident occurs - randomly select one from the appropriate array
    const level = this.getIncidentLevel(tier);
    console.log('Incident level:', level);
    if (!level) return null;
    
    return this.getRandomIncident(level);
  },
  
  /**
   * Get a random incident from the appropriate level array
   */
  getRandomIncident(level: IncidentLevel): Incident | null {
    let incidents: Incident[];
    
    switch (level) {
      case IncidentLevel.MINOR:
        incidents = IncidentManager.minorIncidents;
        break;
      case IncidentLevel.MODERATE:
        incidents = IncidentManager.moderateIncidents;
        break;
      case IncidentLevel.MAJOR:
        incidents = IncidentManager.majorIncidents;
        break;
      default:
        return null;
    }
    
    console.log('Getting random incident from level:', level, 'Array length:', incidents?.length || 0);
    
    if (!incidents || incidents.length === 0) {
      console.error('No incidents found for level:', level);
      return null;
    }
    
    // Pick a random incident from the array
    const randomIndex = Math.floor(Math.random() * incidents.length);
    const incident = incidents[randomIndex];
    console.log('Selected incident:', incident?.name || 'none');
    return incident;
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
      id: 'diplomatic_incident',
      name: 'Diplomatic Incident',
      description: 'A serious diplomatic incident threatens relations',
      level: IncidentLevel.MODERATE,
      percentileMin: 25,
      percentileMax: 33,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Smooth over' }, { skill: 'Deception', description: 'Deny responsibility' }, { skill: 'Society', description: 'Formal apology' }
      ],
      successEffect: 'Relations maintained, no effect',
      failureEffect: "One neighbouring kingdom's attitude worsens by 1 step",
      criticalFailureEffect: "Two random kingdoms' attitudes worsen by 1 step",
      imagePath: 'img/incidents/mod_placeholder.webp'
    }, {
      id: 'tax_revolt',
      name: 'Tax Revolt',
      description: 'Citizens revolt against tax collection',
      level: IncidentLevel.MODERATE,
      percentileMin: 34,
      percentileMax: 42,
      skillOptions: [
        { skill: 'Intimidation', description: 'Enforce collection' }, { skill: 'Diplomacy', description: 'Negotiate rates' }, { skill: 'Society', description: 'Tax reform' }, { skill: 'Deception', description: 'Creative accounting' }
      ],
      successEffect: 'Taxes collected normally',
      failureEffect: 'Lose 1d4 Gold (reduced tax collection)',
      criticalFailureEffect: 'Lose 2d4 Gold, +1 Unrest',
      imagePath: 'img/incidents/mod_placeholder.webp'
    }, {
      id: 'infrastructure_damage',
      name: 'Infrastructure Damage',
      description: 'Critical infrastructure is damaged or sabotaged',
      level: IncidentLevel.MODERATE,
      percentileMin: 43,
      percentileMax: 51,
      skillOptions: [
        { skill: 'Crafting', description: 'Emergency repairs' }, { skill: 'Athletics', description: 'Labor mobilization' }, { skill: 'Society', description: 'Organize response' }, { skill: 'Arcana', description: 'Magical restoration' }
      ],
      successEffect: 'Damage prevented, no effect',
      failureEffect: 'One random structure in a random settlement becomes damaged',
      criticalFailureEffect: '1d3 random structures become damaged (random settlements), +1 unrest',
      imagePath: 'img/incidents/mod_placeholder.webp'
    }, {
      id: 'disease_outbreak',
      name: 'Disease Outbreak',
      description: 'A dangerous disease spreads through your settlements',
      level: IncidentLevel.MODERATE,
      percentileMin: 52,
      percentileMax: 60,
      skillOptions: [
        { skill: 'Medicine', description: 'Treat disease' }, { skill: 'Nature', description: 'Natural remedies' }, { skill: 'Religion', description: 'Divine healing' }
      ],
      successEffect: 'Disease contained, no effect',
      failureEffect: 'Lose 1d4 Food (feeding the sick), +1 Unrest',
      criticalFailureEffect: 'Lose 2d4 Food, one Medicine or Faith structure becomes damaged, +1 Unrest',
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
      id: 'settlement_crisis',
      name: 'Settlement Crisis',
      description: 'One of your settlements faces a major crisis',
      level: IncidentLevel.MODERATE,
      percentileMin: 70,
      percentileMax: 78,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Address concerns' }, { skill: 'Society', description: 'Emergency aid' }, { skill: 'Religion', description: 'Provide hope' }
      ],
      successEffect: 'Settlement stabilized, no effect',
      failureEffect: 'Random settlement loses 1d4 Gold OR 1 structure damaged',
      criticalFailureEffect: 'Random settlement loses one level (minimum level 1), +1 unrest',
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
      id: 'trade_embargo',
      name: 'Trade Embargo',
      description: 'Neighboring kingdoms impose trade restrictions',
      level: IncidentLevel.MODERATE,
      percentileMin: 88,
      percentileMax: 93,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Negotiate' }, { skill: 'Society', description: 'Find loopholes' }, { skill: 'Deception', description: 'Smuggling routes' }, { skill: 'Occultism', description: 'Divine trade routes' }
      ],
      successEffect: 'Trade continues, no effect',
      failureEffect: "Lose 1d4 Gold OR 1d4+1 Resources (player's choice)",
      criticalFailureEffect: 'Lose 2d4 Gold AND 1d4+1 Resources, +1 Unrest',
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
      id: 'mass_desertion_threat',
      name: 'Mass Desertion Threat',
      description: 'Your armies threaten mass desertion',
      level: IncidentLevel.MAJOR,
      percentileMin: 18,
      percentileMax: 24,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Rally troops' }, { skill: 'Intimidation', description: 'Threaten deserters' }, { skill: 'Performance', description: 'Inspire loyalty' }
      ],
      successEffect: 'Troops remain loyal, no effect',
      failureEffect: '1 army makes morale checks, highest tier military structure is damaged',
      criticalFailureEffect: '2 armies make morale checks, highest tier military structure is destroyed',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'trade_embargo_major',
      name: 'Trade Embargo',
      description: 'A complete trade embargo devastates your economy',
      level: IncidentLevel.MAJOR,
      percentileMin: 25,
      percentileMax: 31,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Negotiate' }, { skill: 'Society', description: 'Find loopholes' }, { skill: 'Deception', description: 'Smuggling routes' }, { skill: 'Arcana', description: 'Teleportation network' }
      ],
      successEffect: 'Trade continues, no effect',
      failureEffect: "Lose 2d4 Gold OR 2d4+1 Resources (player's choice)",
      criticalFailureEffect: 'Lose 3d4 Gold AND 2d4+1 Resources, +1 Unrest',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'settlement_crisis_major',
      name: 'Settlement Crisis',
      description: 'A major settlement faces total collapse',
      level: IncidentLevel.MAJOR,
      percentileMin: 32,
      percentileMax: 38,
      skillOptions: [
        { skill: 'Diplomacy', description: 'Address concerns' }, { skill: 'Society', description: 'Emergency aid' }, { skill: 'Religion', description: 'Provide hope' }
      ],
      successEffect: 'Settlement stabilized, no effect',
      failureEffect: 'Random settlement loses 2d4 Gold OR 2 structures damaged',
      criticalFailureEffect: 'Random settlement loses one level (minimum level 1), 1 structure destroyed, +1 unrest',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'international_scandal',
      name: 'International Scandal',
      description: "A massive scandal ruins your kingdom's reputation",
      level: IncidentLevel.MAJOR,
      percentileMin: 39,
      percentileMax: 45,
      skillOptions: [
        { skill: 'Performance', description: 'Grand gesture' }, { skill: 'Diplomacy', description: 'Public relations' }, { skill: 'Deception', description: 'Propaganda' }
      ],
      successEffect: 'Reputation maintained, no effect',
      failureEffect: 'Lose 1 Fame AND 1d4 gold',
      criticalFailureEffect: 'King has zero fame this round and cannot gain fame this round, lose 2d4 gold, +1 Unrest',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'prison_breaks',
      name: 'Prison Breaks',
      description: 'Mass prison breaks release dangerous criminals',
      level: IncidentLevel.MAJOR,
      percentileMin: 46,
      percentileMax: 52,
      skillOptions: [
        { skill: 'Intimidation', description: 'Lockdown prisons' }, { skill: 'Athletics', description: 'Pursuit' }, { skill: 'Society', description: 'Negotiation' }
      ],
      successEffect: 'Break prevented, no effect',
      failureEffect: 'Half imprisoned unrest becomes regular unrest, the justice structure is damaged',
      criticalFailureEffect: 'All imprisoned unrest becomes regular unrest, the justice structure is destroyed',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'noble_conspiracy',
      name: 'Noble Conspiracy',
      description: "Nobles plot to overthrow the kingdom's leadership",
      level: IncidentLevel.MAJOR,
      percentileMin: 53,
      percentileMax: 59,
      skillOptions: [
        { skill: 'Stealth', description: 'Uncover plot' }, { skill: 'Intimidation', description: 'Arrests' }, { skill: 'Society', description: 'Political maneuvering' }, { skill: 'Occultism', description: 'Divine truth' }
      ],
      successEffect: 'Conspiracy exposed and dealt with, no effect',
      failureEffect: 'Lose 1d4 Gold, -1 fame',
      criticalFailureEffect: 'Lose 2d4 Gold, -1 fame, one random PC loses kingdom action this turn, +1 unrest',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'economic_crash',
      name: 'Economic Crash',
      description: "Your kingdom's economy collapses",
      level: IncidentLevel.MAJOR,
      percentileMin: 60,
      percentileMax: 66,
      skillOptions: [
        { skill: 'Society', description: 'Economic reform' }, { skill: 'Diplomacy', description: 'Secure loans' }, { skill: 'Crafting', description: 'Boost production' }, { skill: 'Arcana', description: 'Transmute resources' }
      ],
      successEffect: 'Economy stabilized, no effect',
      failureEffect: 'Lose 2d6 gold, your highest tier commerce structure is damaged',
      criticalFailureEffect: 'Lose 4d6 gold, your highest tier commerce structure is destroyed',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'religious_schism',
      name: 'Religious Schism',
      description: 'Religious divisions tear your kingdom apart',
      level: IncidentLevel.MAJOR,
      percentileMin: 67,
      percentileMax: 73,
      skillOptions: [
        { skill: 'Religion', description: 'Theological debate' }, { skill: 'Diplomacy', description: 'Mediate factions' }, { skill: 'Occultism', description: 'Divine intervention' }, { skill: 'Society', description: 'Secular compromise' }
      ],
      successEffect: 'Schism averted, no effect',
      failureEffect: 'Church factions form, lose 2d6 gold, your highest tier religious structure is damaged',
      criticalFailureEffect: 'Church splits, lose 4d6 gold, your highest tier religious structure is destroyed',
      imagePath: 'img/incidents/major_placeholder.webp'
    }, {
      id: 'border_raid',
      name: 'Border Raid',
      description: 'Enemy forces raid your border territories',
      level: IncidentLevel.MAJOR,
      percentileMin: 74,
      percentileMax: 80,
      skillOptions: [
        { skill: 'Athletics', description: 'Rapid response' }, { skill: 'Intimidation', description: 'Retaliation' }, { skill: 'Survival', description: 'Tracking' }, { skill: 'Nature', description: 'Use terrain' }
      ],
      successEffect: 'Raiders repelled, no effect',
      failureEffect: 'Lose 1 border hex permanently, lose 1d4 Gold (pillaging)',
      criticalFailureEffect: 'Lose 1d3 border hexes permanently, lose 2d4 Gold',
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
