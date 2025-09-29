/**
 * Data Persistence Service for PF2e Reignmaker
 * Handles saving and loading kingdom state data to/from Foundry VTT settings
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
    private readonly KINGDOM_DATA_KEY = 'kingdomData';
    private readonly SAVE_VERSION = 1;
    
    // Flags
    private isInitialized = false;
    private isSaving = false;
    private saveDebounceTimer: number | null = null;
    
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
        if (typeof game === 'undefined' || !game?.settings) {
            console.warn('[PersistenceService] Not in Foundry environment, using localStorage fallback');
            return;
        }
        
        try {
            // Register settings for kingdom data storage
            await this.registerSettings();
            
            // Load saved data
            await this.loadData();
            
            // Set up save-on-change listeners instead of interval-based saving
            this.setupSaveOnChange();
            
            // Set up hooks for synchronization
            this.setupSyncHooks();
            
            this.isInitialized = true;
            console.log('[PersistenceService] Initialized successfully with save-on-change');
        } catch (error) {
            console.error('[PersistenceService] Failed to initialize:', error);
        }
    }
    
    /**
     * Register Foundry settings for data storage
     */
    private async registerSettings(): Promise<void> {
        if (!game?.settings?.register) return;
        
        // Register kingdom data storage
        game.settings.register(this.MODULE_ID, this.KINGDOM_DATA_KEY, {
            name: 'Kingdom Save Data',
            hint: 'Stores the current state of the kingdom',
            scope: 'world',
            config: false,
            type: Object,
            default: {},
            onChange: (value: any) => {
                // Handle remote changes from other clients
                if (!this.isSaving) {
                    this.handleRemoteUpdate(value);
                }
            }
        });
        
        // No longer registering auto-save setting as we now save on changes
    }
    
    /**
     * Save current kingdom state to persistent storage
     */
    async saveData(showNotification = true): Promise<void> {
        if (!this.isFoundryReady()) {
            return this.saveToLocalStorage();
        }
        
        try {
            this.isSaving = true;
            
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
            
            // Save to Foundry settings
            await game.settings.set(this.MODULE_ID, this.KINGDOM_DATA_KEY, saveData);
            
            // Show notification
            if (showNotification && game.user?.isGM) {
                (window as any).ui?.notifications?.info('Kingdom state saved successfully');
            }
            
            console.log('[PersistenceService] Data saved successfully', saveData.metadata);
        } catch (error) {
            console.error('[PersistenceService] Failed to save data:', error);
            (window as any).ui?.notifications?.error('Failed to save kingdom state');
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
            const savedData = game.settings.get(this.MODULE_ID, this.KINGDOM_DATA_KEY) as SavedKingdomData;
            
            if (!savedData || Object.keys(savedData).length === 0) {
                console.log('[PersistenceService] No saved data found');
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
            
            console.log('[PersistenceService] Data loaded successfully', savedData.metadata);
            
            // Show notification
            if (game.user?.isGM) {
                const lastSaved = new Date(savedData.timestamp).toLocaleString();
                (window as any).ui?.notifications?.info(`Kingdom state loaded (last saved: ${lastSaved})`);
            }
        } catch (error) {
            console.error('[PersistenceService] Failed to load data:', error);
            (window as any).ui?.notifications?.error('Failed to load kingdom state');
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
                await game.settings.set(this.MODULE_ID, this.KINGDOM_DATA_KEY, {});
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
        
        // Notify user of remote update
        if (data.metadata?.lastSavedBy && data.metadata.lastSavedBy !== game?.user?.name) {
            (window as any).ui?.notifications?.info(
                `Kingdom updated by ${data.metadata.lastSavedBy}`
            );
        }
    }
    
    /**
     * Set up hooks for synchronization between clients
     */
    private setupSyncHooks(): void {
        if (typeof Hooks === 'undefined') return;
        
        // Listen for socket messages for real-time sync
        Hooks.on('updateSetting', (setting: any, value: any) => {
            if (setting.key === `${this.MODULE_ID}.${this.KINGDOM_DATA_KEY}` && !this.isSaving) {
                console.log('[PersistenceService] Setting updated via socket');
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
        // Subscribe to kingdom state changes
        kingdomState.subscribe(() => {
            this.debouncedSave();
        });
        
        // Subscribe to game state changes
        gameState.subscribe(() => {
            this.debouncedSave();
        });
        
        console.log('[PersistenceService] Save-on-change listeners established');
    }
    
    /**
     * Debounced save to prevent excessive saving
     * Waits 500ms after last change before saving
     */
    private debouncedSave(): void {
        // Skip if not initialized or already saving
        if (!this.isInitialized || this.isSaving) return;
        
        // Clear existing timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        // Set new timer for save
        this.saveDebounceTimer = window.setTimeout(() => {
            this.saveData(false);
        }, 500);
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
            
            settlements: state.settlements,
            armies: state.armies,
            buildQueue: state.buildQueue
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
