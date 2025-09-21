// Auto-converted and fixed from KingdomManager.kt
// Simple kingdom management logic

import { Kingdom, Resources, Settlement, Modifier } from './KingdomCore';

/**
 * Simple kingdom management logic
 */
export class KingdomManager {
    private kingdom: Kingdom;
    
    constructor(initialKingdom?: Kingdom) {
        this.kingdom = initialKingdom || this.createDefaultKingdom();
    }
    
    private createDefaultKingdom(): Kingdom {
        return {
            id: 'default',
            name: 'New Kingdom',
            level: 1,
            xp: 0,
            currentTurn: 1,
            gold: 0,
            unrest: 0,
            fame: 0,
            resources: {
                food: 0,
                lumber: 0,
                ore: 0,
                stone: 0
            },
            settlements: [],
            activeEvents: [],
            modifiers: []
        };
    }
    
    // Basic kingdom operations
    getKingdom(): Kingdom {
        return this.kingdom;
    }
    
    setKingdomName(name: string): void {
        this.kingdom.name = name;
    }
    
    addSettlement(name: string): Settlement {
        const settlement: Settlement = {
            id: `settlement_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            name: name,
            level: 1,
            structures: []
        };
        this.kingdom.settlements.push(settlement);
        return settlement;
    }
    
    addStructureToSettlement(settlementId: string, structureId: string): void {
        const settlement = this.kingdom.settlements.find(s => s.id === settlementId);
        if (settlement) {
            settlement.structures.push(structureId);
        }
    }
    
    // Resource management
    modifyResources(
        food: number = 0,
        lumber: number = 0,
        ore: number = 0,
        stone: number = 0
    ): void {
        this.kingdom.resources.food = Math.max(0, this.kingdom.resources.food + food);
        this.kingdom.resources.lumber = Math.max(0, this.kingdom.resources.lumber + lumber);
        this.kingdom.resources.ore = Math.max(0, this.kingdom.resources.ore + ore);
        this.kingdom.resources.stone = Math.max(0, this.kingdom.resources.stone + stone);
    }
    
    // Kingdom status management
    modifyGold(amount: number): void {
        this.kingdom.gold = Math.max(0, this.kingdom.gold + amount);
    }
    
    modifyUnrest(amount: number): void {
        this.kingdom.unrest = Math.max(0, this.kingdom.unrest + amount);
    }
    
    modifyFame(amount: number): void {
        this.kingdom.fame = Math.max(0, this.kingdom.fame + amount);
    }
    
    // Turn management
    advanceTurn(): void {
        this.kingdom.currentTurn++;
        // TODO: Process turn events, resource generation, etc.
    }
    
    // Activity execution (simplified)
    executeActivity(actionId: string): string {
        // For now, just return a message
        // TODO: Implement actual activity logic based on the JSON data
        return `Executed activity: ${actionId}`;
    }
    
    // Event handling (simplified)
    addEvent(eventId: string): void {
        this.kingdom.activeEvents.push(eventId);
    }
    
    resolveEvent(eventId: string): void {
        this.kingdom.activeEvents = this.kingdom.activeEvents.filter(id => id !== eventId);
    }
    
    // XP and level management
    addXP(amount: number): void {
        this.kingdom.xp += amount;
        
        // Simple level calculation (every 1000 XP = 1 level)
        while (this.kingdom.xp >= this.kingdom.level * 1000) {
            this.kingdom.level++;
        }
    }
    
    // Modifier management
    addModifier(modifier: Modifier): void {
        this.kingdom.modifiers.push(modifier);
    }
    
    removeModifier(source: string): void {
        this.kingdom.modifiers = this.kingdom.modifiers.filter(m => m.source !== source);
    }
    
    // Utility methods
    getSettlementById(settlementId: string): Settlement | undefined {
        return this.kingdom.settlements.find(s => s.id === settlementId);
    }
    
    getTotalSettlementLevels(): number {
        return this.kingdom.settlements.reduce((total, s) => total + s.level, 0);
    }
    
    hasEnoughResources(food: number = 0, lumber: number = 0, ore: number = 0, stone: number = 0): boolean {
        return this.kingdom.resources.food >= food &&
               this.kingdom.resources.lumber >= lumber &&
               this.kingdom.resources.ore >= ore &&
               this.kingdom.resources.stone >= stone;
    }
}
