<script lang="ts">
  // Visual design system showcase
  // Displays surface gradient swatches for design reference
  
  interface Swatch {
    name: string;
    variable: string | null;
    description: string;
  }
  
  interface SwatchGroup {
    title: string;
    swatches: Swatch[];
  }
  
  const swatchGroups: SwatchGroup[] = [
    {
      title: 'Base Surfaces',
      swatches: [
        { name: 'Lowest', variable: '--surface-lowest', description: '10% - Deepest surface layer' },
        { name: 'Lower', variable: '--surface-lower', description: '~11% - Very subtle lift' },
        { name: 'Low', variable: '--surface-low', description: '~12% - Subtle panels' },
        { name: 'Surface', variable: '--surface', description: '~13% - Standard surface (MIDPOINT)' },
        { name: 'High', variable: '--surface-high', description: '~14% - Elevated panels' },
        { name: 'Higher', variable: '--surface-higher', description: '~14.5% - Prominent elements' },
        { name: 'Highest', variable: '--surface-highest', description: '15% - Most elevated (modals, tooltips)' }
      ]
    },
    {
      title: 'Overlays',
      swatches: [
        { name: 'Lowest', variable: '--overlay-lowest', description: 'Barely visible tint' },
        { name: 'Lower', variable: '--overlay-lower', description: 'Very subtle overlay' },
        { name: 'Low', variable: '--overlay-low', description: 'Light overlay' },
        { name: 'Overlay', variable: '--overlay', description: 'Standard overlay' },
        { name: 'High', variable: '--overlay-high', description: 'Heavy overlay' },
        { name: 'Higher', variable: '--overlay-higher', description: 'Modal backdrop' },
        { name: 'Highest', variable: '--overlay-highest', description: 'Nearly opaque' }
      ]
    },
    {
      title: 'Primary (Crimson)',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Lower', variable: '--surface-primary-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-primary-low', description: 'Subtle' },
        { name: 'Primary', variable: '--surface-primary', description: 'Default' },
        { name: 'High', variable: '--surface-primary-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-primary-higher', description: 'Most prominent' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    },
    {
      title: 'Success (Green)',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Lower', variable: '--surface-success-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-success-low', description: 'Subtle' },
        { name: 'Success', variable: '--surface-success', description: 'Default' },
        { name: 'High', variable: '--surface-success-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-success-higher', description: 'Most prominent' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    },
    {
      title: 'Warning (Amber)',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Lower', variable: '--surface-warning-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-warning-low', description: 'Subtle' },
        { name: 'Warning', variable: '--surface-warning', description: 'Default' },
        { name: 'High', variable: '--surface-warning-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-warning-higher', description: 'Most prominent' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    },
    {
      title: 'Accent (Amber)',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Lower', variable: '--surface-accent-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-accent-low', description: 'Subtle' },
        { name: 'Accent', variable: '--surface-accent', description: 'Default' },
        { name: 'High', variable: '--surface-accent-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-accent-higher', description: 'Most prominent' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    },
    {
      title: 'Info (Blue)',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Lower', variable: '--surface-info-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-info-low', description: 'Subtle' },
        { name: 'Info', variable: '--surface-info', description: 'Default' },
        { name: 'High', variable: '--surface-info-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-info-higher', description: 'Most prominent' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    },
    {
      title: 'Special (Purple)',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Lower', variable: '--surface-special-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-special-low', description: 'Subtle' },
        { name: 'Special', variable: '--surface-special', description: 'Default' },
        { name: 'High', variable: '--surface-special-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-special-higher', description: 'Most prominent' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    },
    {
      title: 'Hover States',
      swatches: [
        { name: '', variable: null, description: 'Empty slot' },
        { name: '', variable: null, description: 'Empty slot' },
        { name: 'Low', variable: '--hover-low', description: 'Subtle hover' },
        { name: 'Hover', variable: '--hover', description: 'Standard hover' },
        { name: 'High', variable: '--hover-high', description: 'Prominent hover' },
        { name: '', variable: null, description: 'Empty slot' },
        { name: '', variable: null, description: 'Empty slot' }
      ]
    }
  ];
</script>

<div class="visuals-container">
  {#each swatchGroups as group}
    <div class="swatch-group">
      <h2 class="group-title">{group.title}</h2>
      <div class="swatches-grid">
        {#each group.swatches as swatch}
          <div class="swatch-card">
            {#if swatch.variable}
              <div 
                class="swatch-box" 
                style="background: var({swatch.variable});"
              ></div>
              <div class="swatch-name">{swatch.name}</div>
            {:else}
              <div class="swatch-box empty"></div>
              <div class="swatch-name">&nbsp;</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  @import '../../../styles/variables.css';
  
  .visuals-container {
    width: 100%;
    min-height: 100%;
    background: var(--empty);
    padding: var(--space-16);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-24);
  }
  
  .swatch-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .group-title {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin: 0;
  }
  
  .swatches-grid {
    display: grid;
    grid-template-columns: repeat(7, 4rem);
    gap: var(--space-16);
  }
  
  .swatch-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: center;
  }
  
  .swatch-box {
    width: 4rem; /* 64px */
    height: 4rem; /* 64px */
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }
  
  .swatch-box.empty {
    opacity: 0;
  }
  
  .swatch-name {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    text-align: center;
  }
</style>
