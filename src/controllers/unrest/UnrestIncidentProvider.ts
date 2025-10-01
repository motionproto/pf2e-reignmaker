/**
 * UnrestIncidentProvider - Centralized provider for unrest calculations and incident logic
 * 
 * This provider ensures consistent tier calculations, incident thresholds, and display information
 * across both the UnrestPhaseController and UI components.
 */

export interface UnrestTierInfo {
  tier: number;
  tierName: string;
  penalty: number;
  incidentThreshold: number;
  incidentChance: number;
  incidentSeverity: 'minor' | 'moderate' | 'major';
  description: string;
  statusClass: string;
}

export class UnrestIncidentProvider {
  /**
   * Calculate unrest tier using the canonical formula
   * This is the single source of truth for tier calculation
   */
  static calculateTier(unrest: number): number {
    return Math.min(3, Math.floor(unrest / 3));
  }

  /**
   * Get comprehensive tier information for display and logic
   */
  static getTierInfo(unrest: number): UnrestTierInfo {
    const tier = this.calculateTier(unrest);
    const threshold = this.getIncidentThreshold(unrest);
    
    return {
      tier,
      tierName: this.getTierName(tier),
      penalty: tier,
      incidentThreshold: threshold,
      incidentChance: threshold > 0 ? Math.round((threshold / 20) * 100) : 0,
      incidentSeverity: this.getIncidentSeverity(tier),
      description: this.getTierDescription(tier),
      statusClass: this.getTierStatusClass(tier)
    };
  }

  /**
   * Get incident threshold based on unrest level
   * Matches the logic in UnrestPhaseController
   */
  static getIncidentThreshold(unrest: number): number {
    if (unrest <= 2) return 0;   // No incidents
    if (unrest <= 4) return 3;   // 15% chance
    if (unrest <= 6) return 6;   // 30% chance  
    if (unrest <= 8) return 10;  // 50% chance
    return 15;                   // 75% chance
  }

  /**
   * Get incident severity based on tier
   */
  static getIncidentSeverity(tier: number): 'minor' | 'moderate' | 'major' {
    if (tier <= 1) return 'minor';
    if (tier <= 2) return 'moderate';
    return 'major';
  }

  /**
   * Get tier name for display
   */
  private static getTierName(tier: number): string {
    switch (tier) {
      case 0: return 'Stable';
      case 1: return 'Discontent';
      case 2: return 'Unrest';  
      case 3: return 'Rebellion';
      default: return 'Stable';
    }
  }

  /**
   * Get tier description for UI
   */
  private static getTierDescription(tier: number): string {
    switch (tier) {
      case 0: return 'No incidents occur at this level';
      case 1: return 'Minor incidents possible';
      case 2: return 'Moderate incidents possible';
      case 3: return 'Major incidents possible';
      default: return 'No incidents occur at this level';
    }
  }

  /**
   * Get CSS class for tier styling
   */
  private static getTierStatusClass(tier: number): string {
    switch (tier) {
      case 0: return 'stable';
      case 1: return 'discontent';
      case 2: return 'unrest';
      case 3: return 'rebellion';
      default: return 'stable';
    }
  }

  /**
   * Get unrest status text based on level
   */
  static getUnrestStatus(unrest: number): string {
    if (unrest === 0) return 'stable';
    if (unrest <= 2) return 'calm';
    if (unrest <= 4) return 'tense';
    if (unrest <= 6) return 'troubled';
    if (unrest <= 8) return 'volatile';
    return 'critical';
  }
}
