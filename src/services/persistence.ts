/**
 * Data Persistence Service for PF2e Reignmaker
 * Handles saving and loading kingdom state data using actor flags
 * and synchronizing between different player clients
 */

import { get } from 'svelte/store';
import { kingdomState, loadKingdomState, getCurrentKingdomState } from '../stores/kingdom';
import { gameState, getGameStateForSave, loadGameState } from '../stores/gameState';
import type { KingdomState } from '../models/KingdomState';
import { Hex, Worksite } from '../models/Hex';

// Declare Foundry globals
declare const game: any;
declare const Hooks: any;
declare const CONFIG: any;

interface SavedKingdomData {
    version: number;
    timestamp: number;
    kingdomState: Partial<KingdomState>;
    gameState: any;
    metadata?: {
        worldId?: string;
        lastSavedBy?: string;
        turnNumber?: number;
        phaseName?: string;
    };
}

export class PersistenceService {
    private static instance: PersistenceService;
    
    // Constants
    private readonly MODULE_ID = 'pf2e-reignmaker';
    private readonly KINGDOM_DATA_KEY = 'kingdom-data';
    private readonly PARTY_ACTOR_ID = 'xxxPF2ExPARTYxxx';
    private readonly SAVE_VERSION = 1;
    
    // Flags
    private isInitialized = false;
    private isSaving = false;
    private saveDebounceTimer: number | null = null;
    private debugLogging = false; // Set to true for troubleshooting
    
    private constructor() {}
    
    static getInstance(): PersistenceService {
        if (!PersistenceService.instance) {
            PersistenceService.instance = new PersistenceService();
        }
        return PersistenceService.instance;
    }
    
    /**
     * Initialize the persistence service
     * Should be called once during module setup
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        // Check if we're in Foundry environment
        if (typeof game === 'undefined' || !game?.actors) {
            console.warn('[PersistenceService] Not in Foundry environment, using localStorage fallback');
            return;
        }
        
        try {
            // Ensure party actor exists
            await this.ensurePartyActor();
            
            // Load saved data
            await this.loadData();
            
            // Set up save-on-change listeners
            this.setupSaveOnChange();
            
            // Set up hooks for synchronization
            this.setupSyncHooks();
            
            this.isInitialized = true;
            if (this.debugLogging) {
                console.log('[PersistenceService] Initialized successfully with actor flag storage');
            }
        } catch (error) {
            console.error('[PersistenceService] Failed to initialize:', error);
        }
    }
    
    /**
     * Ensure the party actor exists for storing kingdom data
     */
    private async ensurePartyActor(): Promise<any> {
        let partyActor = game.actors?.get(this.PARTY_ACTOR_ID);
        
        if (!partyActor) {
            // Look for any party actor
            partyActor = game.actors?.find((a: any) => a.type === 'party');
            
            if (!partyActor) {
                // Only warn once, don't spam console
                if (this.debugLogging) {
                    console.warn('[PersistenceService] No party actor found in world');
                }
                throw new Error('No party actor found. Please create a party actor first.');
            }
        }
        
        return partyActor;
    }
    
    
    /**
     * Save current kingdom state to persistent storage using actor flags
     */
    async saveData(showNotification = true): Promise<void> {
        if (!this.isFoundryReady()) {
            return this.saveToLocalStorage();
        }
        
        try {
            this.isSaving = true;
            
            // Get party actor
            const partyActor = await this.ensurePartyActor();
            if (!partyActor) {
                throw new Error('No party actor available for saving kingdom data');
            }
            
            // Get current state from stores
            const kingdomStateData = getCurrentKingdomState();
            const gameStateData = getGameStateForSave();
            
            // Prepare save data
            const saveData: SavedKingdomData = {
                version: this.SAVE_VERSION,
                timestamp: Date.now(),
                kingdomState: this.serializeKingdomState(kingdomStateData),
                gameState: gameStateData,
                metadata: {
                    worldId: game.world?.id,
                    lastSavedBy: game.user?.name,
                    turnNumber: gameStateData.currentTurn,
                    phaseName: gameStateData.currentPhase
                }
            };
            
            // Save to actor flag
            await partyActor.setFlag(this.MODULE_ID, this.KINGDOM_DATA_KEY, saveData);
            
            // No longer show save notifications
            
            if (this.debugLogging) {
                console.log('[PersistenceService] Data saved to actor flag', saveData.metadata);
            }
        } catch (error) {
            console.error('[PersistenceService] Failed to save data:', error);
            (window as any).ui?.notifications?.error('Failed to save kingdom state: ' + error);
        } finally {
            this.isSaving = false;
        }
    }
    
    /**
     * Load kingdom state from persistent storage
     */
    async loadData(): Promise<void> {
        if (!this.isFoundryReady()) {
            return this.loadFromLocalStorage();
        }
        
        try {
            // Get party actor
            const partyActor = await this.ensurePartyActor();
            if (!partyActor) {
                console.log('[PersistenceService] No party actor available for loading kingdom data');
                return;
            }
            
            // Load from actor flag
            const savedData = partyActor.getFlag(this.MODULE_ID, this.KINGDOM_DATA_KEY) as SavedKingdomData;
            
            if (!savedData || Object.keys(savedData).length === 0) {
                if (this.debugLogging) {
                    console.log('[PersistenceService] No saved data found on party actor');
                }
                return;
            }
            
            // Check version compatibility
            if (savedData.version !== this.SAVE_VERSION) {
                console.warn('[PersistenceService] Save version mismatch, attempting migration');
                // Future: Add migration logic here
            }
            
            // Load kingdom state
            if (savedData.kingdomState) {
                const deserializedState = this.deserializeKingdomState(savedData.kingdomState);
                loadKingdomState(deserializedState);
            }
            
            // Load game state
            if (savedData.gameState) {
                loadGameState(savedData.gameState);
            }
            
            console.log('[PersistenceService] Data loaded successfully from actor flag', savedData.metadata);
            
            // No longer show load notifications
            if (this.debugLogging) {
                const lastSaved = new Date(savedData.timestamp).toLocaleString();
                console.log(`[PersistenceService] Kingdom state loaded (last saved: ${lastSaved})`);
            }
        } catch (error: any) {
            console.error('[PersistenceService] Failed to load data:', error);
            // Don't show error notification if just no data exists
            if (error?.message !== 'No party actor found. Please create a party actor first.') {
                (window as any).ui?.notifications?.error('Failed to load kingdom state');
            }
        }
    }
    
    /**
     * Export kingdom data to JSON
     */
    async exportData(): Promise<string> {
        const kingdomStateData = getCurrentKingdomState();
        const gameStateData = getGameStateForSave();
        
        const exportData: SavedKingdomData = {
            version: this.SAVE_VERSION,
            timestamp: Date.now(),
            kingdomState: this.serializeKingdomState(kingdomStateData),
            gameState: gameStateData,
            metadata: {
                worldId: game?.world?.id,
                lastSavedBy: game?.user?.name,
                turnNumber: gameStateData.currentTurn,
                phaseName: gameStateData.currentPhase
            }
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * Import kingdom data from JSON
     */
    async importData(jsonString: string): Promise<void> {
        try {
            const importData = JSON.parse(jsonString) as SavedKingdomData;
            
            // Validate import data
            if (!importData.kingdomState || !importData.gameState) {
                throw new Error('Invalid import data format');
            }
            
            // Load the imported data
            const deserializedState = this.deserializeKingdomState(importData.kingdomState);
            loadKingdomState(deserializedState);
            loadGameState(importData.gameState);
            
            // Save to persistence
            await this.saveData(false);
            
            (window as any).ui?.notifications?.info('Kingdom data imported successfully');
        } catch (error) {
            console.error('[PersistenceService] Failed to import data:', error);
            (window as any).ui?.notifications?.error('Failed to import kingdom data: ' + error);
        }
    }
    
    /**
     * Reset kingdom to initial state
     */
    async resetKingdom(): Promise<void> {
        if (!confirm('Are you sure you want to reset the kingdom? This will clear all progress.')) {
            return;
        }
        
        try {
            // Clear saved data
            if (this.isFoundryReady()) {
                const partyActor = await this.ensurePartyActor();
                if (partyActor) {
                    await partyActor.unsetFlag(this.MODULE_ID, this.KINGDOM_DATA_KEY);
                    console.log('[PersistenceService] Kingdom data cleared from party actor');
                }
            } else {
                localStorage.removeItem(`${this.MODULE_ID}-${this.KINGDOM_DATA_KEY}`);
            }
            
            // Reload the page to reset stores
            window.location.reload();
        } catch (error) {
            console.error('[PersistenceService] Failed to reset kingdom:', error);
        }
    }
    
    /**
     * Handle updates from other clients
     */
    private handleRemoteUpdate(data: SavedKingdomData): void {
        if (!data || Object.keys(data).length === 0) return;
        
        console.log('[PersistenceService] Received remote update', data.metadata);
        
        // Load the updated data
        if (data.kingdomState) {
            const deserializedState = this.deserializeKingdomState(data.kingdomState);
            loadKingdomState(deserializedState);
        }
        
        if (data.gameState) {
            loadGameState(data.gameState);
        }
        
        // No longer notify of remote updates - just log for debugging if needed
        if (this.debugLogging && data.metadata?.lastSavedBy && data.metadata.lastSavedBy !== game?.user?.name) {
            console.log(`[PersistenceService] Kingdom updated by ${data.metadata.lastSavedBy}`);
        }
    }
    
    /**
     * Set up hooks for synchronization between clients
     */
    private setupSyncHooks(): void {
        if (typeof Hooks === 'undefined') return;
        
        // Listen for actor updates for real-time sync
        Hooks.on('updateActor', (actor: any, changes: any, options: any, userId: string) => {
            // Check if this is our party actor and the update contains kingdom data
            if ((actor.id === this.PARTY_ACTOR_ID || actor.type === 'party') && 
                changes.flags?.[this.MODULE_ID]?.[this.KINGDOM_DATA_KEY] && 
                !this.isSaving &&
                userId !== game.user?.id) {
                
                console.log('[PersistenceService] Party actor updated remotely by', userId);
                const savedData = actor.getFlag(this.MODULE_ID, this.KINGDOM_DATA_KEY) as SavedKingdomData;
                if (savedData) {
                    this.handleRemoteUpdate(savedData);
                }
            }
        });
        
        // Hook into turn advancement
        Hooks.on('pf2e-reignmaker.turnAdvanced', () => {
            this.saveData(false);
        });
        
        // Hook into phase changes
        Hooks.on('pf2e-reignmaker.phaseChanged', () => {
            this.saveData(false);
        });
    }
    
    /**
     * Set up save-on-change listeners for the stores
     * Automatically saves when kingdom or game state changes
     */
    private setupSaveOnChange(): void {
        let lastKingdomState = JSON.stringify(this.serializeKingdomState(get(kingdomState)));
        let lastGameState = JSON.stringify(getGameStateForSave());
        
        // Subscribe to kingdom state changes
        kingdomState.subscribe((state) => {
            // Serialize and compare only meaningful data
            const serialized = this.serializeKingdomState(state);
            const currentState = JSON.stringify(serialized);
            
            if (currentState !== lastKingdomState) {
                lastKingdomState = currentState;
                this.debouncedSave();
            }
        });
        
        // Subscribe to game state changes
        gameState.subscribe(() => {
            // Only save meaningful game state changes, not UI state
            const currentState = JSON.stringify(getGameStateForSave());
            if (currentState !== lastGameState) {
                lastGameState = currentState;
                this.debouncedSave();
            }
        });
    }
    
    /**
     * Debounced save to prevent excessive saving
     * Waits 500ms after last change before saving
     */
    private debouncedSave(): void {
        // Skip if not initialized
        if (!this.isInitialized) return;
        
        // If already saving, queue another save after current one completes
        if (this.isSaving) {
            // Queue a save to happen after the current one
            setTimeout(() => this.debouncedSave(), 100);
            return;
        }
        
        // Clear existing timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        // Set new timer for save
        this.saveDebounceTimer = window.setTimeout(async () => {
            await this.saveData(false);
        }, 500);
    }
    
    /**
     * Force an immediate save (bypasses debouncing)
     * Useful for critical updates that need to be persisted immediately
     */
    async forceSave(): Promise<void> {
        // Cancel any pending debounced saves
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }
        
        // Save immediately
        await this.saveData(false);
    }
    
    /**
     * Check if Foundry is ready
     */
    private isFoundryReady(): boolean {
        return typeof game !== 'undefined' && 
               game?.settings?.get !== undefined &&
               game?.ready === true;
    }
    
    /**
     * Serialize kingdom state for storage
     * Converts Maps and complex objects to plain objects
     */
    private serializeKingdomState(state: KingdomState): any {
        const serialized: any = {
            unrest: state.unrest,
            imprisonedUnrest: state.imprisonedUnrest,
            fame: state.fame,
            size: state.size,
            isAtWar: state.isAtWar,
            currentEvent: state.currentEvent,
            continuousEvents: state.continuousEvents,
            modifiers: state.modifiers,
            
            // Convert Maps to objects
            resources: Object.fromEntries(state.resources),
            worksiteCount: Object.fromEntries(state.worksiteCount),
            cachedProduction: Object.fromEntries(state.cachedProduction),
            
            // Complex arrays
            hexes: state.hexes.map(hex => ({
                id: hex.id,
                terrain: hex.terrain,
                worksite: hex.worksite ? {
                    type: hex.worksite.type
                } : null,
                hasSpecialTrait: hex.hasSpecialTrait,
                name: hex.name
            })),
            
            // Explicitly serialize settlements for proper change detection
            settlements: state.settlements.map(settlement => ({
                ...settlement
            })),
            
            // Explicitly serialize armies
            armies: state.armies.map(army => ({
                ...army
            })),
            
            // Convert buildQueue Maps to objects for serialization
            buildQueue: state.buildQueue.map(project => ({
                ...project,
                totalCost: project.totalCost ? Object.fromEntries(project.totalCost) : {},
                remainingCost: project.remainingCost ? Object.fromEntries(project.remainingCost) : {},
                invested: project.invested ? Object.fromEntries(project.invested) : {},
                pendingAllocation: project.pendingAllocation ? Object.fromEntries(project.pendingAllocation) : {}
            })),
            
            // Handle cachedProductionByHex with nested Maps
            cachedProductionByHex: state.cachedProductionByHex ? state.cachedProductionByHex.map(([hex, production]) => ({
                hex: {
                    id: hex.id,
                    terrain: hex.terrain,
                    worksite: hex.worksite ? { type: hex.worksite.type } : null,
                    hasSpecialTrait: hex.hasSpecialTrait,
                    name: hex.name
                },
                production: Object.fromEntries(production)
            })) : []
        };
        
        return serialized;
    }
    
    /**
     * Deserialize kingdom state from storage
     * Converts plain objects back to Maps and complex objects
     */
    private deserializeKingdomState(data: any): Partial<KingdomState> {
        const deserialized: Partial<KingdomState> = {
            ...data,
            
            // Convert objects back to Maps
            resources: new Map(Object.entries(data.resources || {})),
            worksiteCount: new Map(Object.entries(data.worksiteCount || {})),
            cachedProduction: new Map(Object.entries(data.cachedProduction || {})),
            
            // Reconstruct Hex objects
            hexes: data.hexes ? data.hexes.map((hexData: any) => {
                const worksite = hexData.worksite ? 
                    new Worksite(hexData.worksite.type) : null;
                
                return new Hex(
                    hexData.id,
                    hexData.terrain,
                    worksite,
                    hexData.hasSpecialTrait,
                    hexData.name
                );
            }) : [],
            
            // Reconstruct buildQueue with Maps
            buildQueue: data.buildQueue ? data.buildQueue.map((project: any) => ({
                ...project,
                totalCost: new Map(Object.entries(project.totalCost || {})),
                remainingCost: new Map(Object.entries(project.remainingCost || {})),
                invested: new Map(Object.entries(project.invested || {})),
                pendingAllocation: new Map(Object.entries(project.pendingAllocation || {}))
            })) : [],
            
            // Reconstruct cachedProductionByHex with nested Maps
            cachedProductionByHex: data.cachedProductionByHex ? data.cachedProductionByHex.map((item: any) => {
                const worksite = item.hex.worksite ? 
                    new Worksite(item.hex.worksite.type) : null;
                
                const hex = new Hex(
                    item.hex.id,
                    item.hex.terrain,
                    worksite,
                    item.hex.hasSpecialTrait,
                    item.hex.name
                );
                
                const production = new Map(Object.entries(item.production || {}));
                
                return [hex, production];
            }) : []
        };
        
        return deserialized;
    }
    
    /**
     * Fallback to localStorage for development
     */
    private saveToLocalStorage(): void {
        const kingdomStateData = getCurrentKingdomState();
        const gameStateData = getGameStateForSave();
        
        const saveData = {
            kingdomState: this.serializeKingdomState(kingdomStateData),
            gameState: gameStateData
        };
        
        localStorage.setItem(`${this.MODULE_ID}-${this.KINGDOM_DATA_KEY}`, JSON.stringify(saveData));
        console.log('[PersistenceService] Data saved to localStorage (dev mode)');
    }
    
    /**
     * Fallback to load from localStorage for development
     */
    private loadFromLocalStorage(): void {
        const savedString = localStorage.getItem(`${this.MODULE_ID}-${this.KINGDOM_DATA_KEY}`);
        
        if (!savedString) {
            console.log('[PersistenceService] No saved data in localStorage');
            return;
        }
        
        try {
            const savedData = JSON.parse(savedString);
            
            if (savedData.kingdomState) {
                const deserializedState = this.deserializeKingdomState(savedData.kingdomState);
                loadKingdomState(deserializedState);
            }
            
            if (savedData.gameState) {
                loadGameState(savedData.gameState);
            }
            
            console.log('[PersistenceService] Data loaded from localStorage (dev mode)');
        } catch (error) {
            console.error('[PersistenceService] Failed to load from localStorage:', error);
        }
    }
}

// Export singleton instance
export const persistenceService = PersistenceService.getInstance();
