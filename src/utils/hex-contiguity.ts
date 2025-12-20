/**
 * Hex Contiguity Utilities
 *
 * Functions for validating and managing contiguous groups of hexes.
 * Used primarily for province management where hexes must form connected regions.
 */

import { getAdjacentHexIdsFromId } from '../domain/territory/adjacencyLogic';

/**
 * Check if a hex can be added to a set of hexes while maintaining contiguity.
 * Returns true if:
 * - The existing set is empty (first hex can always be added)
 * - The new hex is adjacent to at least one hex in the existing set
 *
 * @param existingHexIds - Current set of hex IDs
 * @param newHexId - Hex ID to check for contiguous addition
 * @returns True if adding this hex maintains contiguity
 */
export function isContiguousAddition(
  existingHexIds: string[],
  newHexId: string
): boolean {
  // First hex can always be added
  if (existingHexIds.length === 0) {
    return true;
  }

  // Check if new hex is adjacent to any existing hex
  const existingSet = new Set(existingHexIds);
  const neighbors = getAdjacentHexIdsFromId(newHexId);

  return neighbors.some(neighbor => existingSet.has(neighbor));
}

/**
 * Find orphaned hexes that would result from removing a hex from a group.
 * Uses flood-fill from an anchor hex to find all reachable hexes,
 * then returns any hexes that are no longer reachable.
 *
 * @param hexIds - Current set of hex IDs
 * @param removedHexId - Hex ID being removed
 * @returns Array of hex IDs that would become orphaned (disconnected from main group)
 */
export function findOrphanedHexes(
  hexIds: string[],
  removedHexId: string
): string[] {
  // Remove the hex being removed
  const remaining = hexIds.filter(id => id !== removedHexId);

  // If no hexes remain, nothing is orphaned
  if (remaining.length === 0) {
    return [];
  }

  // Get contiguous groups after removal
  const groups = getContiguousGroups(remaining);

  // If only one group, nothing is orphaned
  if (groups.length <= 1) {
    return [];
  }

  // Keep the largest group, return the rest as orphaned
  groups.sort((a, b) => b.length - a.length);
  const orphaned: string[] = [];

  for (let i = 1; i < groups.length; i++) {
    orphaned.push(...groups[i]);
  }

  return orphaned;
}

/**
 * Partition a set of hexes into contiguous groups.
 * Uses flood-fill algorithm to identify connected components.
 *
 * @param hexIds - Set of hex IDs to partition
 * @returns Array of groups, where each group is an array of contiguous hex IDs
 */
export function getContiguousGroups(hexIds: string[]): string[][] {
  if (hexIds.length === 0) {
    return [];
  }

  const remaining = new Set(hexIds);
  const groups: string[][] = [];

  while (remaining.size > 0) {
    // Start a new group with an arbitrary hex
    const startHex = remaining.values().next().value;
    const group = floodFill(startHex, remaining);

    // Remove found hexes from remaining
    for (const hexId of group) {
      remaining.delete(hexId);
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Flood-fill from a starting hex to find all connected hexes.
 *
 * @param startHexId - Starting hex ID
 * @param validHexes - Set of hex IDs that are valid to include
 * @returns Array of all hex IDs connected to the start hex
 */
function floodFill(startHexId: string, validHexes: Set<string>): string[] {
  const visited = new Set<string>();
  const queue: string[] = [startHexId];
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current)) {
      continue;
    }

    if (!validHexes.has(current)) {
      continue;
    }

    visited.add(current);
    result.push(current);

    // Add unvisited neighbors to queue
    const neighbors = getAdjacentHexIdsFromId(current);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && validHexes.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Check if a set of hexes forms a single contiguous group.
 *
 * @param hexIds - Set of hex IDs to check
 * @returns True if all hexes are connected
 */
export function isContiguous(hexIds: string[]): boolean {
  if (hexIds.length <= 1) {
    return true;
  }

  const groups = getContiguousGroups(hexIds);
  return groups.length === 1;
}
