// Foundry VTT API definitions for PF2e Kingdom Lite
// Auto-converted and fixed from FoundryApi.kt

// Declare game as global - Foundry provides this
declare const game: Game;

/**
 * Extended Foundry interfaces specific to Kingdom module
 */
export interface KingdomScene {
    id: string;
    name: string;
    [key: string]: any;
}

export interface KingdomScenes {
    contents: KingdomScene[];
    current: KingdomScene | null;
    get(id: string): KingdomScene | null;
}

/**
 * Kingdom Settings helper functions
 */
export const KingdomSettings = {
    MODULE_ID: "pf2e-reignmaker",
    KINGDOM_SCENE_KEY: "kingdomSceneId",
    
    /**
     * Get the saved kingdom scene ID
     */
    getKingdomSceneId(): string | null {
        if (typeof game === 'undefined' || !game?.settings) {
            return null;
        }
        
        try {
            const sceneId = game.settings.get("pf2e-reignmaker", this.KINGDOM_SCENE_KEY) as string;
            return (sceneId && sceneId !== "") ? sceneId : null;
        } catch (e) {
            return null; // Setting not registered yet
        }
    },
    
    /**
     * Save the kingdom scene ID
     */
    setKingdomSceneId(sceneId: string): Promise<any> {
        if (typeof game === 'undefined' || !game?.settings) {
            return Promise.reject(new Error("Game not initialized"));
        }
        
        return game.settings.set("pf2e-reignmaker", this.KINGDOM_SCENE_KEY, sceneId);
    },
    
    /**
     * Get all available scenes
     */
    getAllScenes(): any[] {
        if (typeof game === 'undefined' || !game?.scenes) {
            return [];
        }
        return (game.scenes as any).contents || [];
    },
    
    /**
     * Get the selected kingdom scene or find "Stolen Lands" by default
     */
    getKingdomScene(): any | null {
        if (typeof game === 'undefined' || !game?.scenes) {
            return null;
        }
        
        const savedId = this.getKingdomSceneId();
        if (savedId) {
            const scene = (game.scenes as any).get(savedId);
            if (scene) return scene;
        }
        
        // Fallback to finding "Stolen Lands" scene
        const scenes = (game.scenes as any).contents || [];
        return scenes.find((scene: any) => 
            scene.name?.toLowerCase()?.includes("stolen lands")
        ) || null;
    }
};
