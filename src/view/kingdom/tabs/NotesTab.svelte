<script lang="ts">
   import { writable } from 'svelte/store';
   
   // Local notes store (could be persisted to actor flags later)
   const notes = writable('');
</script>

<div class="notes-tab">
   <h2>Kingdom Notes</h2>
   <p>Keep track of important information and plans.</p>
   
   <div class="notes-editor">
      <textarea 
         bind:value={$notes}
         placeholder="Enter your kingdom notes here..."
         class="notes-textarea"
      ></textarea>
   </div>
</div>

<style lang="scss">
   .notes-tab {
      display: flex;
      flex-direction: column;
      height: 100%;
      
      h2 {
         margin: 0 0 10px 0;
         color: var(--color-text-dark-primary, #b5b3a4);
      }
      
      p {
         margin: 0 0 15px 0;
         color: var(--color-text-dark-secondary, #7a7971);
      }
   }
   
   .notes-editor {
      flex: 1;
      display: flex;
   }
   
   .notes-textarea {
      flex: 1;
      padding: 10px;
      background: rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 5px;
      color: var(--color-text-dark-primary, #b5b3a4);
      font-family: inherit;
      font-size: 0.9em;
      resize: none;
      
      &:focus {
         outline: none;
         border-color: var(--color-primary, #5e0000);
         background: rgba(0, 0, 0, 0.08);
      }
      
      &::placeholder {
         color: var(--color-text-dark-secondary, #7a7971);
         opacity: 0.5;
      }
   }
</style>
