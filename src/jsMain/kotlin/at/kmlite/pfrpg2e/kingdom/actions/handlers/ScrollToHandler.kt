package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import kotlinx.browser.document
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for scrolling to a specific element on the page.
 */
class ScrollToHandler : PlayerSkillActionHandler {
    override val actionId = "scroll-to"
    override val actionName = "Scroll To Element"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        event.stopPropagation()
        event.preventDefault()
        
        // This action is handled in the KingdomSheet's legacy switch statement
        // since it uses document-level scrolling
        // TODO: Refactor when UI navigation is extracted
    }
}
