<script lang="ts">
   import type { KingdomState } from '../../../models/KingdomState';
   
   export let state: KingdomState;
   
   // Format resource display
   function formatResource(amount: number): string {
      return amount.toString();
   }
   
   // Get control DC modifier
   function getControlDCModifier(): string {
      const modifier = state.controlDC - 15;
      return modifier >= 0 ? `+${modifier}` : modifier.toString();
   }
</script>

<div class="kingdom-stats">
   <h3>Kingdom Stats</h3>
   
   <!-- Core Stats -->
   <div class="stat-group">
      <div class="stat-row">
         <span class="stat-label">Economy</span>
         <span class="stat-value">{state.economy}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">Stability</span>
         <span class="stat-value">{state.stability}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">Culture</span>
         <span class="stat-value">{state.culture}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">Loyalty</span>
         <span class="stat-value">{state.loyalty}</span>
      </div>
   </div>
   
   <hr />
   
   <!-- Kingdom Info -->
   <div class="stat-group">
      <div class="stat-row">
         <span class="stat-label">Size</span>
         <span class="stat-value">{state.size}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">Control DC</span>
         <span class="stat-value">{state.controlDC} ({getControlDCModifier()})</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">Fame</span>
         <span class="stat-value">{state.fame}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">Unrest</span>
         <span class="stat-value" class:danger={state.unrest > 5}>
            {state.unrest}
            {#if state.imprisonedUnrest > 0}
               <span class="imprisoned">(+{state.imprisonedUnrest} imprisoned)</span>
            {/if}
         </span>
      </div>
   </div>
   
   <hr />
   
   <!-- Resources -->
   <div class="stat-group">
      <h4>Resources</h4>
      <div class="stat-row">
         <span class="stat-label">
            <i class="fas fa-coins"></i> Gold
         </span>
         <span class="stat-value">{formatResource(state.resources.get('gold') || 0)}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">
            <i class="fas fa-drumstick-bite"></i> Food
         </span>
         <span class="stat-value">{formatResource(state.resources.get('food') || 0)}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">
            <i class="fas fa-tree"></i> Lumber
         </span>
         <span class="stat-value">{formatResource(state.resources.get('lumber') || 0)}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">
            <i class="fas fa-cube"></i> Stone
         </span>
         <span class="stat-value">{formatResource(state.resources.get('stone') || 0)}</span>
      </div>
      <div class="stat-row">
         <span class="stat-label">
            <i class="fas fa-gem"></i> Ore
         </span>
         <span class="stat-value">{formatResource(state.resources.get('ore') || 0)}</span>
      </div>
   </div>
   
   <hr />
   
   <!-- Turn Info -->
   <div class="stat-group">
      <div class="stat-row">
         <span class="stat-label">Turn</span>
         <span class="stat-value">{state.currentTurn}</span>
      </div>
      <div class="stat-row full-width">
         <span class="stat-label">Phase</span>
         <span class="phase-name">{state.currentPhase}</span>
      </div>
   </div>
   
   {#if state.isAtWar}
      <div class="war-status">
         <i class="fas fa-exclamation-triangle"></i>
         Kingdom at War!
      </div>
   {/if}
</div>

<style lang="scss">
   .kingdom-stats {
      color: var(--color-text-light-primary, #191813);
      font-size: 0.9em;
      
      h3 {
         margin: 0 0 10px 0;
         font-size: 1.2em;
         text-align: center;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      h4 {
         margin: 5px 0;
         font-size: 1em;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   .stat-group {
      margin-bottom: 10px;
   }
   
   .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 5px;
      border-radius: 3px;
      
      &:hover {
         background: rgba(0, 0, 0, 0.05);
      }
      
      &.full-width {
         flex-direction: column;
         align-items: flex-start;
         gap: 2px;
      }
   }
   
   .stat-label {
      font-weight: 600;
      color: var(--color-text-dark-secondary, #7a7971);
      display: flex;
      align-items: center;
      gap: 5px;
      
      i {
         width: 16px;
         text-align: center;
      }
   }
   
   .stat-value {
      font-weight: bold;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &.danger {
         color: #cc3311;
      }
      
      .imprisoned {
         font-size: 0.85em;
         color: var(--color-text-dark-secondary, #7a7971);
         font-weight: normal;
      }
   }
   
   .phase-name {
      font-size: 0.9em;
      color: var(--color-text-dark-primary, #b5b3a4);
      font-weight: 500;
   }
   
   .war-status {
      background: rgba(204, 51, 17, 0.2);
      color: #cc3311;
      padding: 8px;
      border-radius: 5px;
      text-align: center;
      margin-top: 10px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
   }
   
   hr {
      margin: 10px 0;
      border: none;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
   }
</style>
