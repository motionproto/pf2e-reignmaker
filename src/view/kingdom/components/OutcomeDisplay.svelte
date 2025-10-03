<script lang="ts">
   import { createEventDispatcher } from 'svelte';
   import { kingdomData } from '../../../stores/KingdomStore';
   import Button from './baseComponents/Button.svelte';
   
   export let outcome: string;
   export let actorName: string;
   export let skillName: string | undefined = undefined;
   export let effect: string;
   export let stateChanges: Record<string, any> | undefined = undefined;
   export let modifiers: any[] | undefined = undefined; // Raw modifiers for resource array detection
   export let manualEffects: string[] | undefined = undefined; // Manual effects from EventOutcome
   export const rerollEnabled: boolean = false; // Unused - marked as const
   export const rerollLabel: string = "Reroll"; // Unused - marked as const
   export const rerollCount: number | undefined = undefined; // Unused - marked as const
   export let primaryButtonLabel: string = "OK";
   export let compact: boolean = false;
   export let showFameReroll: boolean = true; // New prop to control fame reroll visibility
   export let showCancel: boolean = true; // New prop to control cancel button visibility
   export let applied: boolean = false; // New prop to auto-hide buttons when outcome is applied
   export let choices: any[] | undefined = undefined; // Optional choice buttons
   
   const dispatch = createEventDispatcher();
   
   // Choice selection state
   let selectedChoice: number | null = null;
   let choiceResult: { effect: string; stateChanges: Record<string, any> } | null = null;
   
   // Resource array selection state
   let resourceArrayModifiers: any[] = [];
   let selectedResources: Map<number, string> = new Map(); // Map modifier index to selected resource
   
   // Dice formula detection regex
   const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;
   
   // Get fame from kingdom state
   $: currentFame = $kingdomData?.fame || 0;
   
   // Get outcome display properties
   $: outcomeProps = getOutcomeProps(outcome);
   
   // Detect resource-array modifiers
   $: resourceArrayModifiers = detectResourceArrayModifiers(modifiers);
   $: hasResourceArrays = resourceArrayModifiers.length > 0;
   $: resourceArraysResolved = hasResourceArrays && resourceArrayModifiers.every((_, idx) => selectedResources.has(idx));
   
   // Manual effects from EventOutcome.manualEffects array (not modifiers)
   $: hasManualEffects = manualEffects && manualEffects.length > 0;
   
   // Determine if choices are present (explicit choice buttons)
   $: hasChoices = choices && choices.length > 0;
   $: choicesResolved = hasChoices && selectedChoice !== null;
   
   // Automatically derive button visibility based on applied state
   $: showCancelButton = showCancel && !applied;
   $: showFameRerollButton = showFameReroll && !applied && !hasChoices && !hasResourceArrays;
   $: effectivePrimaryLabel = applied ? '' : primaryButtonLabel;
   $: primaryButtonDisabled = (hasChoices && !choicesResolved) || (hasResourceArrays && !resourceArraysResolved);
   
   // Display effective message and state changes (choice result overrides original, resource selections augment)
   $: displayEffect = choiceResult ? choiceResult.effect : effect;
   $: displayStateChanges = getDisplayStateChanges();
   
   function getDisplayStateChanges() {
      if (choiceResult) return choiceResult.stateChanges;
      
      // If we have resource array selections, merge them with stateChanges
      if (hasResourceArrays && resourceArraysResolved) {
         const merged = { ...(stateChanges || {}) };
         resourceArrayModifiers.forEach((modifier, idx) => {
            const selectedResource = selectedResources.get(idx);
            if (selectedResource) {
               merged[selectedResource] = (merged[selectedResource] || 0) + modifier.value;
            }
         });
         return merged;
      }
      
      return stateChanges;
   }
   
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
      if (hasChoices && selectedChoice === null) {
         // Don't allow primary action until a choice is made
         return;
      }
      
      if (hasResourceArrays && !resourceArraysResolved) {
         // Don't allow primary action until all resource arrays are resolved
         return;
      }
      
      // Include both choice selections and resource array selections in the dispatch
      const eventData: any = {};
      
      if (selectedChoice !== null && choices) {
         eventData.choiceIndex = selectedChoice;
         eventData.choice = choices[selectedChoice];
      }
      
      if (hasResourceArrays && resourceArraysResolved) {
         eventData.resourceSelections = Object.fromEntries(selectedResources);
      }
      
      dispatch('primary', eventData);
   }
   
   // Detect modifiers with resource arrays
   function detectResourceArrayModifiers(modifiers: any[] | undefined): any[] {
      if (!modifiers) return [];
      return modifiers.filter(m => Array.isArray(m.resource));
   }
   
   // Handle resource selection from dropdown
   function handleResourceSelect(modifierIndex: number, resourceType: string) {
      const newSelections = new Map(selectedResources);
      newSelections.set(modifierIndex, resourceType);
      selectedResources = newSelections;
      
      // Dispatch event to notify parent
      dispatch('resourceSelected', {
         modifierIndex,
         resourceType,
         allSelections: Object.fromEntries(selectedResources)
      });
   }
   
   function handleChoiceSelect(index: number) {
      if (selectedChoice === index) {
         // Deselect if clicking the same choice
         selectedChoice = null;
         choiceResult = null;
         return;
      }
      
      selectedChoice = index;
      const choice = choices![index];
      
      // Roll all dice formulas in modifiers
      const resourceValues: Record<string, number> = {};
      
      if (choice.modifiers) {
         for (const modifier of choice.modifiers) {
            const value = modifier.value;
            
            // Check if value is a dice formula
            if (typeof value === 'string' && DICE_PATTERN.test(value)) {
               // Roll the dice
               const rolled = rollDiceFormula(value);
               resourceValues[modifier.resource] = rolled;
            } else if (typeof value === 'number') {
               resourceValues[modifier.resource] = value;
            }
         }
      }
      
      // Replace {resource} placeholders in label with rolled values
      let resultLabel = choice.label;
      for (const [resource, value] of Object.entries(resourceValues)) {
         resultLabel = resultLabel.replace(new RegExp(`\\{${resource}\\}`, 'g'), String(Math.abs(value)));
      }
      
      choiceResult = {
         effect: resultLabel,
         stateChanges: resourceValues
      };
      
      // Dispatch choice event
      dispatch('choiceSelected', { 
         choiceIndex: index,
         choice: choice,
         result: choiceResult
      });
   }
   
   // Dice roller for formulas like "1d4", "2d6+1", "-1d4", "-2d6-1"
   function rollDiceFormula(formula: string): number {
      // Handle negative prefix
      const isNegative = formula.startsWith('-');
      const cleanFormula = isNegative ? formula.substring(1) : formula;
      
      // Parse the dice formula
      const match = cleanFormula.match(/(\d+)d(\d+)(?:([+-])(\d+))?/i);
      if (!match) {
         console.error(`Invalid dice formula: ${formula}`);
         return 0;
      }
      
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const bonusSign = match[3]; // '+' or '-'
      const bonusValue = match[4] ? parseInt(match[4]) : 0;
      
      // Calculate bonus
      let bonus = 0;
      if (bonusSign === '+') {
         bonus = bonusValue;
      } else if (bonusSign === '-') {
         bonus = -bonusValue;
      }
      
      // Roll dice
      let total = bonus;
      for (let i = 0; i < count; i++) {
         total += Math.floor(Math.random() * sides) + 1;
      }
      
      // Apply negative if needed
      return isNegative ? -total : total;
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
      {#if displayEffect}
         <div class="resolution-effect">
            {displayEffect}
         </div>
      {/if}
      
      {#if hasManualEffects && manualEffects}
         <div class="manual-effects">
            <div class="manual-effects-header">
               <i class="fas fa-exclamation-triangle"></i>
               <span>Manual Effects - Apply Yourself</span>
            </div>
            <ul class="manual-effects-list">
               {#each manualEffects as effect}
                  <li>{effect}</li>
               {/each}
            </ul>
         </div>
      {/if}
      
      {#if hasResourceArrays}
         <div class="resource-array-selectors">
            {#each resourceArrayModifiers as modifier, index}
               <div class="resource-selector">
                  <label class="resource-selector-label">
                     Choose resource {modifier.value > 0 ? 'to gain' : 'to lose'} ({modifier.value > 0 ? '+' : ''}{modifier.value}):
                  </label>
                  <select 
                     class="resource-dropdown"
                     value={selectedResources.get(index) || ''}
                     on:change={(e) => handleResourceSelect(index, e.currentTarget.value)}
                  >
                     <option value="" disabled>Select resource...</option>
                     {#each modifier.resource as resourceType}
                        <option value={resourceType}>
                           {formatStateChangeLabel(resourceType)}
                        </option>
                     {/each}
                  </select>
               </div>
            {/each}
         </div>
      {/if}
      
      {#if hasChoices && !choicesResolved && choices}
         <div class="choice-buttons">
            <div class="choice-buttons-header">Choose one:</div>
            <div class="choice-buttons-list">
               {#each choices as choice, index}
                  <button
                     class="choice-button {selectedChoice === index ? 'selected' : ''}"
                     on:click={() => handleChoiceSelect(index)}
                  >
                     {choice.label}
                  </button>
               {/each}
            </div>
         </div>
      {/if}
      
      {#if displayStateChanges && Object.keys(displayStateChanges).length > 0}
         <div class="state-changes">
            <div class="state-changes-list">
               {#each Object.entries(displayStateChanges) as [key, change]}
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
                  disabled={primaryButtonDisabled}
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
   
   .resource-array-selectors {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .resource-selector {
         display: flex;
         flex-direction: column;
         gap: 6px;
         
         .resource-selector-label {
            font-size: var(--font-sm);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
         }
         
         .resource-dropdown {
            padding: 10px 14px;
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid var(--border-medium);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: var(--font-md);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: all var(--transition-fast);
            
            &:hover {
               background: rgba(0, 0, 0, 0.4);
               border-color: var(--border-strong);
            }
            
            &:focus {
               outline: none;
               border-color: var(--color-blue);
               box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            option {
               background: var(--bg-primary);
               color: var(--text-primary);
            }
         }
      }
   }
   
   .manual-effects {
      padding: 14px 16px;
      background: linear-gradient(135deg, 
         rgba(251, 146, 60, 0.15),
         rgba(251, 146, 60, 0.05));
      border: 2px solid rgba(251, 146, 60, 0.4);
      border-radius: var(--radius-sm);
      
      .manual-effects-header {
         display: flex;
         align-items: center;
         gap: 8px;
         font-size: var(--font-md);
         font-weight: var(--font-weight-semibold);
         color: rgba(251, 146, 60, 1);
         margin-bottom: 10px;
         
         i {
            font-size: 18px;
         }
      }
      
      .manual-effects-list {
         margin: 0;
         padding-left: 24px;
         list-style-type: disc;
         
         li {
            color: var(--text-primary);
            font-size: var(--font-md);
            line-height: 1.6;
            margin-bottom: 6px;
            
            &:last-child {
               margin-bottom: 0;
            }
         }
      }
   }
   
   .choice-buttons {
      margin-top: 10px;
      
      .choice-buttons-header {
         font-size: var(--font-md);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
         margin-bottom: 10px;
      }
      
      .choice-buttons-list {
         display: flex;
         flex-wrap: wrap;
         gap: 10px;
      }
      
      .choice-button {
         padding: 10px 16px;
         background: rgba(255, 255, 255, 0.05);
         border: 2px solid var(--border-medium);
         border-radius: var(--radius-md);
         color: var(--text-primary);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         cursor: pointer;
         transition: all var(--transition-fast);
         
         &:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--border-strong);
            transform: translateY(-1px);
         }
         
         &.selected {
            background: rgba(59, 130, 246, 0.2);
            border-color: var(--color-blue);
            color: var(--color-blue);
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
         }
         
         &:disabled {
            opacity: var(--opacity-disabled);
            cursor: not-allowed;
         }
      }
   }
</style>
