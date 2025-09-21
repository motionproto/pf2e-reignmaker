// Auto-converted from ActionsPhase.kt
// TODO: Review and fix TypeScript-specific issues

import { ActionListItem } from '../components/ActionListItem';
import { PlayerActionsData, PlayerAction } from '../../models/PlayerActions';

/**
 * Actions Phase content for the Kingdom Sheet
 * Handles all kingdom actions that players can perform during their turn
 */
export const ActionsPhase = {
    
    render(): string {
        let result = "";
        
        result += `
            <div class="phase-step-container">
                <strong>Perform Kingdom Actions (4 PC actions total)</strong>
            </div>
            
            <div class="actions-phase-content" id="kingdom-actions-content">
        `;
        
        // Render categories in order with their actions
        const categories = [
            "uphold-stability",
            "military-operations", 
            "expand-borders",
            "urban-planning",
            "foreign-affairs",
            "economic-actions"
        ];
        
        categories.forEach((category) => {
            const categoryActions = PlayerActionsData.getActionsByCategory(category);
            if (categoryActions.length > 0) {
                result += this.renderCategory(category, categoryActions);
            }
        });
        
        result += `
            </div>
            <script>
                // Initialize action handlers
                (function() {
                    if (window.actionsPhaseListenersAttached) return;
                    window.actionsPhaseListenersAttached = true;
                    
                    console.log('Initializing action handlers');
                    
                    document.addEventListener('click', function(e) {
                        let toggleable = e.target.closest('.action-toggleable');
                        if (toggleable) {
                            console.log('Toggle clicked');
                            e.preventDefault();
                            
                            let itemId = toggleable.getAttribute('data-item-id');
                            if (itemId) {
                                let item = document.getElementById(itemId);
                                if (item) {
                                    let expandedContent = item.querySelector('.action-expanded-content');
                                    let chevron = item.querySelector('.fa-chevron-right, .fa-chevron-down');
                                    
                                    if (expandedContent) {
                                        if (expandedContent.style.display === 'none' || expandedContent.style.display === '') {
                                            expandedContent.style.display = 'block';
                                            if (chevron) chevron.className = 'fas fa-chevron-down';
                                        } else {
                                            expandedContent.style.display = 'none';
                                            if (chevron) chevron.className = 'fas fa-chevron-right';
                                        }
                                    }
                                }
                            }
                        }
                        
                        let skillBtn = e.target.closest('.skill-perform-btn');
                        if (skillBtn) {
                            e.preventDefault();
                            let actionId = skillBtn.getAttribute('data-action-id');
                            let skillName = skillBtn.getAttribute('data-skill-name');
                            console.log('Skill button clicked:', actionId, skillName);
                            
                            let selector = '[data-action-id="' + actionId + '"] .action-title-line strong';
                            let actionElement = document.querySelector(selector);
                            if (actionElement) {
                                alert('Performing: ' + actionElement.textContent + '\\nUsing skill: ' + skillName);
                            }
                        }
                    });
                })();
            </script>
        `;
        
        return result;
    },
    
    renderCategory(categoryId: string, actions: Array<PlayerAction>): string {
        let result = "";
        
        const categoryName = PlayerActionsData.categoryNames.get(categoryId) || categoryId;
        const categoryDesc = PlayerActionsData.categoryDescriptions.get(categoryId) || "";
        
        result += `
            <div class="phase-step-container">
                <h4>${categoryName}</h4>
                <p class="category-desc">${categoryDesc}</p>
                <ul>
        `;
        
        // Render each action as a list item
        actions.forEach((action) => {
            const item = new ActionListItem(action);
            result += item.render(false);
        });
        
        result += `
                </ul>
            </div>
        `;
        
        return result;
    }
};
