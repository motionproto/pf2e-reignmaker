/**
 * Cult Activity Event Pipeline
 *
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import type { GameCommandContext } from '../../services/gameCommands/GameCommandHandler';
import { ConvertUnrestToImprisonedHandler } from '../../services/gameCommands/handlers/ConvertUnrestToImprisonedHandler';
import { textBadge } from '../../types/OutcomeBadge';

export const cultActivityPipeline: CheckPipeline = {
  id: 'cult-activity',
  name: 'Cult Activity',
  description: 'A dangerous cult has been discovered operating in your kingdom.',
  checkType: 'event',
  tier: 1,

  skills: [
      { skill: 'religion', description: 'counter with true faith' },
      { skill: 'diplomacy', description: 'reason with cultists' },
      { skill: 'intimidation', description: 'forcibly disband them' },
    ],

  outcomes: {
    criticalSuccess: {
      description: 'Cult leaders are imprisoned and brought to justice.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ],
      gameCommands: [
        { type: 'convertUnrestToImprisoned', amount: 2, bonusUnrestReduction: 0 }
      ],
      outcomeBadges: [
        textBadge('Imprison 2 unrest', '', 'positive')
      ]
    },
    success: {
      description: 'The cult is disbanded and their assets seized.',
      endsEvent: true,
      modifiers: [
        { type: 'dice', resource: 'gold', formula: '1d3', duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' },
      ],
      gameCommands: [
        { type: 'convertUnrestToImprisoned', amount: 1, bonusUnrestReduction: 0 }
      ],
      outcomeBadges: [
        textBadge('Imprison 1 unrest', '', 'positive')
      ]
    },
    failure: {
      description: 'The cult evades your forces.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The cult\'s influence spreads.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 2, duration: 'immediate' },
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      const warnings: string[] = [];
      
      if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
        const handler = new ConvertUnrestToImprisonedHandler();
        const amount = ctx.outcome === 'criticalSuccess' ? 2 : 1;
        const prepared = await handler.prepare(
          { type: 'convertUnrestToImprisoned', amount, bonusUnrestReduction: 0 },
          { actionId: 'cult-activity', outcome: ctx.outcome, kingdom: ctx.kingdom, metadata: ctx.metadata } as GameCommandContext
        );

        if (prepared) {
          ctx.metadata._preparedConvertUnrest = prepared;
          outcomeBadges.push(prepared.outcomeBadge);
        }
      }

      return {
        resources: [],
        outcomeBadges,
        warnings
      };
    }
  },

  execute: async (ctx) => {
    if (ctx.outcome === 'criticalSuccess' || ctx.outcome === 'success') {
      const prepared = ctx.metadata._preparedConvertUnrest;
      if (prepared?.commit) {
        await prepared.commit();
      }
    }
    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
