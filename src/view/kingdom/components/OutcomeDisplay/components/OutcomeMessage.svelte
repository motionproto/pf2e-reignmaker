<script lang="ts">
  import type { SpecialEffect } from '../../../../../types/special-effects';
  import { getResourceIcon } from '../../../utils/presentation';
  
  export let effect: string;
  export let inlineBadges: SpecialEffect[] = [];
  
  // Extract resource name from message (e.g., "Gained 1 Unrest" -> "unrest")
  function extractResourceFromMessage(message: string): string | null {
    const match = message.match(/(?:gained|lost|received)\s+\d+\s+(\w+)/i);
    return match ? match[1].toLowerCase() : null;
  }
  
  // Get icon for effect type if not explicitly provided
  function getEffectIcon(effect: SpecialEffect): string {
    if (effect.icon) return effect.icon;
    
    switch (effect.type) {
      case 'attitude':
        return 'fa-handshake';
      case 'resource': {
        const resourceType = extractResourceFromMessage(effect.message);
        if (resourceType) {
          return getResourceIcon(resourceType);
        }
        return 'fa-coins';
      }
      case 'status':
        return 'fa-flag';
      case 'damage':
        return 'fa-hammer';
      case 'hex':
        return 'fa-map';
      case 'info':
      default:
        return 'fa-info-circle';
    }
  }
  
  // Get variant class for styling
  function getVariantClass(variant?: string): string {
    switch (variant) {
      case 'positive':
        return 'variant-positive';
      case 'negative':
        return 'variant-negative';
      case 'neutral':
      default:
        return 'variant-neutral';
    }
  }
</script>

{#if effect && effect.trim().length > 0}
  <div class="resolution-effect-wrapper">
    <div class="resolution-effect">
      {@html effect}
    </div>
    
    {#if inlineBadges.length > 0}
      <div class="inline-badges">
        {#each inlineBadges as badge}
          <div class="effect-badge {getVariantClass(badge.variant)}">
            <div class="badge-content">
              <i class="fas {getEffectIcon(badge)} effect-icon"></i>
              <span class="effect-message">{badge.message}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .resolution-effect-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .resolution-effect {
    color: var(--text-primary);
    font-size: var(--font-lg);
    font-weight: var(--font-weight-medium);
    line-height: 1.4;
    padding: 0;
  }
  
  .inline-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
  }
  
  .effect-badge {
    display: flex;
    align-items: center;
    padding: var(--space-8) var(--space-12);
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-md);
    min-width: 12.5rem;
    width: auto;
    transition: all var(--transition-fast);
    
    &.variant-positive {
      background: rgba(34, 197, 94, 0.1);
      border-color: var(--border-success-medium);
      
      .effect-icon {
        color: var(--color-green);
      }
    }
    
    &.variant-negative {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--border-primary-medium);
      
      .effect-icon {
        color: var(--color-red);
      }
    }
    
    &.variant-neutral {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.4);
      
      .effect-icon {
        color: rgb(59, 130, 246);
      }
    }
    
    .badge-content {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      width: 100%;
      
      .effect-icon {
        font-size: var(--font-lg);
        flex-shrink: 0;
      }
      
      .effect-message {
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        line-height: 1.4;
        flex: 1;
      }
    }
  }
</style>
