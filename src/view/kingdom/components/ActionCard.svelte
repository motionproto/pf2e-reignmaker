<script lang="ts">
   import type { PlayerAction } from '../../../models/PlayerActions';
   import SkillTag from './SkillTag.svelte';
   import { 
      performKingdomActionRoll, 
      getKingdomActionDC,
      getCurrentUserCharacter,
      showCharacterSelectionDialog,
      getPlayerCharacters
   } from '../../../api/foundry-actors';
   import { kingdomState } from '../../../stores/kingdom';
   import { createEventDispatcher } from 'svelte';
   
   export let action: PlayerAction;
   export let expanded: boolean = false;
   export let available: boolean = true;
   export let resolved: boolean = false;
   export let resolution: { 
      outcome: string, 
      actorName: string, 
      skillName?: string,
      stateChanges?: Record<string, any>
   } | undefined = undefined;
   export let character: any = null;
   export let canPerformMore: boolean = true;
   
   const dispatch = createEventDispatcher();
   
   // Track which skill was used for this action
   let isRolling: boolean = false;
   let localUsedSkill: string = '';
   
   // Get the skill that was used - either from resolution or from local tracking
   $: usedSkill = resolution?.skillName || localUsedSkill || '';
   
   // Get fame from kingdom state properly
   $: currentFame = $kingdomState?.fame || 0;
   
   // React to resolution prop changes
   $: if (resolved) {
      console.log(`ActionCard ${action.id} is now resolved:`, {
         resolved,
         resolution,
         usedSkill,
         localUsedSkill,
         'resolution?.skillName': resolution?.skillName,
         actionId: action.id,
         'currentFame': currentFame,
         'kingdomState.fame': $kingdomState?.fame,
         'kingdomState.resources': $kingdomState?.resources
      });
   }
   
   function toggleExpanded(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      // Always allow toggling if not disabled, regardless of resolved state
      // This allows users to view the resolution details
      if (available || resolved) {
         dispatch('toggle');
      }
   }
   
   async function executeSkill(event: CustomEvent) {
      const skill = event.detail.skill;
      
      // If no character is provided, try to use user's assigned character or show dialog
      let actingCharacter = character;
      if (!actingCharacter) {
         actingCharacter = getCurrentUserCharacter();
         
         if (!actingCharacter) {
            // Show character selection dialog
            actingCharacter = await showCharacterSelectionDialog();
            if (!actingCharacter) {
               return; // User cancelled selection
            }
            
            // Notify parent component about the character selection
            dispatch('characterSelected', { character: actingCharacter });
         }
      }
      
      if (resolved || isRolling) {
         return; // Already resolved or currently rolling
      }
      
      isRolling = true;
      localUsedSkill = skill;
      
      try {
         // Get DC based on character's level using standard level-based DCs
         const characterLevel = actingCharacter.level || 1;
         const dc = getKingdomActionDC(characterLevel);
         
         // Perform the roll with the selected character
         await performKingdomActionRoll(
            actingCharacter,
            skill,
            dc,
            action.name,
            action.id,
            {
               criticalSuccess: action.criticalSuccess,
               success: action.success,
               failure: action.failure,
               criticalFailure: action.criticalFailure
            }
         );
      } catch (error) {
         console.error("Error executing skill:", error);
      } finally {
         isRolling = false;
      }
   }
   
   function formatOutcome(outcome: any): string {
      if (!outcome) return '—';
      return outcome.description || '—';
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
         // Handle meta object for coordinated action
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
      // Context-aware coloring based on the key
      const negativeBenefitKeys = ['unrest', 'cost', 'damage', 'imprisoned'];
      const isNegativeBenefit = key && negativeBenefitKeys.some(k => key.toLowerCase().includes(k));
      
      if (typeof change === 'number') {
         if (isNegativeBenefit) {
            // For things like unrest, negative is good
            return change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral';
         }
         // For most resources, positive is good
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
         // Handle meta object for coordinated action
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
   
   async function handleRerollWithFame() {
      if (currentFame > 0 && resolution) {
         // Deduct fame
         kingdomState.update(state => {
            state.fame = currentFame - 1;
            return state;
         });
         
         // Reset the action first
         dispatch('reset', { actionId: action.id });
         
         // Get the character that was used (or current character)
         let actingCharacter = character || getCurrentUserCharacter();
         if (!actingCharacter && resolution.actorName) {
            // Try to find the character by name if we don't have it
            const players = getPlayerCharacters();
            const player = players.find((p: any) => p.character?.name === resolution.actorName);
            if (player?.character) {
               actingCharacter = player.character;
            }
         }
         
         if (!actingCharacter) {
            // Show character selection dialog if we still don't have a character
            actingCharacter = await showCharacterSelectionDialog();
            if (!actingCharacter) {
               return; // User cancelled selection
            }
         }
         
         // Use the same skill that was used before
         const skillToUse = usedSkill || localUsedSkill;
         if (skillToUse) {
            // Trigger a new roll with the same skill
            try {
               const characterLevel = actingCharacter.level || 1;
               const dc = getKingdomActionDC(characterLevel);
               
               await performKingdomActionRoll(
                  actingCharacter,
                  skillToUse,
                  dc,
                  action.name,
                  action.id,
                  {
                     criticalSuccess: action.criticalSuccess,
                     success: action.success,
                     failure: action.failure,
                     criticalFailure: action.criticalFailure
                  }
               );
            } catch (error) {
               console.error("Error rerolling with fame:", error);
            }
         }
      }
   }
   
   function handleOk() {
      // Notify parent to reset this action for another user
      dispatch('reset', { actionId: action.id });
   }
</script>

<div class="action-card {!available ? 'disabled' : ''} {expanded ? 'expanded' : ''} {resolved ? 'resolved result-state' : 'select-state'}">
   <button 
      class="action-header-btn"
      on:click={toggleExpanded}
      disabled={!available && !resolved}
   >
      <div class="action-header-content">
         <div class="action-main">
            <strong class="action-name">
               {action.name}
               {#if resolved}
                  <span class="resolved-badge">
                     <i class="fas fa-check-circle"></i>
                     Resolved
                  </span>
               {/if}
            </strong>
            {#if action.brief}
               <span class="action-brief">{action.brief}</span>
            {/if}
         </div>
         <i class="fas fa-chevron-{expanded ? 'down' : 'right'} expand-icon"></i>
      </div>
   </button>
   
   {#if expanded}
      <div class="action-details">
         <!-- Description -->
         <p class="action-full-description">{action.description}</p>
         
         <!-- Resolution display if action is resolved -->
         {#if resolved && resolution}
            <div class="resolution-display {resolution.outcome}">
               <div class="resolution-header">
                  <i class="fas fa-dice-d20"></i>
                  <span>Action Resolved</span>
               </div>
               <div class="resolution-details">
                  <div class="resolution-actor">
                     {resolution.actorName} used {#if usedSkill}{usedSkill.charAt(0).toUpperCase() + usedSkill.slice(1)}{:else}a skill{/if}
                  </div>
                  <div class="resolution-outcome">
                     {#if resolution.outcome === 'criticalSuccess'}
                        <i class="fas fa-star"></i> Critical Success!
                     {:else if resolution.outcome === 'success'}
                        <i class="fas fa-check"></i> Success
                     {:else if resolution.outcome === 'failure'}
                        <i class="fas fa-times"></i> Failure
                     {:else}
                        <i class="fas fa-skull"></i> Critical Failure
                     {/if}
                  </div>
                  <div class="resolution-effect">
                     {#if resolution.outcome === 'criticalSuccess'}
                        {formatOutcome(action.criticalSuccess)}
                     {:else if resolution.outcome === 'success'}
                        {formatOutcome(action.success)}
                     {:else if resolution.outcome === 'failure'}
                        {formatOutcome(action.failure)}
                     {:else}
                        {formatOutcome(action.criticalFailure)}
                     {/if}
                  </div>
                  
                  <!-- State changes display -->
                  {#if resolution.stateChanges && Object.keys(resolution.stateChanges).length > 0}
                     <div class="state-changes">
                        <div class="state-changes-header">
                           <i class="fas fa-exchange-alt"></i>
                           State Changes:
                        </div>
                        <div class="state-changes-list">
                           {#each Object.entries(resolution.stateChanges) as [key, change]}
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
               
               <!-- Action buttons for resolved state -->
               <div class="resolution-actions">
                  <button 
                     class="btn-reroll"
                     on:click={handleRerollWithFame}
                     disabled={currentFame === 0}
                  >
                     <i class="fas fa-dice"></i>
                     Reroll with Fame
                     <span class="fame-count">({currentFame} left)</span>
                  </button>
                  <button 
                     class="btn-ok"
                     on:click={handleOk}
                  >
                     <i class="fas fa-check"></i>
                     OK
                  </button>
               </div>
            </div>
         {:else}
            <!-- Skills section - only show when not resolved -->
            <div class="skills-section">
               <h4 class="section-title">Choose Skill:</h4>
               <div class="skills-tags">
                  {#each action.skills as skillOption}
                     {@const isDisabled = !canPerformMore}
                     <SkillTag
                        skill={skillOption.skill}
                        description={skillOption.description}
                        selected={false}
                        disabled={isDisabled}
                        loading={isRolling && skillOption.skill === localUsedSkill}
                        faded={false}
                        on:execute={executeSkill}
                     />
                  {/each}
               </div>
               {#if !character && !getCurrentUserCharacter()}
                  <div class="no-character-info">
                     <i class="fas fa-info-circle"></i>
                     Click a skill to select your character
                  </div>
               {/if}
            </div>
            
            <!-- Outcomes section - only show when not resolved -->
            <div class="outcomes-section">
               <h4 class="section-title">Possible Outcomes:</h4>
               <div class="outcomes-grid">
                  <div class="outcome critical-success">
                     <div class="outcome-header">
                        <i class="fas fa-star"></i>
                        Critical Success
                     </div>
                     <div class="outcome-text">{formatOutcome(action.criticalSuccess)}</div>
                  </div>
                  <div class="outcome success">
                     <div class="outcome-header">
                        <i class="fas fa-thumbs-up"></i>
                        Success
                     </div>
                     <div class="outcome-text">{formatOutcome(action.success)}</div>
                  </div>
                  <div class="outcome failure">
                     <div class="outcome-header">
                        <i class="fas fa-thumbs-down"></i>
                        Failure
                     </div>
                     <div class="outcome-text">{formatOutcome(action.failure)}</div>
                  </div>
                  <div class="outcome critical-failure">
                     <div class="outcome-header">
                        <i class="fas fa-skull"></i>
                        Critical Failure
                     </div>
                     <div class="outcome-text">{formatOutcome(action.criticalFailure)}</div>
                  </div>
               </div>
            </div>
         {/if}
         
         <!-- Special rules or costs -->
         {#if action.special || action.cost}
            <div class="additional-info">
               {#if action.special}
                  <div class="info-box special-section">
                     <i class="fas fa-info-circle"></i>
                     <span>{action.special}</span>
                  </div>
               {/if}
               
               {#if action.cost}
                  <div class="info-box cost-section">
                     <i class="fas fa-tag"></i>
                     <span>Cost: 
                        {#each Array.from(action.cost.entries()) as [resource, amount], i}
                           {#if i > 0}, {/if}
                           {amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
                        {/each}
                     </span>
                  </div>
               {/if}
            </div>
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .action-card {
      background: linear-gradient(135deg,
         rgba(24, 24, 27, 0.6),
         rgba(31, 31, 35, 0.4));
      border-radius: var(--radius-md);
      border: 1px solid var(--border-medium);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      min-height: min-content;
      position: relative;
      
      // Select State (default) - Action not yet performed
      &.select-state {
         &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, 
               transparent, 
               var(--color-amber), 
               transparent);
            border-radius: var(--radius-md) var(--radius-md) 0 0;
            opacity: 0;
            transition: opacity 0.3s ease;
         }
         
         &.expanded::before {
            opacity: 0.6;
         }
      }
      
      // Result State - Action has been performed and resolved
      &.result-state {
         background: linear-gradient(135deg,
            rgba(20, 20, 23, 0.7),
            rgba(15, 15, 17, 0.5));
         border-color: var(--border-subtle);
         
         &::after {
            content: '';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-green);
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
            animation: pulse 2s infinite;
         }
      }
      
      &.resolved {
         background: linear-gradient(135deg,
            rgba(24, 24, 27, 0.4),
            rgba(31, 31, 35, 0.3));
         border-color: var(--border-subtle);
      }
      
      // Hover states for select state
      &.select-state:hover:not(.disabled):not(.expanded) {
         border-color: var(--border-strong);
         transform: translateY(-1px);
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      &.select-state.expanded {
         border-color: var(--color-amber);
         box-shadow: 0 4px 12px rgba(251, 191, 36, 0.1);
         
         &:hover:not(.disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(251, 191, 36, 0.15);
         }
      }
      
      // Result state has different hover behavior
      &.result-state:hover:not(.disabled) {
         transform: none;
         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      &.result-state.expanded {
         border-color: rgba(34, 197, 94, 0.3);
      }
      
      &.disabled {
         opacity: 0.5;
         cursor: not-allowed;
         
         .action-header-btn {
            cursor: not-allowed;
         }
      }
   }
   
   .action-header-btn {
      display: flex;
      width: 100%;
      background: transparent;
      border: none;
      margin: 0;
      padding-left: 1em;
      padding-right: 1em;
      padding-top: 0.75em;
      padding-bottom: 0.75em;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s ease;
      box-sizing: border-box;
      flex-shrink: 0;
      min-height: min-content;
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.02);
      }
      
      &:disabled {
         cursor: not-allowed;
      }
   }
   
   .action-card.expanded .action-header-btn {
      background: rgba(255, 255, 255, 0.03);
      
      &:hover:not(:disabled) {
         background: rgba(255, 255, 255, 0.05);
      }
   }
   
   .action-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      width: 100%;
      
      .action-main {
         flex: 1;
         display: flex;
         flex-direction: column;
         gap: 4px;
         text-align: left;
         min-width: 0;
         
         .action-name {
            color: var(--text-primary);
            font-size: var(--type-heading-1-size);
            font-weight: var(--type-heading-1-weight);
            line-height: var(--type-heading-1-line);
            text-align: left;
            display: flex;
            align-items: center;
            gap: 12px;
            
            .resolved-badge {
               display: inline-flex;
               align-items: center;
               gap: 4px;
               padding: 2px 8px;
               background: rgba(34, 197, 94, 0.15);
               border: 1px solid rgba(34, 197, 94, 0.3);
               border-radius: var(--radius-sm);
               font-size: var(--type-badge-size);
               font-weight: var(--type-badge-weight);
               line-height: var(--type-badge-line);
               letter-spacing: var(--type-badge-spacing);
               color: var(--color-green);
               text-transform: uppercase;
               
               i {
                  font-size: 12px;
               }
            }
         }
         
         .action-brief {
            color: var(--text-secondary);
            font-size: var(--type-body-size);
            line-height: var(--type-body-line);
            opacity: 0.8;
            text-align: left;
            display: block;
         }
      }
      
      .expand-icon {
         color: var(--text-tertiary);
         transition: transform 0.3s ease;
         flex-shrink: 0;
         font-size: 14px;
         margin-top: 4px;
         margin-left: auto;
      }
   }
   
   .action-details {
      padding: 16px;
      animation: slideDown 0.3s ease-out;
      border-top: 1px solid var(--border-subtle);
      text-align: left;
      
      .action-full-description {
         margin: 0 0 16px 0;
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
         text-align: left;
      }
   }
   
   @keyframes slideDown {
      from {
         opacity: 0;
         max-height: 0;
      }
      to {
         opacity: 1;
         max-height: 2000px;
      }
   }
   
   @keyframes pulse {
      0% {
         opacity: 1;
         transform: scale(1);
      }
      50% {
         opacity: 0.6;
         transform: scale(1.1);
      }
      100% {
         opacity: 1;
         transform: scale(1);
      }
   }
   
   @keyframes fadeInUp {
      from {
         opacity: 0;
         transform: translateY(10px);
      }
      to {
         opacity: 1;
         transform: translateY(0);
      }
   }
   
   .resolution-display {
      margin: 16px 0;
      padding: 16px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-strong);
      background: rgba(0, 0, 0, 0.3);
      
      &.criticalSuccess {
         background: rgba(34, 197, 94, 0.1);
         border-color: rgba(34, 197, 94, 0.4);
      }
      
      &.success {
         background: rgba(34, 197, 94, 0.05);
         border-color: rgba(34, 197, 94, 0.3);
      }
      
      &.failure {
         background: rgba(249, 115, 22, 0.05);
         border-color: rgba(249, 115, 22, 0.3);
      }
      
      &.criticalFailure {
         background: rgba(239, 68, 68, 0.1);
         border-color: rgba(239, 68, 68, 0.4);
      }
      
      .resolution-header {
         display: flex;
         align-items: center;
         gap: 8px;
         margin-bottom: 12px;
         font-weight: 600;
         color: var(--color-amber);
         
         i {
            font-size: 18px;
         }
      }
      
      .resolution-details {
         display: flex;
         flex-direction: column;
         gap: 8px;
         margin-bottom: 16px;
      }
      
      .resolution-actor {
         color: var(--text-secondary);
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
      }
      
      .resolution-outcome {
         font-size: var(--type-heading-3-size);
         font-weight: var(--type-heading-3-weight);
         line-height: var(--type-heading-3-line);
         display: flex;
         align-items: center;
         gap: 6px;
         
         i {
            font-size: 16px;
         }
      }
      
      .resolution-effect {
         color: var(--text-secondary);
         line-height: 1.5;
         margin-top: 4px;
         padding-bottom: 12px;
         border-bottom: 1px solid var(--border-subtle);
      }
      
      .state-changes {
         margin-top: 12px;
         padding: 12px;
         background: linear-gradient(135deg, 
            rgba(251, 191, 36, 0.05),
            rgba(0, 0, 0, 0.2));
         border-radius: var(--radius-sm);
         border: 1px solid rgba(251, 191, 36, 0.2);
         animation: fadeInUp 0.3s ease-out;
      }
      
      .state-changes-header {
         display: flex;
         align-items: center;
         gap: 6px;
         font-size: var(--type-body-size);
         font-weight: var(--type-weight-semibold);
         color: var(--text-primary);
         margin-bottom: 8px;
         padding-bottom: 6px;
         border-bottom: 1px solid var(--border-subtle);
         
         i {
            font-size: 14px;
            color: var(--color-amber);
         }
      }
      
      .state-changes-list {
         display: flex;
         flex-direction: column;
         gap: 6px;
      }
      
      .state-change-item {
         display: flex;
         align-items: center;
         justify-content: space-between;
         padding: 4px 8px;
         background: rgba(0, 0, 0, 0.1);
         border-radius: var(--radius-sm, 4px);
         font-size: var(--type-body-size);
         
         .change-label {
            color: var(--text-secondary);
            font-weight: var(--type-weight-medium);
         }
         
         .change-value {
            font-weight: var(--type-weight-semibold);
            font-family: var(--font-code, monospace);
            
            &.positive {
               color: var(--color-green);
            }
            
            &.negative {
               color: var(--color-red);
            }
            
            &.neutral {
               color: var(--text-primary);
            }
         }
      }
      
      .resolution-actions {
         display: flex;
         gap: 12px;
         margin-top: 16px;
         
         button {
            flex: 1;
            padding: 8px 16px;
            border-radius: var(--radius-sm);
            border: 1px solid;
            font-size: var(--type-button-size);
            font-weight: var(--type-button-weight);
            line-height: var(--type-button-line);
            letter-spacing: var(--type-button-spacing);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all var(--transition-fast);
            
            i {
               font-size: 14px;
            }
         }
         
         .btn-reroll {
            background: rgba(251, 191, 36, 0.1);
            border-color: var(--color-amber);
            color: var(--color-amber);
            
            .fame-count {
               font-size: var(--type-small-size);
               opacity: 0.8;
            }
            
            &:hover:not(:disabled) {
               background: rgba(251, 191, 36, 0.2);
               box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
            }
            
            &:disabled {
               opacity: 0.5;
               cursor: not-allowed;
               background: rgba(100, 100, 100, 0.1);
               border-color: var(--border-subtle);
               color: var(--text-tertiary);
            }
         }
         
         .btn-ok {
            background: rgba(34, 197, 94, 0.1);
            border-color: var(--color-green);
            color: var(--color-green);
            
            &:hover {
               background: rgba(34, 197, 94, 0.2);
               box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
            }
         }
      }
   }
   
   .criticalSuccess .resolution-outcome {
      color: var(--color-green);
   }
   
   .success .resolution-outcome {
      color: var(--color-green-light);
   }
   
   .failure .resolution-outcome {
      color: var(--color-orange);
   }
   
   .criticalFailure .resolution-outcome {
      color: var(--color-red);
   }
   
   .skills-section {
      margin-top: 20px;
   }
   
   .outcomes-section {
      margin-top: 20px;
   }
   
   .section-title {
      margin: 0 0 12px 0;
      color: var(--text-primary);
      font-size: var(--type-heading-2-size);
      font-weight: var(--type-heading-2-weight);
      line-height: var(--type-heading-2-line);
      opacity: 0.8;
   }
   
   .skills-tags {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
   }
   
   .no-character-info {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: var(--radius-sm);
      color: var(--color-blue-light);
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
      display: flex;
      align-items: center;
      gap: 8px;
      
      i {
         font-size: 14px;
      }
   }
   
   .outcomes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
   }
   
   .outcome {
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      position: relative;
      transition: all 0.3s ease;
      
      .outcome-header {
         display: flex;
         align-items: center;
         gap: 6px;
         font-size: var(--type-label-size);
         font-weight: var(--type-label-weight);
         line-height: var(--type-label-line);
         letter-spacing: var(--type-label-spacing);
         text-transform: uppercase;
         margin-bottom: 8px;
         position: relative;
         
         i {
            font-size: 14px;
            padding-bottom: 2px;
         }
      }
      
      .outcome-text {
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
         color: var(--text-secondary);
      }
      
      &.critical-success {
         background: rgba(34, 197, 94, 0.05);
         border-color: rgba(34, 197, 94, 0.3);
         
         .outcome-header {
            color: var(--color-green);
         }
      }
      
      &.success {
         background: rgba(34, 197, 94, 0.03);
         
         .outcome-header {
            color: var(--color-green-light);
         }
      }
      
      &.failure {
         background: rgba(249, 115, 22, 0.03);
         
         .outcome-header {
            color: var(--color-orange);
         }
      }
      
      &.critical-failure {
         background: rgba(239, 68, 68, 0.05);
         border-color: rgba(239, 68, 68, 0.3);
         
         .outcome-header {
            color: var(--color-red);
         }
      }
   }
   
   .additional-info {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   
   .info-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      
      i {
         margin-top: 2px;
         flex-shrink: 0;
      }
      
      span {
         font-size: var(--type-body-size);
         line-height: var(--type-body-line);
      }
      
      &.special-section {
         background: rgba(59, 130, 246, 0.1);
         border: 1px solid rgba(59, 130, 246, 0.3);
         
         i {
            color: var(--color-blue);
         }
         
         span {
            color: var(--color-blue-light);
         }
      }
      
      &.cost-section {
         background: rgba(251, 191, 36, 0.1);
         border: 1px solid rgba(251, 191, 36, 0.3);
         
         i {
            color: var(--color-amber);
         }
         
         span {
            color: var(--color-amber-light);
         }
      }
   }
</style>
