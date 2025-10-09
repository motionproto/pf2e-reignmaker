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
      gap: 1rem;
      height: 100%;
      padding: 1rem;
   }
   
   .factions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .header-left {
         display: flex;
         align-items: baseline;
         gap: 0.5rem;
         
         h2 {
            margin: 0;
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .faction-count {
            font-size: 0.875rem;
            color: var(--color-text-dark-secondary, #7a7971);
         }
      }
   }
   
   .factions-summary {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      
      .summary-card {
         display: flex;
         align-items: center;
         gap: 0.75rem;
         background: rgba(0, 0, 0, 0.2);
         padding: 0.75rem 1rem;
         border-radius: 0.375rem;
         border: 1px solid rgba(255, 255, 255, 0.1);
         
         i {
            font-size: 1.5rem;
         }
         
         .summary-value {
            font-size: 1.25rem;
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: 0.875rem;
            color: var(--text-medium-light, #9e9b8f);
         }
      }
   }
   
   .table-controls {
      display: flex;
      gap: 1rem;
      
      .search-input,
      .filter-select {
         padding: 0.5rem;
         background: rgba(0, 0, 0, 0.3);
         border: 1px solid rgba(255, 255, 255, 0.2);
         border-radius: 0.375rem;
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
      border-radius: 0.375rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
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
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-dark-primary, #b5b3a4);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            
            &.attitude-header {
               text-align: center;
            }
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            
            &:hover:not(.create-row) {
               background: rgba(255, 255, 255, 0.05);
            }
            
            &.create-row {
               background: rgba(94, 0, 0, 0.1);
            }
         }
         
         td {
            padding: 0.75rem 1rem;
            color: var(--color-text-dark-primary, #b5b3a4);
            
            &.attitude-cell {
               text-align: center;
               padding: 0.25rem;
            }
            
            &.empty-state {
               padding: 3rem;
               text-align: center;
               color: var(--color-text-dark-secondary, #7a7971);
               
               i {
                  font-size: 2rem;
                  margin-bottom: 1rem;
                  opacity: 0.5;
                  display: block;
               }
               
               p {
                  margin: 0.5rem 0;
                  
                  &.hint {
                     font-size: 0.875rem;
                     font-style: italic;
                  }
               }
            }
         }
      }
   }
   
   .editable-cell {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
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
      padding: 0.25rem;
      border: 1px solid transparent;
      outline: none;
      background: transparent;
      font-size: 1.1rem;
      transition: all 0.2s;
      box-shadow: none;
      border-radius: 0.25rem;
      
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
      gap: 0.5rem;
      justify-content: center;
   }
   
   .clock-btn {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.25rem;
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
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: rgba(255, 255, 255, 0.1);
      }
   }
   
   .clock-max-input {
      width: 3rem;
      padding: 0.25rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      text-align: center;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .inline-edit {
      display: flex;
      gap: 0.5rem;
      align-items: center;
   }
   
   .inline-input {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 150px;
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .attitude-select {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.25rem;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:focus {
         outline: none;
         background: rgba(0, 0, 0, 0.5);
      }
   }
   
   .inline-actions {
      display: flex;
      gap: 0.5rem;
   }
   
   .save-btn,
   .cancel-btn,
   .delete-btn {
      padding: 0.25rem 0.5rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
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
      gap: 1rem;
      
      .page-btn {
         padding: 0.5rem 1rem;
         background: rgba(0, 0, 0, 0.2);
         border: 1px solid rgba(255, 255, 255, 0.1);
         border-radius: 0.375rem;
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
