<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import { kingdomData } from '../../../stores/KingdomStore';
   import Button from './baseComponents/Button.svelte';
   
   export let outcome: string;
   export let actorName: string;
   export let skillName: string | undefined = undefined;
   export let effect: string;
   export let stateChanges: Record<string, any> | undefined = undefined;
   export const rerollEnabled: boolean = false; // Unused - marked as const
   export const rerollLabel: string = "Reroll"; // Unused - marked as const
   export const rerollCount: number | undefined = undefined; // Unused - marked as const
   export let primaryButtonLabel: string = "OK";
   export let compact: boolean = false;
   export let showFameReroll: boolean = true; // New prop to control fame reroll visibility
   export let showCancel: boolean = true; // New prop to control cancel button visibility
   export let applied: boolean = false; // New prop to auto-hide buttons when outcome is applied
   
   const dispatch = createEventDispatcher();
   
   // Get fame from kingdom state
   $: currentFame = $kingdomData?.fame || 0;
   
   // Get outcome display properties
   $: outcomeProps = getOutcomeProps(outcome);
   
   // Automatically derive button visibility based on applied state
   $: showCancelButton = showCancel && !applied;
   $: showFameRerollButton = showFameReroll && !applied;
   $: effectivePrimaryLabel = applied ? '' : primaryButtonLabel;
   
   function getOutcomeProps(outcomeType: string) {
      switch(outcomeType) {
         case 'criticalSuccess':
            return { icon: 'fas fa-star', label: 'Critical Success', colorClass: 'critical-success' };
         case 'success':
            return { icon: 'fas fa-thumbs-up', label: 'Success', colorClass: 'success' };
         case 'failure':
            return { icon: 'fas fa-thumbs-down', label: 'Failure', colorClass: 'failure' };
         case 'criticalFailure':
            return { icon: 'fas fa-skull', label: 'Critical Failure', colorClass: 'critical-failure' };
         default:
            return { icon: 'fas fa-question', label: 'Unknown', colorClass: 'neutral' };
      }
   }
   
   function formatStateChangeLabel(key: string): string {
      const labels: Record<string, string> = {
         'gold': 'Gold',
         'unrest': 'Unrest',
         'fame': 'Fame',
         'food': 'Food',
         'wood': 'Wood',
         'stone': 'Stone',
         'metal': 'Metal',
         'lumber': 'Lumber',
         'ore': 'Ore',
         'hexesClaimed': 'Hexes Claimed',
         'structuresBuilt': 'Structures Built',
         'roadsBuilt': 'Roads Built',
         'armyRecruited': 'Army Recruited',
         'resources': 'Resources',
         'structureCostReduction': 'Structure Cost',
         'imprisonedUnrest': 'Imprisoned Unrest',
         'imprisonedUnrestRemoved': 'Prisoners Released',
         'settlementFounded': 'Settlement Founded',
         'armyLevel': 'Army Level',
         'meta': 'Next Action Bonus'
      };
      return labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
   }
   
   function formatStateChangeValue(change: any): string {
      if (typeof change === 'number') {
         return change > 0 ? `+${change}` : `${change}`;
      }
      if (typeof change === 'boolean') {
         return change ? 'Yes' : 'No';
      }
      if (typeof change === 'string') {
         return change;
      }
      if (typeof change === 'object' && change !== null) {
         // Handle aid bonus from aid-another action
         if (change.aidBonus !== undefined) {
            let bonusText = '';
            if (typeof change.aidBonus === 'number') {
               bonusText = change.aidBonus > 0 ? `+${change.aidBonus} circumstance bonus` : `${change.aidBonus} circumstance penalty`;
            } else {
               bonusText = String(change.aidBonus);
            }
            
            if (change.rerollOnFailure) {
               bonusText += ' (can reroll on failure)';
            }
            
            return bonusText;
         }
         if (change.nextActionBonus !== undefined) {
            return change.nextActionBonus > 0 ? `+${change.nextActionBonus}` : `${change.nextActionBonus}`;
         }
         if (change.from !== undefined && change.to !== undefined) {
            return `${change.from} → ${change.to}`;
         }
         if (change.added) {
            return `+${change.added}`;
         }
         if (change.removed) {
            return `-${change.removed}`;
         }
      }
      return String(change);
   }
   
   function getChangeClass(change: any, key?: string): string {
      const negativeBenefitKeys = ['unrest', 'cost', 'damage', 'imprisoned'];
      const isNegativeBenefit = key && negativeBenefitKeys.some(k => key.toLowerCase().includes(k));
      
      if (typeof change === 'number') {
         if (isNegativeBenefit) {
            return change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral';
         }
         return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      }
      
      if (typeof change === 'boolean') {
         return change ? 'positive' : 'neutral';
      }
      
      if (typeof change === 'string') {
         if (change.includes('+') || change.includes('extra') || change.includes('double')) {
            return 'positive';
         }
         if (change.includes('half') || change.includes('50%')) {
            return key && key.includes('Cost') ? 'positive' : 'neutral';
         }
         if (change === 'all' || change === '1d4') {
            return key && key.includes('Removed') ? 'positive' : 'neutral';
         }
      }
      
      if (typeof change === 'object' && change !== null) {
         // Handle aid bonus from aid-another action
         if (change.aidBonus !== undefined) {
            if (typeof change.aidBonus === 'number' && change.aidBonus > 0) {
               return 'positive';
            } else if (typeof change.aidBonus === 'number' && change.aidBonus < 0) {
               return 'negative';
            }
            return 'neutral';
         }
         if (change.nextActionBonus !== undefined) {
            return change.nextActionBonus > 0 ? 'positive' : change.nextActionBonus < 0 ? 'negative' : 'neutral';
         }
         if (change.to > change.from) return 'positive';
         if (change.to < change.from) return 'negative';
         if (change.added) return 'positive';
         if (change.removed) return 'negative';
      }
      
      return 'neutral';
   }
   
   function handleReroll() {
      dispatch('reroll');
   }
   
   function handlePrimary() {
      dispatch('primary');
   }
   
   function handleCancel() {
      dispatch('cancel');
   }
</script>

<div class="resolution-display {outcomeProps.colorClass} {compact ? 'compact' : ''}">
   <div class="resolution-header">
      <div class="resolution-header-left">
         <i class={outcomeProps.icon}></i>
         <span>{outcomeProps.label}</span>
      </div>
      {#if actorName}
         <div class="resolution-header-right">
            {actorName}{#if skillName}&nbsp;used {skillName}{/if}
         </div>
      {/if}
   </div>
   
   <div class="resolution-details">
      {#if effect}
         <div class="resolution-effect">
            {effect}
         </div>
      {/if}
      
      {#if stateChanges && Object.keys(stateChanges).length > 0}
         <div class="state-changes">
            <div class="state-changes-list">
               {#each Object.entries(stateChanges) as [key, change]}
                  <div class="state-change-item">
                     <span class="change-label">{formatStateChangeLabel(key)}:</span>
                     <span class="change-value {getChangeClass(change, key)}">
                        {formatStateChangeValue(change)}
                     </span>
                  </div>
               {/each}
            </div>
         </div>
      {/if}
   </div>
   
   {#if showCancelButton || showFameRerollButton || effectivePrimaryLabel}
      <div class="resolution-actions">
         {#if showCancelButton}
            <Button
               variant="outline"
               on:click={handleCancel}
               icon="fas fa-times"
               iconPosition="left"
            >
               Cancel
            </Button>
         {/if}
         <div class="resolution-actions-main">
            {#if showFameRerollButton}
               <Button
                  variant="secondary"
                  disabled={currentFame === 0}
                  on:click={handleReroll}
                  icon="fas fa-star"
                  iconPosition="left"
               >
                  Reroll with Fame
                  <span class="fame-count">({currentFame} left)</span>
               </Button>
            {/if}
            {#if effectivePrimaryLabel}
               <Button
                  variant="secondary"
                  on:click={handlePrimary}
                  icon="fas fa-check"
                  iconPosition="left"
               >
                  {effectivePrimaryLabel}
               </Button>
            {/if}
         </div>
      </div>
   {/if}
</div>

<style lang="scss">
   .resolution-display {
      margin: 20px 0;
      padding: 0;
      border-radius: var(--radius-md);
      border: 2px solid var(--border-strong);
      background: linear-gradient(135deg, 
         rgba(0, 0, 0, 0.4),
         rgba(0, 0, 0, 0.2));
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      position: relative;
      
      &.compact {
         margin: 12px 0;
         border-width: 1px;
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
         
         .resolution-header {
            padding: 10px 14px;
         }
         
         .resolution-details {
            padding: 12px;
            gap: 10px;
         }
         
         .resolution-actions {
            padding: 12px;
         }
      }
      
      &::before {
         content: '';
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         height: 4px;
         background: linear-gradient(90deg, 
            transparent,
            currentColor,
            transparent);
         opacity: 0.6;
      }
      
      &.critical-success {
         background: linear-gradient(135deg,
            rgba(34, 197, 94, 0.15),
            rgba(34, 197, 94, 0.05));
         border-color: rgba(34, 197, 94, 0.5);
         
         &::before {
            color: var(--color-green);
         }
         
         .resolution-header-left {
            color: var(--color-green);
         }
      }
      
      &.success {
         background: linear-gradient(135deg,
            rgba(34, 197, 94, 0.1),
            rgba(34, 197, 94, 0.02));
         border-color: rgba(34, 197, 94, 0.35);
         
         &::before {
            color: var(--color-green-light);
         }
         
         .resolution-header-left {
            color: var(--color-green-light);
         }
      }
      
      &.failure {
         background: linear-gradient(135deg,
            rgba(249, 115, 22, 0.1),
            rgba(249, 115, 22, 0.02));
         border-color: rgba(249, 115, 22, 0.35);
         
         &::before {
            color: var(--color-orange);
         }
         
         .resolution-header-left {
            color: var(--color-orange);
         }
      }
      
      &.critical-failure {
         background: linear-gradient(135deg,
            rgba(239, 68, 68, 0.15),
            rgba(239, 68, 68, 0.05));
         border-color: rgba(239, 68, 68, 0.5);
         
         &::before {
            color: var(--color-red);
         }
         
         .resolution-header-left {
            color: var(--color-red);
         }
      }
   }
   
   .resolution-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid var(--border-subtle);
      
      .resolution-header-left {
         display: flex;
         align-items: center;
         gap: 10px;
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         
         i {
            font-size: 20px;
         }
         
         span {
            text-transform: capitalize;
         }
      }
      
      .resolution-header-right {
         color: var(--text-secondary);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
      }
   }
   
   .resolution-details {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      
      .resolution-effect {
         color: var(--text-primary);
         font-size: var(--font-md);
         line-height: 1.6;
         padding: 14px 16px;
         background: rgba(255, 255, 255, 0.03);
         border-radius: var(--radius-sm);
         border: 1px solid var(--border-subtle);
      }
      
      .state-changes {
         margin-top: 0;
      }
      
      .state-changes-list {
         display: grid;
         grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
         gap: 8px;
      }
      
      .state-change-item {
         display: flex;
         align-items: center;
         justify-content: space-between;
         padding: 8px 12px;
         background: rgba(0, 0, 0, 0.15);
         border: 1px solid var(--border-subtle);
         border-radius: var(--radius-sm);
         font-size: var(--font-md);
         
         .change-label {
            color: var(--text-secondary);
            font-weight: var(--font-weight-medium);
            font-size: calc(var(--font-md) * 0.95);
         }
         
         .change-value {
            font-weight: var(--font-weight-bold);
            font-family: var(--font-code, monospace);
            font-size: calc(var(--font-md) * 1.1);
            padding: 2px 6px;
            border-radius: 3px;
            
            &.positive {
               color: var(--color-green);
               background: rgba(34, 197, 94, 0.1);
               border: 1px solid rgba(34, 197, 94, 0.2);
            }
            
            &.negative {
               color: var(--color-red);
               background: rgba(239, 68, 68, 0.1);
               border: 1px solid rgba(239, 68, 68, 0.2);
            }
            
            &.neutral {
               color: var(--text-primary);
               background: rgba(255, 255, 255, 0.05);
               border: 1px solid var(--border-subtle);
            }
         }
      }
   }
   
   .resolution-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid var(--border-subtle);
      
      // Cancel button stays on the left
      > :global(.button.outline) {
         flex: 0 0 auto;
         margin-right: auto;
         opacity: 0.7;
         
         &:hover {
            opacity: 1;
         }
      }
      
      // Main action buttons group on the right
      .resolution-actions-main {
         display: flex;
         gap: 12px;
         flex: 1;
         justify-content: flex-end;
         
         // Main buttons can expand to equal width
         :global(.button) {
            flex: 0 1 auto;
            min-width: 120px;
         }
      }
   }
</style>
