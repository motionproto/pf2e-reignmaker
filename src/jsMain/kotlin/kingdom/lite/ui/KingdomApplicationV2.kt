package kingdom.lite.ui

import kotlinx.browser.window
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kingdom.lite.ui.components.*
import kotlin.js.Json
import kotlin.js.json

/**
 * External declaration for Foundry's ApplicationV2 class
 */
@JsModule("foundry.applications.api.ApplicationV2")
@JsNonModule
external abstract class ApplicationV2 {
    open val options: dynamic
    fun render(force: Boolean = definedExternally): dynamic
    fun close(options: dynamic = definedExternally): dynamic
    fun setPosition(position: dynamic = definedExternally): dynamic
}

/**
 * Creates a Foundry ApplicationV2-based Kingdom Sheet
 * Since Kotlin can't extend JS classes, we'll create and return a JS application instance
 */
fun createKingdomApplicationV2(): dynamic {
    // Simply use fallback to our custom implementation for now
    // The ApplicationV2 approach needs more complex JavaScript bridge
    console.log("Using custom Application implementation (ApplicationV2 bridge needs refinement)")
    return null
}

/**
 * Initialize the Kingdom Sheet HTML template
 */
fun initializeKingdomTemplate() {
    // Create the template HTML
    val template = buildString {
        append("""
            <div class="kingdom-container">
                <div class="kingdom-header">
                    ${ContentSelector { }.render()}
                </div>
                <div class="kingdom-body">
                    <div class="kingdom-sidebar">
                        ${KingdomStats.render()}
                    </div>
                    <div class="kingdom-main content">
                        ${ContentTurn().render()}
                    </div>
                </div>
            </div>
        """)
    }
    
    // Store it globally for the ApplicationV2 to use
    window.asDynamic().kingdomSheetV2Template = template
}

/**
 * Setup callbacks for the ApplicationV2
 */
fun setupKingdomCallbacks() {
    // Store components
    val contentSelector = ContentSelector { contentId ->
        switchContent(contentId)
    }
    
    val contentComponents = mapOf(
        "turn" to ContentTurn(),
        "settlements" to ContentSettlements,
        "factions" to ContentFactions,
        "modifiers" to ContentModifiers,
        "notes" to ContentNotes,
        "settings" to ContentSettings
    )
    
    var currentContent: ContentComponent? = contentComponents["turn"]
    
    // Setup render callback
    window.asDynamic().onKingdomSheetRendered = { element: dynamic ->
        console.log("Kingdom sheet rendered, element:", element)
        
        // Update the template with current content
        val mainArea = element.querySelector(".kingdom-main")
        if (mainArea != null) {
            mainArea.innerHTML = currentContent?.render() ?: ""
        }
    }
    
    // Setup listeners callback
    window.asDynamic().activateKingdomListeners = { html: dynamic ->
        val htmlElement = html as org.w3c.dom.HTMLElement
        
        console.log("Activating Kingdom listeners")
        
        // Attach component listeners
        contentSelector.attachListeners(htmlElement)
        KingdomStats.attachListeners(htmlElement)
        currentContent?.attachListeners(htmlElement)
        
        // Setup content switching
        val buttons = htmlElement.asDynamic().querySelectorAll(".content-selector button")
        val buttonsLength = buttons.length as? Int ?: 0
        for (i in 0 until buttonsLength) {
            val button = buttons.item(i)
            if (button != null) {
                button.onclick = { event: dynamic ->
                    val target = event.target
                    val contentId = target.getAttribute("data-content") ?: "turn"
                    
                    // Switch content
                    currentContent = contentComponents[contentId]
                    
                    // Update main area
                    val mainArea = htmlElement.querySelector(".kingdom-main") as? org.w3c.dom.HTMLElement
                    if (mainArea != null) {
                        mainArea.innerHTML = currentContent?.render() ?: ""
                        currentContent?.attachListeners(htmlElement)
                    }
                    
                    Unit
                }
            }
        }
    }
    
    window.asDynamic().switchContent = { contentId: String ->
        currentContent = contentComponents[contentId]
        
        val sheet = window.asDynamic().currentKingdomSheet
        if (sheet?.element != null) {
            val mainArea = sheet.element.querySelector(".kingdom-main")
            if (mainArea != null) {
                mainArea.innerHTML = currentContent?.render() ?: ""
                currentContent?.attachListeners(sheet.element as org.w3c.dom.HTMLElement)
            }
        }
    }
}

/**
 * Open the Kingdom Sheet using ApplicationV2
 */
fun openKingdomSheetV2() {
    console.log("Opening Kingdom Sheet V2 - falling back to custom implementation")
    
    // For now, fall back to our custom implementation
    // The ApplicationV2 approach would require a more complex JS bridge
    kotlinx.coroutines.GlobalScope.launch {
        val sheet = KingdomSheet()
        sheet.render(true)
    }
}

/**
 * Helper to switch content in the sheet
 */
private fun switchContent(contentId: String) {
    window.asDynamic().switchContent?.invoke(contentId)
}
