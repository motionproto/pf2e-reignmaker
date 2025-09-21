<script lang="ts">
   import { writable } from 'svelte/store';
   import { onMount } from 'svelte';
   
   // Local notes store (persisted to localStorage)
   const notes = writable('');
   
   // Load notes from localStorage
   onMount(() => {
      const savedNotes = localStorage.getItem('kingdomNotes');
      if (savedNotes) {
         notes.set(savedNotes);
      }
   });
   
   // Save notes to localStorage
   function saveNotes(value: string) {
      localStorage.setItem('kingdomNotes', value);
   }
   
   // Auto-save on change
   $: if ($notes !== undefined) {
      saveNotes($notes);
   }
</script>

<div class="tw-h-full tw-flex tw-flex-col">
   <div class="tw-mb-4">
      <h2 class="tw-text-2xl tw-font-bold tw-text-base-content tw-mb-2">Kingdom Notes</h2>
      <p class="tw-text-base-content/60">Keep track of important information, strategies, and plans</p>
   </div>
   
   <!-- Notes Editor -->
   <div class="tw-flex-1 tw-card tw-bg-base-200">
      <div class="tw-card-body tw-p-4 tw-h-full">
         <div class="tw-form-control tw-h-full">
            <label class="tw-label" for="kingdom-notes">
               <span class="tw-label-text tw-flex tw-items-center tw-gap-2">
                  <i class="fas fa-book tw-text-primary"></i>
                  Your Notes
               </span>
               <span class="tw-label-text-alt">
                  Auto-saved locally
               </span>
            </label>
            <textarea 
               id="kingdom-notes"
               bind:value={$notes}
               placeholder="Enter your kingdom notes here...
               
• Strategic plans
• Important NPCs and relationships  
• Quest objectives
• Resource management notes
• Future expansion plans
• Trade agreements
• Military campaigns"
               class="tw-textarea tw-textarea-bordered tw-flex-1 tw-h-full tw-bg-base-300 tw-text-base-content tw-placeholder:text-base-content/40"
            ></textarea>
         </div>
         
         <!-- Quick Actions -->
         <div class="tw-card-actions tw-justify-end tw-mt-4">
            <div class="tw-stats tw-shadow tw-bg-base-300">
               <div class="tw-stat tw-py-2 tw-px-4">
                  <div class="tw-stat-title tw-text-xs">Characters</div>
                  <div class="tw-stat-value tw-text-sm">{$notes.length}</div>
               </div>
               <div class="tw-stat tw-py-2 tw-px-4">
                  <div class="tw-stat-title tw-text-xs">Words</div>
                  <div class="tw-stat-value tw-text-sm">
                     {$notes.trim() ? $notes.trim().split(/\s+/).length : 0}
                  </div>
               </div>
            </div>
            
            <button 
               class="tw-btn tw-btn-sm tw-btn-ghost"
               on:click={() => notes.set('')}
               disabled={!$notes}
            >
               <i class="fas fa-eraser"></i>
               Clear
            </button>
            
            <button 
               class="tw-btn tw-btn-sm tw-btn-primary"
               on:click={() => {
                  navigator.clipboard.writeText($notes);
               }}
               disabled={!$notes}
            >
               <i class="fas fa-copy"></i>
               Copy
            </button>
         </div>
      </div>
   </div>
   
   <!-- Tips Section -->
   <div class="tw-collapse tw-collapse-arrow tw-bg-base-300 tw-mt-4">
      <input type="checkbox" /> 
      <div class="tw-collapse-title tw-text-sm tw-font-medium">
         <i class="fas fa-lightbulb tw-text-warning tw-mr-2"></i>
         Note-Taking Tips
      </div>
      <div class="tw-collapse-content tw-text-xs tw-text-base-content/70">
         <ul class="tw-list-disc tw-list-inside tw-space-y-1">
            <li>Use headers (## Title) to organize sections</li>
            <li>Create lists with - or * for better readability</li>
            <li>Track turn numbers for time-sensitive events</li>
            <li>Note NPC relationships and faction standings</li>
            <li>Document resource locations and trade routes</li>
            <li>Keep a log of important decisions and their outcomes</li>
         </ul>
      </div>
   </div>
</div>
