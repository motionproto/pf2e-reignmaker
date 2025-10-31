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
 * - Must match faction ownership (settlement.owned === capital.owned)
 */

import type { Settlement } from '../models/Settlement';
import type { KingdomData } from '../actors/KingdomActor';
import { hexHasRoads } from '../actions/shared/hexValidation';

class RoadConnectivityService {
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
      
      const neighbors = canvas.grid.getNeighbors(i, j);
      
      return neighbors.map((neighbor: any) => 
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
    
    // Must be same faction
    if (settlement.ownedBy !== capital.ownedBy) {

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
   * @param factionId - Faction ID (owned value) to recalculate
   */
  recalculateAllConnectivity(kingdom: KingdomData, factionId: number = 1): void {
    const capital = kingdom.settlements?.find(s => s.isCapital && s.ownedBy === factionId as any);
    
    if (!capital) {

      return;
    }

    const settlements = kingdom.settlements?.filter(s => s.ownedBy === factionId as any) || [];
    
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
