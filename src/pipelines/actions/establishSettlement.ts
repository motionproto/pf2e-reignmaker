/**
 * Establish Settlement Action Pipeline
 * Found a new village
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { applyActionCost } from '../shared/applyActionCost';
import { foundSettlementExecution } from '../../execution';
import { textBadge } from '../../types/OutcomeBadge';
import {
  validateClaimed,
  validateNoSettlement,
  validateExplored,
  safeValidation,
  getFreshKingdomData,
  type ValidationResult
} from '../shared/hexValidators';
import SettlementCustomSelector from '../../services/hex-selector/SettlementCustomSelector.svelte';
import { getAdjacentHexes } from '../../utils/hexUtils';

export const establishSettlementPipeline: CheckPipeline = {
  // === BASE DATA ===
  id: 'establish-settlement',
  name: 'Establish Settlement',
  description: 'Found a new community where settlers can establish homes and begin building infrastructure',
  brief: 'Found a new village',
  category: 'urban-planning',
  checkType: 'action',
  cost: { gold: 2, lumber: 2, food: 2 },
  special: 'A new settlement begins as a level 1 Village unless special circumstances apply. Must be founded in a claimed hex with no other settlement within 4 hexes.',

  skills: [
    { skill: 'diplomacy', description: 'attract settlers', doctrine: 'idealist' },
    { skill: 'religion', description: 'blessed founding', doctrine: 'idealist' },
    { skill: 'medicine', description: 'healthy community planning', doctrine: 'idealist' },
    { skill: 'society', description: 'organized settlement', doctrine: 'practical' },
    { skill: 'survival', description: 'frontier establishment', doctrine: 'practical' },
    { skill: 'intimidation', description: 'forced labour', doctrine: 'ruthless' }
  ],

  outcomes: {
    criticalSuccess: {
      description: 'The village is established quickly.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -2, duration: 'immediate' }
      ],
      manualEffects: ['Place the new village on the hex map', 'Choose and add any Tier 1 structure to the new settlement']
    },
    success: {
      description: 'The village is established.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -2, duration: 'immediate' }
      ],
      manualEffects: ['Place the new village on the hex map']
    },
    failure: {
      description: 'Resources are wasted.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -1, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -1, duration: 'immediate' }
      ]
    },
    criticalFailure: {
      description: 'The settlement attempt is a complete disaster.',
      modifiers: [
        { type: 'static', resource: 'gold', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'food', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'lumber', value: -2, duration: 'immediate' },
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    }
  },

  // === TYPESCRIPT LOGIC ===
  requirements: (kingdom) => {
    const requirements: string[] = [];
    
    const resources = kingdom.resources || {};
    const gold = resources.gold || 0;
    const food = resources.food || 0;
    const lumber = resources.lumber || 0;
    
    if (gold < 2) requirements.push(`Need 2 Gold (have ${gold})`);
    if (food < 2) requirements.push(`Need 2 Food (have ${food})`);
    if (lumber < 2) requirements.push(`Need 2 Lumber (have ${lumber})`);
    
    return {
      met: requirements.length === 0,
      reason: requirements.length > 0 ? requirements.join(', ') : undefined
    };
  },

  preview: {
    calculate: (ctx) => {
      const resourceCost = ctx.outcome === 'failure' ? -1 : -2;

      const resources = [
        { resource: 'gold', value: resourceCost },
        { resource: 'food', value: resourceCost },
        { resource: 'lumber', value: resourceCost }
      ];

      if (ctx.outcome === 'criticalFailure') {
        resources.push({ resource: 'unrest', value: 1 });
      }

      const outcomeBadges = [];
      if (ctx.outcome === 'success') {
        outcomeBadges.push(textBadge('Will found new settlement', 'fa-building', 'positive'));
      } else if (ctx.outcome === 'criticalSuccess') {
        outcomeBadges.push(textBadge('Will found new settlement', 'fa-building', 'positive'));
        outcomeBadges.push(textBadge('Grants free Tier 1 structure', 'fa-gift', 'positive'));
      }

      return { resources, outcomeBadges, warnings: [] };
    }
  },

  postRollInteractions: [],

  postApplyInteractions: [
    {
      type: 'map-selection',
      id: 'location',
      mode: 'hex-selection',
      count: 1,
      colorType: 'settlement',
      title: 'Select hex for new settlement',
      required: true,
      condition: (ctx) => ctx.outcome === 'success' || ctx.outcome === 'criticalSuccess',
      validateHex: (hexId: string): ValidationResult => {
        return safeValidation(() => {
          const kingdom = getFreshKingdomData();
          const hex = kingdom.hexes?.find((h: any) => h.id === hexId);
          
          if (!hex) {
            return { valid: false, message: 'Hex not found' };
          }
          
          const claimedResult = validateClaimed(hexId, kingdom);
          if (!claimedResult.valid) return claimedResult;
          
          const exploredResult = validateExplored(hexId);
          if (!exploredResult.valid) return exploredResult;
          
          const settlementResult = validateNoSettlement(hexId, kingdom);
          if (!settlementResult.valid) return settlementResult;
          
          const [hX, hY] = hexId.split('.').map(Number);
          const adjacentHexes = getAdjacentHexes(hX, hY);
          
          const settlements = kingdom.settlements || [];
          for (const settlement of settlements) {
            if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) continue;
            
            const isAdjacent = adjacentHexes.some(
              adjacent => adjacent.i === settlement.location.x && adjacent.j === settlement.location.y
            );
            
            if (isAdjacent) {
              return {
                valid: false,
                message: `Cannot be adjacent to ${settlement.name}`
              };
            }
          }
          
          return { valid: true };
        }, hexId, 'establishSettlement validation');
      },
      customSelector: {
        component: SettlementCustomSelector,
        props: {
          showStructureSelection: true
        }
      }
    }
  ],

  execute: async (ctx) => {
    switch (ctx.outcome) {
      case 'criticalSuccess':
      case 'success': {
        const locationData = ctx.resolutionData?.compoundData?.location;
        
        let hexId: string | undefined;
        let settlementName: string | undefined;
        
        if (!locationData) {
          return { success: true };
        }
        
        if (Array.isArray(locationData)) {
          if (locationData.length === 0) {
            return { success: true };
          }
          hexId = locationData[0];
        } else if (locationData?.hexIds) {
          hexId = locationData.hexIds[0];
          settlementName = locationData.metadata?.settlementName;
        }
        
        if (!hexId) {
          return { success: false, error: 'Settlement location not provided' };
        }
        
        const [x, y] = hexId.split('.').map(Number);
        
        const finalName = settlementName && settlementName.trim() !== '' 
          ? settlementName.trim() 
          : 'Settlement';
        
        const freeStructureId = locationData.metadata?.structureId || null;
        
        await applyActionCost(establishSettlementPipeline);
        
        await foundSettlementExecution({
          name: finalName,
          location: { x, y },
          hexId,
          freeStructureId
        });
        
        return { success: true };
      }
        
      case 'failure':
        return { success: true };
        
      case 'criticalFailure':
        return { success: true };
        
      default:
        return { success: false, error: `Unexpected outcome: ${ctx.outcome}` };
    }
  }
};
