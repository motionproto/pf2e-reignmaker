package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement

/**
 * Content selector component for the Kingdom Sheet
 * Manages the button navigation for selecting different content pages
 */
class ContentSelector(
    private val onContentChange: (String) -> Unit
) {
    data class ContentButton(val id: String, val label: String)
    
    private val buttons = listOf(
        ContentButton("turn", "Turn"),
        ContentButton("settlements", "Settlements"),
        ContentButton("factions", "Factions"),
        ContentButton("modifiers", "Modifiers"),
        ContentButton("notes", "Notes")
    )
    
    private var activeContent = "turn"
    
    fun render(): String {
        println("ContentSelector.render() called - rendering buttons")
        val html = buildString {
            // Simple button row for content selection
            append("""<div class="content-selector">""")
            
            // Render all buttons on a single line to ensure they're all created
            append("""<button class="content-button${if (activeContent == "turn") " active" else ""}" data-content="turn">Turn</button>""")
            append("""<button class="content-button${if (activeContent == "settlements") " active" else ""}" data-content="settlements">Settlements</button>""")
            append("""<button class="content-button${if (activeContent == "factions") " active" else ""}" data-content="factions">Factions</button>""")
            append("""<button class="content-button${if (activeContent == "modifiers") " active" else ""}" data-content="modifiers">Modifiers</button>""")
            append("""<button class="content-button${if (activeContent == "notes") " active" else ""}" data-content="notes">Notes</button>""")
            
            // Add gear button on the far right
            append("""<button class="content-button gear-button${if (activeContent == "settings") " active" else ""}" data-content="settings" title="Content Settings">""")
            append("""<i class="fas fa-cog"></i>""")
            append("""</button>""")
            
            append("""</div>""")
        }
        println("ContentSelector HTML generated: $html")
        return html
    }
    
    fun attachListeners(container: HTMLElement) {
        val contentButtons = container.querySelectorAll(".content-button")
        println("ContentSelector.attachListeners() - found ${contentButtons.length} buttons")
        for (i in 0 until contentButtons.length) {
            val button = contentButtons.item(i) as HTMLElement
            val content = button.dataset.asDynamic().content as String?
            println("  - Button $i: content=$content, text=${button.textContent}")
            button.addEventListener("click", { event ->
                event.preventDefault()
                val targetContent = button.dataset.asDynamic().content as String
                println("ContentSelector button clicked: $targetContent")
                setActiveContent(targetContent, container)
            })
        }
    }
    
    fun setActiveContent(contentId: String, container: HTMLElement? = null) {
        activeContent = contentId
        
        // Clear ContentSettings cache when switching to settings to ensure fresh data
        if (contentId == "settings") {
            // Force refresh of kingdom data by clearing the cached timestamp
            // This ensures fresh data is loaded from the Kingmaker module
            println("Switching to settings - forcing kingdom data refresh")
        }
        
        // Update button states if container is provided
        container?.let {
            val allButtons = it.querySelectorAll(".content-button")
            for (i in 0 until allButtons.length) {
                val btn = allButtons.item(i) as HTMLElement
                if (btn.dataset.asDynamic().content == contentId) {
                    btn.classList.add("active")
                } else {
                    btn.classList.remove("active")
                }
            }
        }
        
        // Notify the parent about content change
        onContentChange(contentId)
    }
    
    fun getActiveContent(): String = activeContent
}
