/**
 * PreviewData.ts
 *
 * Structured output from preview calculation.
 *
 * TO USE: Copy this file to src/types/PreviewData.ts
 */

import type { ResourceType } from './CheckPipeline';

/**
 * Resource change preview
 */
export interface ResourceChange {
  resource: ResourceType;
  value: number;  // Positive = gain, negative = loss
}

/**
 * Entity operation preview
 */
export interface EntityOperation {
  type: 'army' | 'settlement' | 'structure' | 'faction';
  name: string;
  action: 'create' | 'modify' | 'delete';
  details?: any;
}

/**
 * Special effect (formatted for display)
 */
export interface SpecialEffect {
  type: 'resource' | 'entity' | 'status';
  message: string;
  icon?: string;
  variant: 'positive' | 'negative' | 'neutral';
}

/**
 * Preview data structure
 */
export interface PreviewData {
  // Resource changes
  resources: ResourceChange[];

  // Entity operations
  entities?: EntityOperation[];

  // Special effects (badges) - optional, most actions don't need this
  specialEffects?: SpecialEffect[];

  // Warnings
  warnings?: string[];
}

/**
 * Create empty preview data
 */
export function createEmptyPreviewData(): PreviewData {
  return {
    resources: [],
    entities: [],
    specialEffects: [],
    warnings: []
  };
}
