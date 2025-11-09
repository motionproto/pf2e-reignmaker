<script lang="ts">
   import FactionListView from './factions/FactionListView.svelte';
   import FactionDetailView from './factions/FactionDetailView.svelte';

   // Navigation state
   type ViewMode = 'list' | 'detail';
   let currentView: ViewMode = 'list';
   let selectedFactionId: string | null = null;
   
   // Navigation handlers
   function handleViewDetail(event: CustomEvent<{ factionId: string }>) {
      selectedFactionId = event.detail.factionId;
      currentView = 'detail';
   }
   
   function handleBack() {
      currentView = 'list';
      selectedFactionId = null;
   }
</script>

<div class="factions-tab">
   {#if currentView === 'list'}
      <FactionListView on:viewDetail={handleViewDetail} />
   {:else if currentView === 'detail' && selectedFactionId}
      <FactionDetailView factionId={selectedFactionId} on:back={handleBack} />
   {/if}
</div>
   

<style lang="scss">
   .factions-tab {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      height: 100%;
      padding: var(--space-16);
   }
   
   .factions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .header-left {
         display: flex;
         align-items: baseline;
         gap: var(--space-8);
         
         h2 {
            margin: 0;
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .faction-count {
            font-size: var(--font-sm);
            color: var(--color-text-dark-secondary, #7a7971);
         }
      }
   }
   
   .factions-summary {
      display: flex;
      gap: var(--space-16);
      flex-wrap: wrap;
      
      .summary-card {
         display: flex;
         align-items: center;
         gap: var(--space-12);
         background: rgba(0, 0, 0, 0.2);
         padding: var(--space-12) var(--space-16);
         border-radius: var(--radius-lg);
         border: 0.0625rem solid rgba(255, 255, 255, 0.1);
         
         i {
            font-size: var(--font-2xl);
         }
         
         .summary-value {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: var(--font-sm);
            color: var(--text-medium-light, #9e9b8f);
         }
      }
   }
   
   .table-controls {
      display: flex;
      gap: var(--space-16);
      
      .search-input,
      .filter-select {
         padding: var(--space-8);
         background: rgba(0, 0, 0, 0.3);
         border: 0.0625rem solid rgba(255, 255, 255, 0.2);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.4);
         }
      }
      
      .search-input {
         flex: 1;
      }
   }
   
   .factions-table-container {
      flex: 1;
      overflow: auto;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-lg);
      border: 0.0625rem solid rgba(255, 255, 255, 0.1);
   }
   
   .factions-table {
      width: 100%;
      border-collapse: collapse;
      
      thead {
         background: rgba(0, 0, 0, 0.3);
         position: sticky;
         top: 0;
         z-index: 1;
         
         th {
            padding: var(--space-12) var(--space-16);
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-dark-primary, #b5b3a4);
            border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
            
            &.attitude-header {
               text-align: center;
            }
         }
      }
      
      tbody {
         tr {
            border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.05);
            
            &:hover:not(.create-row) {
               background: rgba(255, 255, 255, 0.05);
            }
            
            &.create-row {
               background: rgba(94, 0, 0, 0.1);
            }
         }
         
         td {
            padding: var(--space-12) var(--space-16);
            color: var(--color-text-dark-primary, #b5b3a4);
            
            &.attitude-cell {
               text-align: center;
               padding: var(--space-4);
            }
            
            &.empty-state {
               padding: var(--space-24);
               text-align: center;
               color: var(--color-text-dark-secondary, #7a7971);
               
               i {
                  font-size: var(--font-4xl);
                  margin-bottom: var(--space-16);
                  opacity: 0.5;
                  display: block;
               }
               
               p {
                  margin: var(--space-8) 0;
                  
                  &.hint {
                     font-size: var(--font-sm);
                     font-style: italic;
                  }
               }
            }
         }
      }
   }
   
   .editable-cell {
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      text-align: left;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .attitude-icon {
      cursor: pointer;
      padding: var(--space-4);
      border: 0.0625rem solid transparent;
      outline: none;
      background: transparent;
      font-size: var(--font-lg);
      transition: all 0.2s;
      box-shadow: none;
      border-radius: var(--radius-md);
      
      &:hover {
         transform: scale(1.15);
      }
      
      &.active {
         transform: scale(1.2);
         border-color: rgba(255, 255, 255, 0.3);
      }
      
      &:focus {
         outline: none;
         border-color: transparent;
         box-shadow: none;
      }
      
      &:focus-visible {
         outline: none;
         border-color: transparent;
         box-shadow: none;
      }
   }
   
   .progress-clock {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      justify-content: center;
   }
   
   .clock-btn {
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 0.0625rem solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .clock-value {
      font-weight: var(--font-weight-bold);
      min-width: 1.5rem;
      text-align: center;
   }
   
   .clock-separator {
      color: var(--color-text-dark-secondary, #7a7971);
   }
   
   .clock-max {
      font-weight: var(--font-weight-bold);
      min-width: 1.5rem;
      text-align: center;
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .clock-max-input {
      width: 3rem;
      padding: var(--space-4);
      background: rgba(0, 0, 0, 0.3);
      border: 0.0625rem solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      text-align: center;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .inline-edit {
      display: flex;
      gap: var(--space-8);
      align-items: center;
   }
   
   .inline-input {
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 0.0625rem solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 9.3750rem;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .attitude-select {
      padding: var(--space-4) var(--space-8);
      background: rgba(0, 0, 0, 0.3);
      border: 0.0625rem solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .inline-actions {
      display: flex;
      gap: var(--space-8);
   }
   
   .save-btn,
   .cancel-btn,
   .delete-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .save-btn {
      background: rgba(144, 238, 144, 0.2);
      color: #90ee90;
      
      &:hover:not(:disabled) {
         background: rgba(144, 238, 144, 0.3);
      }
   }
   
   .cancel-btn {
      background: rgba(255, 107, 107, 0.2);
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.3);
      }
   }
   
   .delete-btn {
      background: transparent;
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.1);
      }
   }
   
   /* Pagination */
   .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-16);
      
      .page-btn {
         padding: var(--space-8) var(--space-16);
         background: rgba(0, 0, 0, 0.2);
         border: 0.0625rem solid rgba(255, 255, 255, 0.1);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         cursor: pointer;
         transition: all 0.2s;
         
         &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
         }
         
         &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
         }
      }
      
      .page-info {
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
</style>
