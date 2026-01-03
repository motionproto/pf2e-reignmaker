<script lang="ts">
  import type { Structure, ResourceCost } from '../../../../models/Structure';
  import {
    getTierLabel,
    getResourceIcon,
    getResourceColor,
    getStructureImagePath
  } from '../../utils/presentation';
  import { generateEffectMessages } from '../../../../models/Structure';
  import StructureDetailsDialog from '../dialogs/StructureDetailsDialog.svelte';

  export let structure: Structure;
  export let tier: number;

  // Generate effect messages for gameEffects and manualEffects
  $: effectMessages = generateEffectMessages(structure);

  // Get image path for this structure
  $: imagePath = getStructureImagePath(structure.name);

  // Dialog state
  let showDetailsDialog = false;

  function handleImageClick(event: MouseEvent) {
    event.stopPropagation();
    showDetailsDialog = true;
  }
</script>

<div class="structure-card">
  <!-- Left Column: Large Image -->
  <div class="structure-image-column">
    <img
      src={imagePath}
      alt={structure.name}
      class="structure-image clickable"
      on:click={handleImageClick}
      title="Click to view details"
    />
  </div>

  <!-- Right Column: All Content -->
  <div class="structure-content-column">
    <!-- Header -->
    <div class="structure-card-header">
      <h4>{structure.name}</h4>

      <div class="badges">
        <!-- Cost display -->
        <div class="cost-display">
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

<!-- Structure Details Dialog -->
<StructureDetailsDialog bind:show={showDetailsDialog} {structure} />

<style lang="scss">
  .structure-card {
    display: flex;
    gap: var(--space-16);
    background: var(--surface-lowest);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-12);
    transition: all 0.2s;

    &:hover {
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
      background: var(--surface);
    }
  }

  /* Left Column: Image */
  .structure-image-column {
    flex: 0 0 8rem;

    .structure-image {
      width: 8rem;
      height: 8rem;
      object-fit: cover;
      border-radius: var(--radius-md);

      &.clickable {
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;

        &:hover {
          transform: scale(1.03);
          box-shadow: 0 0.25rem 0.75rem var(--overlay-medium);
        }
      }
    }
  }

  /* Right Column: Content */
  .structure-content-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    min-width: 0; // Prevent flex overflow
  }

  /* Header Styles */
  .structure-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);

    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
    }

    .badges {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;

      .cost-display {
        display: flex;
        gap: var(--space-6);
        align-items: center;

        .cost-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-sm);
          color: var(--text-primary);

          i {
            font-size: var(--font-sm);
          }
        }

        .free-badge {
          font-size: var(--font-sm);
          color: var(--text-tertiary);
        }
      }

      .tier-badge {
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-secondary);
        background: var(--surface-high);
        padding: var(--space-2) var(--space-6);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-medium);
      }
    }
  }

  /* Description */
  .structure-description {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-light);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* Effect Messages Section */
  .structure-effect-messages {
    .effect-message-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-6);
      margin: var(--space-2) 0;
      font-size: var(--font-sm);
      color: var(--text-primary);

      i {
        width: 0.875rem;
        text-align: center;
        font-size: var(--font-sm);
        margin-top: 0.125rem;
        color: var(--color-amber);
      }
    }
  }

  /* Special Note */
  .special-note {
    padding: var(--space-6);
    background: var(--surface-accent-lower);
    border-left: 2px solid var(--color-amber);
    font-size: var(--font-sm);
    color: var(--text-accent-primary);
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);

    i {
      color: var(--color-amber);
      font-size: var(--font-sm);
      margin-top: 0.125rem;
    }
  }
</style>
