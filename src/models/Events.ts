// Data model for Kingdom Events based on Reignmaker Lite rules
// Auto-converted and fixed from Events.kt

/**
 * Represents the outcome of an event resolution
 */
export interface EventOutcome {
    message: string;
    goldChange?: number;
    unrestChange?: number;
    fameChange?: number;
    resourceChanges?: Map<string, number>;
}

/**
 * Represents a Kingdom Event
 */
export interface KingdomEvent {
    id: string;
    name: string;
    description: string;
    traits: string[];
    skills: string[];
    imagePath?: string;
    special?: string | null;
    criticalSuccess?: EventOutcome;
    success?: EventOutcome;
    failure?: EventOutcome;
    criticalFailure?: EventOutcome;
    isContinuous?: boolean;
}

/**
 * Manages kingdom events
 */
export class EventManager {
    private events: KingdomEvent[] = [];
    private eventDC: number = 16;
    
    constructor() {
        this.loadEvents();
    }
    
    /**
     * Load all events from data
     */
    private loadEvents(): void {
        // Load all 40 events from the Kingdom Events document
        this.events = [
            this.createArchaeologicalFind(),
            this.createAssassinationAttempt(),
            this.createBanditActivity(),
            this.createBoomtown(),
            this.createCultActivity(),
            this.createDemandExpansion(),
            this.createDemandStructure(),
            this.createDiplomaticOverture(),
            this.createDrugDen(),
            this.createEconomicSurge(),
            this.createFestiveInvitation(),
            this.createFeud(),
            this.createFoodShortage(),
            this.createFoodSurplus(),
            this.createGoodWeather(),
            this.createGrandTournament(),
            this.createImmigration(),
            this.createInquisition(),
            this.createJusticePrevails(),
            this.createLandRush(),
            this.createLocalDisaster(),
            this.createMagicalDiscovery(),
            this.createMilitaryExercises(),
            this.createMonsterAttack(),
            this.createNaturalDisaster(),
            this.createNatureBlessing(),
            this.createNotoriousHeist(),
            this.createPilgrimage(),
            this.createPlague(),
            this.createPublicScandal(),
            this.createRaiders(),
            this.createRemarkableTreasure(),
            this.createScholarlyDiscovery(),
            this.createSensationalCrime(),
            this.createTradeAgreement(),
            this.createUndeadUprising(),
            this.createVisitingCelebrity()
        ];
    }
    
    /**
     * Check for a kingdom event (Phase IV)
     */
    checkForEvent(): boolean {
        const roll = Math.floor(Math.random() * 20) + 1;
        const success = roll >= this.eventDC;
        
        if (!success) {
            // Decrease DC for next turn, minimum 6
            this.eventDC = Math.max(6, this.eventDC - 5);
            console.log(`Event check failed (rolled ${roll} vs DC ${this.eventDC}). DC reduced to ${this.eventDC} for next turn.`);
        } else {
            // Reset DC after successful event
            this.eventDC = 16;
            console.log(`Event triggered! (rolled ${roll} vs DC ${this.eventDC})`);
        }
        
        return success;
    }
    
    /**
     * Get a random event
     */
    getRandomEvent(): KingdomEvent | null {
        if (this.events.length > 0) {
            return this.events[Math.floor(Math.random() * this.events.length)];
        }
        return null;
    }
    
    /**
     * Resolve an event with a skill check
     */
    resolveEvent(
        event: KingdomEvent, 
        skill: string, 
        checkResult: number,
        dc: number
    ): EventOutcome {
        if (checkResult >= dc + 10) {
            return event.criticalSuccess || { message: "Critical success!" };
        } else if (checkResult >= dc) {
            return event.success || { message: "Success!" };
        } else if (checkResult <= dc - 10) {
            return event.criticalFailure || { message: "Critical failure!" };
        } else {
            return event.failure || { message: "Failure." };
        }
    }
    
    // Sample event creators
    private createArchaeologicalFind(): KingdomEvent {
        return {
            id: "archaeological-find",
            name: "Archaeological Find",
            description: "Ancient ruins or artifacts are discovered in your territory.",
            traits: ["beneficial"],
            skills: ["Society", "Religion", "Occultism"],
            criticalSuccess: {
                message: "Major discovery! The find brings wealth and reduces unrest.",
                goldChange: 2,
                unrestChange: -1,
                fameChange: 1
            } as EventOutcome,
            success: {
                message: "Valuable artifacts found.",
                goldChange: 1
            } as EventOutcome,
            failure: {
                message: "Minor artifacts provide some resources.",
                resourceChanges: new Map([["food", 1]])
            } as EventOutcome,
            criticalFailure: {
                message: "The site proves dangerous.",
                unrestChange: 1
            } as EventOutcome,
            special: "Knowledge & Magic structures provide bonus equal to tier"
        };
    }
    
    private createAssassinationAttempt(): KingdomEvent {
        return {
            id: "assassination-attempt",
            name: "Assassination Attempt",
            description: "Someone attempts to kill one of your leaders!",
            traits: ["dangerous"],
            skills: ["Stealth", "Intimidation", "Medicine"],
            criticalSuccess: {
                message: "Assassin captured! You gain valuable information about your enemies."
            } as EventOutcome,
            success: {
                message: "Attempt foiled successfully."
            } as EventOutcome,
            failure: {
                message: "Leader escapes but the kingdom is shaken.",
                unrestChange: 1
            } as EventOutcome,
            criticalFailure: {
                message: "Leader wounded! They cannot act this turn.",
                unrestChange: 2
            } as EventOutcome
        };
    }
    
    private createBanditActivity(): KingdomEvent {
        return {
            id: "bandit-activity",
            name: "Bandit Activity",
            description: "Bandits establish a camp and begin raiding travelers.",
            traits: ["dangerous", "continuous"],
            skills: ["Intimidation", "Diplomacy", "Stealth"],
            isContinuous: true,
            criticalSuccess: {
                message: "Bandits defeated or recruited! You seize their loot.",
                goldChange: 1
            } as EventOutcome,
            success: {
                message: "Bandits scattered successfully."
            } as EventOutcome,
            failure: {
                message: "Raids continue, disrupting trade.",
                resourceChanges: new Map([["food", -1], ["lumber", -1]]),
                unrestChange: 1
            } as EventOutcome,
            criticalFailure: {
                message: "Bandits grow bolder!",
                resourceChanges: new Map([["food", -2], ["lumber", -2]]),
                unrestChange: 2
            } as EventOutcome
        };
    }
    
    private createBoomtown(): KingdomEvent {
        return {
            id: "boomtown",
            name: "Boomtown",
            description: "A settlement experiences sudden, dramatic growth!",
            traits: ["beneficial", "continuous"],
            skills: ["Society", "Crafting", "Diplomacy"],
            isContinuous: true,
            criticalSuccess: {
                message: "Major growth brings prosperity!",
                goldChange: 4
            } as EventOutcome,
            success: {
                message: "Steady expansion continues.",
                goldChange: 2
            } as EventOutcome,
            failure: {
                message: "Growth stalls."
            } as EventOutcome,
            criticalFailure: {
                message: "Boom goes bust!",
                unrestChange: 1
            } as EventOutcome
        };
    }
    
    private createCultActivity(): KingdomEvent {
        return {
            id: "cult-activity",
            name: "Cult Activity",
            description: "A dangerous cult begins operating in secret within your kingdom.",
            traits: ["dangerous", "continuous"],
            skills: ["Stealth", "Religion", "Intimidation"],
            isContinuous: true,
            criticalSuccess: {
                message: "Cult exposed and defeated!",
                unrestChange: -1
            } as EventOutcome,
            success: {
                message: "Cult defeated."
            } as EventOutcome,
            failure: {
                message: "Cult continues to spread.",
                unrestChange: 1
            } as EventOutcome,
            criticalFailure: {
                message: "Cult grows stronger!",
                unrestChange: 2
            } as EventOutcome,
            special: "Faith & Nature structures provide bonus to defeat. Crime & Intrigue structures provide bonus to locate."
        };
    }
    
    // Add remaining event creators following the same pattern
    private createDemandExpansion(): KingdomEvent {
        return {
            id: "demand-expansion",
            name: "Demand Expansion",
            description: "Citizens demand the kingdom claim new territory.",
            traits: ["dangerous", "continuous"],
            skills: ["Diplomacy", "Survival", "Intimidation"],
            isContinuous: true,
            criticalSuccess: {
                message: "Citizens satisfied with expansion plans.",
                unrestChange: -1
            } as EventOutcome,
            success: {
                message: "Citizens satisfied."
            } as EventOutcome,
            failure: {
                message: "Citizens unhappy with lack of growth.",
                unrestChange: 1
            } as EventOutcome,
            criticalFailure: {
                message: "Major dissatisfaction!",
                unrestChange: 2
            } as EventOutcome,
            special: "Expanding territory this turn automatically succeeds and ends event"
        };
    }
    
    private createDemandStructure(): KingdomEvent {
        return {
            id: "demand-structure",
            name: "Demand Structure",
            description: "Citizens demand that a specific structure be built.",
            traits: ["dangerous", "continuous"],
            skills: ["Diplomacy", "Intimidation", "Society"],
            isContinuous: true,
            criticalSuccess: {
                message: "Citizens convinced to be patient.",
                unrestChange: -1
            } as EventOutcome,
            success: {
                message: "Demands are satisfied."
            } as EventOutcome,
            failure: {
                message: "Protests continue.",
                unrestChange: 1,
                goldChange: -1
            } as EventOutcome,
            criticalFailure: {
                message: "Violence erupts!",
                unrestChange: 2
            } as EventOutcome,
            special: "Building the demanded structure automatically ends the event"
        };
    }
    
    // Simplified versions of remaining events - would need full implementation
    private createDiplomaticOverture = () => this.createPlaceholderEvent("diplomatic-overture", "Diplomatic Overture");
    private createDrugDen = () => this.createPlaceholderEvent("drug-den", "Drug Den");
    private createEconomicSurge = () => this.createPlaceholderEvent("economic-surge", "Economic Surge");
    private createFestiveInvitation = () => this.createPlaceholderEvent("festive-invitation", "Festive Invitation");
    private createFeud = () => this.createPlaceholderEvent("feud", "Feud");
    private createFoodShortage = () => this.createPlaceholderEvent("food-shortage", "Food Shortage");
    private createFoodSurplus = () => this.createPlaceholderEvent("food-surplus", "Food Surplus");
    private createGoodWeather = () => this.createPlaceholderEvent("good-weather", "Good Weather");
    private createGrandTournament = () => this.createPlaceholderEvent("grand-tournament", "Grand Tournament");
    private createImmigration = () => this.createPlaceholderEvent("immigration", "Immigration");
    private createInquisition = () => this.createPlaceholderEvent("inquisition", "Inquisition");
    private createJusticePrevails = () => this.createPlaceholderEvent("justice-prevails", "Justice Prevails");
    private createLandRush = () => this.createPlaceholderEvent("land-rush", "Land Rush");
    private createLocalDisaster = () => this.createPlaceholderEvent("local-disaster", "Local Disaster");
    private createMagicalDiscovery = () => this.createPlaceholderEvent("magical-discovery", "Magical Discovery");
    private createMilitaryExercises = () => this.createPlaceholderEvent("military-exercises", "Military Exercises");
    private createMonsterAttack = () => this.createPlaceholderEvent("monster-attack", "Monster Attack");
    private createNaturalDisaster = () => this.createPlaceholderEvent("natural-disaster", "Natural Disaster");
    private createNatureBlessing = () => this.createPlaceholderEvent("natures-blessing", "Nature's Blessing");
    private createNotoriousHeist = () => this.createPlaceholderEvent("notorious-heist", "Notorious Heist");
    private createPilgrimage = () => this.createPlaceholderEvent("pilgrimage", "Pilgrimage");
    private createPlague = () => this.createPlaceholderEvent("plague", "Plague");
    private createPublicScandal = () => this.createPlaceholderEvent("public-scandal", "Public Scandal");
    private createRaiders = () => this.createPlaceholderEvent("raiders", "Raiders");
    private createRemarkableTreasure = () => this.createPlaceholderEvent("remarkable-treasure", "Remarkable Treasure");
    private createScholarlyDiscovery = () => this.createPlaceholderEvent("scholarly-discovery", "Scholarly Discovery");
    private createSensationalCrime = () => this.createPlaceholderEvent("sensational-crime", "Sensational Crime");
    private createTradeAgreement = () => this.createPlaceholderEvent("trade-agreement", "Trade Agreement");
    private createUndeadUprising = () => this.createPlaceholderEvent("undead-uprising", "Undead Uprising");
    private createVisitingCelebrity = () => this.createPlaceholderEvent("visiting-celebrity", "Visiting Celebrity");
    
    private createPlaceholderEvent(id: string, name: string): KingdomEvent {
        return {
            id,
            name,
            description: `${name} event`,
            traits: ["placeholder"],
            skills: ["Diplomacy"],
            criticalSuccess: { message: "Critical success!" },
            success: { message: "Success!" },
            failure: { message: "Failure." },
            criticalFailure: { message: "Critical failure!" }
        };
    }
}
