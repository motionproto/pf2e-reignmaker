<script lang="ts">
  import { kingdomData } from '../../../stores/KingdomStore';
  import { startKingdom } from '../../../stores/KingdomStore';
  import { getResourceIcon, getResourceColor } from '../utils/presentation';
  
  let isStarting = false;
  
  // Calculate world stats (all hexes)
  $: totalHexes = $kingdomData.hexes.length;
  $: terrainCounts = $kingdomData.hexes.reduce((acc, hex) => {
    const terrain = hex.terrain || 'unknown';
    acc[terrain] = (acc[terrain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  $: terrainBreakdown = Object.entries(terrainCounts).sort((a, b) => b[1] - a[1]);
  
  // Calculate territory stats (claimed hexes only)
  $: claimedHexes = $kingdomData.hexes.filter(h => h.claimedBy !== null && h.claimedBy !== undefined);
  $: worksites = Object.entries($kingdomData.worksiteCount || {});
  $: settlements = $kingdomData.settlements;
  
  async function handleStartKingdom() {
    isStarting = true;
    try {
      await startKingdom();
      ui.notifications?.info('Kingdom turns have begun! Starting Turn 1.');
    } catch (error) {
      console.error('Failed to start kingdom:', error);
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
      World Overview
    </h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <i class="fas fa-map"></i>
        <div class="stat-content">
          <span class="stat-value">{totalHexes}</span>
          <span class="stat-label">Total Hexes</span>
        </div>
      </div>
    </div>
    
    {#if terrainBreakdown.length > 0}
      <div class="terrain-details">
        <h3>Terrain Breakdown:</h3>
        <ul>
          {#each terrainBreakdown as [terrain, count]}
            <li>
              <strong>{count}</strong> {terrain.charAt(0).toUpperCase() + terrain.slice(1)} hex{count > 1 ? 'es' : ''}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  
  <!-- Territory Overview (Claimed Hexes Only) -->
  <div class="setup-section territory-overview">
    <h2>
      <i class="fas fa-flag"></i>
      Territory Overview
    </h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <i class="fas fa-flag"></i>
        <div class="stat-content">
          <span class="stat-value">{claimedHexes.length}</span>
          <span class="stat-label">Claimed Hexes</span>
        </div>
      </div>
      
      <div class="stat-card">
        <i class="fas fa-city"></i>
        <div class="stat-content">
          <span class="stat-value">{settlements.length}</span>
          <span class="stat-label">Settlements</span>
        </div>
      </div>
      
      <div class="stat-card">
        <i class="fas fa-hammer"></i>
        <div class="stat-content">
          <span class="stat-value">{worksites.reduce((sum, [_, count]) => sum + count, 0)}</span>
          <span class="stat-label">Worksites</span>
        </div>
      </div>
    </div>
    
    {#if worksites.length > 0}
      <div class="worksite-details">
        <h3>Resource Production Sites:</h3>
        <ul>
          {#each worksites as [type, count]}
            <li>
              <strong>{count}</strong> {type}{count > 1 ? 's' : ''}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  
  <!-- Quick Start Guide -->
  <div class="setup-section quick-guide">
    <h2>
      <i class="fas fa-book-open"></i>
      Kingdom Management Overview
    </h2>
    
    <p class="guide-intro">
      ReignMaker uses a turn-based system to manage your kingdom. Each turn consists of 6 phases:
    </p>
    
    <div class="phases-grid">
      <div class="phase-card">
        <div class="phase-icon status">
          <i class="fas fa-chart-line"></i>
        </div>
        <h3>Kingdom Status</h3>
        <p>Gain Fame and apply ongoing modifiers</p>
      </div>
      
      <div class="phase-card">
        <div class="phase-icon resources">
          <i class="fas fa-coins"></i>
        </div>
        <h3>Resources</h3>
        <p>Collect resources from your territory</p>
      </div>
      
      <div class="phase-card">
        <div class="phase-icon unrest">
          <i class="fas fa-fire"></i>
        </div>
        <h3>Unrest</h3>
        <p>Check for incidents and manage stability</p>
      </div>
      
      <div class="phase-card">
        <div class="phase-icon events">
          <i class="fas fa-dice"></i>
        </div>
        <h3>Events</h3>
        <p>Resolve kingdom events and challenges</p>
      </div>
      
      <div class="phase-card">
        <div class="phase-icon actions">
          <i class="fas fa-hammer"></i>
        </div>
        <h3>Actions</h3>
        <p>Build structures and perform activities</p>
      </div>
      
      <div class="phase-card">
        <div class="phase-icon upkeep">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Upkeep</h3>
        <p>Pay costs and advance to the next turn</p>
      </div>
    </div>
  </div>
  
  <!-- Resources Section -->
  <div class="setup-section resources-info">
    <h2>
      <i class="fas fa-coins"></i>
      Kingdom Resources
    </h2>
    
    <p>Your kingdom uses 5 types of resources:</p>
    
    <div class="resource-list">
      <div class="resource-item">
        <i class="fas {getResourceIcon('gold')}" style="color: {getResourceColor('gold')};"></i>
        <strong>Gold:</strong> Currency for general expenses
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('food')}" style="color: {getResourceColor('food')};"></i>
        <strong>Food:</strong> Required to feed your population
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('lumber')}" style="color: {getResourceColor('lumber')};"></i>
        <strong>Lumber:</strong> Wood for construction
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('stone')}" style="color: {getResourceColor('stone')};"></i>
        <strong>Stone:</strong> Building material
      </div>
      <div class="resource-item">
        <i class="fas {getResourceIcon('ore')}" style="color: {getResourceColor('ore')};"></i>
        <strong>Ore:</strong> Metal for advanced structures
      </div>
    </div>
  </div>
  
  <!-- Ready to Start -->
  <div class="setup-section ready-section">
    <h2>
      <i class="fas fa-flag-checkered"></i>
      Ready to Begin?
    </h2>
    
    <p class="ready-message">
      When you're ready, click the button below to start Turn 1 and begin managing your kingdom.
      You can explore your territory, settlements, and other tabs at any time.
    </p>
    
    <button 
      class="start-button" 
      on:click={handleStartKingdom}
      disabled={isStarting}
    >
      {#if isStarting}
        <i class="fas fa-spinner fa-spin"></i>
        Starting Kingdom...
      {:else}
        <i class="fas fa-play"></i>
        Begin Turn 1
      {/if}
    </button>
  </div>
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
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.9;
    }
    
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
      font-weight: bold;
    }
    
    .subtitle {
      margin: 0;
      font-size: 1.125rem;
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
      font-size: 1.125rem;
      color: var(--text-primary);
    }
    
    p {
      color: var(--text-secondary);
      line-height: 1.6;
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .stat-card {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid var(--border-subtle);
    
    i {
      font-size: 2rem;
      color: var(--text-secondary);
    }
    
    .stat-content {
      display: flex;
      flex-direction: column;
    }
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--text-primary);
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
  }
  
  .worksite-details,
  .terrain-details {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 0.375rem;
    margin-top: 1rem;
    
    h3 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }
    
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      
      li {
        color: var(--text-secondary);
        
        strong {
          color: var(--text-primary);
        }
      }
    }
  }
  
  .guide-intro {
    margin-bottom: 1.5rem;
  }
  
  .phases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .phase-card {
    background: var(--bg-surface);
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid var(--border-subtle);
    
    .phase-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      font-size: 1.5rem;
      color: white;
      
      &.status { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
      &.resources { background: linear-gradient(135deg, #059669, #10b981); }
      &.unrest { background: linear-gradient(135deg, #dc2626, #ef4444); }
      &.events { background: linear-gradient(135deg, #ea580c, #f59e0b); }
      &.actions { background: linear-gradient(135deg, #0891b2, #06b6d4); }
      &.upkeep { background: linear-gradient(135deg, #7c2d12, #9a3412); }
    }
    
    h3 {
      font-size: 1rem;
      margin: 0 0 0.25rem 0;
    }
    
    p {
      font-size: 0.875rem;
      margin: 0;
    }
  }
  
  .resource-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.75rem;
  }
  
  .resource-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--bg-surface);
    border-radius: 0.25rem;
    
    i {
      font-size: 1.25rem;
    }
    
    strong {
      color: var(--text-primary);
    }
  }
  
  .ready-section {
    text-align: center;
    
    .ready-message {
      margin-bottom: 2rem;
      font-size: 1.125rem;
    }
  }
  
  .start-button {
    padding: 1rem 3rem;
    font-size: 1.25rem;
    font-weight: bold;
    background: linear-gradient(to top, var(--color-primary-dark), var(--color-primary));
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    i {
      font-size: 1.5rem;
    }
  }
</style>
