// Debug version of Kingdom Icon to diagnose why it's not appearing

import { KingdomApp } from '../view/kingdom/KingdomApp';
import { logger } from '../utils/Logger';

export function debugKingdomIcon(): void {

    // Check if Hooks is available
    if (typeof Hooks === 'undefined') {
        logger.error("🏰 Hooks is not defined!");
        return;
    }
    
    // Add multiple hooks to catch different render events
    const hooks = [
        'renderActorDirectory',
        'renderSidebarTab', 
        'renderActorSheet',
        'ready'
    ];
    
    hooks.forEach(hookName => {
        Hooks.on(hookName, (...args: any[]) => {

            if (hookName === 'renderActorDirectory') {
                tryAddKingdomIcons(args[1]);
            }
        });
    });
    
    // Also try on ready
    Hooks.once('ready', () => {

        // Log all actors
        // @ts-ignore
        if (game?.actors) {
            // @ts-ignore
            const actors = game.actors.contents;

            const partyActors = actors.filter((a: any) => a.type === 'party');

            // Try to find the actor directory
            setTimeout(() => {
                const actorDir = document.querySelector('#actors');

                if (actorDir) {
                    // Look for all possible selectors
                    const selectors = [
                        '.folder[data-party]',
                        '.directory-item[data-actor-id]',
                        '.actor.directory-item',
                        '.entity-link[data-type="Actor"]',
                        '.folder-header',
                        'li[data-entry-id]'
                    ];
                    
                    selectors.forEach(selector => {
                        const elements = actorDir.querySelectorAll(selector);
                        if (elements.length > 0) {

                        }
                    });
                    
                    // Try to manually add icons to party actors
                    partyActors.forEach((actor: any) => {
                        const actorElement = actorDir.querySelector(`[data-entry-id="${actor.id}"]`);
                        if (actorElement) {

                            addKingdomIconToElement(actorElement as HTMLElement, actor.id);
                        } else {

                        }
                    });
                }
            }, 1000); // Wait a bit for DOM to settle
        }
    });
}

function tryAddKingdomIcons(html: JQuery | HTMLElement): void {

    const htmlElement = html instanceof HTMLElement ? html : html.get(0);
    if (!htmlElement) {

        return;
    }
    
    // Try multiple selectors
    const selectors = [
        '.folder[data-party]',
        '[data-folder-id]',
        '.directory-item',
        'li[data-entry-id]'
    ];
    
    selectors.forEach(selector => {
        const elements = htmlElement.querySelectorAll(selector);
        if (elements.length > 0) {

            elements.forEach(elem => {
                // Check if this is a party actor
                // @ts-ignore
                const actorId = elem.dataset.entryId || elem.dataset.actorId;
                if (actorId) {
                    // @ts-ignore
                    const actor = game.actors?.get(actorId);
                    if (actor && actor.type === 'party') {

                        addKingdomIconToElement(elem as HTMLElement, actorId);
                    }
                }
            });
        }
    });
}

function addKingdomIconToElement(element: HTMLElement, actorId: string): void {
    // Check if icon already exists
    if (element.querySelector('.kingdom-icon-debug')) {

        return;
    }
    
    // Find where to insert the icon
    const insertTargets = [
        '.folder-name',
        '.entity-name', 
        '.document-name',
        'h4',
        'h3'
    ];
    
    let inserted = false;
    for (const target of insertTargets) {
        const targetElement = element.querySelector(target);
        if (targetElement && !inserted) {

            const icon = createKingdomIconElement(actorId);
            targetElement.insertAdjacentElement('afterend', icon);
            inserted = true;
            break;
        }
    }
    
    if (!inserted) {
        // Fallback: append to the element itself

        const icon = createKingdomIconElement(actorId);
        element.appendChild(icon);
    }
}

function createKingdomIconElement(actorId: string): HTMLElement {
    const link = document.createElement('a');
    link.classList.add('kingdom-icon-debug');
    link.style.cssText = 'margin-left: 8px; color: #4a90e2; cursor: pointer;';
    link.setAttribute('data-tooltip', 'ReignMaker');
    link.title = 'ReignMaker';
    
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-chess-rook');
    link.appendChild(icon);
    
    link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        try {
            const app = new KingdomApp({ actorId });
            app.render(true, { focus: true });

        } catch (error) {
            logger.error("🏰 Error opening KingdomApp:", error);
            // @ts-ignore
            ui.notifications?.error("Failed to open Kingdom UI: " + error);
        }
    });
    
    return link;
}

// Export the debug function
export function initKingdomIconDebug(): void {

    debugKingdomIcon();
}
