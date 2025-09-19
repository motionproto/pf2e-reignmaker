package kingdom.lite.ui

import kotlinx.browser.document
import org.w3c.dom.HTMLElement
import org.w3c.dom.HTMLStyleElement
import kotlin.js.Json

/**
 * Application options interface for Foundry VTT
 */
external interface ApplicationOptions {
    var id: String?
    var title: String?
    var classes: Array<String>?
    var width: Int?
    var height: Int?
    var resizable: Boolean?
    var minimizable: Boolean?
    var scrollY: Array<String>?
}

/**
 * Base Application class for Foundry VTT UI elements
 */
abstract class Application {
    var element: HTMLElement? = null
    
    abstract val options: ApplicationOptions
    abstract suspend fun getData(): Json
    abstract val template: String
    
    open fun activateListeners(html: HTMLElement) {
        // Override in subclasses to add event listeners
    }
    
    suspend fun render(force: Boolean = false) {
        // Close existing window if force rendering
        if (force && element != null) {
            close()
        }
        
        // Create or update the application window
        val data = getData()
        
        if (element == null) {
            // Create new element
            element = document.createElement("div") as HTMLElement
            element?.className = "app window-app ${options.classes?.joinToString(" ") ?: ""}"
            element?.id = options.id ?: ""
            
            // Apply position and size styles
            element?.style?.position = "fixed"
            element?.style?.left = "50%"
            element?.style?.top = "50%"
            element?.style?.transform = "translate(-50%, -50%)"
            element?.style?.zIndex = "100"
            options.width?.let { element?.style?.width = "${it}px" }
            options.height?.let { element?.style?.height = "${it}px" }
            
            // Create window structure
            element?.innerHTML = """
                <header class="window-header">
                    <h4 class="window-title">${options.title}</h4>
                    <a class="header-button control close" title="Close">
                        <i class="fas fa-times"></i>
                    </a>
                </header>
                <section class="window-content">
                    $template
                </section>
            """
            
            // Add to document
            document.body?.appendChild(element!!)
            
            // Add close button handler
            element?.querySelector(".close")?.addEventListener("click", {
                close()
            })
        } else if (force) {
            // Update existing element
            element?.querySelector(".window-content")?.innerHTML = template
        }
        
        // Activate listeners
        element?.let { activateListeners(it) }
    }
    
    fun close() {
        element?.remove()
        element = null
    }
}

/**
 * Helper extension to query all matching elements
 */
fun HTMLElement.querySelectorAll(selector: String): List<HTMLElement> {
    val nodeList = this.asDynamic().querySelectorAll(selector)
    val result = mutableListOf<HTMLElement>()
    val length = nodeList.length as Int
    for (i in 0 until length) {
        (nodeList.item(i) as? HTMLElement)?.let { result.add(it) }
    }
    return result
}

/**
 * Inject styles into the document
 */
fun injectStyles(styles: String, id: String = "kingdom-sheet-styles") {
    // Check if styles already exist
    if (document.getElementById(id) != null) return
    
    val styleElement = document.createElement("style") as HTMLStyleElement
    styleElement.id = id
    styleElement.textContent = styles
    document.head?.appendChild(styleElement)
}
