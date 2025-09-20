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
            
            // Create window structure with resize handle if resizable
            val resizeHandle = if (options.resizable == true) {
                """<div class="window-resize-handle" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; cursor: se-resize; z-index: 1000;">
                    <i class="fas fa-grip-lines-vertical" style="position: absolute; bottom: 3px; right: 3px; font-size: 12px; opacity: 0.3; transform: rotate(45deg);"></i>
                </div>"""
            } else ""
            
            element?.innerHTML = """
                <header class="window-header" style="cursor: move;">
                    <h4 class="window-title">${options.title}</h4>
                    <a class="header-button control close" title="Close">
                        <i class="fas fa-times"></i>
                    </a>
                </header>
                <section class="window-content">
                    $template
                </section>
                $resizeHandle
            """
            
            // Add to document
            document.body?.appendChild(element!!)
            
            // Add close button handler
            element?.querySelector(".close")?.addEventListener("click", {
                close()
            })
            
            // Add draggable functionality
            setupDraggable()
            
            // Add resizable functionality if enabled
            if (options.resizable == true) {
                setupResizable()
            }
        } else if (force) {
            // Update existing element
            element?.querySelector(".window-content")?.innerHTML = template
        }
        
        // Activate listeners
        element?.let { activateListeners(it) }
    }
    
    private fun setupDraggable() {
        val header = element?.querySelector(".window-header") as? HTMLElement ?: return
        var isDragging = false
        var startX = 0
        var startY = 0
        var initialLeft = 0
        var initialTop = 0
        
        header.style.cursor = "move"
        
        header.onmousedown = { event ->
            isDragging = true
            startX = event.asDynamic().clientX as Int
            startY = event.asDynamic().clientY as Int
            
            // Get current position
            val rect = element?.asDynamic().getBoundingClientRect()
            initialLeft = (rect?.left as? Double)?.toInt() ?: 0
            initialTop = (rect?.top as? Double)?.toInt() ?: 0
            
            // Remove the centering transform when starting to drag
            element?.style?.transform = ""
            element?.style?.left = "${initialLeft}px"
            element?.style?.top = "${initialTop}px"
            
            event.preventDefault()
        }
        
        document.onmousemove = { event ->
            if (isDragging) {
                val currentX = event.asDynamic().clientX as Int
                val currentY = event.asDynamic().clientY as Int
                val deltaX = currentX - startX
                val deltaY = currentY - startY
                
                element?.style?.left = "${initialLeft + deltaX}px"
                element?.style?.top = "${initialTop + deltaY}px"
                
                event.preventDefault()
            }
        }
        
        document.onmouseup = {
            isDragging = false
        }
    }
    
    private fun setupResizable() {
        val resizeHandle = element?.querySelector(".window-resize-handle") as? HTMLElement ?: return
        var isResizing = false
        var startX = 0
        var startY = 0
        var initialWidth = 0
        var initialHeight = 0
        
        // Style the resize handle to be more visible
        resizeHandle.style.background = "transparent"
        
        resizeHandle.onmousedown = { event ->
            isResizing = true
            startX = event.asDynamic().clientX as Int
            startY = event.asDynamic().clientY as Int
            
            // Get current dimensions
            initialWidth = element?.asDynamic().offsetWidth as? Int ?: options.width ?: 800
            initialHeight = element?.asDynamic().offsetHeight as? Int ?: options.height ?: 600
            
            // Add visual feedback
            element?.style?.opacity = "0.9"
            
            event.stopPropagation()
            event.preventDefault()
        }
        
        val handleMouseMove = { event: dynamic ->
            if (isResizing) {
                val currentX = event.clientX as Int
                val currentY = event.clientY as Int
                val deltaX = currentX - startX
                val deltaY = currentY - startY
                
                val newWidth = (initialWidth + deltaX).coerceAtLeast(400).coerceAtMost(1600)
                val newHeight = (initialHeight + deltaY).coerceAtLeast(300).coerceAtMost(1200)
                
                element?.style?.width = "${newWidth}px"
                element?.style?.height = "${newHeight}px"
                
                event.preventDefault()
            }
            Unit
        }
        
        val handleMouseUp = { _: dynamic ->
            if (isResizing) {
                isResizing = false
                element?.style?.opacity = "1"
            }
            Unit
        }
        
        // Attach to document for global mouse tracking
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
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
