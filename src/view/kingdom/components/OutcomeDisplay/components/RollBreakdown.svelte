<script lang="ts">
  export let rollBreakdown: any = null;
  
  let expanded = false;
  
  // Filter enabled modifiers
  $: enabledModifiers = rollBreakdown?.modifiers?.filter((m: any) => m.enabled !== false) || [];
</script>

{#if rollBreakdown}
  <div class="roll-breakdown">
    <button 
      class="roll-breakdown-toggle"
      on:click={() => expanded = !expanded}
    >
      <div class="roll-result-large">
        <i class="fas fa-dice-d20"></i>
        <span class="roll-number">{rollBreakdown.total}</span>
      </div>
      <span class="roll-dc-small">vs DC {rollBreakdown.dc}</span>
      <i class="fas fa-chevron-{expanded ? 'up' : 'down'} toggle-icon"></i>
    </button>
    
    {#if expanded}
      <div class="modifier-breakdown">
        <div class="modifier-item base-roll">
          <span class="modifier-label">Base Roll (1d20)</span>
          <span class="modifier-value">{rollBreakdown.d20Result}</span>
        </div>
        {#each enabledModifiers as mod}
          <div class="modifier-item">
            <span class="modifier-label">{mod.label}</span>
            <span class="modifier-value {mod.modifier >= 0 ? 'positive' : 'negative'}">
              {mod.modifier >= 0 ? '+' : ''}{mod.modifier}
            </span>
          </div>
        {/each}
        <div class="modifier-item total">
          <span class="modifier-label">Total</span>
          <span class="modifier-value">{rollBreakdown.total}</span>
        </div>
        <div class="modifier-item dc">
          <span class="modifier-label">DC</span>
          <span class="modifier-value">{rollBreakdown.dc}</span>
        </div>
        <div class="modifier-item result">
          <span class="modifier-label">Margin</span>
          <span class="modifier-value {rollBreakdown.total >= rollBreakdown.dc ? 'positive' : 'negative'}">
            {rollBreakdown.total >= rollBreakdown.dc ? '+' : ''}{rollBreakdown.total - rollBreakdown.dc}
          </span>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .roll-breakdown {
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
    
    .roll-breakdown-toggle {
      width: 100%;
      padding: var(--space-10) var(--space-12);
      background: transparent;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: flex-end;
      gap: var(--space-12);
      min-height: 2.5000rem;
      transition: background var(--transition-fast);
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .roll-result-large {
        display: flex;
        align-items: baseline;
        gap: var(--space-12);
        
        .fa-dice-d20 {
          color: var(--text-primary);
          font-size: var(--font-xl);
          opacity: 0.9;
          line-height: 1;
        }
        
        .roll-number {
          font-size: var(--font-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          line-height: 1;
        }
      }
      
      .roll-dc-small {
        flex: 1;
        font-size: var(--font-md);
        color: var(--text-secondary);
        text-align: left;
        padding-bottom: var(--space-2);
      }
      
      .toggle-icon {
        color: var(--text-secondary);
        font-size: var(--font-xs);
        transition: transform var(--transition-fast);
        padding-bottom: var(--space-4);
      }
    }
    
    .modifier-breakdown {
      padding: var(--space-8);
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      
      .modifier-item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: var(--space-4) var(--space-8);
        background: rgba(255, 255, 255, 0.02);
        border-radius: var(--radius-xs);
        font-size: var(--font-sm);
        
        &.base-roll {
          background: rgba(96, 165, 250, 0.15);
          border: 0.0625rem solid rgba(96, 165, 250, 0.3);
          
          .modifier-label {
            color: rgb(147, 197, 253);
            font-weight: var(--font-weight-semibold);
          }
          
          .modifier-value {
            color: rgb(191, 219, 254);
            font-weight: var(--font-weight-bold);
          }
        }
        
        &.total {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-medium);
          margin-top: var(--space-4);
          
          .modifier-label {
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
          }
          
          .modifier-value {
            font-weight: var(--font-weight-bold);
            font-size: var(--font-md);
            color: var(--text-primary);
          }
        }
        
        &.dc {
          background: rgba(249, 115, 22, 0.1);
          border: 0.0625rem solid rgba(249, 115, 22, 0.2);
          
          .modifier-label {
            color: rgba(249, 115, 22, 0.9);
            font-weight: var(--font-weight-semibold);
          }
          
          .modifier-value {
            color: rgba(249, 115, 22, 1);
            font-weight: var(--font-weight-bold);
          }
        }
        
        &.result {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-strong);
          font-weight: var(--font-weight-bold);
          
          .modifier-label {
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold);
          }
        }
        
        .modifier-label {
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
        }
        
        .modifier-value {
          font-family: var(--font-code, monospace);
          
          &.positive {
            color: var(--color-green);
          }
          
          &.negative {
            color: var(--color-red);
          }
        }
      }
    }
  }
</style>
