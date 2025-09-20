import kingdom.lite.ui.registerKingdomIconHook
import kingdom.lite.ui.injectStyles
import kingdom.lite.ui.KingdomSheetStyles
import kingdom.lite.api.game
import kingdom.lite.api.Hooks

@JsExport
@JsName("init")
fun init() {
    console.log("PF2e Kingdom Lite: Module loading...")
    
    // Register init hook
    Hooks.once("init") {
        console.log("PF2e Kingdom Lite: Init hook")
        
        // Register settings
        registerSettings()
        
        // Inject the Kingdom Sheet styles
        injectStyles(KingdomSheetStyles.styles)
    }
    
    // Register ready hook for final setup
    Hooks.once("ready") {
        console.log("PF2e Kingdom Lite: Ready hook - Module fully loaded")
        
        // Register the Kingdom icon hook to add icons to party actors
        registerKingdomIconHook()
        
        // Register hooks for Kingmaker updates
        registerKingmakerHooks()
    }
}

// Register module settings
fun registerSettings() {
    console.log("PF2e Kingdom Lite: Registering settings")
    
    // Register kingdom scene setting
    val settingsConfig = js("{}")
    settingsConfig.name = "Kingdom Scene"
    settingsConfig.hint = "The scene that represents your kingdom map"
    settingsConfig.scope = "world"
    settingsConfig.config = false
    settingsConfig.type = js("String")
    settingsConfig.default = ""
    
    game.settings.asDynamic().register(
        "pf2e-kingdom-lite",
        "kingdomSceneId",
        settingsConfig
    )
}

/**
 * Register hooks to listen for Kingmaker module updates
 */
fun registerKingmakerHooks() {
    console.log("PF2e Kingdom Lite: Registering Kingmaker update hooks...")
    
    // Hook when hex editing is closed (indicates hex data may have changed)
    Hooks.on("closeKingmakerHexEdit") { _ ->
        console.log("Kingmaker hex edit detected - refreshing kingdom data")
        refreshKingdomData()
    }
    
    // Hook for general scene updates (hexes might be claimed/unclaimed)
    Hooks.on("updateScene") { args ->
        // Check if this is the kingdom scene
        val sceneId = (args as? Array<dynamic>)?.getOrNull(0)?.asDynamic()?.id
        if (sceneId != null) {
            console.log("Scene update detected - checking for kingdom changes")
            refreshKingdomData()
        }
    }
    
    // Hook for when actor updates (kingdom actor might change)
    Hooks.on("updateActor") { args ->
        val actor = (args as? Array<dynamic>)?.getOrNull(0)
        if (actor?.asDynamic()?.type == "party") {
            console.log("Party actor update detected - refreshing kingdom data")
            refreshKingdomData()
        }
    }
    
    console.log("PF2e Kingdom Lite: Kingmaker hooks registered successfully")
}

/**
 * Refresh kingdom data in all open Kingdom Sheets
 */
fun refreshKingdomData() {
    // Simply notify that data should be refreshed
    // The actual refresh happens when tabs are switched due to our existing mechanism
    console.log("Kingdom data changed - will refresh on next view")
}

// Entry point for the module
fun main() {
    init()
}
