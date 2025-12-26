/**
 * Recruit Army Action Pipeline
 * Raise new troops for your armies
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';

export const recruitArmyPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'recruit-army',
  name: 'Recruit Army',
  description: 'Rally citizens to arms, drawing from the population to form new military units through inspiration, coercion, or demonstration of prowess',
  brief: 'Raise new troops for your armies',
  category: 'military-operations',
  checkType: 'action',

  skills: [
    { skill: 'diplomacy', description: 'inspire patriotism', doctrine: 'idealist' },
    { skill: 'performance', description: 'recruitment rallies', doctrine: 'idealist' },
    { skill: 'society', description: 'civic duty', doctrine: 'practical' },
    { skill: 'athletics', description: 'demonstrations of prowess', doctrine: 'practical' },
    { skill: 'intimidation', description: 'conscription', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Patriotic fervor spreads.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ],
      outcomeBadges: [
        textBadge('Recruit new army', 'fa-shield-alt', 'positive')
      ]
    },
    success: {
      description: 'Troops are recruited.',
      modifiers: [],
      outcomeBadges: [
        textBadge('Recruit new army', 'fa-shield-alt', 'positive')
      ]
    },
    failure: {
      description: 'Recruitment fails.',
      modifiers: [],
      outcomeBadges: []
    },
    criticalFailure: {
      description: 'The recruitment attempt angers the populace.',
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ],
      outcomeBadges: []
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: () => ({ met: true }),

  preview: {
    calculate: (ctx) => {
      const unrestChange = ctx.outcome === 'criticalSuccess' ? -1 :
                          ctx.outcome === 'criticalFailure' ? 1 : 0;

      const outcomeBadges = [];

      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge('Will recruit new army at party level', 'fa-shield-alt', 'positive')
        );
      }

      return {
        resources: unrestChange !== 0 ? [{ resource: 'unrest', value: unrestChange }] : [],
        outcomeBadges,
        warnings: []
      };
    }
  },

  postApplyInteractions: [
    {
      id: 'recruit-army',
      type: 'configuration',
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      component: 'RecruitArmyDialog',
      componentProps: {
        show: true,
        exemptFromUpkeep: false
      },
      onComplete: async (data: any, ctx: any) => {
        ctx.resolutionData = ctx.resolutionData || {};
        ctx.resolutionData.customComponentData = ctx.resolutionData.customComponentData || {};
        ctx.resolutionData.customComponentData['recruit-army'] = data;
      }
    }
  ],

  execute: async (ctx: any) => {
    if (ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') {
      return {
        success: true,
        message: ctx.outcome === 'failure'
          ? 'Failed to recruit troops'
          : 'Recruitment attempt angered the populace'
      };
    }

    const recruitmentData = ctx.resolutionData?.customComponentData?.['recruit-army'];

    if (!recruitmentData) {
      return {
        success: true,
        message: 'Army recruitment cancelled - no army was created',
        cancelled: true
      };
    }

    const { getPartyLevel } = await import('../../services/gameCommands/GameCommandUtils');
    const { getGameCommandRegistry } = await import('../../services/gameCommands/GameCommandHandlerRegistry');

    const partyLevel = getPartyLevel();
    const registry = getGameCommandRegistry();

    const preparedCommand = await registry.process(
      {
        type: 'recruitArmy',
        level: partyLevel,
        recruitmentData: {
          name: recruitmentData.name,
          armyType: recruitmentData.armyType,
          settlementId: recruitmentData.settlementId || null
        },
        exemptFromUpkeep: false
      },
      { kingdom: ctx.kingdom, outcome: ctx.outcome, metadata: ctx.metadata }
    );

    if (preparedCommand?.commit) {
      await preparedCommand.commit();
    }

    return {
      success: true,
      message: `Successfully recruited ${recruitmentData.name}`
    };
  }
};
