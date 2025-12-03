/**
 * RoadConnectivityService - Detects road connectivity between settlements
 * 
 * Uses BFS (Breadth-First Search) pathfinding to determine if a settlement
 * is connected to the capital by roads.
 * 
 * Rules:
 * - Roads can be traversed (hex.hasRoad === true OR hex has settlement)
 * - Water terrain = automatic road
 * - Settlements count as roads (can chain through them)
 * - Future: River features will count as roads (type: 'river')
 * - Must match faction ownership (derived from hex.claimedBy)
 */

import type { Settlement } from '../models/Settlement';
import type { KingdomData } from '../actors/KingdomActor';
import type { OwnershipValue } from '../types/ownership';
import { hexHasRoads } from '../pipelines/shared/hexValidation';
import { getAdjacentHexes } from '../utils/hexUtils';

class RoadConnectivityService {
  /**
   * Get settlement owner from the hex it occupies (single source of truth)
   */
  private getSettlementOwner(settlement: Settlement, kingdom: KingdomData): OwnershipValue {
    const hex = kingdom.hexes?.find(h => 
      h.row === settlement.location.x && h.col === settlement.location.y
    );
    return hex?.claimedBy ?? null;
  }
  
  /**
   * Get adjacent hex IDs using Foundry's grid API
   * Uses canvas.grid.getNeighbors() directly (Foundry v13+)
   */
  private getAdjacentHexIds(hexId: string): string[] {
    const canvas = (globalThis as any).canvas;
    
    if (!canvas?.grid) {
      return [];
    }
    
    try {
      const [rowStr, colStr] = hexId.split('.');
      const i = parseInt(rowStr);
      const j = parseInt(colStr);
      
      if (isNaN(i) || isNaN(j)) return [];
      
      const neighbors = getAdjacentHexes(i, j);
      
      // Convert to hex ID format
      return neighbors.map((neighbor) => 
        `${neighbor.i}.${neighbor.j}`
      );
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Check if a hex can be traversed (has road connectivity)
   * 
   * Traversable if:
   * - Has road built OR has a settlement (using hexHasRoads helper)
   * - Is water terrain (automatic road)
   * - Has river feature (future support)
   */
  private isHexTraversable(hexId: string, kingdom: KingdomData): boolean {
    const hex = kingdom.hexes?.find(h => h.id === hexId);
    if (!hex) return false;
    
    // Check if hex has roads or settlement (unified check)
    if (hexHasRoads(hexId, kingdom)) return true;
    
    // Check if hex is water (automatic road)
    if (hex.terrain === 'water') return true;
    
    // Check if hex has a river feature (future support)
    // Note: hex.features may not exist on all hex types, handle gracefully
    const hasRiverFeature = (hex as any).features?.some((f: any) => f.type === 'river');
    if (hasRiverFeature) return true;
    
    return false;
  }
  
  /**
   * Check if a settlement is connected to the capital by roads
   * Uses BFS (Breadth-First Search) pathfinding
   * 
   * @param settlement - Settlement to check connectivity for
   * @param capital - Capital settlement to connect to
   * @param kingdom - Kingdom data
   * @returns true if settlement is connected to capital by roads
   */
  isConnectedToCapital(
    settlement: Settlement,
    capital: Settlement,
    kingdom: KingdomData
  ): boolean {
    // Quick validation
    if (!settlement || !capital) {

      return false;
    }
    
    // Must be same faction (derive ownership from hex)
    const settlementOwner = this.getSettlementOwner(settlement, kingdom);
    const capitalOwner = this.getSettlementOwner(capital, kingdom);
    if (settlementOwner !== capitalOwner) {

      return false;
    }
    
    // Get hex IDs
    const startHexId = `${settlement.location.x}.${settlement.location.y}`;
    const targetHexId = `${capital.location.x}.${capital.location.y}`;
    
    // Same hex = connected
    if (startHexId === targetHexId) {

      return true;
    }

    // BFS pathfinding
    const queue: string[] = [startHexId];
    const visited = new Set<string>([startHexId]);
    
    while (queue.length > 0) {
      const currentHexId = queue.shift()!;
      
      // Get adjacent hexes
      const adjacentHexIds = this.getAdjacentHexIds(currentHexId);
      
      for (const adjacentHexId of adjacentHexIds) {
        // Skip if already visited
        if (visited.has(adjacentHexId)) continue;
        
        // Check if we reached the target
        if (adjacentHexId === targetHexId) {

          return true;
        }
        
        // Check if this hex is traversable
        if (this.isHexTraversable(adjacentHexId, kingdom)) {
          visited.add(adjacentHexId);
          queue.push(adjacentHexId);
        }
      }
    }

    return false;
  }
  
  /**
   * Recalculate connectivity for all settlements in a faction
   * Used when roads are built or capital changes
   * 
   * @param kingdom - Kingdom data
   * @param factionId - Faction ID (hex.claimedBy value) to recalculate, defaults to "player"
   */
  recalculateAllConnectivity(kingdom: KingdomData, factionId: OwnershipValue = "player"): void {
    // Find capital owned by this faction (using hex ownership)
    const capital = kingdom.settlements?.find(s => {
      if (!s.isCapital) return false;
      const owner = this.getSettlementOwner(s, kingdom);
      return owner === factionId;
    });
    
    if (!capital) {

      return;
    }

    // Find all settlements owned by this faction (using hex ownership)
    const settlements = kingdom.settlements?.filter(s => {
      const owner = this.getSettlementOwner(s, kingdom);
      return owner === factionId;
    }) || [];
    
    for (const settlement of settlements) {
      if (settlement.isCapital) {
        // Capital doesn't need connectivity flag (uses isCapital instead)
        settlement.connectedByRoads = false;
      } else {
        settlement.connectedByRoads = this.isConnectedToCapital(settlement, capital, kingdom);

      }
    }
  }
}

// Export singleton instance
export const roadConnectivityService = new RoadConnectivityService();
