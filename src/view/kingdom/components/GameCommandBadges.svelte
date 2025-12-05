<script lang="ts">
  import type { GameCommand } from '../../../types/modifiers';
  
  export let gameCommands: GameCommand[];
  
  // Get party level from PF2e party actor
  function getPartyLevel(): number {
    const game = (globalThis as any).game;
    if (!game?.actors) return 1;
    
    const partyActors = Array.from(game.actors).filter((a: any) => a.type === 'party');
    if (partyActors.length === 0) return 1;
    
    const partyActor = partyActors[0];
    if (partyActor.system?.details?.level !== undefined) {
      const level = typeof partyActor.system.details.level === 'number' 
        ? partyActor.system.details.level 
        : partyActor.system.details.level.value || 1;
      return level;
    }
    
    return 1;
  }
  
  // Format condition text for deployArmy conditions
  function formatCondition(condition: string): { text: string; variant: 'positive' | 'negative' } {
    // Determine variant based on condition text
    const isPositive = condition.includes('+') || condition.includes('bonus');
    const variant = isPositive ? 'positive' : 'negative';
    
    // Clean up condition text for display
    // Remove "(status bonus)" or "(status penalty)" suffix for cleaner display
    let text = condition
      .replace(/\s*\(status\s+(bonus|penalty)\)/gi, '')
      .trim();
    
    return { text, variant };
  }
  
  // Check if command has deployArmy conditions
  function hasDeployArmyConditions(command: GameCommand): boolean {
    return command.type === 'deployArmy' && 
           'conditionsToApply' in command && 
           Array.isArray((command as any).conditionsToApply) &&
           (command as any).conditionsToApply.length > 0;
  }
  
  // Get deployArmy conditions
  function getDeployArmyConditions(command: GameCommand): string[] {
    if (hasDeployArmyConditions(command)) {
      return (command as any).conditionsToApply;
    }
    return [];
  }
  
  // Format game command text based on type
  function formatGameCommand(command: GameCommand): string {
    switch (command.type) {
      // Territory & Expansion
      case 'claimHexes':
        const count = typeof command.count === 'number' ? command.count : 'multiple';
        return `Claim ${count} Hex${count !== 1 ? 'es' : ''}`;
      
      case 'buildRoads':
        const hexCount = command.hexCount === 'standard' ? 'standard' : command.hexCount;
        return `Build Roads (${hexCount} hexes)`;
      
      case 'fortifyHex':
        return 'Fortify Hex';
      
      // Settlement & Construction
      case 'foundSettlement':
        const tier = command.tier.charAt(0).toUpperCase() + command.tier.slice(1);
        return `Found ${tier}`;
      
      case 'upgradeSettlement':
        return 'Upgrade Settlement';
      
      case 'buildStructure':
        return `Build ${command.count} Structure${command.count !== 1 ? 's' : ''}`;
      
      case 'repairStructure':
        return 'Repair Structure';
      
      case 'createWorksite':
        return command.worksiteType 
          ? `Create ${command.worksiteType.charAt(0).toUpperCase() + command.worksiteType.slice(1)}`
          : 'Create Worksite';
      
      // Military Operations
      case 'recruitArmy':
        return 'Recruit Army';
      
      case 'trainArmy':
        // ✅ FIX: Get party level and format based on outcome
        const partyLevel = getPartyLevel();
        const outcome = command.outcome || 'success';
        
        if (outcome === 'criticalSuccess') {
          return `Train army to party level ${partyLevel}`;
        } else if (outcome === 'success') {
          return `Train army to party level ${partyLevel}`;
        } else if (outcome === 'failure') {
          return ''; // No badge for failure
        } else if (outcome === 'criticalFailure') {
          return 'Poorly trained: -1 to all saves';
        }
        
        // Fallback for old format
        return `Train Army${command.levelIncrease ? ` (+${command.levelIncrease} level)` : ''}`;
      
      case 'deployArmy':
        // Don't show "Deploy Army" badge - it's redundant since the action is already "Deploy Army"
        // Conditions will be displayed separately below
        return '';
      
      case 'outfitArmy':
        return 'Outfit Army';
      
      case 'recoverArmy':
        return 'Recover Army';
      
      case 'disbandArmy':
        return 'Disband Army';
      
      // Diplomatic & Special
      case 'establishDiplomaticRelations':
        return 'Establish Diplomatic Relations';
      
      case 'adjustFactionAttitude':
        const steps = command.steps > 0 ? `+${command.steps}` : command.steps;
        return `Adjust Faction Attitude (${steps})`;
      
      case 'requestEconomicAid':
        return 'Request Economic Aid';
      
      case 'requestMilitaryAid':
        return 'Request Military Aid';
      
      case 'requestMilitaryAidRecruitment':
        return 'Recruit Allied Army';
      
      case 'requestMilitaryAidEquipment':
        return 'Receive Military Equipment';
      
      case 'infiltration':
        return 'Infiltration';
      
      case 'sendScouts':
        return 'Send Scouts';
      
      // Event & Unrest Management
      case 'resolveEvent':
        return 'Resolve Event';
      
      case 'hireAdventurers':
        return 'Hire Adventurers';
      
      case 'arrestDissidents':
        return 'Arrest Dissidents';
      
      // Support & Bonuses
      case 'aidBonus':
        return 'Aid Bonus';
      
      case 'grantReroll':
        return 'Grant Reroll';
      
      // Personal Actions
      case 'giveActorGold':
        return `Collect Stipend (×${command.multiplier})`;
      
      case 'chooseAndGainResource':
        return `Choose Resource (+${command.amount})`;
      
      // Structure Management
      case 'damageStructure':
        const damageCount = command.count || 1;
        return `Damage ${damageCount} Structure${damageCount !== 1 ? 's' : ''}`;
      
      case 'destroyStructure':
        const destroyCount = command.count || 1;
        return `Destroy ${destroyCount} Structure${destroyCount !== 1 ? 's' : ''}`;
      
      // Unrest Management
      case 'releaseImprisoned':
        const percentage = command.percentage === 'all' ? 'All' : `${command.percentage * 100}%`;
        return `Release ${percentage} Imprisoned`;
      
      case 'reduceImprisoned':
        if (command.amount === 'all') return 'Clear all imprisoned';
        // Show dice formula or number directly
        return `Reduce imprisoned (${command.amount})`;
      
      case 'convertUnrestToImprisoned':
        // Badge handled by outcomeBadges in the pipeline
        return '';
      
      // Worksite Management
      case 'destroyWorksite':
        const wsCount = command.count || 1;
        return `Destroy ${wsCount} Worksite${wsCount !== 1 ? 's' : ''}`;
      
      // Character Actions
      case 'spendPlayerAction':
        return 'Leader loses action';
      
      // Territory Management
      case 'removeBorderHexes':
        const removeCount = typeof command.count === 'number' ? command.count : command.dice;
        return `Remove ${removeCount} Border Hex${removeCount !== 1 ? 'es' : ''}`;
      
      default:
        return 'Unknown Command';
    }
  }
</script>

{#if gameCommands && gameCommands.length > 0}
  {#each gameCommands as command}
    {@const text = formatGameCommand(command)}
    {#if text}
      <span class="badge command-badge">{text}</span>
    {/if}
    
    <!-- Special handling for deployArmy: show conditions as badges -->
    {#if hasDeployArmyConditions(command)}
      {#each getDeployArmyConditions(command) as condition}
        {@const formatted = formatCondition(condition)}
        <span class="badge condition-badge" class:variant-positive={formatted.variant === 'positive'} class:variant-negative={formatted.variant === 'negative'}>
          {formatted.text}
        </span>
      {/each}
    {/if}
  {/each}
{/if}

<style lang="scss">
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-lg);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1.3;
    white-space: nowrap;
  }
  
  .command-badge {
    background: var(--hover-low);
    color: var(--text-secondary);
    border: 1px solid var(--border-medium);
  }
  
  .condition-badge {
    background: var(--hover-low);
    color: var(--text-secondary);
    border: 1px solid var(--border-medium);
    
    &.variant-positive {
      background: var(--surface-success-lower);
      color: var(--color-green);
      border-color: var(--color-green-light);
    }
    
    &.variant-negative {
      background: var(--surface-primary-lower);
      color: var(--color-red);
      border-color: var(--color-red-light);
    }
  }
</style>
