// Events Phase UI component for PF2e Kingdom Lite
// Auto-converted and fixed from EventsPhase.kt

import { html } from '../html-helpers';
import { KingdomState } from '../../models/KingdomState';
import { TurnManager } from '../../models/TurnManager';
import { EventStyles } from '../styles/EventStyles';
import { KingdomEvent, EventOutcome } from '../../models/Events';

/**
 * Events Phase content for the Kingdom Sheet
 * Handles checking for kingdom events and resolving them
 */
export class EventsPhase {
  private kingdomState: KingdomState;
  private turnManager: TurnManager;
  
  constructor(kingdomState: KingdomState, turnManager: TurnManager) {
    this.kingdomState = kingdomState;
    this.turnManager = turnManager;
  }
  
  render(): string {
    const currentEvent = this.kingdomState.currentEvent;
    
    // Include event styles
    const styles = `<style>${EventStyles.getStyles()}</style>`;
    
    return html`
      ${styles}
      ${currentEvent == null 
        ? this.renderStabilityCheck()
        : this.renderEventCard(currentEvent)}
    `;
  }
  
  private renderStabilityCheck(): string {
    const continuousEvents = this.kingdomState.continuousEvents || [];
    
    // Set up the stability check handler
    (window as any).performStabilityCheck = () => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const dc = this.kingdomState.eventDC || 16;
      const success = roll >= dc;
      const resultDiv = document.getElementById("event-check-result");
      
      if (success) {
        // Event triggered!
        this.kingdomState.eventDC = 16; // Reset DC
        const event = this.kingdomState.eventManager?.getRandomEvent();
        if (event && resultDiv) {
          this.kingdomState.currentEvent = event;
          resultDiv.innerHTML = html`
            <div class="roll-result success">
              <strong>Event Triggered!</strong> (Rolled ${roll} vs DC ${dc})
              <div>Drawing event card...</div>
            </div>
          `;
          
          // Refresh the phase display after a short delay
          window.setTimeout(() => {
            const phaseContent = document.querySelector(".phase-content");
            if (phaseContent) {
              phaseContent.innerHTML = this.render();
            }
          }, 1500);
        }
      } else {
        // No event this turn
        this.kingdomState.eventDC = Math.max(6, (this.kingdomState.eventDC || 16) - 5);
        if (resultDiv) {
          resultDiv.innerHTML = html`
            <div class="roll-result failure">
              <strong>No Event</strong> (Rolled ${roll} vs DC ${dc})
              <div>DC reduced to ${this.kingdomState.eventDC} for next turn.</div>
            </div>
          `;
        }
      }
    };
    
    return html`
      <div class="event-phase-container">
        <div class="stability-check-section">
          <h3>Kingdom Events Check</h3>
          <p class="event-description">
            The kingdom must make a Stability Check to see if an event occurs this turn.
          </p>
          <div class="dc-info">
            <span class="dc-label">Event DC:</span>
            <span class="dc-value">${this.kingdomState.eventDC || 16}</span>
          </div>
          <button class="btn-primary event-check-btn" onclick="window.performStabilityCheck()">
            <i class="fas fa-dice-d20"></i> Roll Stability Check
          </button>
          <div id="event-check-result" class="check-result-display"></div>
        </div>
        
        ${continuousEvents.length > 0 ? html`
          <div class="continuous-events-section">
            <h4>Ongoing Events</h4>
            <div class="continuous-events-list">
              ${continuousEvents.map(event => html`
                <div class="continuous-event-item">
                  <span class="event-name">${event.name}</span>
                  <span class="event-trait ${event.traits?.[0] || ''}">${event.traits?.[0] || ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  private renderEventCard(event: KingdomEvent): string {
    // Set up event resolution handler
    (window as any).resolveEventWithSkill = (skill: string) => {
      // Get party level for DC (defaulting to 3 if not available)
      const partyLevel = ((window as any).game?.pf2e?.party?.level as number | null) ?? 3;
      
      // Calculate DC based on party level
      let dc = 15;
      switch (partyLevel) {
        case 1: dc = 15; break;
        case 2: dc = 16; break;
        case 3: dc = 18; break;
        case 4: dc = 19; break;
        case 5: dc = 20; break;
        case 6: dc = 22; break;
        case 7: dc = 23; break;
        case 8: dc = 24; break;
        case 9: dc = 26; break;
        case 10: dc = 27; break;
        default: dc = 15 + partyLevel; break;
      }
      
      // Roll the check (simplified - in real game would use character modifiers)
      const roll = Math.floor(Math.random() * 20) + 1;
      const modifier = 5; // Base modifier, would come from character sheet
      const unrestPenalty = this.turnManager.getUnrestPenalty();
      const total = roll + modifier + unrestPenalty;
      
      // Determine outcome
      let outcome: EventOutcome | null = null;
      if (total >= dc + 10) {
        outcome = event.criticalSuccess;
      } else if (total >= dc) {
        outcome = event.success;
      } else if (total <= dc - 10) {
        outcome = event.criticalFailure;
      } else {
        outcome = event.failure;
      }
      
      // Apply effects
      if (outcome) {
        this.applyEventOutcome(outcome);
      }
      
      // Display result
      const resultDiv = document.getElementById("event-resolution-result");
      if (resultDiv && outcome) {
        const effects: string[] = [];
        
        if (outcome.goldChange && outcome.goldChange !== 0) {
          effects.push(`${outcome.goldChange > 0 ? '+' : ''}${outcome.goldChange} Gold`);
        }
        if (outcome.unrestChange && outcome.unrestChange !== 0) {
          effects.push(`${outcome.unrestChange > 0 ? '+' : ''}${outcome.unrestChange} Unrest`);
        }
        if (outcome.fameChange && outcome.fameChange !== 0) {
          effects.push(`${outcome.fameChange > 0 ? '+' : ''}${outcome.fameChange} Fame`);
        }
        if (outcome.resourceChanges) {
          outcome.resourceChanges.forEach((amount, resource) => {
            if (amount !== 0) {
              effects.push(`${amount > 0 ? '+' : ''}${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`);
            }
          });
        }
        
        resultDiv.innerHTML = html`
          <div class="resolution-result">
            <div class="roll-display">
              <strong>${skill} Check:</strong> Rolled ${roll} + ${modifier} ${unrestPenalty < 0 ? `${unrestPenalty} (unrest)` : ''} = ${total} vs DC ${dc}
            </div>
            <div class="outcome-message ${total >= dc ? 'success' : 'failure'}">
              ${outcome.message}
            </div>
            <div class="outcome-effects">
              ${effects.length > 0 ? effects.join(' | ') : ''}
            </div>
            <button class="btn-primary" onclick="window.completeEventResolution()">
              Continue
            </button>
          </div>
        `;
        
        // Mark event as resolved if not continuous
        if (!event.isContinuous || outcome === event.criticalSuccess || outcome === event.success) {
          this.kingdomState.currentEvent = null;
        } else {
          // Add to continuous events if it persists
          if (!this.kingdomState.continuousEvents) {
            this.kingdomState.continuousEvents = [];
          }
          if (!this.kingdomState.continuousEvents.includes(event)) {
            this.kingdomState.continuousEvents.push(event);
          }
        }
      }
    };
    
    // Complete event resolution handler
    (window as any).completeEventResolution = () => {
      this.kingdomState.currentEvent = null;
      const phaseContent = document.querySelector(".phase-content");
      if (phaseContent) {
        phaseContent.innerHTML = this.render();
      }
      
      // Update kingdom stats display
      const updateCallback = (window as any).updateKingdomStats;
      if (updateCallback) {
        updateCallback();
      }
    };
    
    return html`
      <div class="event-phase-container">
        <div class="event-card">
          <div class="event-header">
            <h3 class="event-title">${event.name}</h3>
            <div class="event-traits">
              ${event.traits ? event.traits.map(trait => 
                html`<span class="event-trait ${trait}">${trait}</span>`
              ).join('') : ''}
            </div>
          </div>
          
          ${event.imagePath ? html`
            <div class="event-image-container">
              <img src="${event.imagePath}" alt="${event.name}" class="event-image">
            </div>
          ` : ''}
          
          <div class="event-body">
            <p class="event-description">${event.description}</p>
            
            ${event.special ? html`
              <div class="event-special">
                <i class="fas fa-info-circle"></i> ${event.special}
              </div>
            ` : ''}
            
            <div class="event-resolution">
              <h4>Choose Your Response:</h4>
              <div class="skill-options">
                ${event.skills ? event.skills.map(skill => html`
                  <button class="skill-btn" onclick="window.resolveEventWithSkill('${skill}')">
                    <i class="fas fa-dice-d20"></i> ${skill}
                  </button>
                `).join('') : ''}
              </div>
            </div>
            
            <div id="event-resolution-result" class="event-result-display"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  private applyEventOutcome(outcome: EventOutcome): void {
    // Apply gold change
    if (outcome.goldChange && outcome.goldChange !== 0) {
      const currentGold = this.kingdomState.resources.get("gold") || 0;
      this.kingdomState.resources.set("gold", currentGold + outcome.goldChange);
    }
    
    // Apply unrest change
    if (outcome.unrestChange && outcome.unrestChange !== 0) {
      this.kingdomState.unrest = Math.max(0, this.kingdomState.unrest + outcome.unrestChange);
    }
    
    // Apply fame change
    if (outcome.fameChange && outcome.fameChange !== 0) {
      this.kingdomState.fame = Math.max(0, Math.min(3, this.kingdomState.fame + outcome.fameChange));
    }
    
    // Apply resource changes
    if (outcome.resourceChanges) {
      outcome.resourceChanges.forEach((amount, resource) => {
        const current = this.kingdomState.resources.get(resource) || 0;
        this.kingdomState.resources.set(resource, Math.max(0, current + amount));
      });
    }
  }
}
