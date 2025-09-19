package kingdom.lite

import kingdom.lite.fresh.testFreshKingdomSystem
import kotlinx.browser.window

fun main() {
    // Initialize the fresh kingdom system
    window.addEventListener("load", {
        console.log("PF2e Kingdom Lite - Fresh Start")
        console.log("===================================")
        
        // Run the test to verify everything works
        testFreshKingdomSystem()
        
        console.log("Kingdom system initialized successfully!")
        console.log("Use testFreshKingdomSystem() in the console to test the kingdom features.")
    })
}
