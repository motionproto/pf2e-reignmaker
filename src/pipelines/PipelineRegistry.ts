/**
 * Pipeline Registry
 *
 * Central registry for all check pipelines (actions, events, incidents).
 * Manages pipeline registration and lookup for the unified check system.
 */

import { unifiedCheckHandler } from '../services/UnifiedCheckHandler';
import type { CheckPipeline } from '../types/CheckPipeline';

// ==================================================
// ACTION PIPELINES (26)
// ==================================================

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
import { establishDiplomaticRelationsPipeline } from './actions/diplomaticMission';
import { requestEconomicAidPipeline } from './actions/requestEconomicAid';
import { requestMilitaryAidPipeline } from './actions/requestMilitaryAid';
import { trainArmyPipeline } from './actions/trainArmy';
import { disbandArmyPipeline } from './actions/disbandArmy';

// Week 7: Game Command Actions (5)
import { recruitArmyPipeline } from './actions/recruitArmy';
import { deployArmyPipeline } from './actions/deployArmy';
import { buildStructurePipeline } from './actions/buildStructure';
import { repairStructurePipeline } from './actions/repairStructure';
import { upgradeSettlementPipeline } from './actions/upgradeSettlement';

// Week 8: Custom Resolution Actions (5)
import { arrestDissidentsPipeline } from './actions/arrestDissidents';
import { outfitArmyPipeline } from './actions/outfitArmy';
import { infiltrationPipeline } from './actions/infiltration';
import { establishSettlementPipeline } from './actions/establishSettlement';
import { tendWoundedPipeline } from './actions/tendWounded';

// Special Actions
import { aidAnotherPipeline } from './actions/aidAnother';

// Status Phase Actions
import { cohesionCheckPipeline } from './actions/cohesionCheck';

// ==================================================
// EVENT PIPELINES (36)
// ==================================================

import { archaeologicalFindPipeline } from './events/archaeological-find';
import { assassinationAttemptPipeline } from './events/assassination-attempt';
import { banditActivityPipeline as banditActivityEventPipeline } from './events/bandit-activity';
import { boomtownPipeline } from './events/boomtown';
import { criminalTrialPipeline } from './events/criminal-trial';
import { cultActivityPipeline } from './events/cult-activity';
import { demandExpansionPipeline } from './events/demand-expansion';
import { demandStructurePipeline } from './events/demand-structure';
import { diplomaticOverturePipeline } from './events/diplomatic-overture';
import { drugDenPipeline } from './events/drug-den';
import { economicSurgePipeline } from './events/economic-surge';
import { festiveInvitationPipeline } from './events/festive-invitation';
import { feudPipeline } from './events/feud';
import { foodShortagePipeline } from './events/food-shortage';
import { foodSurplusPipeline } from './events/food-surplus';
import { goodWeatherPipeline } from './events/good-weather';
import { grandTournamentPipeline } from './events/grand-tournament';
import { immigrationPipeline } from './events/immigration';
import { inquisitionPipeline } from './events/inquisition';
import { landRushPipeline } from './events/land-rush';
import { magicalDiscoveryPipeline } from './events/magical-discovery';
import { militaryExercisesPipeline } from './events/military-exercises';
import { monsterAttackPipeline } from './events/monster-attack';
import { naturalDisasterPipeline } from './events/natural-disaster';
import { naturesBlessingPipeline } from './events/natures-blessing';
import { notoriousHeistPipeline } from './events/notorious-heist';
import { pilgrimagePipeline } from './events/pilgrimage';
import { plaguePipeline } from './events/plague';
import { publicScandalPipeline } from './events/public-scandal';
import { raidersPipeline } from './events/raiders';
import { remarkableTreasurePipeline } from './events/remarkable-treasure';
import { crimeWavePipeline } from './events/crime-wave';
import { tradeAgreementPipeline } from './events/trade-agreement';
import { undeadUprisingPipeline } from './events/undead-uprising';
import { visitingCelebrityPipeline } from './events/visiting-celebrity';

// ==================================================
// INCIDENT PIPELINES (30)
// ==================================================

// Minor incidents (9)
import { banditRaidsPipeline } from './incidents/minor/bandit-raids';
import { corruptionScandalPipeline } from './incidents/minor/corruption-scandal';
import { criminalActivityPipeline } from './incidents/minor/criminal-activity';
import { diplomaticIncidentPipeline } from './incidents/minor/diplomatic-incident';
import { emigrationThreatPipeline } from './incidents/minor/emigration-threat';
import { protestsPipeline } from './incidents/minor/protests';
import { risingTensionsPipeline } from './incidents/minor/rising-tensions';
import { workStoppagePipeline } from './incidents/minor/work-stoppage';

// Moderate incidents (10)
import { assassinAttackPipeline } from './incidents/moderate/assassin-attack';
import { diplomaticCrisisPipeline } from './incidents/moderate/diplomatic-crisis';
import { diseaseOutbreakPipeline } from './incidents/moderate/disease-outbreak';
import { infrastructureDamagePipeline } from './incidents/moderate/infrastructure-damage';
import { massExodusPipeline } from './incidents/moderate/mass-exodus';
import { productionStrikePipeline } from './incidents/moderate/production-strike';
import { riotPipeline } from './incidents/moderate/riot';
import { settlementCrisisPipeline } from './incidents/moderate/settlement-crisis';
import { taxRevoltPipeline } from './incidents/moderate/tax-revolt';
import { tradeEmbargoPipeline } from './incidents/moderate/trade-embargo';

// Major incidents (12)
import { borderRaidPipeline } from './incidents/major/border-raid';
import { economicCrashPipeline } from './incidents/major/economic-crash';
import { guerrillaMovementPipeline } from './incidents/major/guerrilla-movement';
import { internationalCrisisPipeline } from './incidents/major/international-crisis';
import { internationalScandalPipeline } from './incidents/major/international-scandal';
import { massDesertionThreatPipeline } from './incidents/major/mass-desertion-threat';
import { nobleConspiracyPipeline } from './incidents/major/noble-conspiracy';
import { prisonBreaksPipeline } from './incidents/major/prison-breaks';
import { religiousSchismPipeline } from './incidents/major/religious-schism';
import { secessionCrisisPipeline } from './incidents/major/secession-crisis';
import { settlementCollapsePipeline } from './incidents/major/settlement-collapse';
import { tradeWarPipeline } from './incidents/major/trade-war';

/**
 * All registered action pipelines (27 total)
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
  recruitArmyPipeline,
  deployArmyPipeline,
  buildStructurePipeline,
  repairStructurePipeline,
  upgradeSettlementPipeline,

  // Week 8: Custom Resolution Actions (5)
  arrestDissidentsPipeline,
  outfitArmyPipeline,
  infiltrationPipeline,
  establishSettlementPipeline,
  tendWoundedPipeline,

  // Special Actions (1)
  aidAnotherPipeline,

  // Status Phase Actions (1)
  cohesionCheckPipeline
];

/**
 * All registered event pipelines (36 total)
 */
const EVENT_PIPELINES: CheckPipeline[] = [
  archaeologicalFindPipeline,
  assassinationAttemptPipeline,
  banditActivityEventPipeline,
  boomtownPipeline,
  criminalTrialPipeline,
  cultActivityPipeline,
  demandExpansionPipeline,
  demandStructurePipeline,
  diplomaticOverturePipeline,
  drugDenPipeline,
  economicSurgePipeline,
  festiveInvitationPipeline,
  feudPipeline,
  foodShortagePipeline,
  foodSurplusPipeline,
  goodWeatherPipeline,
  grandTournamentPipeline,
  immigrationPipeline,
  inquisitionPipeline,
  landRushPipeline,
  magicalDiscoveryPipeline,
  militaryExercisesPipeline,
  monsterAttackPipeline,
  naturalDisasterPipeline,
  naturesBlessingPipeline,
  notoriousHeistPipeline,
  pilgrimagePipeline,
  plaguePipeline,
  publicScandalPipeline,
  raidersPipeline,
  remarkableTreasurePipeline,
  crimeWavePipeline,
  tradeAgreementPipeline,
  undeadUprisingPipeline,
  visitingCelebrityPipeline
];

/**
 * All registered incident pipelines (30 total)
 */
const INCIDENT_PIPELINES: CheckPipeline[] = [
  // Minor (8)
  banditRaidsPipeline,
  corruptionScandalPipeline,
  criminalActivityPipeline,
  diplomaticIncidentPipeline,
  emigrationThreatPipeline,
  protestsPipeline,
  risingTensionsPipeline,
  workStoppagePipeline,

  // Moderate (10)
  assassinAttackPipeline,
  diplomaticCrisisPipeline,
  diseaseOutbreakPipeline,
  infrastructureDamagePipeline,
  massExodusPipeline,
  productionStrikePipeline,
  riotPipeline,
  settlementCrisisPipeline,
  taxRevoltPipeline,
  tradeEmbargoPipeline,

  // Major (12)
  borderRaidPipeline,
  economicCrashPipeline,
  guerrillaMovementPipeline,
  internationalCrisisPipeline,
  internationalScandalPipeline,
  massDesertionThreatPipeline,
  nobleConspiracyPipeline,
  prisonBreaksPipeline,
  religiousSchismPipeline,
  secessionCrisisPipeline,
  settlementCollapsePipeline,
  tradeWarPipeline
];

/**
 * All registered incident pipelines (30 total)
 */
const ALL_PIPELINES: CheckPipeline[] = [
  ...ACTION_PIPELINES,
  ...EVENT_PIPELINES,
  ...INCIDENT_PIPELINES
];

/**
 * Pipeline Registry Service
 */
export class PipelineRegistry {
  private initialized = false;

  /**
   * Check if the registry has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the registry and register all pipelines
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[PipelineRegistry] ⚠️ Already initialized');
      return;
    }

    // Register all pipelines
    let successCount = 0;
    for (const pipeline of ALL_PIPELINES) {
      try {
        unifiedCheckHandler.registerCheck(pipeline.id, pipeline);
        successCount++;
      } catch (error) {
        console.error(`[PipelineRegistry] ❌ Failed to register ${pipeline.id}:`, error);
      }
    }

    this.initialized = true;
    console.log(`✅ [PipelineRegistry] Successfully registered ${successCount}/${ALL_PIPELINES.length} pipelines`);
  }

  /**
   * Get a pipeline by ID
   */
  getPipeline(id: string): CheckPipeline | undefined {
    // Auto-initialize on first access (fixes HMR singleton issues)
    if (!this.initialized) {
      console.warn(`[PipelineRegistry] Auto-initializing on first access for: ${id}`);
      this.initialize();
    }
    
    return unifiedCheckHandler.getCheck(id);
  }

  /**
   * Get all registered pipelines
   */
  getAllPipelines(): CheckPipeline[] {
    return ALL_PIPELINES;
  }

  /**
   * Get all pipelines by category
   */
  getPipelinesByCategory(category: string): CheckPipeline[] {
    return ALL_PIPELINES.filter(p => p.category === category);
  }

  /**
   * Get all pipelines by type
   */
  getPipelinesByType(checkType: 'action' | 'event' | 'incident'): CheckPipeline[] {
    return ALL_PIPELINES.filter(p => p.checkType === checkType);
  }
}

/**
 * Singleton instance
 */
export const pipelineRegistry = new PipelineRegistry();

/**
 * Force re-initialization (for HMR)
 * Called when pipeline modules hot-reload during development
 */
export function reinitializeRegistry(): void {
  console.log('🔄 [PipelineRegistry] Hot reload detected, re-initializing registry');
  pipelineRegistry['initialized'] = false;  // Access private property via indexer
  pipelineRegistry.initialize();
}

// Hot Module Replacement support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔥 [PipelineRegistry] Module hot reloaded');
    reinitializeRegistry();
  });
}
