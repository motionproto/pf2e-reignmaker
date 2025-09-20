package kingdom.lite.api

import kotlin.js.Promise

/**
 * Foundry VTT Hooks API
 */
@JsName("Hooks")
external object Hooks {
    fun on(hook: String, callback: (args: dynamic) -> Unit)
    fun off(hook: String, callback: (args: dynamic) -> Unit)
    fun once(hook: String, callback: (args: dynamic) -> Unit)
    fun call(hook: String, vararg args: dynamic): Boolean
    fun callAll(hook: String, vararg args: dynamic): Boolean
}

/**
 * External interfaces for Foundry VTT's game object
 */
external val game: Game

external interface Game {
    val scenes: Scenes
    val settings: ClientSettings
}

external interface Scenes {
    val contents: Array<Scene>
    val current: Scene?
    fun get(id: String): Scene?
}

external interface Scene {
    val id: String
    val name: String
}

external interface ClientSettings {
    fun get(namespace: String, key: String): dynamic
    fun set(namespace: String, key: String, value: dynamic): Promise<dynamic>
}

/**
 * Kingdom Settings helper functions
 */
object KingdomSettings {
    private const val MODULE_ID = "pf2e-kingdom-lite"
    private const val KINGDOM_SCENE_KEY = "kingdomSceneId"
    
    /**
     * Get the saved kingdom scene ID
     */
    fun getKingdomSceneId(): String? {
        return try {
            val sceneId = game.settings.get(MODULE_ID, KINGDOM_SCENE_KEY)
            if (sceneId != null && sceneId != "") sceneId as String else null
        } catch (e: Throwable) {
            null // Setting not registered yet
        }
    }
    
    /**
     * Save the kingdom scene ID
     */
    fun setKingdomSceneId(sceneId: String): Promise<dynamic> {
        return game.settings.set(MODULE_ID, KINGDOM_SCENE_KEY, sceneId)
    }
    
    /**
     * Get all available scenes
     */
    fun getAllScenes(): List<Scene> {
        return game.scenes.contents.toList()
    }
    
    /**
     * Get the selected kingdom scene or find "Stolen Lands" by default
     */
    fun getKingdomScene(): Scene? {
        val savedId = getKingdomSceneId()
        if (savedId != null) {
            val scene = game.scenes.get(savedId)
            if (scene != null) return scene
        }
        
        // Fallback to finding "Stolen Lands" scene
        return game.scenes.contents.find { 
            it.name.contains("Stolen Lands", ignoreCase = true)
        }
    }
}
