// Foundry VTT API definitions for PF2e Kingdom Lite
// Auto-converted and fixed from FoundryApi.kt

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
    MODULE_ID: "pf2e-kingdom-lite",
    KINGDOM_SCENE_KEY: "kingdomSceneId",
    
    /**
     * Get the saved kingdom scene ID
     */
    getKingdomSceneId(): string | null {
        try {
            const sceneId = game.settings.get(this.MODULE_ID, this.KINGDOM_SCENE_KEY);
            return (sceneId && sceneId !== "") ? sceneId as string : null;
        } catch (e) {
            return null; // Setting not registered yet
        }
    },
    
    /**
     * Save the kingdom scene ID
     */
    setKingdomSceneId(sceneId: string): Promise<any> {
        return game.settings.set(this.MODULE_ID, this.KINGDOM_SCENE_KEY, sceneId);
    },
    
    /**
     * Get all available scenes
     */
    getAllScenes(): Scene[] {
        return game.scenes.contents;
    },
    
    /**
     * Get the selected kingdom scene or find "Stolen Lands" by default
     */
    getKingdomScene(): Scene | null {
        const savedId = this.getKingdomSceneId();
        if (savedId) {
            const scene = game.scenes.get(savedId);
            if (scene) return scene;
        }
        
        // Fallback to finding "Stolen Lands" scene
        return game.scenes.contents.find((scene: Scene) => 
            scene.name.toLowerCase().includes("stolen lands")
        ) || null;
    }
};
