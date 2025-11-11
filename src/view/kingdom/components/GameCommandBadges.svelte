<script lang="ts">
  import type { GameCommand } from '../../../types/modifiers';
  
  export let gameCommands: GameCommand[];
  
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
        const worksiteType = command.worksiteType.charAt(0).toUpperCase() + command.worksiteType.slice(1);
        return `Create ${worksiteType}`;
      
      // Military Operations
      case 'recruitArmy':
        return 'Recruit Army';
      
      case 'trainArmy':
        return `Train Army (+${command.levelIncrease} level)`;
      
      case 'deployArmy':
        return 'Deploy Army';
      
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
      
      case 'executePrisoners':
        return 'Execute Prisoners';
      
      case 'pardonPrisoners':
        return 'Pardon Prisoners';
      
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
</style>
