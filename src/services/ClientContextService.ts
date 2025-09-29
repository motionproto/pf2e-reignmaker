/**
 * Client Context Service for PF2e Reignmaker
 * Manages client differentiation, socket communication, and multiplayer coordination
 */

import type { ActionResolution } from '../stores/gameState';

// Declare Foundry globals
declare const game: any;
declare const Hooks: any;
declare const ui: any;

export interface ActionSocketMessage {
  type: 'action-started' | 'action-resolved' | 'action-cancelled' | 'action-reroll';
  userId: string;
  userName: string;
  userColor: string;
  actionId: string;
  actionName: string;
  timestamp: number;
  
  // Optional fields based on message type
  outcome?: string;
  actorName?: string;
  skillName?: string;
  stateChanges?: any;
  characterLevel?: number;
}

export class ClientContextService {
  private static instance: ClientContextService;
  private readonly MODULE_ID = 'pf2e-reignmaker';
  private initialized = false;
  
  private constructor() {}
  
  static getInstance(): ClientContextService {
    if (!ClientContextService.instance) {
      ClientContextService.instance = new ClientContextService();
    }
    return ClientContextService.instance;
  }
  
  /**
   * Initialize the service and register socket listeners
   */
  initialize(): void {
    if (this.initialized) return;
    
    this.registerSocketListeners();
    this.initialized = true;
    
    console.log('[ClientContextService] Initialized for multiplayer action coordination');
  }
  
  /**
   * Get the current user object
   */
  getCurrentUser(): any {
    return game?.user;
  }
  
  /**
   * Get the current user's ID
   */
  getCurrentUserId(): string | null {
    return game?.user?.id || null;
  }
  
  /**
   * Check if a given userId is the current user
   */
  isCurrentUser(userId: string): boolean {
    return game?.user?.id === userId;
  }
  
  /**
   * Get all connected users
   */
  getAllUsers(): any[] {
    return game?.users?.contents || [];
  }
  
  /**
   * Get a user by ID
   */
  getUserById(userId: string): any {
    return game?.users?.get(userId);
  }
  
  /**
   * Broadcast an action event to all other clients
   */
  broadcastActionEvent(eventType: 'started' | 'resolved' | 'cancelled' | 'reroll', data: {
    actionId: string;
    actionName: string;
    outcome?: string;
    actorName?: string;
    skillName?: string;
    stateChanges?: any;
    characterLevel?: number;
  }): void {
    if (!game?.socket) return;
    
    const user = this.getCurrentUser();
    if (!user) return;
    
    const { actionId, actionName, ...otherData } = data;
    
    const message: ActionSocketMessage = {
      type: `action-${eventType}` as ActionSocketMessage['type'],
      userId: user.id,
      userName: user.name,
      userColor: user.color || '#ffffff',
      actionId,
      actionName,
      timestamp: Date.now(),
      ...otherData
    };
    
    // Emit socket message to other clients
    game.socket.emit(`module.${this.MODULE_ID}`, message);
    
    // Also trigger local hook for consistency
    this.triggerLocalHook(message);
  }
  
  /**
   * Register socket listeners for incoming action events
   */
  private registerSocketListeners(): void {
    if (!game?.socket) return;
    
    // Register socket listener
    game.socket.on(`module.${this.MODULE_ID}`, (data: any) => {
      // Only process action-related messages
      if (data.type?.startsWith('action-')) {
        this.handleIncomingActionEvent(data);
      }
    });
  }
  
  /**
   * Handle incoming action events from other clients
   */
  private handleIncomingActionEvent(message: ActionSocketMessage): void {
    // Don't process our own messages
    if (this.isCurrentUser(message.userId)) return;
    
    // Trigger hooks for different message types
    switch (message.type) {
      case 'action-started':
        Hooks.callAll(`${this.MODULE_ID}.actionStarted`, message);
        this.showActionNotification(message, 'started');
        break;
        
      case 'action-resolved':
        Hooks.callAll(`${this.MODULE_ID}.actionResolved`, message);
        this.showActionNotification(message, 'resolved');
        break;
        
      case 'action-cancelled':
        Hooks.callAll(`${this.MODULE_ID}.actionCancelled`, message);
        break;
        
      case 'action-reroll':
        Hooks.callAll(`${this.MODULE_ID}.actionReroll`, message);
        this.showActionNotification(message, 'rerolling');
        break;
    }
  }
  
  /**
   * Trigger local hook for consistency
   */
  private triggerLocalHook(message: ActionSocketMessage): void {
    // Trigger the same hooks locally for UI consistency
    const eventName = message.type.replace('action-', '');
    Hooks.callAll(`${this.MODULE_ID}.action${eventName.charAt(0).toUpperCase() + eventName.slice(1)}Local`, message);
  }
  
  /**
   * Show a notification for other players' actions
   */
  private showActionNotification(message: ActionSocketMessage, action: 'started' | 'resolved' | 'rerolling'): void {
    if (!ui?.notifications) return;
    
    let notificationText = '';
    const playerName = `<span style="color: ${message.userColor}; font-weight: bold;">${message.userName}</span>`;
    
    switch (action) {
      case 'started':
        notificationText = `${playerName} is performing ${message.actionName}`;
        break;
        
      case 'resolved':
        const outcomeColor = this.getOutcomeColor(message.outcome);
        const outcomeText = message.outcome ? 
          `<span style="color: ${outcomeColor}; font-weight: bold;">${this.formatOutcome(message.outcome)}</span>` : 
          'completed';
        notificationText = `${playerName} ${outcomeText} ${message.actionName}`;
        if (message.actorName && message.skillName) {
          notificationText += ` (${message.actorName} - ${message.skillName})`;
        }
        break;
        
      case 'rerolling':
        notificationText = `${playerName} is using Fame to reroll ${message.actionName}`;
        break;
    }
    
    // Use Foundry's notification system with HTML support
    ui.notifications.info(notificationText, { permanent: false });
  }
  
  /**
   * Get color based on outcome type
   */
  private getOutcomeColor(outcome?: string): string {
    switch (outcome) {
      case 'criticalSuccess':
        return '#44ff44';
      case 'success':
        return '#88ff88';
      case 'failure':
        return '#ff8888';
      case 'criticalFailure':
        return '#ff4444';
      default:
        return '#ffffff';
    }
  }
  
  /**
   * Format outcome text for display
   */
  private formatOutcome(outcome: string): string {
    switch (outcome) {
      case 'criticalSuccess':
        return 'critically succeeded';
      case 'success':
        return 'succeeded';
      case 'failure':
        return 'failed';
      case 'criticalFailure':
        return 'critically failed';
      default:
        return outcome;
    }
  }
  
  /**
   * Check if the service is ready to use
   */
  isReady(): boolean {
    return this.initialized && game?.socket !== undefined;
  }
  
  /**
   * Generate a composite key for player-specific action resolution
   */
  static generateResolutionKey(userId: string, actionId: string): string {
    return `${userId}:${actionId}`;
  }
  
  /**
   * Parse a composite resolution key
   */
  static parseResolutionKey(key: string): { userId: string; actionId: string } | null {
    const parts = key.split(':');
    if (parts.length !== 2) return null;
    return {
      userId: parts[0],
      actionId: parts[1]
    };
  }
}

// Export singleton instance
export const clientContextService = ClientContextService.getInstance();
