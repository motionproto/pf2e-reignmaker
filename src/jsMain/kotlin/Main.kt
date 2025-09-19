import kingdom.lite.ui.registerKingdomIconHook
import kingdom.lite.ui.injectStyles
import kingdom.lite.ui.KingdomSheetStyles

external val Hooks: dynamic

@JsExport
@JsName("init")
fun init() {
    console.log("PF2e Kingdom Lite: Module loading...")
    
    // Register init hook
    Hooks.once("init") {
        console.log("PF2e Kingdom Lite: Init hook")
        
        // Inject the Kingdom Sheet styles
        injectStyles(KingdomSheetStyles.styles)
    }
    
    // Register ready hook for final setup
    Hooks.once("ready") {
        console.log("PF2e Kingdom Lite: Ready hook - Module fully loaded")
        
        // Register the Kingdom icon hook to add icons to party actors
        registerKingdomIconHook()
    }
}

// Entry point for the module
fun main() {
    init()
}
