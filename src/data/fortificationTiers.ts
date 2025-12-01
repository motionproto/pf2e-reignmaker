/**
 * Fortification tier configuration data
 * 
 * This is the single source of truth for fortification tiers.
 * Previously loaded from JSON, now embedded in TypeScript.
 */

export interface FortificationTier {
  id: string;
  name: string;
  tier: number;
  cost: { lumber?: number; stone?: number };
  maintenance: number;
  benefits: { ac: number; initiative: number };
  icon: string;
  description: string;
  special?: string;
}

export const fortificationTiers: FortificationTier[] = [
  {
    id: 'earthworks',
    name: 'Earthworks',
    tier: 1,
    cost: { lumber: 1 },
    maintenance: 0,
    benefits: { ac: 1, initiative: 0 },
    icon: 'fortification_earthen.webp',
    description: 'Basic earthen defensive positions with ditches and berms.'
  },
  {
    id: 'wooden-tower',
    name: 'Wooden Tower',
    tier: 2,
    cost: { lumber: 2 },
    maintenance: 1,
    benefits: { ac: 1, initiative: 1 },
    icon: 'fortification_tower_wood.webp',
    description: 'Wooden watchtower with palisade defenses.'
  },
  {
    id: 'stone-tower',
    name: 'Stone Tower',
    tier: 3,
    cost: { lumber: 1, stone: 2 },
    maintenance: 1,
    benefits: { ac: 2, initiative: 1 },
    icon: 'fortification_tower_stone.webp',
    description: 'Stone tower with reinforced defensive walls.'
  },
  {
    id: 'fortress',
    name: 'Fortress',
    tier: 4,
    cost: { lumber: 2, stone: 4 },
    maintenance: 2,
    benefits: { ac: 2, initiative: 2 },
    icon: 'fortification_keep.webp',
    description: 'Massive fortified keep with multiple defensive layers.',
    special: 'Units stationed here require no gold upkeep'
  }
];

/**
 * Get fortification tier by tier number (1-4)
 */
export function getFortificationTier(tier: number): FortificationTier | undefined {
  return fortificationTiers.find(t => t.tier === tier);
}

/**
 * Get all fortification tiers
 */
export function getAllFortificationTiers(): FortificationTier[] {
  return fortificationTiers;
}

