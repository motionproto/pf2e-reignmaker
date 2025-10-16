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
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 1rem;
    transition: all 0.2s;
    
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      background: rgba(0, 0, 0, 0.3);
    }
  }
  
  /* Header Styles */
  .structure-card-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 0.5rem;
    
    .tier-badge {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      background: rgba(251, 191, 36, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
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
    gap: 1rem;
  }
  
  .structure-thumbnail {
    flex: 0 0 100px;
    height: 100px;
    
    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-subtle);
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
    gap: 1rem;
  }
  
  /* Description */
  .structure-description {
    font-size: var(--font-md);
    color: var(--text-secondary);
    font-style: italic;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-subtle);
  }
  
  /* Cost Section */
  .structure-card-cost {
    .cost-label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }
    
    .resource-list {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      
      .resource-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
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
      margin-bottom: 0.25rem;
    }
    
    .effect-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.25rem 0;
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
      margin-bottom: 0.25rem;
    }
    
    .effect-message-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0.25rem 0;
      font-size: var(--font-sm);
      color: var(--text-primary);
      
      i {
        width: 1rem;
        text-align: center;
        font-size: var(--font-sm);
        margin-top: 0.125rem;
        color: var(--color-amber);
      }
    }
  }
  
  /* Special Note */
  .special-note {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(251, 191, 36, 0.05);
    border-left: 2px solid var(--color-amber);
    font-size: var(--font-md);
    color: var(--text-accent);
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    
    i {
      color: var(--color-amber);
      font-size: var(--font-md);
      margin-top: 0.125rem;
    }
  }
</style>
