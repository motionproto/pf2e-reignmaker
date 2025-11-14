/**
 * Pipeline Registry
 *
 * Central registry for all check pipelines (actions, events, incidents).
 * Manages pipeline registration and lookup for the unified check system.
 */

import { unifiedCheckHandler } from '../services/UnifiedCheckHandler';
import type { CheckPipeline } from '../types/CheckPipeline';

// Week 5: Simple Actions (9)
import { dealWithUnrestPipeline } from './actions/dealWithUnrest';
import { sellSurplusPipeline } from './actions/sellSurplus';
import { purchaseResourcesPipeline } from './actions/purchaseResources';
import { harvestResourcesPipeline } from './actions/harvestResources';
import { claimHexesPipeline } from './actions/claimHexes';
import { buildRoadsPipeline } from './actions/buildRoads';
import { fortifyHexPipeline } from './actions/fortifyHex';
import { createWorksitePipeline } from './actions/createWorksite';
import { sendScoutsPipeline } from './actions/sendScouts';

// Week 6: Pre-roll Dialog Actions (7)
import { collectStipendPipeline } from './actions/collectStipend';
import { executeOrPardonPrisonersPipeline } from './actions/executeOrPardonPrisoners';
import { establishDiplomaticRelationsPipeline } from './actions/establishDiplomaticRelations';
import { requestEconomicAidPipeline } from './actions/requestEconomicAid';
import { requestMilitaryAidPipeline } from './actions/requestMilitaryAid';
import { trainArmyPipeline } from './actions/trainArmy';
import { disbandArmyPipeline } from './actions/disbandArmy';

// Week 7: Game Command Actions (5)
import { recruitUnitPipeline } from './actions/recruitUnit';
import { deployArmyPipeline } from './actions/deployArmy';
import { buildStructurePipeline } from './actions/buildStructure';
import { repairStructurePipeline } from './actions/repairStructure';
import { upgradeSettlementPipeline } from './actions/upgradeSettlement';

// Week 8: Custom Resolution Actions (5)
import { arrestDissidentsPipeline } from './actions/arrestDissidents';
import { outfitArmyPipeline } from './actions/outfitArmy';
import { infiltrationPipeline } from './actions/infiltration';
import { establishSettlementPipeline } from './actions/establishSettlement';
import { recoverArmyPipeline } from './actions/recoverArmy';

/**
 * All registered action pipelines (26 total)
 */
const ACTION_PIPELINES: CheckPipeline[] = [
  // Week 5: Simple Actions (9)
  dealWithUnrestPipeline,
  sellSurplusPipeline,
  purchaseResourcesPipeline,
  harvestResourcesPipeline,
  claimHexesPipeline,
  buildRoadsPipeline,
  fortifyHexPipeline,
  createWorksitePipeline,
  sendScoutsPipeline,

  // Week 6: Pre-roll Dialog Actions (7)
  collectStipendPipeline,
  executeOrPardonPrisonersPipeline,
  establishDiplomaticRelationsPipeline,
  requestEconomicAidPipeline,
  requestMilitaryAidPipeline,
  trainArmyPipeline,
  disbandArmyPipeline,

  // Week 7: Game Command Actions (5)
  recruitUnitPipeline,
  deployArmyPipeline,
  buildStructurePipeline,
  repairStructurePipeline,
  upgradeSettlementPipeline,

  // Week 8: Custom Resolution Actions (5)
  arrestDissidentsPipeline,
  outfitArmyPipeline,
  infiltrationPipeline,
  establishSettlementPipeline,
  recoverArmyPipeline
];

/**
 * Pipeline Registry Service
 */
export class PipelineRegistry {
  private initialized = false;

  /**
   * Initialize the registry and register all pipelines
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[PipelineRegistry] Already initialized');
      return;
    }

    console.log('[PipelineRegistry] Initializing...');

    // Register all action pipelines
    for (const pipeline of ACTION_PIPELINES) {
      unifiedCheckHandler.registerCheck(pipeline.id, pipeline);
    }

    this.initialized = true;
    console.log(`✅ [PipelineRegistry] Registered ${ACTION_PIPELINES.length} action pipelines`);
  }

  /**
   * Get a pipeline by ID
   */
  getPipeline(id: string): CheckPipeline | undefined {
    return unifiedCheckHandler.getCheck(id);
  }

  /**
   * Get all registered pipelines
   */
  getAllPipelines(): CheckPipeline[] {
    return ACTION_PIPELINES;
  }

  /**
   * Get all pipelines by category
   */
  getPipelinesByCategory(category: string): CheckPipeline[] {
    return ACTION_PIPELINES.filter(p => p.category === category);
  }

  /**
   * Get all pipelines by type
   */
  getPipelinesByType(checkType: 'action' | 'event' | 'incident'): CheckPipeline[] {
    return ACTION_PIPELINES.filter(p => p.checkType === checkType);
  }
}

/**
 * Singleton instance
 */
export const pipelineRegistry = new PipelineRegistry();
