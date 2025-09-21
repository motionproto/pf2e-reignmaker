// Auto-converted and fixed from SimpleKingdomUI.kt
// Simple UI for Kingdom management

import { KingdomManager } from './KingdomManager';

/**
 * Simple UI for Kingdom management
 */
export class SimpleKingdomUI {
    private manager: KingdomManager;
    
    constructor() {
        this.manager = new KingdomManager();
    }
    
    render(): HTMLElement {
        const kingdom = this.manager.getKingdom();
        
        const container = document.createElement('div');
        container.className = 'kingdom-ui';
        
        // Header
        const header = document.createElement('h2');
        header.textContent = `Kingdom: ${kingdom.name}`;
        container.appendChild(header);
        
        const info = document.createElement('p');
        info.textContent = `Level: ${kingdom.level} | XP: ${kingdom.xp} | Turn: ${kingdom.currentTurn}`;
        container.appendChild(info);
        
        // Kingdom Status
        const statusDiv = document.createElement('div');
        const statusHeader = document.createElement('h3');
        statusHeader.textContent = 'Kingdom Status';
        statusDiv.appendChild(statusHeader);
        
        const statusList = document.createElement('ul');
        this.addListItem(statusList, `Gold: ${kingdom.gold}`);
        this.addListItem(statusList, `Fame: ${kingdom.fame}`);
        this.addListItem(statusList, `Unrest: ${kingdom.unrest}`);
        statusDiv.appendChild(statusList);
        container.appendChild(statusDiv);
        
        // Resources section
        const resourcesDiv = document.createElement('div');
        const resourcesHeader = document.createElement('h3');
        resourcesHeader.textContent = 'Resources';
        resourcesDiv.appendChild(resourcesHeader);
        
        const resourcesList = document.createElement('ul');
        const res = kingdom.resources;
        this.addListItem(resourcesList, `Food: ${res.food}`);
        this.addListItem(resourcesList, `Lumber: ${res.lumber}`);
        this.addListItem(resourcesList, `Ore: ${res.ore}`);
        this.addListItem(resourcesList, `Stone: ${res.stone}`);
        resourcesDiv.appendChild(resourcesList);
        container.appendChild(resourcesDiv);
        
        // Settlements section
        const settlementsDiv = document.createElement('div');
        const settlementsHeader = document.createElement('h3');
        settlementsHeader.textContent = 'Settlements';
        settlementsDiv.appendChild(settlementsHeader);
        
        if (kingdom.settlements.length === 0) {
            const noSettlements = document.createElement('p');
            noSettlements.textContent = 'No settlements yet';
            settlementsDiv.appendChild(noSettlements);
        } else {
            const settlementsList = document.createElement('ul');
            kingdom.settlements.forEach(settlement => {
                const settlementItem = document.createElement('li');
                settlementItem.textContent = `${settlement.name} (Level ${settlement.level})`;
                
                if (settlement.structures.length > 0) {
                    const structuresList = document.createElement('ul');
                    settlement.structures.forEach(structureId => {
                        this.addListItem(structuresList, structureId);
                    });
                    settlementItem.appendChild(structuresList);
                }
                
                settlementsList.appendChild(settlementItem);
            });
            settlementsDiv.appendChild(settlementsList);
        }
        container.appendChild(settlementsDiv);
        
        // Active Events
        if (kingdom.activeEvents.length > 0) {
            const eventsDiv = document.createElement('div');
            const eventsHeader = document.createElement('h3');
            eventsHeader.textContent = 'Active Events';
            eventsDiv.appendChild(eventsHeader);
            
            const eventsList = document.createElement('ul');
            kingdom.activeEvents.forEach(eventId => {
                this.addListItem(eventsList, eventId);
            });
            eventsDiv.appendChild(eventsList);
            container.appendChild(eventsDiv);
        }
        
        // Action buttons
        const actionsDiv = document.createElement('div');
        const actionsHeader = document.createElement('h3');
        actionsHeader.textContent = 'Actions';
        actionsDiv.appendChild(actionsHeader);
        
        const addSettlementBtn = this.createButton('Add Test Settlement', () => {
            this.addTestSettlement();
            this.refresh();
        });
        actionsDiv.appendChild(addSettlementBtn);
        
        const addResourcesBtn = this.createButton('Add Test Resources', () => {
            this.addTestResources();
            this.refresh();
        });
        actionsDiv.appendChild(addResourcesBtn);
        
        const advanceTurnBtn = this.createButton('Advance Turn', () => {
            this.advanceTurn();
            this.refresh();
        });
        actionsDiv.appendChild(advanceTurnBtn);
        
        container.appendChild(actionsDiv);
        
        return container;
    }
    
    private addListItem(list: HTMLElement, text: string): void {
        const item = document.createElement('li');
        item.textContent = text;
        list.appendChild(item);
    }
    
    private createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }
    
    private refresh(): void {
        // Find the existing UI element and replace it
        const existingUI = document.querySelector('.kingdom-ui');
        if (existingUI && existingUI.parentNode) {
            const newUI = this.render();
            existingUI.parentNode.replaceChild(newUI, existingUI);
        }
    }
    
    // Methods that can be called from button clicks
    addTestSettlement(): void {
        const settlementCount = this.manager.getKingdom().settlements.length;
        this.manager.addSettlement(`Test Settlement ${settlementCount + 1}`);
        console.log('Added settlement');
    }
    
    addTestResources(): void {
        this.manager.modifyResources(10, 5, 3, 4);
        this.manager.modifyGold(100);
        console.log('Added resources');
    }
    
    advanceTurn(): void {
        this.manager.advanceTurn();
        console.log('Advanced turn');
    }
}

/**
 * Simple function to open the kingdom UI
 */
export function openSimpleKingdomUI(): void {
    const ui = new SimpleKingdomUI();
    const element = ui.render();
    
    // Add to document body or a specific container
    document.body?.appendChild(element);
    
    console.log('Simple Kingdom UI opened');
}
