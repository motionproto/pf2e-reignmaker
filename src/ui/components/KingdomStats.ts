// Kingdom Statistics UI component for PF2e Kingdom Lite
// Displays kingdom ability scores and core statistics

import { html } from '../html-helpers';
import { KingdomState } from '../../models/KingdomState';
import { TurnManager } from '../../models/TurnManager';
import { KingdomStatsStyles } from '../styles/KingdomStatsStyles';

/**
 * Kingdom Statistics sidebar component
 * Displays the core kingdom ability scores and statistics
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
  }
  
  /**
   * Calculate ability modifier from ability score
   * Same as D&D/Pathfinder: (score - 10) / 2
   */
  private calculateModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Format modifier for display
   */
  private formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }
  
  render(): string {
    // Include styles
    const styles = `<style>${KingdomStatsStyles.getStyles()}</style>`;
    
    // Calculate ability modifiers
    const cultureModifier = this.calculateModifier(this.kingdomState.culture);
    const economyModifier = this.calculateModifier(this.kingdomState.economy);
    const loyaltyModifier = this.calculateModifier(this.kingdomState.loyalty);
    const stabilityModifier = this.calculateModifier(this.kingdomState.stability);
    
    return html`
      ${styles}
      <div class="kingdom-stats-container">
        <div class="kingdom-name-header">
          <h3 id="kingdom-name-text">${this.kingdomName}</h3>
          <input id="kingdom-name-input" type="text" value="${this.kingdomName}" style="display: none;">
          <span id="kingdom-edit-btn" title="Edit kingdom name">
            <i class="fa-solid fa-pen-fancy"></i>
          </span>
        </div>
        
        <div class="kingdom-stats-scrollable">
          <div class="kingdom-stats-content">
            
            <!-- Ability Scores Section -->
            <div class="stat-group" style="border-top: none; margin-top: 0;">
              <h4 class="stat-group-header">Ability Scores</h4>
              
              <div class="ability-scores-grid">
                <!-- Culture -->
                <div class="ability-score-container">
                  <div class="ability-score-label">Culture</div>
                  <div class="ability-score-value-box">
                    <div class="ability-score-value">${this.kingdomState.culture || 10}</div>
                    <div class="ability-score-modifier ${cultureModifier >= 0 ? 'positive' : 'negative'}">
                      ${this.formatModifier(cultureModifier)}
                    </div>
                  </div>
                </div>
                
                <!-- Economy -->
                <div class="ability-score-container">
                  <div class="ability-score-label">Economy</div>
                  <div class="ability-score-value-box">
                    <div class="ability-score-value">${this.kingdomState.economy || 10}</div>
                    <div class="ability-score-modifier ${economyModifier >= 0 ? 'positive' : 'negative'}">
                      ${this.formatModifier(economyModifier)}
                    </div>
                  </div>
                </div>
                
                <!-- Loyalty -->
                <div class="ability-score-container">
                  <div class="ability-score-label">Loyalty</div>
                  <div class="ability-score-value-box">
                    <div class="ability-score-value">${this.kingdomState.loyalty || 10}</div>
                    <div class="ability-score-modifier ${loyaltyModifier >= 0 ? 'positive' : 'negative'}">
                      ${this.formatModifier(loyaltyModifier)}
                    </div>
                  </div>
                </div>
                
                <!-- Stability -->
                <div class="ability-score-container">
                  <div class="ability-score-label">Stability</div>
                  <div class="ability-score-value-box">
                    <div class="ability-score-value">${this.kingdomState.stability || 10}</div>
                    <div class="ability-score-modifier ${stabilityModifier >= 0 ? 'positive' : 'negative'}">
                      ${this.formatModifier(stabilityModifier)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Kingdom Stats -->
            <div class="stat-group">
              <h4 class="stat-group-header">Kingdom Stats</h4>
              <div>
                <div class="stat-item">
                  <label>Control DC:</label>
                  <span class="stat-value">${this.kingdomState.controlDC || 15}</span>
                </div>
                <div class="stat-item">
                  <label>Size:</label>
                  <span class="stat-value">${this.kingdomState.size || 0} hexes</span>
                </div>
                <div class="stat-item">
                  <label>Unrest:</label>
                  <span class="stat-value" style="${this.kingdomState.unrest > 0 ? 'color: #ff6b6b;' : ''}">
                    ${this.kingdomState.unrest || 0}
                  </span>
                </div>
                ${this.kingdomState.imprisonedUnrest > 0 ? html`
                  <div class="stat-item">
                    <label>Imprisoned:</label>
                    <span class="stat-value" style="color: #6c757d;">${this.kingdomState.imprisonedUnrest}</span>
                  </div>
                ` : ''}
                <div class="stat-item">
                  <label>Fame:</label>
                  <span class="stat-value">${this.kingdomState.fame || 0}</span>
                </div>
              </div>
            </div>
            
            <!-- Resources -->
            <div class="stat-group">
              <h4 class="stat-group-header">Resources</h4>
              <div>
                <div class="stat-item">
                  <label>Gold:</label>
                  <span class="stat-value" id="kingdom-gold-value">${this.kingdomState.resources.get("gold") || 0}</span>
                </div>
                <div class="stat-item">
                  <label>Food:</label>
                  <span class="stat-value" id="kingdom-food-value">${this.kingdomState.resources.get("food") || 0}</span>
                </div>
                <div class="resource-grid">
                  <div class="resource-item">
                    <label>Lumber:</label>
                    <span>${this.kingdomState.resources.get("lumber") || 0}</span>
                  </div>
                  <div class="resource-item">
                    <label>Stone:</label>
                    <span>${this.kingdomState.resources.get("stone") || 0}</span>
                  </div>
                  <div class="resource-item">
                    <label>Ore:</label>
                    <span>${this.kingdomState.resources.get("ore") || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Settlements -->
            <div class="stat-group">
              <h4 class="stat-group-header">Settlements</h4>
              <div>
                <div class="stat-item">
                  <label>Total:</label>
                  <span class="stat-value">${this.kingdomState.settlements.length}</span>
                </div>
                <div class="stat-item">
                  <label>Villages:</label>
                  <span class="stat-value">${this.kingdomState.settlements.filter(s => s.tier === 'Village').length}</span>
                </div>
                <div class="stat-item">
                  <label>Towns:</label>
                  <span class="stat-value">${this.kingdomState.settlements.filter(s => s.tier === 'Town').length}</span>
                </div>
                <div class="stat-item">
                  <label>Cities:</label>
                  <span class="stat-value">${this.kingdomState.settlements.filter(s => s.tier === 'City').length}</span>
                </div>
                <div class="stat-item">
                  <label>Metropolises:</label>
                  <span class="stat-value">${this.kingdomState.settlements.filter(s => s.tier === 'Metropolis').length}</span>
                </div>
              </div>
            </div>
            
            <!-- Turn Info -->
            <div class="stat-group">
              <h4 class="stat-group-header">Turn ${this.kingdomState.currentTurn}</h4>
              <div>
                <div class="stat-item">
                  <label>Current Phase:</label>
                  <span class="stat-value" style="font-size: 0.9em;">
                    ${this.kingdomState.currentPhase.split(':')[0]}
                  </span>
                </div>
                <div class="stat-item">
                  <label>War Status:</label>
                  <span class="stat-value ${this.kingdomState.isAtWar ? 'at-war' : ''}">
                    ${this.kingdomState.isAtWar ? 'At War' : 'Peace'}
                  </span>
                </div>
              </div>
            </div>
            
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
}
