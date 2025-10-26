/**
 * CollectStipendAction - Custom implementation for Collect Stipend
 * 
 * Allows player to select a settlement and receive gold based on income table.
 */

import type { KingdomData } from '../../actors/KingdomActor';
import type { ActionRequirement } from '../../controllers/actions/action-resolver';
import type { ResolutionData } from '../../types/modifiers';
import { updateKingdom, getKingdomData } from '../../stores/KingdomStore';
import {
  logActionStart,
  logActionSuccess,
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult
} from '../shared/ActionHelpers';

/**
 * Income table based on settlement level and taxation tier
 * T2 = Town+ (needs 2+ structures)
 * T3 = City+ (needs 4+ structures)  
 * T4 = Metropolis (needs 8+ structures)
 */
const INCOME_TABLE: { [level: number]: { t2?: number; t3?: number; t4?: number } } = {
  1: {},
  2: { t2: 3 },
  3: { t2: 5 },
  4: { t2: 7 },
  5: { t2: 9, t3: 18 },
  6: { t2: 15, t3: 30 },
  7: { t2: 20, t3: 40 },
  8: { t2: 25, t3: 50, t4: 100 },
  9: { t2: 30, t3: 60, t4: 120 },
  10: { t2: 40, t3: 80, t4: 160 },
  11: { t2: 50, t3: 100, t4: 200 },
  12: { t2: 60, t3: 120, t4: 240 },
  13: { t2: 70, t3: 140, t4: 280 },
  14: { t2: 80, t3: 160, t4: 320 },
  15: { t2: 100, t3: 200, t4: 400 },
  16: { t2: 130, t3: 260, t4: 520 },
  17: { t2: 150, t3: 300, t4: 600 },
  18: { t2: 200, t3: 400, t4: 800 },
  19: { t2: 300, t3: 600, t4: 1200 },
  20: { t2: 400, t3: 800, t4: 1600 },
};

export const CollectStipendAction = {
  id: 'collect-stipend',
  
  checkRequirements(kingdomData: KingdomData): ActionRequirement {
    // Need at least one settlement at level 2+ with 2+ structures
    const eligibleSettlements = (kingdomData.settlements || []).filter(s => {
      const structureCount = s.structureIds?.length || 0;
      return s.level >= 2 && structureCount >= 2;
    });
    
    if (eligibleSettlements.length === 0) {
      return {
        met: false,
        reason: 'Requires a settlement at level 2+ with at least 2 structures'
      };
    }
    
    return { met: true };
  },
  
  customResolution: {
    component: null,
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('collect-stipend', 'Selecting settlement for stipend');
      
      try {
        const kingdom = getKingdomData();
        
        // Get eligible settlements (level 2+, 2+ structures)
        const eligibleSettlements = (kingdom.settlements || []).filter(s => {
          const structureCount = s.structureIds?.length || 0;
          return s.level >= 2 && structureCount >= 2;
        });
        
        if (eligibleSettlements.length === 0) {
          return createErrorResult('No eligible settlements (need level 2+ with 2+ structures)');
        }
        
        // Prompt for settlement selection
        const selectedSettlement = await promptForSettlementSelection(eligibleSettlements);
        if (!selectedSettlement) {
          return createErrorResult('Settlement selection cancelled');
        }
        
        // Calculate income based on settlement tier
        const structureCount = selectedSettlement.structureIds?.length || 0;
        const level = selectedSettlement.level;
        const income = calculateIncome(level, structureCount);
        
        if (income === 0) {
          return createErrorResult('Selected settlement does not generate income (check taxation tier requirements)');
        }
        
        // Add gold
        await updateKingdom(kingdom => {
          if (kingdom.resources) {
            kingdom.resources.gold = (kingdom.resources.gold || 0) + income;
          }
        });
        
        const message = `Collected ${income} gold from ${selectedSettlement.name}!`;
        logActionSuccess('collect-stipend', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('collect-stipend', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Failed to collect stipend');
      }
    }
  },
  
  needsCustomResolution(outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'): boolean {
    // This action doesn't have a roll, but we still need custom resolution for settlement selection
    return outcome === 'success';
  }
};

function calculateIncome(level: number, structureCount: number): number {
  const incomeRow = INCOME_TABLE[level];
  if (!incomeRow) return 0;
  
  // Determine taxation tier based on structure count
  if (structureCount >= 8 && incomeRow.t4 !== undefined) {
    return incomeRow.t4; // Metropolis
  } else if (structureCount >= 4 && incomeRow.t3 !== undefined) {
    return incomeRow.t3; // City+
  } else if (structureCount >= 2 && incomeRow.t2 !== undefined) {
    return incomeRow.t2; // Town+
  }
  
  return 0;
}

async function promptForSettlementSelection(settlements: any[]): Promise<any | null> {
  return new Promise((resolve) => {
    const Dialog = (globalThis as any).Dialog;
    
    const settlementOptions = settlements.map(s => {
      const structureCount = s.structureIds?.length || 0;
      const income = calculateIncome(s.level, structureCount);
      const tierLabel = structureCount >= 8 ? 'T4' : structureCount >= 4 ? 'T3' : 'T2';
      return `<option value="${s.id}">${s.name} (Level ${s.level}, ${tierLabel}, ${income} gp)</option>`;
    }).join('\n');
    
    new Dialog({
      title: 'Select Settlement for Stipend',
      content: `
        <div style="margin-bottom: 1rem;">
          <label for="settlement-select" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            Settlement:
          </label>
          <select 
            id="settlement-select" 
            name="settlement-select" 
            style="width: 100%; padding: 0.5rem;"
          >
            ${settlementOptions}
          </select>
          <p style="margin-top: 0.5rem; font-size: 0.9em; color: #888;">
            Income is based on settlement level and taxation tier (T2=2+ structures, T3=4+, T4=8+)
          </p>
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-coins"></i>',
          label: 'Collect Stipend',
          callback: (html: any) => {
            const select = html.find('#settlement-select')[0] as HTMLSelectElement;
            const settlementId = select?.value;
            const settlement = settlements.find(s => s.id === settlementId);
            resolve(settlement || null);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'ok',
      close: () => resolve(null)
    }).render(true);
  });
}

export default CollectStipendAction;
