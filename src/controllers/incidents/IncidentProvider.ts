/**
 * IncidentProvider - Provides incident data for the Unrest phase
 * 
 * Simple data provider that handles incident selection and retrieval.
 * No game logic - just data access.
 */

import { incidentService, type IncidentService } from '../../services/domain/incidents/IncidentService';
import type { KingdomIncident } from './types';

export type IncidentSeverity = 'minor' | 'moderate' | 'major';

export class IncidentProvider {
    /**
     * Get a random incident for a specific severity level
     * Ensures proper random selection with logging for debugging
     */
    static async getRandomIncident(severity: IncidentSeverity): Promise<KingdomIncident | null> {
        // Ensure incidents are loaded
        await incidentService.loadIncidents();
        
        console.log(`[IncidentProvider] Getting random ${severity} incident`);
        
        return incidentService.getRandomIncident(severity);
    }
    
    /**
     * Get all incidents for a specific severity level
     */
    static async getIncidentsBySeverity(severity: IncidentSeverity): Promise<KingdomIncident[]> {
        await incidentService.loadIncidents();
        return incidentService.getIncidentsBySeverity(severity);
    }
    
    /**
     * Get all available incidents (for debugging)
     */
    static async getAllIncidents(): Promise<KingdomIncident[]> {
        await incidentService.loadIncidents();
        return incidentService.exportIncidents();
    }
    
    /**
     * Get incident counts by severity (for debugging)
     */
    static async getIncidentCounts(): Promise<Record<string, number>> {
        await incidentService.loadIncidents();
        return incidentService.getIncidentCountsBySeverity();
    }
}

/**
 * Get a random incident by severity
 */
export function getRandomIncidentBySeverity(severity: IncidentSeverity): KingdomIncident | null {
  return incidentService.getRandomIncident(severity);
}

/**
 * Get incident by ID
 */
export function getIncidentById(incidentId: string): KingdomIncident | null {
  return incidentService.getIncidentById(incidentId);
}
