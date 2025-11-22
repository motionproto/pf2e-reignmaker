/**
 * Helper to create action pipelines from compiled JSON data
 * 
 * This provides a clean way to:
 * 1. Import base data from JSON (descriptions, skills, modifiers)
 * 2. Add TypeScript-only logic (preview, execute, postRollInteractions)
 */

import type { CheckPipeline, SkillOption, EventModifier } from '../../types/CheckPipeline';
import actionData from '../../data-compiled/player-actions.json';

type ActionJsonData = typeof actionData[number];

interface ActionOverrides {
  /** TypeScript-only: Requirements function */
  requirements?: CheckPipeline['requirements'];
  /** TypeScript-only: Pre-roll interactions */
  preRollInteractions?: CheckPipeline['preRollInteractions'];
  /** TypeScript-only: Post-roll interactions */
  postRollInteractions?: CheckPipeline['postRollInteractions'];
  /** TypeScript-only: Post-apply interactions */
  postApplyInteractions?: CheckPipeline['postApplyInteractions'];
  /** TypeScript-only: Preview calculation */
  preview?: CheckPipeline['preview'];
  /** TypeScript-only: Execute function */
  execute?: CheckPipeline['execute'];
}

/**
 * Create a pipeline from JSON data with optional TypeScript overrides
 */
export function createActionPipeline(
  actionId: string,
  overrides: ActionOverrides = {}
): CheckPipeline {
  const data = actionData.find(a => a.id === actionId);
  if (!data) {
    throw new Error(`Action not found in JSON: ${actionId}`);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    checkType: 'action',
    cost: data.cost as any,

    // Cast to proper types (JSON loses type narrowing)
    skills: data.skills as SkillOption[],

    outcomes: {
      criticalSuccess: {
        description: data.outcomes.criticalSuccess?.description || '',
        modifiers: (data.outcomes.criticalSuccess?.modifiers || []) as EventModifier[]
      },
      success: {
        description: data.outcomes.success?.description || '',
        modifiers: (data.outcomes.success?.modifiers || []) as EventModifier[]
      },
      failure: {
        description: data.outcomes.failure?.description || '',
        modifiers: (data.outcomes.failure?.modifiers || []) as EventModifier[]
      },
      criticalFailure: {
        description: data.outcomes.criticalFailure?.description || '',
        modifiers: (data.outcomes.criticalFailure?.modifiers || []) as EventModifier[]
      }
    },

    // Default preview (empty but defined)
    preview: {
      calculate: () => ({ resources: [], outcomeBadges: [] })
    },

    // Apply remaining TypeScript overrides
    ...(overrides.requirements && { requirements: overrides.requirements }),
    ...(overrides.preview && { preview: overrides.preview }),
    ...(overrides.preRollInteractions && { preRollInteractions: overrides.preRollInteractions }),
    ...(overrides.postRollInteractions && { postRollInteractions: overrides.postRollInteractions }),
    ...(overrides.postApplyInteractions && { postApplyInteractions: overrides.postApplyInteractions }),
    ...(overrides.execute && { execute: overrides.execute })
  };
}

/**
 * Get raw action data for inspection (without creating pipeline)
 */
export function getActionData(actionId: string): ActionJsonData | undefined {
  return actionData.find(a => a.id === actionId);
}
