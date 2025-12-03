/**
 * KingdomModifierService - Extracts kingdom modifiers for skill checks
 * 
 * This service is responsible for gathering all kingdom-specific modifiers
 * that apply to skill checks. These are domain concepts, NOT PF2e concepts:
 * - Structure bonuses (e.g., Library gives +1 to Scholarship)
 * - Unrest penalty (e.g., -1 per unrest tier)
 * - Aid bonuses (e.g., "Aid from Alice +2")
 * 
 * The modifiers are returned in the standardized RollModifier format.
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { structuresService } from '../structures';
import { getSkillPenalty } from './unrest/UnrestService';
import type { RollModifier } from '../../types/RollModifier';

export interface ModifierCheckOptions {
  /** Skill being checked (for structure bonuses) */
  skillName: string;
  /** Action/event/incident ID to retrieve aid bonuses */
  actionId?: string;
  /** Check type to determine which phase aids to check */
  checkType: 'action' | 'event' | 'incident';
  /** Optional settlement ID to only include that specific settlement's modifiers */
  onlySettlementId?: string;
  /** Optional settlement/structure info to auto-enable a specific modifier */
  enabledSettlement?: string;
  enabledStructure?: string;
}

class KingdomModifierService {
  private static instance: KingdomModifierService;

  static getInstance(): KingdomModifierService {
    if (!KingdomModifierService.instance) {
      KingdomModifierService.instance = new KingdomModifierService();
    }
    return KingdomModifierService.instance;
  }

  /**
   * Get all applicable modifiers for a kingdom skill check
   * Returns modifiers in standardized RollModifier format
   */
  getModifiersForCheck(options: ModifierCheckOptions): RollModifier[] {
    const modifiers: RollModifier[] = [];
    
    // Add structure bonuses
    const structureModifiers = this.getStructureBonuses(
      options.skillName, 
      options.onlySettlementId,
      options.enabledSettlement,
      options.enabledStructure
    );
    modifiers.push(...structureModifiers);
    
    // Add unrest penalty
    const unrestModifier = this.getUnrestPenalty();
    if (unrestModifier) {
      modifiers.push(unrestModifier);
    }
    
    // Add leadership penalty
    const leadershipModifier = this.getLeadershipPenalty();
    if (leadershipModifier) {
      modifiers.push(leadershipModifier);
    }
    
    // Add aid bonuses
    if (options.actionId) {
      const aidModifiers = this.getAidBonuses(options.actionId, options.checkType);
      modifiers.push(...aidModifiers);
    }
    
    return modifiers;
  }

  /**
   * Get structure bonuses for a skill
   * Calculates on-the-fly from settlement structures
   */
  private getStructureBonuses(
    skillName: string, 
    onlySettlementId?: string,
    enabledSettlement?: string,
    enabledStructure?: string
  ): RollModifier[] {
    const modifiers: RollModifier[] = [];
    const currentKingdomState = get(kingdomData);
    
    if (!currentKingdomState?.settlements) {
      return modifiers;
    }
    
    // Filter to settlements with valid map locations
    let mappedSettlements = currentKingdomState.settlements.filter(
      s => s.location.x !== 0 || s.location.y !== 0
    );
    
    // If onlySettlementId is specified, filter to just that settlement
    if (onlySettlementId) {
      mappedSettlements = mappedSettlements.filter(s => s.id === onlySettlementId);
    }
    
    for (const settlement of mappedSettlements) {
      // Calculate skill bonuses on-the-fly from structures
      if (settlement.structureIds && settlement.structureIds.length > 0) {
        const bonusMap: Record<string, { bonus: number; structureName: string }> = {};
        
        for (const structureId of settlement.structureIds) {
          // Skip damaged structures
          if (structuresService.isStructureDamaged(settlement, structureId)) {
            continue;
          }
          
          const structure = structuresService.getStructure(structureId);
          if (structure?.type === 'skill' && structure.effects.skillsSupported) {
            const bonus = structure.effects.skillBonus || 0;
            for (const skill of structure.effects.skillsSupported) {
              const currentBonus = bonusMap[skill]?.bonus || 0;
              if (bonus > currentBonus) {
                bonusMap[skill] = {
                  bonus,
                  structureName: structure.name
                };
              }
            }
          }
        }
        
        // Add modifier for this settlement if it has a bonus for this skill
        if (bonusMap[skillName]) {
          const modifierLabel = `${settlement.name} ${bonusMap[skillName].structureName}`;
          
          // Check if this modifier should be auto-enabled
          const shouldEnable = enabledSettlement && enabledStructure && 
            modifierLabel === `${enabledSettlement} ${enabledStructure}`;
          
          modifiers.push({
            label: modifierLabel,
            value: bonusMap[skillName].bonus,
            type: 'circumstance',
            enabled: shouldEnable || false,
            ignored: !shouldEnable,  // Set to ignored unless specifically enabled
            source: 'structure'
          });
        }
      }
    }
    
    return modifiers;
  }

  /**
   * Get unrest penalty modifier
   */
  private getUnrestPenalty(): RollModifier | null {
    const currentKingdomState = get(kingdomData);
    const unrest = currentKingdomState?.unrest || 0;
    const penalty = getSkillPenalty(unrest);
    
    if (penalty < 0) {
      return {
        label: 'Unrest Penalty',
        value: penalty,
        type: 'circumstance',
        enabled: true,
        ignored: false,
        source: 'unrest'
      };
    }
    
    return null;
  }

  /**
   * Get leadership penalty modifier (turn-scoped from incidents/events)
   */
  private getLeadershipPenalty(): RollModifier | null {
    const currentKingdomState = get(kingdomData);
    const penalty = currentKingdomState?.leadershipPenalty || 0;
    
    if (penalty < 0) {
      return {
        label: 'Leadership Penalty',
        value: penalty,
        type: 'status',
        enabled: true,
        ignored: false,
        source: 'leadership'
      };
    }
    
    return null;
  }

  /**
   * Get aid bonuses for an action/event
   */
  private getAidBonuses(actionId: string, checkType: 'action' | 'event' | 'incident'): RollModifier[] {
    const modifiers: RollModifier[] = [];
    const currentKingdomState = get(kingdomData);
    
    if (!currentKingdomState?.turnState) {
      return modifiers;
    }
    
    let aids: any[] = [];
    
    // Check for event aids
    if (checkType === 'event' && currentKingdomState.turnState.eventsPhase?.activeAids) {
      aids = currentKingdomState.turnState.eventsPhase.activeAids.filter(
        aid => aid.targetActionId === actionId
      );
    }
    // Check for action aids (also applies to incidents since they use actionsPhase)
    else if (currentKingdomState.turnState.actionsPhase?.activeAids) {
      aids = currentKingdomState.turnState.actionsPhase.activeAids.filter(
        aid => aid.targetActionId === actionId
      );
    }
    
    for (const aid of aids) {
      if (aid.bonus > 0) {
        modifiers.push({
          label: `Aid from ${aid.characterName} (${aid.skillUsed})`,
          value: aid.bonus,
          type: 'circumstance',
          enabled: true,
          ignored: false,
          source: 'aid'
        });
      }
    }
    
    return modifiers;
  }

  /**
   * Check if any aid for this action/event grants keep-higher (critical success aid)
   */
  hasKeepHigherAid(actionId: string, checkType: 'action' | 'event' | 'incident'): boolean {
    const currentKingdomState = get(kingdomData);
    
    if (!currentKingdomState?.turnState) {
      return false;
    }
    
    let aids: any[] = [];
    
    // Check for event aids
    if (checkType === 'event' && currentKingdomState.turnState.eventsPhase?.activeAids) {
      aids = currentKingdomState.turnState.eventsPhase.activeAids.filter(
        aid => aid.targetActionId === actionId
      );
    }
    // Check for action aids
    else if (currentKingdomState.turnState.actionsPhase?.activeAids) {
      aids = currentKingdomState.turnState.actionsPhase.activeAids.filter(
        aid => aid.targetActionId === actionId
      );
    }
    
    // Return true if any aid grants keep higher
    return aids.some(aid => aid.grantKeepHigher);
  }
}

// Export singleton instance
export const kingdomModifierService = KingdomModifierService.getInstance();

