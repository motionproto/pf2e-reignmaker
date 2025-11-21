<script lang="ts">
  // Visual design system showcase
  // Displays surface gradient swatches for design reference
  import Button from '../components/baseComponents/Button.svelte';
  import Notification from '../components/baseComponents/Notification.svelte';
  import OutcomeBadges from '../components/OutcomeDisplay/components/OutcomeBadges.svelte';
  import { textBadge, valueBadge, diceBadge, badge } from '../../../types/OutcomeBadge';
  import type { UnifiedOutcomeBadge } from '../../../types/OutcomeBadge';
  
  interface Swatch {
    name: string;
    variable: string | null;
    description: string;
  }
  
  interface SwatchGroup {
    title: string;
    swatches: Swatch[];
  }
  
  // Collapsible section state
  let expandedSections: Record<string, boolean> = {
    textColors: true,
    choiceButtons: true,
    standardButtons: true,
    notifications: true,
    outcomeBadges: true
  };
  
  function toggleSection(section: string) {
    expandedSections[section] = !expandedSections[section];
  }
  
  // Choice button state example
  let selectedChoice = 'option-2';
  
  // Track dice rolls for demo - use key to force remount
  let demoResolvedDice = new Map<number | string, number>();
  let diceBadgeKey = 0;
  
  // Outcome badge examples
  const staticBadges: UnifiedOutcomeBadge[] = [
    // Default variant (gray) - no variant specified or 'default'
    textBadge('Action completed', 'fa-check', 'default'),
    valueBadge('Costs {{value}} RP', 'fa-scroll', 2, 'default'),
    // Positive variant (green)
    textBadge('GM will disclose sensitive information', 'fa-user-secret', 'positive'),
    valueBadge('Receive {{value}} gold', 'fa-coins', 50, 'positive'),
    // Negative variant (red)
    textBadge('Army arrives with penalties', 'fa-exclamation-triangle', 'negative'),
    valueBadge('Lose {{value}} lumber', 'fa-tree', 10, 'negative'),
    // Info variant (blue)
    textBadge('Kingdom status unchanged', 'fa-info-circle', 'info'),
    valueBadge('Note: {{value}} days remaining', 'fa-clock', 5, 'info'),
    // With context
    badge({ 
      icon: 'fa-building', 
      template: 'Founded {{name}} settlement', 
      context: { name: 'Tuskwater' },
      variant: 'positive'
    }),
    badge({
      icon: 'fa-map-marker-alt',
      template: 'Explored {{hex}} hex',
      context: { hex: 'A4' },
      variant: 'info'
    }),
  ];
  
  // Use $: to recreate badges when key changes (for reset)
  $: diceBadges = diceBadgeKey >= 0 ? [
    diceBadge('Gain {{value}} food', 'fa-wheat-awn', '1d6', 'positive'),
    diceBadge('Lose {{value}} gold', 'fa-coins', '2d4', 'negative'),
    badge({
      icon: 'fa-gavel',
      template: 'Remove {{value}} imprisoned unrest',
      value: { formula: '1d4' },
      variant: 'positive'
    }),
    badge({
      icon: 'fa-handshake',
      template: '{{faction}} sends {{value}} troops',
      value: { formula: '1d6+2' },
      context: { faction: 'Swordlords' },
      variant: 'positive'
    }),
  ] : [];
  
  function handleDemoRoll(event: CustomEvent) {
    const { badgeIndex, result } = event.detail;
    demoResolvedDice.set(badgeIndex, result);
    demoResolvedDice = demoResolvedDice;
  }
  
  function resetDemoRolls() {
    demoResolvedDice = new Map();
    diceBadgeKey += 1; // Force component remount
  }
  
  function handleChoiceClick(choice: string) {
    selectedChoice = choice;
  }
  
  // Border variables for visual reference
  interface BorderGroup {
    title: string;
    borders: Array<{ name: string; variable: string }>;
  }
  
  // Text color variables for visual reference
  interface TextColorGroup {
    title: string;
    colors: Array<{ name: string; variable: string; description: string }>;
  }
  
  const textColorGroups: TextColorGroup[] = [
    {
      title: 'Base Text Colors',
      colors: [
        { name: 'Primary', variable: '--text-primary', description: 'Main text color' },
        { name: 'Secondary', variable: '--text-secondary', description: 'Less prominent text' },
        { name: 'Tertiary', variable: '--text-tertiary', description: 'Subtle text' },
        { name: 'Muted', variable: '--text-muted', description: 'De-emphasized text' },
        { name: 'Disabled', variable: '--text-disabled', description: 'Disabled state text' },
        { name: 'Inverted', variable: '--text-inverted', description: 'Dark text for light backgrounds' },
        { name: 'Accent', variable: '--text-accent', description: 'Highlighted text' }
      ]
    },
    {
      title: 'Success Text Colors',
      colors: [
        { name: 'Success', variable: '--text-success', description: 'Primary - Main text color' },
        { name: 'Success Secondary', variable: '--text-success-secondary', description: 'Secondary - Less prominent' },
        { name: 'Success Tertiary', variable: '--text-success-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Success Muted', variable: '--text-success-muted', description: 'Muted - De-emphasized' },
        { name: 'Success Disabled', variable: '--text-success-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Danger Text Colors',
      colors: [
        { name: 'Danger', variable: '--text-danger', description: 'Primary - Main text color' },
        { name: 'Danger Secondary', variable: '--text-danger-secondary', description: 'Secondary - Less prominent' },
        { name: 'Danger Tertiary', variable: '--text-danger-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Danger Muted', variable: '--text-danger-muted', description: 'Muted - De-emphasized' },
        { name: 'Danger Disabled', variable: '--text-danger-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Warning Text Colors',
      colors: [
        { name: 'Warning', variable: '--text-warning', description: 'Primary - Main text color' },
        { name: 'Warning Secondary', variable: '--text-warning-secondary', description: 'Secondary - Less prominent' },
        { name: 'Warning Tertiary', variable: '--text-warning-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Warning Muted', variable: '--text-warning-muted', description: 'Muted - De-emphasized' },
        { name: 'Warning Disabled', variable: '--text-warning-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Info Text Colors',
      colors: [
        { name: 'Info', variable: '--text-info', description: 'Primary - Main text color' },
        { name: 'Info Secondary', variable: '--text-info-secondary', description: 'Secondary - Less prominent' },
        { name: 'Info Tertiary', variable: '--text-info-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Info Muted', variable: '--text-info-muted', description: 'Muted - De-emphasized' },
        { name: 'Info Disabled', variable: '--text-info-disabled', description: 'Disabled - Disabled state' }
      ]
    },
    {
      title: 'Special Text Colors',
      colors: [
        { name: 'Special', variable: '--text-special', description: 'Primary - Main text color' },
        { name: 'Special Secondary', variable: '--text-special-secondary', description: 'Secondary - Less prominent' },
        { name: 'Special Tertiary', variable: '--text-special-tertiary', description: 'Tertiary - Subtle text' },
        { name: 'Special Muted', variable: '--text-special-muted', description: 'Muted - De-emphasized' },
        { name: 'Special Disabled', variable: '--text-special-disabled', description: 'Disabled - Disabled state' }
      ]
    }
  ];
  
  const borderGroups: BorderGroup[] = [
    {
      title: 'Base Borders',
      borders: [
        { name: 'Faint', variable: '--border-faint' },
        { name: 'Subtle', variable: '--border-subtle' },
        { name: 'Default', variable: '--border-default' },
        { name: 'Medium', variable: '--border-medium' },
        { name: 'Strong', variable: '--border-strong' }
      ]
    },
    {
      title: 'Primary (Crimson)',
      borders: [
        { name: 'Faint', variable: '--border-primary-faint' },
        { name: 'Subtle', variable: '--border-primary-subtle' },
        { name: 'Primary', variable: '--border-primary' },
        { name: 'Medium', variable: '--border-primary-medium' },
        { name: 'Strong', variable: '--border-primary-strong' }
      ]
    },
    {
      title: 'Accent (Amber)',
      borders: [
        { name: 'Faint', variable: '--border-accent-faint' },
        { name: 'Subtle', variable: '--border-accent-subtle' },
        { name: 'Accent', variable: '--border-accent' },
        { name: 'Medium', variable: '--border-accent-medium' },
        { name: 'Strong', variable: '--border-accent-strong' }
      ]
    },
    {
      title: 'Info (Blue)',
      borders: [
        { name: 'Faint', variable: '--border-info-faint' },
        { name: 'Subtle', variable: '--border-info-subtle' },
        { name: 'Info', variable: '--border-info' },
        { name: 'Medium', variable: '--border-info-medium' },
        { name: 'Strong', variable: '--border-info-strong' }
      ]
    },
    {
      title: 'Success (Green)',
      borders: [
        { name: 'Faint', variable: '--border-success-faint' },
        { name: 'Subtle', variable: '--border-success-subtle' },
        { name: 'Success', variable: '--border-success' },
        { name: 'Medium', variable: '--border-success-medium' },
        { name: 'Strong', variable: '--border-success-strong' }
      ]
    },
    {
      title: 'Special (Purple)',
      borders: [
        { name: 'Faint', variable: '--border-special-faint' },
        { name: 'Subtle', variable: '--border-special-subtle' },
        { name: 'Special', variable: '--border-special' },
        { name: 'Medium', variable: '--border-special-medium' },
        { name: 'Strong', variable: '--border-special-strong' }
      ]
    },
    {
      title: 'Danger (Bright Red)',
      borders: [
        { name: 'Faint', variable: '--border-danger-faint' },
        { name: 'Subtle', variable: '--border-danger-subtle' },
        { name: 'Danger', variable: '--border-danger' },
        { name: 'Medium', variable: '--border-danger-medium' },
        { name: 'Strong', variable: '--border-danger-strong' }
      ]
    }
  ];
  
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
        { name: 'Lowest', variable: '--surface-primary-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-primary-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-primary-low', description: 'Subtle' },
        { name: 'Primary', variable: '--surface-primary', description: 'Default' },
        { name: 'High', variable: '--surface-primary-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-primary-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-primary-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Success (Green)',
      swatches: [
        { name: 'Lowest', variable: '--surface-success-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-success-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-success-low', description: 'Subtle' },
        { name: 'Success', variable: '--surface-success', description: 'Default' },
        { name: 'High', variable: '--surface-success-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-success-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-success-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Warning (Amber)',
      swatches: [
        { name: 'Lowest', variable: '--surface-warning-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-warning-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-warning-low', description: 'Subtle' },
        { name: 'Warning', variable: '--surface-warning', description: 'Default' },
        { name: 'High', variable: '--surface-warning-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-warning-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-warning-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Accent (Amber)',
      swatches: [
        { name: 'Lowest', variable: '--surface-accent-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-accent-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-accent-low', description: 'Subtle' },
        { name: 'Accent', variable: '--surface-accent', description: 'Default' },
        { name: 'High', variable: '--surface-accent-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-accent-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-accent-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Info (Blue)',
      swatches: [
        { name: 'Lowest', variable: '--surface-info-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-info-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-info-low', description: 'Subtle' },
        { name: 'Info', variable: '--surface-info', description: 'Default' },
        { name: 'High', variable: '--surface-info-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-info-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-info-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Special (Purple)',
      swatches: [
        { name: 'Lowest', variable: '--surface-special-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-special-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-special-low', description: 'Subtle' },
        { name: 'Special', variable: '--surface-special', description: 'Default' },
        { name: 'High', variable: '--surface-special-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-special-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-special-highest', description: 'Most prominent' }
      ]
    },
    {
      title: 'Danger (Bright Red)',
      swatches: [
        { name: 'Lowest', variable: '--surface-danger-lowest', description: 'Deepest' },
        { name: 'Lower', variable: '--surface-danger-lower', description: 'Barely perceptible' },
        { name: 'Low', variable: '--surface-danger-low', description: 'Subtle' },
        { name: 'Danger', variable: '--surface-danger', description: 'Default' },
        { name: 'High', variable: '--surface-danger-high', description: 'More prominent' },
        { name: 'Higher', variable: '--surface-danger-higher', description: 'Very prominent' },
        { name: 'Highest', variable: '--surface-danger-highest', description: 'Most prominent' }
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
  
  <!-- Border Variables Section -->
  {#each borderGroups as group}
    <div class="swatch-group">
      <h2 class="group-title">{group.title}</h2>
      <div class="outline-colors-grid">
        {#each group.borders as border}
          <div class="outline-card">
            <div 
              class="outline-box" 
              style="border: 2px solid var({border.variable});"
            ></div>
            <div class="outline-name">{border.name}</div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
  
  <!-- Text Colors Section -->
  <div class="choice-button-demo">
    <button class="collapsible-header" on:click={() => toggleSection('textColors')}>
      <h2 class="group-title">Text Colors</h2>
      <i class="fas fa-chevron-down chevron" class:collapsed={!expandedSections.textColors}></i>
    </button>
    {#if expandedSections.textColors}
    <p class="demo-description">
      Typography color system for consistent text hierarchy and states.
    </p>
    
    {#each textColorGroups as group}
      <div class="demo-section">
        <h3 class="demo-subtitle">{group.title}</h3>
        <div class="text-colors-grid">
          {#each group.colors as color}
            <div class="text-color-card">
              <div 
                class="text-color-preview" 
                style="color: var({color.variable});"
              >
                Ag
              </div>
              <div class="text-color-info">
                <div class="text-color-name">{color.name}</div>
                <div class="text-color-variable">{color.variable}</div>
                <div class="text-color-description">{color.description}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
    {/if}
  </div>
  
  <!-- Choice Button Visual States Example -->
  <div class="choice-button-demo">
    <button class="collapsible-header" on:click={() => toggleSection('choiceButtons')}>
      <h2 class="group-title">Button-Based Choice Sets</h2>
      <i class="fas fa-chevron-down chevron" class:collapsed={!expandedSections.choiceButtons}></i>
    </button>
    {#if expandedSections.choiceButtons}
    <p class="demo-description">
      Interactive example showing all 4 visual states. Click buttons to see selection state.
    </p>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Interactive Example</h3>
      <div class="choice-buttons-container">
        <button
          class="choice-button"
          class:selected={selectedChoice === 'option-1'}
          on:click={() => handleChoiceClick('option-1')}
        >
          <i class="fas fa-star"></i>
          <span>Default/Hover</span>
        </button>
        
        <button
          class="choice-button"
          class:selected={selectedChoice === 'option-2'}
          on:click={() => handleChoiceClick('option-2')}
        >
          <i class="fas fa-check"></i>
          <span>Selected</span>
        </button>
        
        <button
          class="choice-button"
          class:selected={selectedChoice === 'option-3'}
          on:click={() => handleChoiceClick('option-3')}
        >
          <i class="fas fa-heart"></i>
          <span>Clickable</span>
        </button>
        
        <button
          class="choice-button"
          disabled
        >
          <i class="fas fa-ban"></i>
          <span>Disabled</span>
        </button>
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">State Reference</h3>
      <div class="state-reference">
        <div class="state-item">
          <div class="state-label">Default</div>
          <div class="state-details">
            <code>background: --surface-high</code>
            <code>border: 1px --border-default</code>
          </div>
        </div>
        
        <div class="state-item">
          <div class="state-label">Hover</div>
          <div class="state-details">
            <code>background: --surface-higher</code>
            <code>border-color: --border-strong</code>
          </div>
        </div>
        
        <div class="state-item">
          <div class="state-label">Selected</div>
          <div class="state-details">
            <code>background: --surface-success-high</code>
            <code>outline: 2px --border-success</code>
          </div>
        </div>
        
        <div class="state-item">
          <div class="state-label">Disabled</div>
          <div class="state-details">
            <code>opacity: 0.4</code>
            <code>cursor: not-allowed</code>
          </div>
        </div>
      </div>
    </div>
    {/if}
  </div>
  
  <!-- Standard Button Component Showcase -->
  <div class="choice-button-demo">
    <button class="collapsible-header" on:click={() => toggleSection('standardButtons')}>
      <h2 class="group-title">Standard Button Component</h2>
      <i class="fas fa-chevron-down chevron" class:collapsed={!expandedSections.standardButtons}></i>
    </button>
    {#if expandedSections.standardButtons}
    <p class="demo-description">
      Reusable button component with multiple variants and sizes. Import from <code>baseComponents/Button.svelte</code>
    </p>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Button Variants</h3>
      <div class="button-showcase-grid">
        <div class="button-showcase-item">
          <Button variant="primary">Primary</Button>
          <span class="variant-label">primary</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="secondary">Secondary</Button>
          <span class="variant-label">secondary</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="outline">Outline</Button>
          <span class="variant-label">outline</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="small_secondary">Small Secondary</Button>
          <span class="variant-label">small_secondary</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="success">Success</Button>
          <span class="variant-label">success</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="danger">Danger</Button>
          <span class="variant-label">danger</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="warning">Warning</Button>
          <span class="variant-label">warning</span>
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">With Icons</h3>
      <div class="button-showcase-grid">
        <div class="button-showcase-item">
          <Button variant="primary" icon="fas fa-star" iconPosition="left">With Icon</Button>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="secondary" icon="fas fa-check" iconPosition="right">Icon Right</Button>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="success" icon="fas fa-plus">Add Item</Button>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="danger" icon="fas fa-trash">Delete</Button>
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Sizes & States</h3>
      <div class="button-showcase-grid">
        <div class="button-showcase-item">
          <Button variant="primary" size="default">Default Size</Button>
          <span class="variant-label">size="default"</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="primary" size="small">Small Size</Button>
          <span class="variant-label">size="small"</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="primary" disabled>Disabled</Button>
          <span class="variant-label">disabled</span>
        </div>
        
        <div class="button-showcase-item">
          <Button variant="primary" fullWidth>Full Width</Button>
          <span class="variant-label">fullWidth</span>
        </div>
      </div>
    </div>
    {/if}
  </div>
  <!-- Notification Components Section -->
  <div class="choice-button-demo">
    <button class="collapsible-header" on:click={() => toggleSection('notifications')}>
      <h2 class="group-title">Notification Components</h2>
      <i class="fas fa-chevron-down chevron" class:collapsed={!expandedSections.notifications}></i>
    </button>
    {#if expandedSections.notifications}
    <p class="demo-description">
      Contextual feedback notifications with multiple variants. Import from <code>baseComponents/Notification.svelte</code>
    </p>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Variants</h3>
      <div class="notification-showcase">
        <Notification
          variant="info"
          title="Information"
          description="This is an informational message to keep you updated."
        />
        
        <Notification
          variant="success"
          title="Success"
          description="Your action was completed successfully."
        />
        
        <Notification
          variant="warning"
          title="Warning"
          description="Caution: This action may have unintended consequences."
        />
        
        <Notification
          variant="danger"
          title="Danger"
          description="Critical error: Please address this issue immediately."
        />
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">With Impact Text</h3>
      <div class="notification-showcase">
        <Notification
          variant="warning"
          title="Food Shortage"
          description="Your kingdom is running low on food supplies."
          impact="-2 to Economy until resolved"
        />
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">With Action Button</h3>
      <div class="notification-showcase">
        <Notification
          variant="info"
          title="Settlement Unmapped"
          description="This settlement has not been placed on the map yet."
          actionText="Place on Map"
          actionIcon="fas fa-map-marker-alt"
          onAction={() => {}}
        />
        
        <Notification
          variant="success"
          title="Trade Agreement Available"
          description="A neighboring faction has offered a trade deal."
          actionText="View Details"
          actionIcon="fas fa-handshake"
          onAction={() => {}}
          actionInline={true}
        />
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Compact Size & Emphasis</h3>
      <div class="notification-showcase">
        <Notification
          variant="info"
          title="Compact Notification"
          description="A smaller notification for tighter spaces."
          size="compact"
        />
        
        <Notification
          variant="danger"
          title="Emphasized Alert"
          description="Important notifications can have emphasis styling."
          emphasis={true}
        />
      </div>
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Dismissible</h3>
      <div class="notification-showcase">
        <Notification
          variant="success"
          title="Dismissible Notification"
          description="Click the X to dismiss this notification."
          dismissible={true}
        />
      </div>
    </div>
    {/if}
  </div>
  
  <!-- Outcome Badges Section -->
  <div class="choice-button-demo">
    <button class="collapsible-header" on:click={() => toggleSection('outcomeBadges')}>
      <h2 class="group-title">Outcome Badges</h2>
      <i class="fas fa-chevron-down chevron" class:collapsed={!expandedSections.outcomeBadges}></i>
    </button>
    {#if expandedSections.outcomeBadges}
    <p class="demo-description">
      New template-based badge system using <code>{"{{value}}"}</code> placeholders. 
      Supports static values, dice rolls, and context substitution.
    </p>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Static Badges (Text & Values)</h3>
      <OutcomeBadges 
        outcomeBadges={staticBadges}
      />
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Interactive Dice Badges (Click to Roll)</h3>
      <div class="dice-demo-controls">
        <Button variant="small_secondary" on:click={resetDemoRolls}>Reset Rolls</Button>
      </div>
      {#key diceBadgeKey}
        <OutcomeBadges 
          outcomeBadges={diceBadges}
          resolvedDice={demoResolvedDice}
          on:badgeRoll={handleDemoRoll}
        />
      {/key}
    </div>
    
    <div class="demo-section">
      <h3 class="demo-subtitle">Badge Template Syntax</h3>
      <div class="state-reference">
        <div class="state-item">
          <div class="state-label">Text Only</div>
          <div class="state-details">
            <code>textBadge('Message', 'fa-icon', 'variant')</code>
          </div>
        </div>
        
        <div class="state-item">
          <div class="state-label">Static Value</div>
          <div class="state-details">
            <code>valueBadge('Gain {"{{value}}"} gold', 'fa-coins', 50)</code>
          </div>
        </div>
        
        <div class="state-item">
          <div class="state-label">Dice Roll</div>
          <div class="state-details">
            <code>diceBadge('Roll {"{{value}}"} damage', 'fa-dice', '1d6')</code>
          </div>
        </div>
        
        <div class="state-item">
          <div class="state-label">With Context</div>
          <div class="state-details">
            <code>badge({"{ template: '{{name}} founded', context: { name: 'Tuskwater' } }"})</code>
          </div>
        </div>
      </div>
    </div>
    {/if}
  </div>
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
    gap: var(--space-16);
  }
  
  /* No gap between collapsible sections */
  .choice-button-demo + .choice-button-demo {
    margin-top: calc(-1 * var(--space-12));
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
  
  .collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    padding: var(--space-4) 0;
    cursor: pointer;
    text-align: left;
  }
  
  .collapsible-header:hover .group-title {
    color: var(--text-primary);
  }
  
  .chevron {
    color: var(--text-tertiary);
    font-size: var(--font-sm);
    transition: transform 0.2s ease;
  }
  
  .chevron.collapsed {
    transform: rotate(-90deg);
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
  
  /* Outline Colors Grid */
  .outline-colors-grid {
    display: flex;
    gap: var(--space-16);
  }
  
  .outline-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: center;
  }
  
  .outline-box {
    width: 4rem; /* 64px */
    height: 4rem; /* 64px */
    background: var(--surface-low);
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }
  
  .outline-name {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    text-align: center;
  }
  
  /* Choice Button Demo Styles */
  .choice-button-demo {
    display: flex;
    flex-direction: column;
    padding: var(--space-4) 0;
    border-top: 1px solid var(--border-subtle);
  }
  
  .choice-button-demo > *:not(.collapsible-header) {
    margin-top: var(--space-12);
  }
  
  .demo-description {
    font-size: var(--font-sm);
    color: var(--text-tertiary);
    margin: 0;
  }
  
  .demo-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  
  .demo-subtitle {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
    margin: 0;
  }
  
  .choice-buttons-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
  }
  
  /* Choice Button Styles - Matches Secondary Button Style */
  .choice-button {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10) var(--space-16);
    
    /* Background - matches secondary button */
    background: var(--surface-high);
    
    /* Border (visible on all states) */
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    
    /* Outline (invisible by default, shows on selection - doesn't affect size) */
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    /* Typography */
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--text-primary);
    
    /* Interaction */
    cursor: pointer;
    transition: all 0.2s;
    
    /* Shimmer effect */
    position: relative;
    overflow: hidden;
  }
  
  .choice-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg,
      transparent,
      var(--hover),
      transparent);
    transition: left 0.5s ease;
  }
  
  .choice-button:hover::before {
    left: 100%;
  }
  
  .choice-button i {
    font-size: var(--font-lg);
    color: var(--text-secondary);
    transition: color 0.2s;
  }
  
  /* Hover state - strong border */
  .choice-button:hover:not(:disabled):not(.selected) {
    background: var(--surface-higher);
    border-color: var(--border-strong);
    transform: translateY(-0.0625rem);
    box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
  }
  
  /* Selected state */
  .choice-button.selected {
    background: var(--surface-success-high);
    outline-color: var(--border-success);
  }
  
  /* Disabled state */
  .choice-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  /* State Reference */
  .state-reference {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-12);
  }
  
  .state-item {
    background: var(--overlay-low);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-12);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  
  .state-label {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .state-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .state-details code {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    background: var(--surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
  }
  
  /* Standard Button Showcase */
  .button-showcase-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-16);
    align-items: start;
  }
  
  .button-showcase-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    align-items: center;
  }
  
  .variant-label {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    font-family: 'Courier New', monospace;
    background: var(--surface-lowest);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }
  
  .demo-description code {
    font-size: var(--font-xs);
    color: var(--color-amber);
    background: var(--surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
  }
  
  .dice-demo-controls {
    margin-bottom: var(--space-12);
  }
  
  /* Notification Showcase */
  .notification-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
  
  /* Text Colors Grid */
  .text-colors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-16);
  }
  
  .text-color-card {
    background: var(--surface-low);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    align-items: center;
  }
  
  .text-color-preview {
    font-size: var(--font-5xl);
    font-weight: var(--font-weight-bold);
    line-height: 1;
  }
  
  .text-color-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: center;
    text-align: center;
  }
  
  .text-color-name {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .text-color-variable {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    font-family: 'Courier New', monospace;
    background: var(--surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
  }
  
  .text-color-description {
    font-size: var(--font-xs);
    color: var(--text-muted);
  }
</style>
