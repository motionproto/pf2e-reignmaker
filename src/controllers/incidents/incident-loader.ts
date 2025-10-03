import type { KingdomIncident, EventSkill, EventOutcome } from './incident-types';
import incidentsData from '../../../dist/incidents.json';

/**
 * Raw incident data structure from JSON (before type conversion)
 */
interface RawIncidentData {
    id: string;
    name: string;
    tier: string;  // "MINOR" | "MODERATE" | "MAJOR" from JSON
    description: string;
    skills: EventSkill[];
    effects: {
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
            console.log('Incidents already loaded, skipping...');
            return;
        }

        console.log('Loading incidents from imported data...');
        
        try {
            // Load incidents from the imported JSON data
            const rawIncidentsList = incidentsData as RawIncidentData[];
            
            // Convert raw data to typed incidents
            const incidentsList: KingdomIncident[] = rawIncidentsList.map(raw => ({
                id: raw.id,
                name: raw.name,
                description: raw.description,
                tier: parseInt(raw.tier) || 1,
                traits: [],
                skills: raw.skills,
                effects: {
                    criticalSuccess: raw.effects.criticalSuccess ? {
                        msg: raw.effects.criticalSuccess.msg,
                        endsEvent: true,
                        modifiers: raw.effects.criticalSuccess.modifiers || []
                    } : undefined,
                    success: raw.effects.success ? {
                        msg: raw.effects.success.msg,
                        endsEvent: true,
                        modifiers: raw.effects.success.modifiers || []
                    } : undefined,
                    failure: raw.effects.failure ? {
                        msg: raw.effects.failure.msg,
                        endsEvent: true,
                        modifiers: raw.effects.failure.modifiers || []
                    } : undefined,
                    criticalFailure: raw.effects.criticalFailure ? {
                        msg: raw.effects.criticalFailure.msg,
                        endsEvent: true,
                        modifiers: raw.effects.criticalFailure.modifiers || []
                    } : undefined,
                },
                severity: raw.tier as 'MINOR' | 'MODERATE' | 'MAJOR'
            }));
            
            // Add all incidents to the map
            for (const incident of incidentsList) {
                this.incidents.set(incident.id, incident);
            }
            
            this.incidentsLoaded = true;
            console.log(`Successfully loaded ${this.incidents.size} incidents`);
            
            // Log incident counts by severity for verification
            const severityCounts = this.getIncidentCountsBySeverity();
            console.log('Incidents loaded by severity:', severityCounts);
        } catch (error) {
            console.error('Failed to load incidents:', error);
            // Fallback to empty map
            this.incidents = new Map();
        }
    }

    /**
     * Get a random incident for a specific severity level
     */
    getRandomIncident(severity: 'minor' | 'moderate' | 'major'): KingdomIncident | null {
        if (!this.incidentsLoaded) {
            console.error('Incidents not loaded yet - call loadIncidents() first');
            return null;
        }

        const incidentsBySeverity = this.getIncidentsBySeverity(severity);
        console.log(`Getting random ${severity} incident from ${incidentsBySeverity.length} available incidents`);
        
        if (incidentsBySeverity.length === 0) {
            console.error(`No ${severity} incidents available`);
            return null;
        }

        const randomIndex = Math.floor(Math.random() * incidentsBySeverity.length);
        const selectedIncident = incidentsBySeverity[randomIndex];
        console.log(`Selected incident: ${selectedIncident.name} (${selectedIncident.id})`);
        
        return selectedIncident;
    }

    /**
     * Get a specific incident by ID
     */
    getIncidentById(incidentId: string): KingdomIncident | null {
        return this.incidents.get(incidentId) || null;
    }

    /**
     * Get all incidents for a specific severity level
     */
    getIncidentsBySeverity(severity: 'minor' | 'moderate' | 'major'): KingdomIncident[] {
        const upperSeverity = severity.toUpperCase() as 'MINOR' | 'MODERATE' | 'MAJOR';
        return Array.from(this.incidents.values()).filter(
            incident => incident.severity === upperSeverity
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
        const effects = incident.effects;
        if (!effects) {
            console.warn(`Incident ${incident.id} has no effects`);
            return null;
        }

        return effects[result] || null;
    }

    /**
     * Apply incident outcome effects
     */
    applyIncidentOutcome(
        incident: KingdomIncident, 
        result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): Record<string, number> {
        const effects = incident.effects;
        if (!effects || !effects[result]) {
            return {};
        }

        const outcome = effects[result];
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
     * Get incident counts by severity (for debugging)
     */
    getIncidentCountsBySeverity(): Record<string, number> {
        const counts: Record<string, number> = { MINOR: 0, MODERATE: 0, MAJOR: 0 };
        
        for (const incident of this.incidents.values()) {
            if (incident.severity) {
                counts[incident.severity] = (counts[incident.severity] || 0) + 1;
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
