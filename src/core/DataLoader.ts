// Data loader with mock data matching the actual JSON schema
// This creates test data that matches the real JSON structure.
// In a full implementation, this would load actual JSON files.

// Define the raw data types
export interface RawStructure {
    id: string;
    name: string;
    type: string;
    category: string;
    tier: number;
    effect: string;
    construction: {
        resources: {
            lumber?: number;
            stone?: number;
            food?: number;
            ore?: number;
        };
    };
    traits: string[];
    special: string | null;
    upgradeFrom: string | null;
}

export interface RawPlayerAction {
    id: string;
    name: string;
    category: string;
    description: string;
    skills: Array<{
        skill: string;
        description: string;
    }>;
    effects: {
        success: {
            description: string;
            modifiers: Record<string, any>;
        };
        failure: {
            description: string;
            modifiers: Record<string, any>;
        };
    };
}

export interface RawEvent {
    id: string;
    name: string;
    description: string;
    traits: string[];
    location: string;
    modifier: number;
    resolution: string;
    resolvedOn: string[];
    stages: Array<{
        skills: string[];
        success: {
            msg: string;
            modifiers: any[];
        };
        failure: {
            msg: string;
            modifiers: Array<{
                type: string;
                name: string;
                value: number;
                selector: string;
                enabled: boolean;
                turns: number;
            }>;
        };
    }>;
    special: string | null;
}

/**
 * Data loader with mock data matching the actual JSON schema
 */
export const DataLoader = {
    
    // Mock data matching the actual JSON schema
    getTestStructure(): RawStructure {
        return {
            id: "bazaar",
            name: "Bazaar",
            type: "support",
            category: "commerce",
            tier: 2,
            effect: "Enables purchasing items",
            construction: {
                resources: {
                    lumber: 2,
                    stone: 2
                }
            },
            traits: ["building", "support-structure"],
            special: null,
            upgradeFrom: "market-square"
        };
    },
    
    getTestAction(): RawPlayerAction {
        return {
            id: "build-roads",
            name: "Build Roads",
            category: "expand-borders",
            description: "Construct pathways between settlements",
            skills: [
                {
                    skill: "crafting",
                    description: "engineering expertise"
                }
            ],
            effects: {
                success: {
                    description: "Build roads",
                    modifiers: { roadsBuilt: 1 }
                },
                failure: {
                    description: "No effect",
                    modifiers: {}
                }
            }
        };
    },
    
    getTestEvent(): RawEvent {
        return {
            id: "bandit-activity",
            name: "Bandit Activity",
            description: "Bandits are causing trouble",
            traits: ["dangerous", "continuous"],
            location: "The borderlands",
            modifier: 0,
            resolution: "Deal with the bandits",
            resolvedOn: ["criticalSuccess", "success"],
            stages: [{
                skills: ["intimidation", "diplomacy"],
                success: {
                    msg: "Bandits driven off",
                    modifiers: []
                },
                failure: {
                    msg: "Bandits remain",
                    modifiers: [{
                        type: "untyped",
                        name: "Bandit trouble",
                        value: -1,
                        selector: "resources",
                        enabled: true,
                        turns: 1
                    }]
                }
            }],
            special: null
        };
    },
    
    // Stub methods for future implementation
    getAllStructures(): RawStructure[] {
        return [this.getTestStructure()];
    },
    
    getAllPlayerActions(): RawPlayerAction[] {
        return [this.getTestAction()];
    },
    
    getAllEvents(): RawEvent[] {
        return [this.getTestEvent()];
    }
};
