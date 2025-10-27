<script lang="ts">
  import { onMount } from 'svelte';
  import { kingdomData, claimedHexes, claimedSettlements, claimedWorksites, currentProduction } from '../../../stores/KingdomStore';
  import { startKingdom } from '../../../stores/KingdomStore';
  import { setSelectedTab } from '../../../stores/ui';
  import { getResourceIcon, getResourceColor, getTerrainIcon, getTerrainColor } from '../utils/presentation';
  import { isKingdomDataReady } from '../../../services/KingdomInitializationService';
  import ResourceCard from '../components/baseComponents/ResourceCard.svelte';
  import Button from '../components/baseComponents/Button.svelte';
  
  let isStarting = false;
  let isGM = false;
  
  onMount(() => {
    // Check if current user is GM
    isGM = (game as any)?.user?.isGM || false;
  });
  
  // Check if game is already active (turn 1 or greater)
  $: isGameActive = $kingdomData.currentTurn >= 1;
  
  // Check if kingdom data is fully initialized and ready
  $: isDataReady = isKingdomDataReady($kingdomData);
  
  // Can start if GM and data is ready
  $: canStart = isGM && isDataReady && !isStarting;
  
  // Function to return to Turn tab
  function resumeGame() {
    setSelectedTab('turn');
  }
  
  // Calculate world stats (all hexes)
  $: totalHexes = $kingdomData.hexes.length;
  $: terrainCounts = $kingdomData.hexes.reduce((acc, hex) => {
    const terrain = hex.terrain || 'unknown';
    acc[terrain] = (acc[terrain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // All terrain types with descriptions (based on ReignMaker rules)
  const allTerrainTypes = [
    { 
      type: 'plains', 
      description: 'Best food producer. Build Farmsteads for 2 Food/turn. Essential for feeding settlements and armies.'
    },
    { 
      type: 'forest', 
      description: 'Logging Camps yield 2 Lumber/turn. Essential for construction - secure Forest hexes early!'
    },
    { 
      type: 'hills', 
      description: 'Versatile terrain. Build Quarries for 1 Stone/turn or Farmsteads for 1 Food/turn. Stone for building.'
    },
    { 
      type: 'mountains', 
      description: 'Mines yield 1 Ore/turn or Quarries yield 1 Stone/turn. Ore is essential for advanced structures and weapons.'
    },
    { 
      type: 'swamp', 
      description: 'Challenging but valuable. Build Fishing Camps for 1 Food/turn or Bog Mines for 1 Ore/turn.'
    },
    { 
      type: 'desert', 
      description: 'Barren land. Cannot build worksites unless the hex has an Oasis.'
    },
    { 
      type: 'water', 
      description: 'Acts as free road! Can build Fishing sites for 1 Food/turn. Speeds up movement and trade.'
    }
  ];
  
  // Create terrain breakdown with all types (even if 0)
  $: terrainBreakdown = allTerrainTypes.map(({ type }) => [
    type,
    terrainCounts[type] || 0
  ] as [string, number]).sort((a, b) => (b[1] as number) - (a[1] as number));
  
  // Hover state for terrain info
  let hoveredTerrain: string | null = null;
  $: terrainInfo = hoveredTerrain 
    ? allTerrainTypes.find(t => t.type === hoveredTerrain)?.description || ''
    : 'Hover over a terrain type to learn more';
  
  // Worksite data with resource mapping (using centralized stores)
  // Uses currentProduction (reactive) instead of cachedProduction (static)
  $: worksiteData = [
    { 
      type: 'Farmlands', 
      count: $claimedWorksites.farmlands || 0,
      resource: 'food',
      income: $currentProduction.food || 0
    },
    { 
      type: 'Lumber Camps', 
      count: $claimedWorksites.lumberCamps || 0,
      resource: 'lumber',
      income: $currentProduction.lumber || 0
    },
    { 
      type: 'Quarries', 
      count: $claimedWorksites.quarries || 0,
      resource: 'stone',
      income: $currentProduction.stone || 0
    },
    { 
      type: 'Mines', 
      count: $claimedWorksites.mines || 0,
      resource: 'ore',
      income: $currentProduction.ore || 0
    }
  ];
  
  $: totalWorksites = worksiteData.reduce((sum, ws) => sum + ws.count, 0);
  
  async function handleStartKingdom() {
    if (!canStart) return;
    
    isStarting = true;
    try {
      await startKingdom();
      ui.notifications?.info('Kingdom turns have begun! Starting Turn 1.');
    } catch (error) {
      logger.error('Failed to start kingdom:', error);
      ui.notifications?.error('Failed to start kingdom. See console for details.');
      isStarting = false;
    }
  }
</script>

<div class="setup-container">
  <!-- Welcome Header -->
  <div class="welcome-header">
    <div class="kingdom-icon">
      <i class="fas fa-chess-rook"></i>
    </div>
    <h1>Welcome to {$kingdomData.name || 'Your Kingdom'}</h1>
    <p class="subtitle">Your kingdom awaits! Review your territory and begin your reign.</p>
  </div>
  
  <!-- World Overview (All Hexes) -->
  <div class="setup-section world-overview">
    <h2>
      <i class="fas fa-globe"></i>
      World Overview - {totalHexes} hexes
    </h2>

       <p class="guide-intro">
      Claim hexes with different terrain and build worksites to produce resources. 
    </p>
    
    {#if terrainBreakdown.length > 0}
      <div class="terrain-grid">
        {#each terrainBreakdown as [terrain, count]}
          <div 
            class="terrain-card"
            style="--terrain-color: {getTerrainColor(terrain)};"
            on:mouseenter={() => hoveredTerrain = terrain}
            on:mouseleave={() => hoveredTerrain = null}
          >
            <span class="terrain-value">{count}</span>
            <span class="terrain-label">{String(terrain).charAt(0).toUpperCase() + String(terrain).slice(1)}</span>
          </div>
        {/each}
      </div>
    {/if}
    
    <p class="terrain-info">{terrainInfo}</p>
  </div>
  
  <!-- Resources Section -->
  <div class="setup-section resources-info">
    <h2>
      <i class="fas fa-coins"></i>
      Kingdom Resources
    </h2>
    
    <p>Your kingdom uses 6 types of resources:</p>
    
    <div class="resource-list">
      <div class="resource-item">
        <i class="fas {getResourceIcon('fame')}" style="color: {getResourceColor('fame')};"></i>
        <div class="resource-content">
          <strong class="resource-name">Fame</strong>
          <span class="resource-description">May be used for a re-roll. Gain 1/turn</span>
        </div>
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('gold')}" style="color: {getResourceColor('gold')};"></i>
        <div class="resource-content">
          <strong class="resource-name">Gold</strong>
          <span class="resource-description">Produced by settlements, or earned by selling resources.</span>
        </div>
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('food')}" style="color: {getResourceColor('food')};"></i>
        <div class="resource-content">
          <strong class="resource-name">Food</strong>
          <span class="resource-description">Feed your population and armies. </span>
        </div>
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('lumber')}" style="color: {getResourceColor('lumber')};"></i>
        <div class="resource-content">
          <strong class="resource-name">Lumber</strong>
          <span class="resource-description">Wood for construction</span>
        </div>
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('stone')}" style="color: {getResourceColor('stone')};"></i>
        <div class="resource-content">
          <strong class="resource-name">Stone</strong>
          <span class="resource-description">For buildings and fortificaitons</span>
        </div>
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('ore')}" style="color: {getResourceColor('ore')};"></i>
        <div class="resource-content">
          <strong class="resource-name">Ore</strong>
          <span class="resource-description">Metal for advanced structures</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Quick Start Guide -->
  <div class="setup-section quick-guide">
    <h2>
      <i class="fas fa-book-open"></i>
      Turn Order
    </h2>
    
    <p class="guide-intro">
      ReignMaker uses a turn-based system. Each turn consists of 6 phases:
    </p>
    
    <div class="phases-grid">
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-icon status">
            <i class="fas fa-chart-line"></i>
          </div>
          <h3>Kingdom Status</h3>
          <span class="phase-number">Phase 1</span>
        </div>
        <ul class="phase-details">
          <li>Gain 1 Fame to use before the end of turn</li>
          <li>Apply ongoing modifiers from structures</li>
        </ul>
      </div>
      
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-icon resources">
            <i class="fas fa-coins"></i>
          </div>
          <h3>Resources</h3>
          <span class="phase-number">Phase 2</span>
        </div>
        <ul class="phase-details">
          <li>Collect resources from worksites</li>
          <li>Collect gold from fed settlements</li>
        </ul>
      </div>
      
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-icon unrest">
            <i class="fas fa-fire"></i>
          </div>
          <h3>Unrest</h3>
          <span class="phase-number">Phase 3</span>
        </div>
        <ul class="phase-details">
          <li>Roll for an incident if unrest is 3+</li>
          <li>Resolving incidents doesn’t use an action</li>
          <li>Incidents are always negative </li>
        </ul>
      </div>
      
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-icon events">
            <i class="fas fa-dice"></i>
          </div>
          <h3>Events</h3>
          <span class="phase-number">Phase 4</span>
        </div>
        <ul class="phase-details">
          <li>Roll a flat check to see if a random event occurs</li>
          <li>Events require a player's action to resolve</li>
          <li>Ignoring events have ongoing consequences</li>
        </ul>
      </div>
      
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-icon actions">
            <i class="fas fa-hammer"></i>
          </div>
          <h3>Actions</h3>
          <span class="phase-number">Phase 5</span>
        </div>
        <ul class="phase-details">
          <li>Each PC gets one action per turn</li>
          <li>Resoved with skill check at DC by level</li>
          <li>Actions from the Capital gain +1 bonus</li>
        </ul>
      </div>
      
      <div class="phase-card">
        <div class="phase-header">
          <div class="phase-icon upkeep">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>Upkeep</h3>
          <span class="phase-number">Phase 6</span>
        </div>
        <ul class="phase-details">
          <li>Feed settlements, or face unrest</li>
          <li>Support armies with food and gold</li>
          <li>Apply resources to build queue</li>
          <li>Unused Lumber/Stone/Ore is lost</li>
        </ul>
      </div>
    </div>
  </div>
  
  <!-- Territory Overview (Claimed Hexes Only) -->
  <div class="setup-section territory-overview">
    <h2>
      <i class="fas fa-flag"></i>
      Territory Overview
    </h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <i class="fas fa-hexagon"></i>
        <div class="stat-content">
          <span class="stat-value">{$claimedHexes.length}</span>
          <span class="stat-label">Claimed Hexes</span>
        </div>
      </div>
      
      <div class="stat-card">
        <i class="fas fa-city"></i>
        <div class="stat-content">
          <span class="stat-value">{$claimedSettlements.length}</span>
          <span class="stat-label">Settlements</span>
        </div>
      </div>
      
      <div class="stat-card">
        <i class="fas fa-hammer"></i>
        <div class="stat-content">
          <span class="stat-value">{totalWorksites}</span>
          <span class="stat-label">Worksites</span>
        </div>
      </div>
    </div>
    
    {#if worksiteData.length > 0}
      <div class="worksite-production">
        <h3>Worksites</h3>
        <div class="worksite-grid">
          {#each worksiteData as worksite}
            <div class="worksite-box">
              <div class="worksite-header">
                <span class="worksite-title">{worksite.type}</span>
                <span class="worksite-count">{worksite.count}</span>
              </div>
              <div class="worksite-content">
                <ResourceCard
                  resource={worksite.resource}
                  value={worksite.income}
                  icon={getResourceIcon(worksite.resource)}
                  color={getResourceColor(worksite.resource)}
                  size="fill"
                  editable={false}
                />
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Ready to Start (only show if game not started) -->
  {#if !isGameActive}
    <div class="setup-section ready-section">
      <h2>
        <i class="fas fa-flag-checkered"></i>
        Ready to Begin?
      </h2>
      
      <p class="ready-message">
        {#if isGM}
          {#if !isDataReady}
            Kingdom data is initializing. Please complete the import wizard first (Welcome dialog).
          {:else}
            Once you've reviewed your kingdom's starting position, click below to begin Turn 1.
            Explore the Territory, Settlements, and other tabs to learn about your kingdom.
          {/if}
        {:else}
          Your GM will start Turn 1 when everyone is ready.
          Explore the Territory, Settlements, and other tabs to learn about your kingdom.
        {/if}
      </p>
      
      {#if isGM}
        <div class="start-button-wrapper">
          <Button
            variant="primary"
            disabled={!canStart}
            icon={isStarting ? "fas fa-spinner fa-spin spinning" : isDataReady ? "fas fa-play" : "fas fa-hourglass-half"}
            on:click={handleStartKingdom}
          >
            {#if !isDataReady}
              Waiting for Data Initialization...
            {:else if isStarting}
              Starting Kingdom...
            {:else}
              Begin Turn 1
            {/if}
          </Button>
        </div>
        
        {#if !isDataReady}
          <p class="data-warning">
            <i class="fas fa-info-circle"></i>
            Complete the import wizard to initialize kingdom data before starting Turn 1.
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  @import '../../../styles/variables.css';
  
  .setup-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .welcome-header {
    text-align: center;
    padding: 2rem;
    background: var(--gradient-header);
    border-radius: 0.5rem;
    color: white;
    
    .kingdom-icon {
      margin-bottom: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      
      i {
        font-size: 6rem;
        opacity: 0.9;
      }
    }
    
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: var(--font-5xl);
      font-weight: bold;
    }
    
    .subtitle {
      margin: 0;
      font-size: var(--font-lg);
      opacity: 0.9;
    }
  }
  
  .setup-section {
    background: var(--bg-elevated);
    
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border-secondary);
    
    h2 {
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      i {
        color: var(--text-secondary);
      }
    }
    
    h3 {
      margin: 0.5rem 0;
      font-size: var(--font-lg);
      color: var(--text-primary);
    }
    
    p {
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .stat-card {
    background: var(--bg-surface);
    padding: 0.75rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    gap: .75rem;
    border: 1px solid var(--border-subtle);
    
    i {
      font-size: var(--font-2xl);
      color: var(--text-secondary);
      flex-shrink: 0;
    }
    
    .stat-content {
      display: flex;
      flex-direction: row;
      align-items: baseline;
      gap: .75rem;
      min-width: 0;
    }
    
    .stat-value {
      font-size: var(--font-2xl);
      font-weight: bold;
      color: var(--text-primary);
    }
    
    .stat-label {
      font-size: var(--font-lg);
      font-weight: normal;
      color: var(--text-secondary);
      white-space: nowrap;
    }
  }
  
  .terrain-info {
    margin: 1rem 0 0 0;
    padding: 0.75rem 1rem;
    background: var(--bg-surface);
    border-radius: 0.375rem;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: var(--font-md);
    font-style: normal;
    display: flex;
    align-items: flex-start;
    transition: all 0.2s ease;
    line-height: 1.5;
  }
  
  .terrain-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 1rem;
  }
  
  .terrain-card {
    /* Use terrain-specific color with low opacity for tint */
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--terrain-color) 15%, rgba(0, 0, 0, 0.3)),
      color-mix(in srgb, var(--terrain-color) 8%, rgba(0, 0, 0, 0.2))
    );
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid color-mix(in srgb, var(--terrain-color) 30%, rgba(255, 255, 255, 0.1));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-align: center;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--terrain-color) 70%, rgba(0, 0, 0, 0.2)),
        color-mix(in srgb, var(--terrain-color) 55%, rgba(0, 0, 0, 0.15))
      );
      border-color: color-mix(in srgb, var(--terrain-color) 80%, rgba(255, 255, 255, 0.3));
    }
    
    .terrain-value {
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      line-height: 1;
    }
    
    .terrain-label {
      font-size: var(--font-md);
      color: var(--text-tertiary);
      text-transform: capitalize;
    }
  }
  
  .worksite-production {
    margin-top: 1rem;
    
    h3 {
      margin: 0 0 1rem 0;
      font-size: var(--font-lg);
      color: var(--text-primary);
    }
  }
  
  .worksite-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  
  .worksite-box {
    border: 2px solid var(--border-secondary);
    border-radius: 0.5rem;
    overflow: hidden;
    background: transparent;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: var(--border-primary);
      transform: translateY(-2px);
    }
  }
  
  .worksite-header {
    background: color-mix(in srgb, var(--color-gray-700) 50%, transparent);
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }

  .worksite-title {
    font-size: var(--font-);
    font-weight: var(--font-weight-normal);
    color: var(--text-primary);
  }
  
  .worksite-count {
    font-size: var(--font-xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-secondary);
    background: var(--bg-elevated);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    min-width: 2rem;
    text-align: center;
  }
  
  .worksite-content {
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  
  .guide-intro {
    margin-bottom: 1.5rem;
    font-size: var(--font-md);
  }
  
  .phases-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .phase-card {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid var(--border-secondary);
    
    .phase-header {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      padding-bottom: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    
    .phase-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
      color: var(--text-secondary);
    }
    
    h3 {
      font-size: var(--font-2xl);
      margin: 0;
      color: var(--text-primary);
      flex: 1;
    }
    
    .phase-number {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-light);
      color: var(--text-secondary);
      line-height: 1;
      padding: 0.25rem 0.5rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-secondary);
      border-radius: 0.25rem;
      align-self: center;
    }
    
    p {
      font-size: var(--font-md);
      margin: 0;
    }
  }
  
  .phase-details {
    list-style: disc;
    padding-left: 1.5rem;
    margin: 0;
    
    li {
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.5;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  .resource-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .resource-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-surface);
    border-radius: 0.25rem;
    
    i {
      font-size: var(--font-4xl);
      flex-shrink: 0;
    }
    
    .resource-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .resource-name {
      color: var(--text-primary);
      font-size: var(--font-2xl);
    }
    
    .resource-description {
      color: var(--text-secondary);
      font-size: var(--font-md);
    }
  }
  
  .ready-section {
    text-align: center;
    
    .ready-message {
      margin-bottom: 2rem;
      font-size: var(--font-lg);
    }
  }
  
  .start-button-wrapper :global(.button) {
    padding: 16px 24px;
    font-size: var(--font-xl);
    gap: 12px;
    
    :global(i) {
      font-size: var(--font-lg);
    }
  }
</style>
