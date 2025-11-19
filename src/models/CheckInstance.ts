/**
 * Check Instance - Represents an active check in the pipeline system
 * 
 * This type defines the structure of check instances that are stored in
 * kingdom actor flags and synced across all clients.
 */

import type { ResolutionState } from './Modifiers';

/**
 * Active check instance with resolution state
 */
export interface ActiveCheckInstance {
  /** Unique identifier for this instance */
  instanceId: string;
  
  /** Type of check (e.g., 'action', 'event', 'incident') */
  checkType: string;
  
  /** Action/event/incident ID */
  checkId: string;
  
  /** Resolution state for interactive components */
  resolutionState?: ResolutionState;
  
  /** Timestamp when instance was created */
  createdAt?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}
