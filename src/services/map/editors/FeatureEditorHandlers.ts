/**
 * FeatureEditorHandlers - Handles hex feature placement (settlements, landmarks, etc.)
 * Settlements are placed as hex features with type: 'settlement'
 */

import { updateKingdom, getKingdomData } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import { settlementEditorDialog } from '../../../stores/SettlementEditorDialogStore';
import type { SettlementData } from '../../../stores/SettlementEditorDialogStore';
import { createSettlement, SettlementTier } from '../../../models/Settlement';
import type { Settlement } from '../../../models/Settlement';
import { getAdjacentHexes } from '../../../utils/hexUtils';

export class FeatureEditorHandlers {
  /**
   * Check if any adjacent hexes have settlements
   * Uses hex.features as the source of truth for map presence
   */
  private hasAdjacentSettlement(hexId: string): boolean {
    const canvas = (globalThis as any).canvas;
    if (!canvas?.grid) return false;
    
    const parts = hexId.split('.');
    if (parts.length !== 2) return false;
    
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) return false;
    
    // Get neighboring hexes using shared utility
    const neighbors = getAdjacentHexes(hexI, hexJ);
    if (!neighbors || neighbors.length === 0) return false;
    
    // Get current kingdom data to check for settlements
    const kingdom = getKingdomData();
    
    // Check each neighbor for settlement features (hex.features is source of truth for map)
    for (const neighbor of neighbors) {
      const neighborId = `${neighbor.i}.${neighbor.j}`;
      
      const neighborHex = kingdom.hexes.find(h => h.id === neighborId);
      if (neighborHex?.features?.some((f: any) => f.type === 'settlement')) {
        logger.info(`[FeatureEditorHandlers] Adjacent hex ${neighborId} has settlement feature`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get settlement feature at hex location (if any)
   * Returns hex feature data directly - does NOT require kingdom.settlements entry
   */
  private getSettlementFeature(hexId: string): any | null {
    const kingdom = getKingdomData();
    
    // Find hex and check for settlement feature
    const hex = kingdom.hexes.find(h => h.id === hexId);
    if (!hex?.features) return null;
    
    // Look for settlement feature on this hex
    const settlementFeature = hex.features.find((f: any) => f.type === 'settlement');
    return settlementFeature || null;
  }
  
  /**
   * Get full settlement data from kingdom.settlements (if it exists)
   */
  private getLinkedSettlement(settlementFeature: any): Settlement | null {
    const kingdom = getKingdomData();
    
    // If feature has a linked settlementId, use that
    if (settlementFeature.settlementId) {
      const settlement = kingdom.settlements.find(s => s.id === settlementFeature.settlementId);
      if (settlement) return settlement;
    }
    
    // Fallback: Try to find by name match (for legacy settlements)
    if (settlementFeature.name) {
      const settlement = kingdom.settlements.find(s => s.name === settlementFeature.name);
      if (settlement) return settlement;
    }
    
    return null;
  }
  
  /**
   * Place or edit a settlement on a hex
   * Prompts for settlement properties using enhanced dialog
   */
  async placeSettlement(hexId: string): Promise<void> {
    logger.info(`[FeatureEditorHandlers] Placing/editing settlement on hex ${hexId}`);
    
    const parts = hexId.split('.');
    if (parts.length !== 2) {
      logger.error(`[FeatureEditorHandlers] Invalid hex ID: ${hexId}`);
      return;
    }
    
    const hexI = parseInt(parts[0], 10);
    const hexJ = parseInt(parts[1], 10);
    if (isNaN(hexI) || isNaN(hexJ)) {
      logger.error(`[FeatureEditorHandlers] Invalid hex coordinates: ${hexId}`);
      return;
    }
    
    // Check if settlement feature already exists at this location
    const existingFeature = this.getSettlementFeature(hexId);
    
    if (existingFeature) {
      // Edit existing settlement feature
      logger.info(`[FeatureEditorHandlers] Editing existing settlement feature: ${existingFeature.name || 'unnamed'}`);
      
      // Try to get linked settlement data (may not exist)
      const linkedSettlement = this.getLinkedSettlement(existingFeature);
      
      // If no linked settlement, create a temporary one from feature data for the dialog
      const settlementForDialog = linkedSettlement || createSettlement(
        existingFeature.name || 'Unnamed Settlement',
        { x: hexI, y: hexJ },
        existingFeature.tier || SettlementTier.VILLAGE
      );
      
      // Open dialog with feature data
      const data = await settlementEditorDialog.edit(hexId, settlementForDialog);
      
      if (!data) {
        logger.info(`[FeatureEditorHandlers] Settlement edit canceled`);
        return;
      }
      
      // Update hex.features directly (only name and tier)
      await updateKingdom((kingdom) => {
        const hex = kingdom.hexes.find(h => h.id === hexId);
        if (hex?.features) {
          const feature = hex.features.find((f: any) => f.type === 'settlement');
          if (feature) {
            feature.name = data.name;
            feature.tier = data.tier;
          }
        }
        
        // Also update linked settlement if it exists (sync name and tier)
        if (linkedSettlement) {
          const settlement = kingdom.settlements.find(s => s.id === linkedSettlement.id);
          if (settlement) {
            settlement.name = data.name;
            settlement.tier = data.tier;
          }
        }
      });
      
      ui.notifications?.info(`Updated settlement "${data.name}" on hex ${hexId}`);
      logger.info(`[FeatureEditorHandlers] Updated settlement "${data.name}" on hex ${hexId}`);
      return;
    }
    
    // Check for adjacent settlements (validation for new placement)
    if (this.hasAdjacentSettlement(hexId)) {
      ui.notifications?.warn('Cannot place settlement adjacent to another settlement');
      logger.warn(`[FeatureEditorHandlers] Adjacent settlement found, placement blocked`);
      return;
    }
    
    // Prompt for new settlement data
    const data = await settlementEditorDialog.prompt(hexId);
    if (!data) {
      logger.info(`[FeatureEditorHandlers] Settlement placement canceled`);
      return;
    }
    
    // Add only as hex feature (no full settlement data created)
    await updateKingdom((kingdom) => {
      kingdom.hexes = kingdom.hexes.map(h => {
        if (h.id === hexId) {
          const features = h.features || [];
          return {
            ...h,
            features: [
              ...features,
              {
                type: 'settlement',
                name: data.name,
                tier: data.tier,
                linked: false  // Not linked to full settlement data
              }
            ]
          };
        }
        return h;
      });
    });
    
    ui.notifications?.info(`Placed settlement "${data.name}" on hex ${hexId}`);
    logger.info(`[FeatureEditorHandlers] Placed settlement "${data.name}" on hex ${hexId}`);
  }
  
  /**
   * Remove settlement feature from a hex
   * If the feature is linked to a settlement, unlinks it (sets location to 0,0) instead of deleting
   */
  async removeSettlement(hexId: string): Promise<void> {
    logger.info(`[FeatureEditorHandlers] Removing settlement from hex ${hexId}`);
    
    // First, check if there's a linked settlement we need to unlink
    const existingFeature = this.getSettlementFeature(hexId);
    const linkedSettlement = existingFeature ? this.getLinkedSettlement(existingFeature) : null;
    
    await updateKingdom((kingdom) => {
      // Remove the hex feature
      kingdom.hexes = kingdom.hexes.map(h => {
        if (h.id === hexId && h.features) {
          const features = h.features.filter(f => f.type !== 'settlement');
          
          // Check if we actually removed anything
          if (features.length === h.features.length) {
            logger.warn(`[FeatureEditorHandlers] No settlement found on hex ${hexId}`);
            return h;
          }
          
          return { ...h, features };
        }
        return h;
      });
      
      // If there was a linked settlement, unlink it (set location to 0,0)
      if (linkedSettlement) {
        const settlement = kingdom.settlements.find(s => s.id === linkedSettlement.id);
        if (settlement) {
          settlement.location.x = 0;
          settlement.location.y = 0;
          logger.info(`[FeatureEditorHandlers] Unlinked settlement "${settlement.name}" (ID: ${settlement.id})`);
        }
      }
    });
    
    if (linkedSettlement) {
      ui.notifications?.info(`Removed settlement from hex ${hexId} - settlement "${linkedSettlement.name}" is now unlinked`);
    } else {
      ui.notifications?.info(`Removed settlement from hex ${hexId}`);
    }
    logger.info(`[FeatureEditorHandlers] Removed settlement from hex ${hexId}`);
  }
  
  /**
   * Place or upgrade fortification on a hex
   * @param hexId - Hex ID to fortify
   * @param tier - Fortification tier (1-4)
   */
  async placeFortification(hexId: string, tier: 1 | 2 | 3 | 4): Promise<void> {
    logger.info(`[FeatureEditorHandlers] Placing tier ${tier} fortification on hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      kingdom.hexes = kingdom.hexes.map(h => {
        if (h.id === hexId) {
          // Get current turn (default to 0 if not set)
          const currentTurn = kingdom.currentTurn || 0;
          
          return {
            ...h,
            fortification: {
              tier: tier,
              maintenancePaid: true,
              turnBuilt: currentTurn
            }
          };
        }
        return h;
      });
    });
    
    const tierNames = ['', 'Earthworks', 'Wooden Tower', 'Stone Tower', 'Fortress'];
    ui.notifications?.info(`Placed ${tierNames[tier]} on hex ${hexId}`);
    logger.info(`[FeatureEditorHandlers] Placed tier ${tier} fortification on hex ${hexId}`);
  }
  
  /**
   * Remove fortification from a hex
   */
  async removeFortification(hexId: string): Promise<void> {
    logger.info(`[FeatureEditorHandlers] Removing fortification from hex ${hexId}`);
    
    await updateKingdom((kingdom) => {
      kingdom.hexes = kingdom.hexes.map(h => {
        if (h.id === hexId && h.fortification) {
          // Remove fortification
          const newHex = { ...h };
          delete newHex.fortification;
          return newHex;
        }
        return h;
      });
    });
    
    ui.notifications?.info(`Removed fortification from hex ${hexId}`);
    logger.info(`[FeatureEditorHandlers] Removed fortification from hex ${hexId}`);
  }
  
}
