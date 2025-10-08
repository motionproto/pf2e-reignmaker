import type { Settlement } from '../../../../models/Settlement';

/**
 * Get Font Awesome icon class for settlement tier
 */
export function getTierIcon(tier: string): string {
   const icons: Record<string, string> = {
      'Village': 'fa-home',
      'Town': 'fa-building',
      'City': 'fa-city',
      'Metropolis': 'fa-landmark'
   };
   return icons[tier] || 'fa-building';
}

/**
 * Get CSS class for settlement tier styling
 */
export function getTierColor(tier: string): string {
   const colors: Record<string, string> = {
      'Village': 'tier-village',
      'Town': 'tier-town',
      'City': 'tier-city',
      'Metropolis': 'tier-metropolis'
   };
   return colors[tier] || '';
}

/**
 * Get structure count for a settlement
 */
export function getStructureCount(settlement: Settlement): number {
   return settlement.structureIds.length;
}

/**
 * Get maximum structures allowed for a settlement based on tier
 * Based on Reignmaker Lite rules
 */
export function getMaxStructures(settlement: Settlement): number {
   switch (settlement.tier) {
      case 'Village':
         return 2;
      case 'Town':
         return 4;
      case 'City':
         return 8;
      case 'Metropolis':
         return 999; // Effectively unlimited
      default:
         return 2;
   }
}

/**
 * Get maximum allowed level for a settlement based on tier and structure count
 * Based on Reignmaker Lite rules:
 * - Village (Tier 1): Level 0-1, can reach 1 (or 4 if has 2 structures for Town upgrade)
 * - Town (Tier 2): Level 2-4, can reach 4 (or 7 if has 4 structures for City upgrade)
 * - City (Tier 3): Level 5-7, can reach 7 (or 20 if has 8 structures for Metropolis upgrade)
 * - Metropolis (Tier 4): Level 8+, no cap
 */
export function getMaxAllowedLevel(settlement: Settlement): number {
   if (!settlement) return 20;
   
   const hasMaxStructures = settlement.structureIds.length >= getMaxStructures(settlement);
   
   switch (settlement.tier) {
      case 'Village':
         return hasMaxStructures ? 4 : 1;  // Can reach Town level range if ready to upgrade
      case 'Town':
         return hasMaxStructures ? 7 : 4;  // Can reach City level range if ready to upgrade
      case 'City':
         return hasMaxStructures ? 20 : 7; // Can reach Metropolis level range if ready to upgrade
      case 'Metropolis':
         return 20; // No cap
      default:
         return 1;
   }
}

/**
 * Get formatted location string for a settlement
 */
export function getLocationString(settlement: Settlement): string {
   return `${settlement.location.x}, ${settlement.location.y}`;
}
