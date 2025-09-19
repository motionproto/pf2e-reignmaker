import kingdom.lite.fresh.initializeKingdom

external val Hooks: dynamic

@JsExport
@JsName("init")
fun init() {
    console.log("PF2e Kingdom Lite: Module loading...")
    
    // Register init hook
    Hooks.once("init") {
        console.log("PF2e Kingdom Lite: Init hook")
        initializeKingdom()
    }
    
    // Register ready hook for any final setup
    Hooks.once("ready") {
        console.log("PF2e Kingdom Lite: Ready hook - Module fully loaded")
    }
}

// Entry point for the module
fun main() {
    init()
}
