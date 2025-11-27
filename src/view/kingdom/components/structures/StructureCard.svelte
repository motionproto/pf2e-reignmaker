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
    <div class="header-left">
      <h4>{structure.name}</h4>
    </div>
    
    <div class="badges">
      <!-- Cost display -->
      <div class="cost-display">
        <span class="cost-label">Cost:</span>
        {#each Object.entries(structure.constructionCost || {}) as [resource, amount]}
          {#if amount && amount > 0}
            <div class="cost-item">
              <i class="fas {getResourceIcon(resource)}" style="color: {getResourceColor(resource)}"></i>
              <span>{amount}</span>
            </div>
          {/if}
        {/each}
        {#if !structure.constructionCost || Object.values(structure.constructionCost).every(v => !v || v === 0)}
          <span class="free-badge">Free</span>
        {/if}
      </div>
      
      <span class="tier-badge">Tier {structure.tier || tier}</span>
    </div>
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
      
      <!-- Effect Messages (gameEffects and manualEffects with msg support) -->
      {#if effectMessages.length > 0}
        <div class="structure-effect-messages">
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
    background: var(--surface-lowest);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    transition: all 0.2s;
    
    &:hover {
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
      background: var(--surface);
    }
  }
  
  /* Header Styles */
  .structure-card-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-12);
    margin-bottom: var(--space-16);
    border-bottom: 1px solid var(--border-faint);
    padding-bottom: var(--space-8);
    
    .header-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }
    
    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
    }
    
    .badges {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      .cost-display {
        display: flex;
        gap: var(--space-8);
        flex-wrap: wrap;
        align-items: center;
        margin-right: var(--space-16);
        
        .cost-label {
          font-size: var(--font-md);
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
        }
        
        .cost-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          font-size: var(--font-md);
          color: var(--text-primary);
          
          i {
            font-size: var(--font-md);
          }
        }
        
        .free-badge {
          font-size: var(--font-md);
          color: var(--text-secondary);
        }
      }
      
      .tier-badge {
        font-size: var(--font-md);
        font-weight: var(--font-weight-semibold);
        color: var(--text-secondary);
        background: var(--surface-high);
        padding: var(--space-4) var(--space-8);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-medium);
      }
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
    
      border: 1px solid var(--border-faint);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      font-size: var(--font-md);
    }
  }
  
  .structure-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  /* Description */
  .structure-description {
    font-size: var(--font-md);
    font-weight: var(--font-weight-light);
    color: var(--text-secondary);
    padding-right: var(--space-16);
  }
  
  /* Cost Section */
  .structure-card-cost {
    .cost-label {
      font-size: var(--font-md);
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
      font-size: var(--font-md);
    }
  }
  
  /* Effect Messages Section */
  .structure-effect-messages {
    .effect-message-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-8);
      margin: var(--space-4) 0;
      font-size: var(--font-md);
      color: var(--text-primary);
      
      i {
        width: 1rem;
        text-align: center;
        font-size: var(--font-md);
        margin-top: var(--space-2);
        color: var(--color-amber);
      }
    }
  }
  
  /* Special Note */
  .special-note {
    margin-top: var(--space-8);
    padding: var(--space-8);
    background: var(--surface-accent-lower);
    border-left: 2px solid var(--color-amber);
    font-size: var(--font-md);
    color: var(--text-accent-primary);
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
