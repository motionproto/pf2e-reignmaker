package at.kmlite.pfrpg2e.kingdom.sheet

import at.kmlite.pfrpg2e.kingdom.data.FameData
import at.kmlite.pfrpg2e.kingdom.data.createFameData
import at.kmlite.pfrpg2e.kingdom.data.RawFame
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.FameContext
import at.kmlite.pfrpg2e.kingdom.sheet.contexts.toContext
import kotlinx.html.*
import kotlinx.html.dom.create
import kotlinx.browser.document
import org.w3c.dom.HTMLElement

/**
 * UI Component for rendering the Fame system display.
 * Shows fame points as stars and tracks usage for rerolls.
 */
class FameComponent {
    
    /**
     * Renders the Fame display as an HTML element.
     * Shows current fame points, maximum capacity, and usage history.
     */
    fun render(fame: FameData?): HTMLElement {
        val currentFame = fame ?: createFameData(current = 1)
        
        return document.create.div {
            classes = setOf("fame-tracker")
            
            // Header section with title and counter
            div {
                classes = setOf("fame-header")
                h3 { 
                    classes = setOf("fame-title")
                    +"Fame Points" 
                }
                span {
                    classes = setOf("fame-current")
                    +"${currentFame.current} / ${currentFame.maximum}"
                }
            }
            
            // Visual display of fame points as stars
            div {
                classes = setOf("fame-points-display")
                
                // Filled stars for current fame
                repeat(currentFame.current) { index ->
                    span {
                        classes = setOf("fame-star", "filled")
                        attributes["title"] = "Click to use for reroll"
                        attributes["data-fame-index"] = index.toString()
                        attributes["data-action"] = "use-fame-reroll"
                        +"\uD83C\uDF1F" // Star emoji
                    }
                }
                
                // Empty stars for remaining capacity
                repeat(currentFame.maximum - currentFame.current) { index ->
                    span {
                        classes = setOf("fame-star", "empty")
                        attributes["title"] = "Empty fame slot"
                        +"\u2606" // Empty star
                    }
                }
            }
            
            // Show which checks fame was used for
            if (currentFame.usedForRerolls.isNotEmpty()) {
                div {
                    classes = setOf("fame-used")
                    small {
                        classes = setOf("fame-used-label")
                        +"Used for rerolls: "
                        span {
                            classes = setOf("fame-used-list")
                            +currentFame.usedForRerolls.joinToString(", ")
                        }
                    }
                }
            }
            
            // Show bonus fame from criticals
            if (currentFame.gainedFromCriticals > 0) {
                div {
                    classes = setOf("fame-criticals")
                    small {
                        classes = setOf("fame-criticals-label")
                        +"Bonus from criticals: +${currentFame.gainedFromCriticals}"
                    }
                }
            }
        }
    }
    
    /**
     * Creates a FameContext for Handlebars templates using the existing toContext extension.
     */
    fun toContext(fame: RawFame, maximumFamePoints: Int): FameContext {
        // Use the existing RawFame.toContext extension function
        return fame.toContext(maximumFamePoints)
    }
    
    /**
     * Creates enhanced fame display info as additional context.
     */
    fun getEnhancedDisplay(fame: FameData?): Map<String, Any> {
        val currentFame = fame ?: createFameData()
        
        // Create star arrays for enhanced template rendering
        val filledStars = (1..currentFame.current).map { index ->
            mapOf(
                "index" to index,
                "filled" to true,
                "title" to "Click to use for reroll"
            )
        }
        
        val emptyStars = (1..(currentFame.maximum - currentFame.current)).map { index ->
            mapOf(
                "index" to currentFame.current + index,
                "filled" to false,
                "title" to "Empty fame slot"
            )
        }
        
        return mapOf(
            "current" to currentFame.current,
            "maximum" to currentFame.maximum,
            "filledStars" to filledStars,
            "emptyStars" to emptyStars,
            "usedForRerolls" to currentFame.usedForRerolls.toList(),
            "hasUsedRerolls" to currentFame.usedForRerolls.isNotEmpty(),
            "gainedFromCriticals" to currentFame.gainedFromCriticals,
            "hasGainedFromCriticals" to (currentFame.gainedFromCriticals > 0),
            "canUseReroll" to (currentFame.current > 0)
        )
    }
    
    /**
     * Creates CSS styles for the Fame component.
     * This should be added to the module's CSS file.
     */
    fun getCssStyles(): String = """
        .fame-tracker {
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 10px;
            margin: 10px 0;
            background: #f9f9f9;
        }
        
        .fame-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .fame-title {
            margin: 0;
            font-size: 1.2em;
            color: #333;
        }
        
        .fame-current {
            font-weight: bold;
            color: #666;
        }
        
        .fame-points-display {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }
        
        .fame-star {
            font-size: 1.5em;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .fame-star.filled {
            color: #FFD700;
        }
        
        .fame-star.filled:hover {
            transform: scale(1.2);
        }
        
        .fame-star.empty {
            color: #ccc;
            cursor: default;
        }
        
        .fame-used,
        .fame-criticals {
            color: #666;
            font-style: italic;
            margin-top: 5px;
        }
        
        .fame-used-label,
        .fame-criticals-label {
            display: block;
        }
        
        .fame-used-list {
            font-weight: normal;
        }
    """.trimIndent()
}
