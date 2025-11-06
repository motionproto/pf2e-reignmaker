<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   import { SettlementTierConfig } from '../../../../models/Settlement';
   import { kingdomData } from '../../../../stores/KingdomStore';
   import SkillTag from '../../components/CheckCard/components/SkillTag.svelte';
   import { performKingdomSkillCheck } from '../../../../services/pf2e';
   import { structuresService } from '../../../../services/structures';
   
   export let settlement: Settlement;
   
   // Expandable state for army support
   let isArmySupportExpanded = false;
   
   // Calculate army support capacity and used
   // Use settlement's calculated armySupport (includes structure bonuses), fallback to base tier value
   $: armySupportCapacity = settlement.armySupport || SettlementTierConfig[settlement.tier].armySupport;
   $: armiesSupportedCount = settlement.supportedUnits.length;
   
   // Calculate food storage capacity
   $: foodCapacity = settlement.foodStorageCapacity || 0;
   
   // Calculate imprisoned unrest capacity
   $: imprisonedUnrestCapacity = settlement.imprisonedUnrestCapacityValue || 0;
   
   // Reactively calculate skill bonuses from current structures
   $: reactiveSkillBonuses = (() => {
      if (!settlement.structureIds?.length) return [];
      
      const bonusMap: Record<string, { bonus: number; structureName: string }> = {};
      
      for (const structureId of settlement.structureIds) {
         // Skip damaged structures
         if (structuresService.isStructureDamaged(settlement, structureId)) {
            continue;
         }
         
         const structure = structuresService.getStructure(structureId);
         if (structure?.type === 'skill' && structure.effects.skillsSupported) {
            const bonus = structure.effects.skillBonus || 0;
            for (const skill of structure.effects.skillsSupported) {
               const currentBonus = bonusMap[skill]?.bonus || 0;
               if (bonus > currentBonus) {
                  bonusMap[skill] = {
                     bonus,
                     structureName: structure.name
                  };
               }
            }
         }
      }
      
      return Object.entries(bonusMap)
         .map(([skill, { bonus, structureName }]) => ({
            skill,
            bonus,
            structureName
         }))
         .sort((a, b) => a.skill.localeCompare(b.skill));
   })();
   
   // Get actual army objects for this settlement
   $: supportedArmies = $kingdomData.armies.filter(army => 
      settlement.supportedUnits.includes(army.id)
   );
   
   function toggleArmySupport() {
      isArmySupportExpanded = !isArmySupportExpanded;
   }
   
   function openArmyActor(event: MouseEvent, actorId: string | undefined) {
      event.stopPropagation(); // Prevent triggering parent click handlers
      if (!actorId) return;
      
      const actor = game.actors?.get(actorId);
      if (actor) {
         actor.sheet?.render(true);
      }
   }
   
   async function adjustImprisonedUnrest(delta: number) {
      const newValue = settlement.imprisonedUnrest + delta;
      // Enforce limits
      if (newValue < 0 || newValue > imprisonedUnrestCapacity) return;
      
      // Update the settlement
      const { updateKingdom } = await import('../../../../stores/KingdomStore');
      await updateKingdom((kingdom) => {
         const settlementIndex = kingdom.settlements.findIndex(s => s.id === settlement.id);
         if (settlementIndex >= 0) {
            kingdom.settlements[settlementIndex].imprisonedUnrest = newValue;
         }
      });
   }
   
   async function handleSkillRoll(skill: string, bonus: number, structureName: string) {
      // Roll the skill for the user's character with the settlement bonus applied
      // Pass settlement info in checkEffects so only this settlement's modifier is shown
      console.log('🎲 [SettlementBasicInfo] Rolling skill:', {
         skill,
         bonus,
         structureName,
         settlementName: settlement.name,
         settlementId: settlement.id,
         checkEffects: {
            enabledSettlement: settlement.name,
            enabledStructure: structureName,
            onlySettlementId: settlement.id  // Only show this settlement
         }
      });
      
      await performKingdomSkillCheck(
         skill,
         'action',
         `${settlement.name} ${structureName} - ${skill}`,
         `settlement-skill-${settlement.id}-${skill}`,
         {
            enabledSettlement: settlement.name,
            enabledStructure: structureName,
            onlySettlementId: settlement.id  // Only show this settlement
         }
      );
   }
</script>

<div class="detail-section">
   <div class="detail-grid">
      <div class="detail-item">
         <span class="label">Food Consumption</span>
         <span class="value">
            <i class="fas fa-wheat-awn"></i>
            {SettlementTierConfig[settlement.tier]?.foodConsumption || 0} per turn
         </span>
      </div>
      <div class="detail-item">
         <span class="label">Stored Food</span>
         <span class="value">
            <i class="fas fa-warehouse"></i>
            {settlement.storedFood} / {foodCapacity}
         </span>
      </div>
   </div>
   
   <div class="detail-grid">
      <div class="detail-item expandable" on:click={toggleArmySupport}>
         <span class="label">Army Support</span>
         <span class="value">
            <i class="fas fa-shield-alt"></i>
            {armiesSupportedCount} out of {armySupportCapacity}
            <i class="fas fa-chevron-{isArmySupportExpanded ? 'up' : 'down'} expand-icon"></i>
         </span>
      </div>
      <div class="detail-item">
         <span class="label">Imprisoned Unrest</span>
         <div class="value-with-controls">
            <i class="fas fa-dungeon"></i>
            <span class="value-display">{settlement.imprisonedUnrest} / {imprisonedUnrestCapacity}</span>
            <div class="control-buttons">
               <button 
                  class="control-btn minus" 
                  on:click={() => adjustImprisonedUnrest(-1)}
                  disabled={settlement.imprisonedUnrest <= 0}
               >
                  <i class="fas fa-minus"></i>
               </button>
               <button 
                  class="control-btn plus" 
                  on:click={() => adjustImprisonedUnrest(1)}
                  disabled={settlement.imprisonedUnrest >= imprisonedUnrestCapacity}
               >
                  <i class="fas fa-plus"></i>
               </button>
            </div>
         </div>
      </div>
   </div>
   {#if isArmySupportExpanded && supportedArmies.length > 0}
      <div class="army-list">
         {#each supportedArmies as army}
            <div class="army-item">
               <i class="fas fa-users"></i>
               {#if army.actorId}
                  <span class="army-link" on:click={(e) => openArmyActor(e, army.actorId)}>{army.name}</span>
               {:else}
                  <span>{army.name}</span>
               {/if}
            </div>
         {/each}
      </div>
   {/if}
   
   {#if reactiveSkillBonuses.length > 0}
      <div class="detail-item-full skill-bonuses-section">
         <span class="label">Skill Bonuses from Structures</span>
         <div class="skill-bonuses-grid">
            {#each reactiveSkillBonuses as { skill, bonus, structureName }}
               <SkillTag
                  skill={skill.charAt(0).toUpperCase() + skill.slice(1)}
                  bonus={bonus}
                  on:execute={() => handleSkillRoll(skill, bonus, structureName)}
               />
            {/each}
         </div>
      </div>
   {/if}
</div>

<style lang="scss">
   @use './settlements-shared.scss';
   
   .detail-item {
      &.expandable {
         cursor: pointer;
         padding: 0.5rem;
         margin-left: -0.5rem;
         margin-right: -0.5rem;
         transition: var(--transition-base);
         border-radius: var(--radius-md);
         
         &:hover {
            background: rgba(255, 255, 255, 0.05);
         }
         
         .value {
            .expand-icon {
               margin-left: auto;
               color: var(--text-secondary);
               font-size: var(--font-sm);
            }
         }
      }
   }
   
   .detail-item-full {
      margin-top: 1rem;
      
      .label {
         display: block;
         font-size: var(--font-md);
         color: var(--text-secondary);
         margin-bottom: 0.5rem;
         font-weight: var(--font-weight-light);
      }
      
      .value {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         color: var(--text-primary);
         font-size: var(--font-lg);
         
         i {
            margin-right: 0.5rem;
         }
      }
   }
   
   .army-list {
      margin-left: 1.5rem;
      margin-top: 0.5rem;
      padding: 0.5rem 0;
      border-left: 2px solid rgba(255, 255, 255, 0.1);
      
      .army-item {
         display: flex;
         align-items: center;
         gap: 0.5rem;
         padding: 0.25rem 0 0.25rem 1rem;
         font-size: var(--font-md);
         color: var(--text-secondary);
         
         i {
            color: var(--text-tertiary);
            font-size: var(--font-md);
         }
         
         .army-link {
            color: var(--color-info);
            cursor: pointer;
            text-decoration: underline;
            transition: var(--transition-base);
            
            &:hover {
               opacity: 0.8;
               text-decoration: none;
            }
         }
      }
   }
   
   .value-with-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-primary);
      font-size: var(--font-lg);
      
      i {
         margin-right: 0.5rem;
      }
      
      .value-display {
         flex: 1;
      }
      
      .control-buttons {
         display: flex;
         gap: 0.25rem;
         
         .control-btn {
            width: 32px;
            height: 32px;
            border: 1px solid var(--border-default);
            background: var(--bg-surface);
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all var(--transition-fast);
            color: var(--text-primary);
            
            &:hover:not(:disabled) {
               background: var(--bg-subtle);
               border-color: var(--border-primary);
               transform: scale(1.05);
            }
            
            &:disabled {
               opacity: 0.3;
               cursor: not-allowed;
            }
            
            i {
               font-size: var(--font-sm);
               margin: 0;
            }
         }
      }
   }
   
   .skill-bonuses-section {
      margin-top: 1rem;
      
      .label {
         display: block;
         font-size: var(--font-md);
         color: var(--text-secondary);
         margin-bottom: 0.75rem;
         font-weight: var(--font-weight-light);
      }
      
      .skill-bonuses-grid {
         display: flex;
         flex-wrap: wrap;
         gap: 0.5rem;
      }
   }
</style>
