<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { VoteService } from '../../../../../services/VoteService';
  import { eventVotes, kingdomData } from '../../../../../stores/KingdomStore';
  import type { EventVote, VoteCast } from '../../../../../types/EventVote';
  
  export let label: string;
  export let options: any[];
  export let disabled: boolean = false;
  export let showIgnoreButton: boolean = false;
  export let eventId: string | undefined = undefined;
  export let enableVoting: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // Get game instance for GM check
  const game = (globalThis as any).game;
  $: isGM = game?.user?.isGM || false;
  $: currentUserId = game?.user?.id;
  
  // REACTIVE VOTING STATE - automatically updates when eventVotes store changes!
  $: currentTurn = $kingdomData.currentTurn || 0;
  $: vote = $eventVotes.find((v: EventVote) => 
    v.eventId === eventId && v.turn === currentTurn
  ) as EventVote | undefined;
  
  // Derived reactive state
  $: hasVoted = vote?.votes.some((v: VoteCast) => v.playerId === currentUserId) || false;
  $: myVote = vote?.votes.find((v: VoteCast) => v.playerId === currentUserId);
  $: voteCount = vote?.votes.length || 0;
  $: requiredVotes = VoteService.getRequiredVoteCount();
  $: isResolved = vote?.resolved || false;
  $: winningChoice = vote?.winningChoice || null;
  $: showContinueButton = isResolved && winningChoice !== null;
  
  // Waiting for players list
  $: waitingForPlayers = (() => {
    if (!vote || isResolved) return [];
    
    const votedUserIds = new Set(vote.votes.map((v: VoteCast) => v.playerId));
    const allUsers = game?.users?.filter((u: any) => u.active) || [];
    const playerCount = allUsers.filter((u: any) => !u.isGM).length;
    
    return allUsers
      .filter((u: any) => {
        const isGMUser = u.isGM;
        const hasVotedUser = votedUserIds.has(u.id);
        const includeGM = playerCount === 0;
        return !hasVotedUser && (!isGMUser || includeGM);
      })
      .map((u: any) => VoteService.getPlayerCharacterName(u.id));
  })();
  
  async function handleContinue() {
    if (!winningChoice) return;
    
    // Store selection in kingdom store (triggers reactivity for all clients)
    const { getKingdomActor } = await import('../../../../../stores/KingdomStore');
    const actor = getKingdomActor();
    if (actor) {
      await actor.updateKingdomData((kingdom: any) => {
        if (!kingdom.turnState?.eventsPhase) return;
        kingdom.turnState.eventsPhase.selectedApproach = winningChoice;
      });
    }
    
    // Then dispatch to parent
    if (winningChoice === '__ignore__') {
      dispatch('ignore');
    } else {
      dispatch('select', { optionId: winningChoice });
    }
  }
  
  async function handleVoteClick(optionId: string) {
    if (!enableVoting || !eventId || disabled || hasVoted) return;
    
    try {
      await VoteService.castVote(eventId, optionId);
    } catch (error) {
      console.error('🗳️ [PreRollChoiceSelector] Failed to cast vote:', error);
    }
  }
  
  function selectOption(optionId: string) {
    if (disabled) return;
    
    // If voting is enabled, cast vote instead of immediate selection
    if (enableVoting && eventId) {
      handleVoteClick(optionId);
    } else {
      dispatch('select', { optionId });
    }
  }
  
  
  // Get vote count for a choice (reactive)
  function getVoteCount(choiceId: string): number {
    if (!vote) return 0;
    return vote.votes.filter((v: VoteCast) => v.choiceId === choiceId).length;
  }
  
  // Get voters for this choice (reactive)
  function getVotersForChoice(choiceId: string): VoteCast[] {
    if (!vote) return [];
    return vote.votes.filter((v: VoteCast) => v.choiceId === choiceId);
  }
  
  // Check if current user voted for this choice (reactive)
  function didIVoteFor(choiceId: string): boolean {
    return myVote?.choiceId === choiceId;
  }
  
  // Generate waiting message (reactive)
  $: waitingMessage = (() => {
    if (waitingForPlayers.length === 0) return '';
    
    const names = waitingForPlayers;
    if (names.length === 1) return `Waiting for ${names[0]} to vote...`;
    if (names.length === 2) return `Waiting for ${names[0]} and ${names[1]} to vote...`;
    
    const lastTwo = names.slice(-2).join(' and ');
    const rest = names.slice(0, -2).join(', ');
    return `Waiting for ${rest}, ${lastTwo} to vote...`;
  })();
  
  /**
   * Sort options by personality alignment:
   * - Virtuous (left) → Practical (center) → Ruthless (right)
   * - Within each category, sort by intensity (highest value = furthest from center)
   */
  function sortByPersonality(opts: any[]): any[] {
    return [...opts].sort((a, b) => {
      const aPersonality = a.personality || {};
      const bPersonality = b.personality || {};

      // Calculate dominant alignment and intensity
      const aIdealist = aPersonality.idealist || 0;
      const aPractical = aPersonality.practical || 0;
      const aRuthless = aPersonality.ruthless || 0;

      const bIdealist = bPersonality.idealist || 0;
      const bPractical = bPersonality.practical || 0;
      const bRuthless = bPersonality.ruthless || 0;

      // Determine primary alignment (highest value wins)
      const getDominant = (v: number, p: number, r: number) => {
        if (v >= p && v >= r) return 'idealist';
        if (r >= p && r >= v) return 'ruthless';
        return 'practical';
      };

      const aDominant = getDominant(aIdealist, aPractical, aRuthless);
      const bDominant = getDominant(bIdealist, bPractical, bRuthless);

      // Sort order: idealist < practical < ruthless
      const order = { idealist: 0, practical: 1, ruthless: 2 };

      if (aDominant !== bDominant) {
        return order[aDominant] - order[bDominant];
      }

      // Same alignment - sort by intensity (highest first within category)
      if (aDominant === 'idealist') {
        return bIdealist - aIdealist;  // Descending (most idealist on far left)
      } else if (aDominant === 'ruthless') {
        return bRuthless - aRuthless;  // Descending (most ruthless on far right)
      } else {
        return bPractical - aPractical;  // Descending (most practical in center)
      }
    });
  }
  
  // Add "Ignore Event" as a votable option if enabled
  $: allOptions = (() => {
    if (!showIgnoreButton) return sortByPersonality(options);
    
    // Add ignore option at the end
    const ignoreOption = {
      id: '__ignore__',
      label: 'Ignore Event',
      icon: 'fas fa-times-circle',
      skills: []
    };
    
    return [...sortByPersonality(options), ignoreOption];
  })();
</script>

<div class="pre-roll-choice-selector">
  <h4 class="choice-label">{label}</h4>
  
  {#if enableVoting && vote}
    <div class="vote-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(voteCount / requiredVotes) * 100}%"></div>
      </div>
      <div class="progress-text">{voteCount} / {requiredVotes} votes</div>
    </div>
  {/if}
  
  <div class="choice-options">
    {#each allOptions as option}
      <div class="choice-option-wrapper" class:has-winner={winningChoice === option.id} class:ignore-option={option.id === '__ignore__'}>
        <button
          class="choice-option"
          class:voted={didIVoteFor(option.id)}
          class:winner={winningChoice === option.id}
          class:ignore-button-style={option.id === '__ignore__'}
          on:click={() => {
            if (option.id === '__ignore__') {
              // If voting, cast vote for ignore. Otherwise, dispatch ignore immediately.
              if (enableVoting && eventId) {
                handleVoteClick(option.id);
              } else {
                dispatch('ignore');
              }
            } else {
              selectOption(option.id);
            }
          }}
          disabled={disabled || (enableVoting && hasVoted)}
        >
          {#if option.icon}
            <i class={option.icon}></i>
          {/if}
          <span class="option-label">{option.label}</span>
        </button>
        
        {#if option.id === '__ignore__'}
          <div class="option-description">
            Failure results.
          </div>
        {:else if option.skills && option.skills.length > 0}
          <div class="option-skills">
            {option.skills.join(', ')}
          </div>
        {/if}
        
        {#if enableVoting && eventId && getVoteCount(option.id) > 0}
          <div class="vote-indicator">
            <div class="voter-list">
              {#each getVotersForChoice(option.id) as voter}
                <div 
                  class="voter-badge"
                  style="border-color: {voter.playerColor || '#999999'};"
                >
                  <i 
                    class="fas fa-circle-check voter-icon"
                    style="color: {voter.playerColor || '#999999'};"
                  ></i>
                  <span class="voter-name">{voter.characterName || voter.playerName}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  
  {#if showContinueButton}
    <div class="continue-section">
      <button class="continue-button" on:click={handleContinue}>
        <i class="fas fa-arrow-right"></i>
        Continue
      </button>
    </div>
  {/if}
  
  {#if enableVoting && waitingMessage && !showContinueButton}
    <div class="waiting-message">
      <div class="waiting-content">
        <i class="fas fa-hourglass-half"></i>
        <span>{waitingMessage}</span>
      </div>
      
      {#if isGM}
        <div class="gm-controls">
          <button
            class="gm-button force-resolve"
            on:click={async () => {
              if (eventId) {
                await VoteService.forceResolveVote(eventId);
              }
            }}
            title="Pick current leader (or random if tied)"
          >
            <i class="fas fa-gavel"></i>
            End Vote
          </button>
          
          <button
            class="gm-button reset-vote"
            on:click={async () => {
              if (eventId) {
                await VoteService.resetVote(eventId);
              }
            }}
            title="Clear all votes and start over"
          >
            <i class="fas fa-redo"></i>
            Reset
          </button>
        </div>
      {/if}
    </div>
  {/if}
  
</div>

<style lang="scss">
  .pre-roll-choice-selector {
    margin: var(--space-16) 0;
  }
  
  .choice-label {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--space-32);  // Increased spacing between label and choices (32px)
  }
  
  .choice-options {
    display: flex;
    flex-wrap: wrap;  // Horizontal row layout with wrapping
    justify-content: center;  // Center buttons horizontally
    gap: var(--space-16);  // Increased spacing to accommodate skill text
  }
  
  .choice-option-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);  // Reduced gap between button and content below
    flex: 1 1 0;  // Equal width for all wrappers
    min-width: 0;
    max-width: 15rem;
  }
  
  .choice-option {
    // Layout
    display: flex;
    align-items: center;
    justify-content: center;  // Center content within button
    gap: var(--space-8);  // Icon-to-text spacing
    padding: var(--space-16) var(--space-24);  // Increased padding for taller buttons
    min-height: 3.5rem;  // Minimum height for taller appearance
    width: 100%;  // Fill wrapper width
    
    // Background
    background: var(--hover-low);
    
    // Border (visible on all states)
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    
    // Outline (overlay, doesn't affect size)
    outline: 2px solid transparent;
    outline-offset: -1px;  // Sits inside border
    
    // Typography
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--text-primary);
    
    // Interaction
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    
    // Icon styling
    i {
      font-size: var(--font-lg);
      color: var(--text-secondary);
      transition: color 0.2s;
    }
    
    // Hover state
    &:hover:not(:disabled) {
      background: var(--btn-secondary-hover);
      border-color: var(--border-strong);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    // Disabled state
    &:disabled {
      cursor: not-allowed;
      
      // Only reduce opacity if this is NOT the voted button
      &:not(.voted) {
        opacity: 0.4;
      }
    }
    
    // Voted state (use standard hover styling - lighter background)
    &.voted {
      background: var(--btn-secondary-hover);
      border-color: var(--border-strong);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    // Winner state (green and faded)
    &.winner {
      background: rgba(34, 197, 94, 0.15);  // Green, faded (15% opacity)
      border-color: rgba(34, 197, 94, 0.4);  // Green border, faded
      box-shadow: 0 0 1rem rgba(34, 197, 94, 0.3);
      animation: pulse-winner 2s ease-in-out infinite;
      
      .winner-icon {
        margin-left: var(--space-8);
        // Removed bounce animation
      }
    }
    
    // Ignore button styling
    &.ignore-button-style {
      background: transparent;
      border-color: var(--border-danger);
      color: var(--text-danger);
      
      i {
        color: var(--text-danger);
      }
      
      &:hover:not(:disabled) {
        background: var(--surface-danger-lower);
        border-color: var(--border-danger-medium);
      }
      
      &.voted {
        background: var(--surface-danger-lower);
        border-color: var(--border-danger-medium);
      }
      
      &.winner {
        background: var(--surface-danger);
        border-color: var(--border-danger-strong);
        box-shadow: 0 0 1rem rgba(239, 68, 68, 0.5);
      }
    }
  }
  
  @keyframes pulse-winner {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-0.25rem); }
  }
  
  .option-label {
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .option-skills {
    font-size: var(--font-sm);
    color: var(--text-tertiary);
    text-align: center;
    text-transform: capitalize;
    line-height: 1.3;
  }
  
  .option-description {
    font-size: var(--font-sm);
    color: var(--text-tertiary);
    text-align: center;
    line-height: 1.3;
  }
  
  .ignore-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    margin-top: var(--space-24);
    padding-top: var(--space-20);
    border-top: 1px solid var(--border-faint);
  }
  
  .ignore-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-20);
    background: transparent;
    border: 1px solid var(--border-danger);
    border-radius: var(--radius-md);
    color: var(--text-danger);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s;
    
    i {
      font-size: var(--font-md);
    }
    
    &:hover:not(:disabled) {
      background: var(--surface-danger-lower);
      border-color: var(--border-danger-medium);
      transform: translateY(-0.0625rem);
    }
    
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
  
  .ignore-description {
    font-size: var(--font-sm);
    color: var(--text-tertiary);
    text-align: center;
    font-style: italic;
  }
  
  // Voting UI styles
  .vote-progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    margin-bottom: var(--space-20);
    
    .progress-bar {
      width: 100%;
      height: 0.5rem;
      background: var(--surface-primary);
      border-radius: var(--radius-full);
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-blue), var(--color-blue-light));
        transition: width 0.3s ease;
      }
    }
    
    .progress-text {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      text-align: center;
    }
  }
  
  .vote-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-4);
    
    .voter-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-6);
      justify-content: center;
      
      .voter-badge {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: 0 var(--space-8) 0 0;  // Only right padding (for text)
        background: transparent;
        border: 1px solid;  // Color set inline via style attribute
        border-radius: var(--radius-full);
        animation: fade-in 0.3s ease;
        
        .voter-icon {
          font-size: var(--font-md);
          line-height: 1;
        }
        
        .voter-name {
          font-size: var(--font-sm);
          color: var(--text-secondary);
          font-weight: var(--font-weight-medium);
          line-height: 1;
          white-space: nowrap;
        }
      }
    }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0); }
    to { opacity: 1; transform: scale(1); }
  }
  
  
  .waiting-message {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    padding: var(--space-12) var(--space-16);
    margin-top: var(--space-16);
    background: var(--surface-accent);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-md);
    
    .waiting-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      font-size: var(--font-md);
      color: var(--text-secondary);
      font-style: italic;
      
      i {
        color: var(--color-amber);
        animation: spin 2s linear infinite;
      }
    }
    
    .gm-controls {
      display: flex;
      gap: var(--space-8);
      justify-content: center;
      padding-top: var(--space-8);
      border-top: 1px solid var(--border-faint);
      
      .gm-button {
        display: flex;
        align-items: center;
        gap: var(--space-6);
        padding: var(--space-6) var(--space-12);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.2s;
        
        i {
          font-size: var(--font-sm);
        }
        
        &.force-resolve {
          background: var(--surface-success-lower);
          color: var(--color-green);
          border-color: var(--border-success);
          
          &:hover {
            background: var(--surface-success-low);
            border-color: var(--border-success-medium);
            transform: translateY(-0.0625rem);
          }
        }
        
        &.reset-vote {
          background: var(--surface-warning-lower);
          color: var(--color-amber);
          border-color: var(--border-warning);
          
          &:hover {
            background: var(--surface-warning-low);
            border-color: var(--border-warning-medium);
            transform: translateY(-0.0625rem);
          }
        }
      }
    }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .continue-section {
    display: flex;
    justify-content: center;
    margin-top: var(--space-20);
    padding-top: var(--space-16);
    border-top: 1px solid var(--border-faint);
  }
  
  .continue-button {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-12) var(--space-24);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: white;
    background: var(--color-blue);
    border: 1px solid var(--color-blue-dark);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0.125rem 0.375rem var(--overlay);
    
    i {
      font-size: var(--font-md);
    }
    
    &:hover {
      background: var(--color-blue-light);
      border-color: var(--color-blue);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.25rem 0.75rem var(--overlay);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 0.0625rem 0.25rem var(--overlay);
    }
  }
</style>
