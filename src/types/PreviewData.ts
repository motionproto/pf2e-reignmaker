/**
 * PreviewData.ts
 *
 * Structured output from preview calculation.
 *
 * TO USE: Copy this file to src/types/PreviewData.ts
 */

import type { ResourceType } from './CheckPipeline';
import type { UnifiedOutcomeBadge } from './OutcomeBadge';

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
 * Preview data structure
 */
export interface PreviewData {
  // Resource changes
  resources: ResourceChange[];

  // Entity operations
  entities?: EntityOperation[];

  // Outcome badges - custom badges for specific outcome display
  outcomeBadges?: UnifiedOutcomeBadge[];

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
    outcomeBadges: [],
    warnings: []
  };
}
