/**
 * Army Type Configuration Types
 * Defines the structure for customizable army types
 */

/**
 * Configuration for a single army type
 */
export interface ArmyTypeConfig {
  /** Unique key identifier (e.g., 'cavalry', 'infantry') */
  key: string;
  /** Display name (e.g., 'Cavalry', 'Infantry') */
  name: string;
  /** Portrait image path for actor sheet (optional) */
  portraitImage?: string;
  /** Token image path for map token (optional) */
  tokenImage?: string;
  /** Whether players can recruit this type (false = GM-only) */
  enabledForPlayers: boolean;
}

/**
 * Collection of army type configurations
 * Keyed by the type key for fast lookup
 */
export interface ArmyTypesConfig {
  [key: string]: ArmyTypeConfig;
}

/**
 * Default army type keys (without images - images added by service)
 */
export const DEFAULT_ARMY_TYPE_KEYS = ['cavalry', 'engineers', 'infantry', 'kobold', 'wolves'] as const;

/**
 * Default army types configuration (without images)
 * Images are resolved at runtime by the service
 */
export const DEFAULT_ARMY_TYPES_BASE: Omit<ArmyTypeConfig, 'image'>[] = [
  { key: 'cavalry', name: 'Cavalry', enabledForPlayers: true },
  { key: 'engineers', name: 'Engineers', enabledForPlayers: true },
  { key: 'infantry', name: 'Infantry', enabledForPlayers: true },
  { key: 'kobold', name: 'Kobold', enabledForPlayers: true },
  { key: 'wolves', name: 'Wolves', enabledForPlayers: true },
];
