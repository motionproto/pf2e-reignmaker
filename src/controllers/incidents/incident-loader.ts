import type { KingdomIncident, EventSkill, EventOutcome } from '../../types/incidents';
import incidentsData from '../../data-compiled/incidents.json';
import { logger } from '../../utils/Logger';

/**
 * Raw incident data structure from JSON (before type conversion)
 */
interface RawIncidentData {
    id: string;
    name: string;
    tier: string;  // "MINOR" | "MODERATE" | "MAJOR" from JSON
    description: string;
    skills: EventSkill[];
    outcomes: {
        criticalSuccess?: {
            msg: string;
            modifiers: any[];
        };
        success?: {
            msg: string;
            modifiers: any[];
        };
        failure?: {
            msg: string;
            modifiers: any[];
        };
        criticalFailure?: {
            msg: string;
            modifiers: any[];
        };
    };
}

/**
 * Service for loading kingdom incidents from JSON data
 * Pure data access - no business logic (Repository pattern)
 */
export class IncidentLoader {
    private incidents: Map<string, KingdomIncident> = new Map();
    private incidentsLoaded: boolean = false;

    /**
     * Load incidents from imported JSON data
     */
    loadIncidents(): void {
        if (this.incidentsLoaded) {

            return;
        }

        try {
            // Load incidents from the imported JSON data
            const rawIncidentsList = incidentsData as RawIncidentData[];
            
            // Convert raw data to typed incidents
            const incidentsList: KingdomIncident[] = rawIncidentsList.map(raw => ({
                id: raw.id,
                name: raw.name,
                description: raw.description,
                tier: raw.tier as 'minor' | 'moderate' | 'major', // Use tier from JSON (lowercase)
                skills: raw.skills,
                outcomes: {
                    criticalSuccess: raw.outcomes.criticalSuccess ? {
                        msg: raw.outcomes.criticalSuccess.msg,
                        endsEvent: true,
                        modifiers: raw.outcomes.criticalSuccess.modifiers || [],
                        manualEffects: (raw.outcomes.criticalSuccess as any).manualEffects || [],
                        gameCommands: (raw.outcomes.criticalSuccess as any).gameCommands || []
                    } : undefined,
                    success: raw.outcomes.success ? {
                        msg: raw.outcomes.success.msg,
                        endsEvent: true,
                        modifiers: raw.outcomes.success.modifiers || [],
                        manualEffects: (raw.outcomes.success as any).manualEffects || [],
                        gameCommands: (raw.outcomes.success as any).gameCommands || []
                    } : undefined,
                    failure: raw.outcomes.failure ? {
                        msg: raw.outcomes.failure.msg,
                        endsEvent: true,
                        modifiers: raw.outcomes.failure.modifiers || [],
                        manualEffects: (raw.outcomes.failure as any).manualEffects || [],
                        gameCommands: (raw.outcomes.failure as any).gameCommands || []
                    } : undefined,
                    criticalFailure: raw.outcomes.criticalFailure ? {
                        msg: raw.outcomes.criticalFailure.msg,
                        endsEvent: true,
                        modifiers: raw.outcomes.criticalFailure.modifiers || [],
                        manualEffects: (raw.outcomes.criticalFailure as any).manualEffects || [],
                        gameCommands: (raw.outcomes.criticalFailure as any).gameCommands || []
                    } : undefined,
                }
            }));
            
            // Add all incidents to the map
            for (const incident of incidentsList) {
                this.incidents.set(incident.id, incident);
            }
            
            this.incidentsLoaded = true;

            // Log incident counts by severity for verification
            const severityCounts = this.getIncidentCountsBySeverity();

        } catch (error) {
            logger.error('Failed to load incidents:', error);
            // Fallback to empty map
            this.incidents = new Map();
        }
    }

    /**
     * Get a random incident for a specific severity level
     */
    getRandomIncident(severity: 'minor' | 'moderate' | 'major'): KingdomIncident | null {
        if (!this.incidentsLoaded) {
            logger.error('Incidents not loaded yet - call loadIncidents() first');
            return null;
        }

        const incidentsBySeverity = this.getIncidentsBySeverity(severity);

        if (incidentsBySeverity.length === 0) {
            logger.error(`No ${severity} incidents available`);
            return null;
        }

        const randomIndex = Math.floor(Math.random() * incidentsBySeverity.length);
        const selectedIncident = incidentsBySeverity[randomIndex];

        return selectedIncident;
    }

    /**
     * Get a specific incident by ID
     */
    getIncidentById(incidentId: string): KingdomIncident | null {
        return this.incidents.get(incidentId) || null;
    }

    /**
     * Get all incidents for a specific tier level
     */
    getIncidentsBySeverity(tier: 'minor' | 'moderate' | 'major'): KingdomIncident[] {
        return Array.from(this.incidents.values()).filter(
            incident => incident.tier === tier
        );
    }

    /**
     * Get skills for an incident
     */
    getIncidentSkills(incident: KingdomIncident): EventSkill[] {
        return incident.skills || [];
    }

    /**
     * Get outcome for a specific result
     */
    getIncidentOutcome(
        incident: KingdomIncident, 
        result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): EventOutcome | null {
        const outcomes = incident.outcomes;
        if (!outcomes) {
            logger.warn(`Incident ${incident.id} has no outcomes`);
            return null;
        }

        return outcomes[result] || null;
    }

    /**
     * Apply incident outcome effects
     */
    applyIncidentOutcome(
        incident: KingdomIncident, 
        result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): Record<string, number> {
        const outcomes = incident.outcomes;
        if (!outcomes || !outcomes[result]) {
            return {};
        }

        const outcome = outcomes[result];
        const appliedEffects: Record<string, number> = {};

        // Process modifiers
        if (outcome.modifiers && Array.isArray(outcome.modifiers)) {
            for (const modifier of outcome.modifiers) {
                if (modifier.resource) {
                    appliedEffects[modifier.resource] = (appliedEffects[modifier.resource] || 0) + modifier.value;
                }
            }
        }

        return appliedEffects;
    }

    /**
     * Get incident counts by tier (for debugging)
     */
    getIncidentCountsBySeverity(): Record<string, number> {
        const counts: Record<string, number> = { minor: 0, moderate: 0, major: 0 };
        
        for (const incident of this.incidents.values()) {
            if (incident.tier) {
                counts[incident.tier] = (counts[incident.tier] || 0) + 1;
            }
        }
        
        return counts;
    }

    /**
     * Check if an incident can be resolved with a given skill
     */
    canResolveWithSkill(incident: KingdomIncident, skill: string): boolean {
        if (!incident.skills) {
            return false;
        }

        return incident.skills.some((s: EventSkill) => s.skill === skill);
    }

    /**
     * Export incidents for debugging
     */
    exportIncidents(): KingdomIncident[] {
        return Array.from(this.incidents.values());
    }

    /**
     * Get all available incidents
     */
    getAllIncidents(): KingdomIncident[] {
        return Array.from(this.incidents.values());
    }
}

// Export singleton instance
export const incidentLoader = new IncidentLoader();

// Initialize incidents on module load
if (typeof window !== 'undefined') {
    incidentLoader.loadIncidents();
}
