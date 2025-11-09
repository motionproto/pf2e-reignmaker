<script lang="ts">
  import type { Structure, ResourceCost } from '../../../../models/Structure';
  import { 
    getTierLabel, 
    getResourceIcon, 
    getResourceColor 
  } from '../../utils/presentation';
  import { generateEffectMessages } from '../../../../models/Structure';
  
  export let structure: Structure;
  export let tier: number;
  
  // Generate effect messages for gameEffects and manualEffects
  $: effectMessages = generateEffectMessages(structure);
</script>

<div class="structure-card">
  <!-- Header -->
  <div class="structure-card-header">
    <h4>{structure.name}</h4>
    <span class="tier-badge">Tier {structure.tier || tier}</span>
  </div>
  
  <!-- Split Layout: Thumbnail | Info -->
  <div class="structure-details">
    <!-- Thumbnail Placeholder -->
    <div class="structure-thumbnail">
      <div class="thumbnail-placeholder">
        <span>Image</span>
      </div>
    </div>
    
    <!-- Info Section -->
    <div class="structure-info">
      <!-- Description -->
      {#if structure.description}
        <div class="structure-description">
          {structure.description}
        </div>
      {/if}
      
      <!-- Cost Section -->
      <div class="structure-card-cost">
        <div class="cost-label">Cost</div>
        <div class="resource-list">
          {#each Object.entries(structure.constructionCost || {}) as [resource, amount]}
            {#if amount && amount > 0}
              <div class="resource-item">
                <i class="fas {getResourceIcon(resource)} resource-icon" style="color: {getResourceColor(resource)}"></i>
                <span>{amount} {resource}</span>
              </div>
            {/if}
          {/each}
          {#if !structure.constructionCost || Object.values(structure.constructionCost).every(v => !v || v === 0)}
            <span class="no-cost">Free</span>
          {/if}
        </div>
      </div>
      
      <!-- Modifiers (from structure.modifiers array) -->
      {#if structure.modifiers && structure.modifiers.length > 0}
        <div class="structure-modifiers">
          <div class="effect-label">Modifiers</div>
          {#each structure.modifiers as modifier}
            <div class="effect-item">
              <i class="fas fa-arrow-up" style="color: #4ade80;"></i>
              <span>{modifier.value > 0 ? '+' : ''}{modifier.value} {modifier.resource}</span>
            </div>
          {/each}
        </div>
      {/if}
      
      <!-- Effect Messages (gameEffects and manualEffects with msg support) -->
      {#if effectMessages.length > 0}
        <div class="structure-effect-messages">
          <div class="effect-label">Effects</div>
          {#each effectMessages as message}
            <div class="effect-message-item">
              <i class="fas fa-bolt"></i>
              <span>{message}</span>
            </div>
          {/each}
        </div>
      {/if}
      
      <!-- Special Note -->
      {#if structure.special}
        <div class="special-note">
          <i class="fas fa-sparkles"></i>
          {structure.special}
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .structure-card {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-16);
    transition: all 0.2s;
    
    &:hover {
      box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.3);
      background: rgba(0, 0, 0, 0.3);
    }
  }
  
  /* Header Styles */
  .structure-card-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-12);
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--border-faint);
    padding-bottom: var(--space-8);
    
    .tier-badge {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      background: rgba(251, 191, 36, 0.1);
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-faint);
    }
    
    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      flex: 1;
    }
  }
  
  /* Details Layout */
  .structure-details {
    display: flex;
    gap: var(--space-16);
  }
  
  .structure-thumbnail {
    flex: 0 0 6.25rem;
    align-self: flex-start;
    
    .thumbnail-placeholder {
      width: 6.25rem;
      height: 6.25rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-faint);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      font-size: var(--font-s);
    }
  }
  
  .structure-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
  
  /* Description */
  .structure-description {
    font-size: var(--font-md);
    color: var(--text-secondary);
    font-style: italic;
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--border-faint);
  }
  
  /* Cost Section */
  .structure-card-cost {
    .cost-label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
    }
    
    .resource-list {
      display: flex;
      gap: var(--space-12);
      flex-wrap: wrap;
      
      .resource-item {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        font-size: var(--font-md);
        color: var(--text-primary);
        
        .resource-icon {
          font-size: var(--font-md);
        }
      }
    }
    
    .no-cost {
      color: var(--text-tertiary);
      font-style: italic;
      font-size: var(--font-m);
    }
  }
  
  /* Modifiers Section */
  .structure-modifiers {
    .effect-label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
    }
    
    .effect-item {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      margin: var(--space-4) 0;
      font-size: var(--font-sm);
      color: var(--text-primary);
      
      i {
        width: 1rem;
        text-align: center;
        font-size: var(--font-sm);
      }
    }
  }
  
  /* Effect Messages Section */
  .structure-effect-messages {
    .effect-label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
    }
    
    .effect-message-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-8);
      margin: var(--space-4) 0;
      font-size: var(--font-sm);
      color: var(--text-primary);
      
      i {
        width: 1rem;
        text-align: center;
        font-size: var(--font-sm);
        margin-top: var(--space-2);
        color: var(--color-amber);
      }
    }
  }
  
  /* Special Note */
  .special-note {
    margin-top: var(--space-8);
    padding: var(--space-8);
    background: rgba(251, 191, 36, 0.05);
    border-left: 2px solid var(--color-amber);
    font-size: var(--font-md);
    color: var(--text-accent);
    display: flex;
    align-items: flex-start;
    gap: var(--space-12);
    
    i {
      color: var(--color-amber);
      font-size: var(--font-md);
      margin-top: var(--space-2);
    }
  }
</style>
