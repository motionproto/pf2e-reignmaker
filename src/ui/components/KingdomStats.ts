// Kingdom Statistics UI component for PF2e Kingdom Lite
// Auto-converted and fixed from KingdomStats.kt

import { html } from '../html-helpers';
import { KingdomState, TurnPhase } from '../../models/KingdomState';
import { TurnManager } from '../../models/TurnManager';
import { KingdomStatsStyles } from '../styles/KingdomStatsStyles';

/**
 * Kingdom Statistics sidebar component
 * Displays the core kingdom statistics including Fame, Unrest, Gold, Resources, etc.
 */
export class KingdomStats {
  private kingdomName: string = "Kingdom Name";
  private kingdomState: KingdomState;
  private turnManager: TurnManager;
  
  constructor(kingdomState: KingdomState, turnManager: TurnManager) {
    this.kingdomState = kingdomState;
    this.turnManager = turnManager;
    
    // Load saved kingdom name from localStorage if available
    const savedName = window.localStorage.getItem("kingdomName");
    if (savedName) {
      this.kingdomName = savedName;
    }
    
    // Load saved war status and apply to kingdom state when initialized
    const savedWarStatus = this.loadWarStatus();
    if (this.kingdomState) {
      this.kingdomState.isAtWar = savedWarStatus;
    }
  }
  
  render(): string {
    // Include styles
    const styles = `<style>${KingdomStatsStyles.getStyles()}</style>`;
    
    return html`
      ${styles}
      <div class="kingdom-stats-container">
        <div class="kingdom-name-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background-color: var(--color-dark-bg-alt);
          border-bottom: none;
        ">
          <h3 id="kingdom-name-text" style="
            margin: 0;
            color: var(--color-text-on-accent);
            flex: 1;
            display: block;
            font-size: 24px;
            text-decoration: none;
            font-family: 'Eczar', serif;
          ">${this.kingdomName}</h3>
          <input id="kingdom-name-input" type="text" value="${this.kingdomName}" style="
            flex: 1;
            font-size: 24px;
            font-weight: bold;
            background-color: transparent;
            border: none;
            outline: 1px solid var(--color-text-on-accent);
            color: var(--color-text-on-accent);
            padding: 4px 8px;
            border-radius: 4px;
            display: none;
            text-decoration: none;
            font-family: 'Eczar', serif;
          ">
          <span id="kingdom-edit-btn" style="
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
            font-size: 16px;
          " title="Edit kingdom name">
            <i class="fa-solid fa-pen-fancy"></i>
          </span>
        </div>
        <div class="kingdom-stats-scrollable">
          <div class="kingdom-stats-content">
            ${this.renderCoreTrackers()}
            ${this.renderUnrest()}
            ${this.renderKingdomSize()}
            ${this.renderResources()}
          </div>
        </div>
      </div>
    `;
  }
  
  private renderCoreTrackers(): string {
    const fame = this.kingdomState?.fame || 0;
    const gold = this.kingdomState?.resources.get("gold") || 0;
    const currentTurn = this.kingdomState?.currentTurn || 1;
    const isAtWar = this.kingdomState?.isAtWar || this.loadWarStatus();
    
    return html`
      <div class="stat-group" style="border-top: none; margin-top: 0;">
        <h4 class="stat-group-header">Turn ${currentTurn}</h4>
        <div>
          <div class="stat-item">
            <label>Fame:</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="fame-decrease-btn" class="stat-adjust-button" title="Decrease Fame">
                <i class="fas fa-minus"></i>
              </button>
              <span class="stat-value" id="kingdom-fame-value" style="min-width: 30px; text-align: center;">${fame}</span>
              <button id="fame-increase-btn" class="stat-adjust-button" title="Increase Fame">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
          <div class="stat-item">
            <label>Gold:</label>
            <span class="stat-value" id="kingdom-gold-value">${gold}</span>
          </div>
          <div class="stat-item">
            <label>War Status:</label>
            <select id="war-status-select" class="kingdom-select">
              <option value="peace" ${!isAtWar ? "selected" : ""}>Peace</option>
              <option value="war" ${isAtWar ? "selected" : ""}>War</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }
  
  private renderUnrest(): string {
    const currentUnrest = this.kingdomState?.unrest || 0;
    const imprisonedUnrest = this.kingdomState?.imprisonedUnrest || 0;
    const isAtWar = this.kingdomState?.isAtWar || this.loadWarStatus();
    
    // Use kingdom state size if available
    const hexes = this.kingdomState?.size || 0;
    
    // Calculate territory-based unrest
    let sizeUnrest = 0;
    if (hexes >= 32) {
      sizeUnrest = 4;
    } else if (hexes >= 24) {
      sizeUnrest = 3;
    } else if (hexes >= 16) {
      sizeUnrest = 2;
    } else if (hexes >= 8) {
      sizeUnrest = 1;
    }
    
    // War unrest
    const warUnrest = isAtWar ? 1 : 0;
    
    // Structure bonus (reduction) - currently 0 since we don't have structures yet
    // TODO: Calculate from actual structures when available
    const structureBonus = 0;
    
    // Net unrest per turn 
    const unrestPerTurn = sizeUnrest + warUnrest - structureBonus;
    
    return html`
      <div class="stat-group">
        <h4 class="stat-group-header">Unrest</h4>
        <div>
          <div class="stat-item">
            <label>Current Unrest:</label>
            <span class="stat-value" id="kingdom-unrest-value">${currentUnrest}</span>
          </div>
          ${imprisonedUnrest > 0 ? html`
            <div class="stat-item">
              <label>Imprisoned:</label>
              <span class="stat-value" style="color: #6c757d;" id="kingdom-imprisoned-unrest-value">${imprisonedUnrest}</span>
            </div>
          ` : ''}
          <div class="stat-item">
            <label>From Size:</label>
            <span class="stat-value" id="unrest-from-size">+${sizeUnrest}</span>
          </div>
          ${isAtWar ? html`
            <div class="stat-item">
              <label>From War:</label>
              <span class="stat-value" style="color: #ff6b6b;">+${warUnrest}</span>
            </div>
          ` : ''}
          <div class="stat-item">
            <label>Structure Bonus:</label>
            <span class="stat-value">-${structureBonus}</span>
          </div>
          <div class="stat-item">
            <label>Per Turn:</label>
            <span class="stat-value" id="unrest-per-turn" style="${unrestPerTurn > 0 ? 'color: #ff6b6b;' : unrestPerTurn < 0 ? 'color: #51cf66;' : ''}">
              ${unrestPerTurn >= 0 ? `+${unrestPerTurn}` : unrestPerTurn}
            </span>
          </div>
        </div>
      </div>
    `;
  }
  
  private renderKingdomSize(): string {
    const hexesClaimed = this.kingdomState?.hexes.length || 0;
    const totalSettlements = this.kingdomState?.settlements.length || 0;
    
    // Count settlement types
    let villages = 0;
    let towns = 0;
    let cities = 0;
    let metropolises = 0;
    
    if (this.kingdomState?.settlements) {
      this.kingdomState.settlements.forEach(settlement => {
        // Settlements may have level or size property
        const settlementLevel = (settlement as any).level || (settlement as any).size || 1;
        switch (settlementLevel) {
          case 1: villages++; break;
          case 2: towns++; break;
          case 3: cities++; break;
          case 4: metropolises++; break;
        }
      });
    }
    
    return html`
      <div class="stat-group">
        <h4 class="stat-group-header">Kingdom Size</h4>
        <div>
          <div class="stat-item">
            <label>Hexes Claimed:</label>
            <span class="stat-value">${hexesClaimed}</span>
          </div>
          <div class="stat-item">
            <label>Total Settlements:</label>
            <span class="stat-value">${totalSettlements}</span>
          </div>
          <div class="stat-item">
            <label>Villages:</label>
            <span class="stat-value">${villages}</span>
          </div>
          <div class="stat-item">
            <label>Towns:</label>
            <span class="stat-value">${towns}</span>
          </div>
          <div class="stat-item">
            <label>Cities:</label>
            <span class="stat-value">${cities}</span>
          </div>
          <div class="stat-item">
            <label>Metropolises:</label>
            <span class="stat-value">${metropolises}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  private renderResources(): string {
    // Get resources from kingdom state
    const currentFood = this.kingdomState?.resources.get("food") || 0;
    const currentLumber = this.kingdomState?.resources.get("lumber") || 0;
    const currentStone = this.kingdomState?.resources.get("stone") || 0;
    const currentOre = this.kingdomState?.resources.get("ore") || 0;
    
    // Get production from kingdom state's calculateProduction method
    const production = this.kingdomState?.calculateProduction() || new Map();
    const foodProduction = production.get("food") || 0;
    const lumberProduction = production.get("lumber") || 0;
    const stoneProduction = production.get("stone") || 0;
    const oreProduction = production.get("ore") || 0;
    
    // Get worksite counts from kingdom state
    const farmlands = this.kingdomState?.worksiteCount.get("farmlands") || 0;
    const lumberCamps = this.kingdomState?.worksiteCount.get("lumberCamps") || 0;
    const mines = this.kingdomState?.worksiteCount.get("mines") || 0;
    const quarries = this.kingdomState?.worksiteCount.get("quarries") || 0;
    
    // Calculate total worksites from kingdom state
    const totalWorksites = farmlands + lumberCamps + mines + quarries;
    
    return html`
      <div class="stat-group">
        <h4 class="stat-group-header">Resources</h4>
        <div class="resource-section">
          <div class="resource-header">Food</div>
          <div class="stat-item">
            <label>Current:</label>
            <span class="stat-value" id="kingdom-food-value">${currentFood}</span>
          </div>
          <div class="stat-item">
            <label>Farmlands:</label>
            <span class="stat-value">${farmlands}</span>
          </div>
          <div class="stat-item">
            <label>Production:</label>
            <span class="stat-value">${foodProduction}/turn</span>
          </div>
        </div>
        <div class="resource-section">
          <div class="resource-header">Resource Income</div>
          <div class="resource-grid">
            <div class="resource-item">
              <label>Lumber:</label>
              <span id="kingdom-lumber-value">${currentLumber}</span>
            </div>
            <div class="resource-item">
              <label>Stone:</label>
              <span id="kingdom-stone-value">${currentStone}</span>
            </div>
            <div class="resource-item">
              <label>Ore:</label>
              <span id="kingdom-ore-value">${currentOre}</span>
            </div>
          </div>
          <div class="stat-item">
            <label>Total Worksites:</label>
            <span class="stat-value">${totalWorksites}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  attachListeners(container: HTMLElement): void {
    // Kingdom name editing functionality
    const nameText = container.querySelector("#kingdom-name-text") as HTMLElement;
    const nameInput = container.querySelector("#kingdom-name-input") as HTMLInputElement;
    const editBtn = container.querySelector("#kingdom-edit-btn") as HTMLElement;
    
    if (editBtn) {
      editBtn.onclick = () => {
        // Switch to edit mode
        if (nameText) nameText.style.display = "none";
        if (nameInput) {
          nameInput.style.display = "block";
          nameInput.focus();
          nameInput.select();
        }
        editBtn.style.display = "none";
      };
      
      // Add hover effect for edit button
      editBtn.onmouseenter = () => {
        editBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      };
      editBtn.onmouseleave = () => {
        editBtn.style.backgroundColor = "transparent";
      };
    }
    
    if (nameInput) {
      // Save on Enter key or blur
      nameInput.onkeydown = (event) => {
        switch (event.key) {
          case "Enter":
            this.saveKingdomName(nameText, nameInput, editBtn);
            event.preventDefault();
            break;
          case "Escape":
            // Cancel editing and restore original value
            nameInput.value = this.kingdomName;
            this.switchToViewMode(nameText, nameInput, editBtn);
            event.preventDefault();
            break;
        }
      };
      
      nameInput.onblur = () => {
        this.saveKingdomName(nameText, nameInput, editBtn);
      };
    }
    
    // Fame adjustment button handlers
    const fameDecreaseBtn = container.querySelector("#fame-decrease-btn") as HTMLElement;
    const fameIncreaseBtn = container.querySelector("#fame-increase-btn") as HTMLElement;
    const fameValue = container.querySelector("#kingdom-fame-value") as HTMLElement;
    
    // Function to update button states
    const updateFameButtonStates = () => {
      if (this.kingdomState) {
        // Disable decrease button at 0
        if (this.kingdomState.fame <= 0) {
          if (fameDecreaseBtn) {
            fameDecreaseBtn.setAttribute("disabled", "true");
            fameDecreaseBtn.style.opacity = "0.5";
            fameDecreaseBtn.style.cursor = "not-allowed";
          }
        } else {
          if (fameDecreaseBtn) {
            fameDecreaseBtn.removeAttribute("disabled");
            fameDecreaseBtn.style.opacity = "1";
            fameDecreaseBtn.style.cursor = "pointer";
          }
        }
        
        // Disable increase button at 3
        if (this.kingdomState.fame >= 3) {
          if (fameIncreaseBtn) {
            fameIncreaseBtn.setAttribute("disabled", "true");
            fameIncreaseBtn.style.opacity = "0.5";
            fameIncreaseBtn.style.cursor = "not-allowed";
          }
        } else {
          if (fameIncreaseBtn) {
            fameIncreaseBtn.removeAttribute("disabled");
            fameIncreaseBtn.style.opacity = "1";
            fameIncreaseBtn.style.cursor = "pointer";
          }
        }
      }
    };
    
    // Initial button state update
    updateFameButtonStates();
    
    if (fameDecreaseBtn) {
      fameDecreaseBtn.onclick = () => {
        if (this.kingdomState && this.kingdomState.fame > 0) {
          this.kingdomState.fame--;
          if (fameValue) fameValue.textContent = this.kingdomState.fame.toString();
          
          // Update button states
          updateFameButtonStates();
          
          // Update the turn controller display (including phases)
          const updateCallback = (window as any).updateKingdomStats;
          if (updateCallback) {
            updateCallback();
          }
          
          // Also update the phase content if it's showing Status Phase
          this.updatePhaseContent();
        }
      };
    }
    
    if (fameIncreaseBtn) {
      fameIncreaseBtn.onclick = () => {
        if (this.kingdomState && this.kingdomState.fame < 3) { // Max fame is 3
          this.kingdomState.fame++;
          if (fameValue) fameValue.textContent = this.kingdomState.fame.toString();
          
          // Update button states
          updateFameButtonStates();
          
          // Update the turn controller display (including phases)
          const updateCallback = (window as any).updateKingdomStats;
          if (updateCallback) {
            updateCallback();
          }
          
          // Also update the phase content if it's showing Status Phase
          this.updatePhaseContent();
        }
      };
    }
    
    // War status dropdown handler
    const warStatusSelect = container.querySelector("#war-status-select") as HTMLSelectElement;
    if (warStatusSelect) {
      warStatusSelect.onchange = () => {
        if (this.kingdomState) {
          const isAtWar = warStatusSelect.value === "war";
          this.kingdomState.isAtWar = isAtWar;
          
          // Save to localStorage
          this.saveWarStatus(isAtWar);
          
          // Update the unrest display to reflect war status change
          const statsContainer = container.querySelector(".kingdom-stats-content") as HTMLElement;
          if (statsContainer) {
            // Re-render the unrest section
            const unrestSection = statsContainer.querySelector(".stat-group:nth-of-type(2)") as HTMLElement;
            if (unrestSection) {
              unrestSection.outerHTML = this.renderUnrest();
            }
          }
          
          // Trigger any update callbacks
          const updateCallback = (window as any).updateKingdomStats;
          if (updateCallback) {
            updateCallback();
          }
        }
      };
    }
  }
  
  private saveKingdomName(
    nameText: HTMLElement | null, 
    nameInput: HTMLInputElement | null, 
    editBtn: HTMLElement | null
  ): void {
    if (nameInput && nameInput.value.trim()) {
      this.kingdomName = nameInput.value.trim();
      if (nameText) nameText.textContent = this.kingdomName;
      
      // Store in browser's localStorage for persistence
      window.localStorage.setItem("kingdomName", this.kingdomName);
    }
    this.switchToViewMode(nameText, nameInput, editBtn);
  }
  
  private switchToViewMode(
    nameText: HTMLElement | null,
    nameInput: HTMLInputElement | null,
    editBtn: HTMLElement | null
  ): void {
    if (nameText) nameText.style.display = "block";
    if (nameInput) nameInput.style.display = "none";
    if (editBtn) editBtn.style.display = "flex";
  }
  
  private saveWarStatus(isAtWar: boolean): void {
    window.localStorage.setItem("kingdomWarStatus", isAtWar ? "war" : "peace");
  }
  
  private loadWarStatus(): boolean {
    return window.localStorage.getItem("kingdomWarStatus") === "war";
  }
  
  private updatePhaseContent(): void {
    // Update the phase content area if it exists
    const phaseContentArea = document.querySelector(".phase-content-scrollable");
    if (phaseContentArea && this.kingdomState && this.turnManager) {
      // Check if we're in Status Phase (Phase I)
      if (this.kingdomState.currentPhase === TurnPhase.PHASE_I) {
        // Re-render the Status Phase content
        // This would be done by the StatusPhase component
        // For now, just trigger any update callbacks
        const updateCallback = (window as any).updatePhaseContent;
        if (updateCallback) {
          updateCallback();
        }
      }
    }
    
    // Also update the resource summary in the turn header
    const resourceSummary = document.querySelector(".resource-summary");
    if (resourceSummary && this.kingdomState) {
      const fameSpan = resourceSummary.querySelector(".resource-item:first-child");
      if (fameSpan) {
        fameSpan.innerHTML = html`<i class="fas fa-star"></i> Fame: ${this.kingdomState.fame}`;
      }
    }
  }
}
