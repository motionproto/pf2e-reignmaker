/**
 * tendWounded Action Pipeline
 * Data from: data/player-actions/tend-wounded.json
 */

import { createActionPipeline } from '../shared/createActionPipeline';

import { textBadge } from '../../types/OutcomeBadge';
export const tendWoundedPipeline = createActionPipeline('tend-wounded', {
  requirements: (kingdom) => {
    if (kingdom.armies.length === 0) {
      return {
        met: false,
        reason: 'No armies available'
      };
    }
    return { met: true };
  },

  preRollInteractions: [
    {
      type: 'entity-selection',
      id: 'armyId',
      label: 'Select wounded army to recover',
      entityType: 'army'
    }
  ],

  preview: {
    calculate: (ctx) => {
      const outcomeBadges = [];

      if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(
          textBadge(`${ctx.metadata.armyName || 'Army'} will be fully healed`, 'fa-heart', 'positive')
        );
      } else if (ctx.outcome === 'success') {
        outcomeBadges.push(
          textBadge(`${ctx.metadata.armyName || 'Army'} will be partially healed`, 'fa-heart', 'positive')
        );
      }

      return { resources: [], outcomeBadges, warnings: [] };
    }
  }
});
