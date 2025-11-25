/**
 * recruitUnit Action Pipeline
 * Data from: data/player-actions/recruit-unit.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';
import { applyPipelineModifiers } from '../shared/applyPipelineModifiers';

// Store reference for execute function
const pipeline = createActionPipeline('recruit-unit', {
  // No cost - always available
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      const specialEffects = [];
      
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        specialEffects.push({
          type: 'entity' as const,
          message: 'Will recruit new army at party level',
          variant: 'positive' as const
        });
      }

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        specialEffects,
        warnings: []
      };
    }
  },

  postApplyInteractions: [
    {
      id: 'recruit-army',
      type: 'configuration',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      component: 'RecruitArmyDialog',  // Resolved via ComponentRegistry
      componentProps: {
        show: true,
        exemptFromUpkeep: false
      },
      onComplete: async (data: any, ctx: any) => {
        // Store recruitment data for execute step
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['recruit-army'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    // Apply modifiers (unrest changes) from JSON outcomes first
    await applyPipelineModifiers(pipeline, ctx.outcome);

    // Handle different outcomes
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return { 
        success: true, 
        message: ctx.outcome === 'failure'
          ? 'Failed to recruit troops'
          : 'Recruitment attempt angered the populace'
      };
    }

    // Get recruitment data from postApplyInteractions resolution
    const recruitmentData = ctx.resolutionData?.customComponentData?.['recruit-army'];
    
    // Handle cancellation gracefully (user cancelled recruitment dialog)
    if (!recruitmentData) {
      return { 
        success: true, 
        message: 'Army recruitment cancelled - no army was created',
        cancelled: true 
      };
    }

    // Get party level (falls back to character level if no party)
    const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
    const resolver = await createGameCommandsResolver();
    const partyLevel = resolver.getPartyLevel();

    // Store recruitment data in globalThis for recruitArmy command
    (globalThis as any).__pendingRecruitArmy = {
      name: recruitmentData.name,
      armyType: recruitmentData.armyType,
      settlementId: recruitmentData.settlementId || null
    };

    // Create army via game command (uses prepare/commit pattern)
    const preparedCommand = await resolver.recruitArmy(
      partyLevel,
      recruitmentData.name,
      false // not exempt from upkeep (regular recruitment)
    );

    // Commit the prepared command
    if (preparedCommand.commit) {
      await preparedCommand.commit();
    }

    return { 
      success: true, 
      message: `Successfully recruited ${recruitmentData.name}` 
    };
  }
});

export const recruitUnitPipeline = pipeline;
