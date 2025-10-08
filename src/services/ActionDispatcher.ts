/**
 * ActionDispatcher - Native Foundry socket-based action routing
 * 
 * Provides a simple pattern for routing player actions to GM for execution.
 * Uses Foundry's built-in game.socket system - no external dependencies.
 * 
 * Pattern inspired by pf2e-kingmaker-tools ActionDispatcher.
 */

console.log('[ActionDispatcher] Module loading...');

interface ActionMessage {
  action: string;
  data: any;
  senderId?: string;
}

type ActionHandler = (data: any) => Promise<any>;

class ActionDispatcher {
  private static instance: ActionDispatcher | null = null;
  private handlers = new Map<string, ActionHandler>();
  private readonly SOCKET_NAME = 'module.pf2e-reignmaker';
  private initialized = false;

  private constructor() {}

  static getInstance(): ActionDispatcher {
    if (!ActionDispatcher.instance) {
      ActionDispatcher.instance = new ActionDispatcher();
    }
    return ActionDispatcher.instance;
  }

  /**
   * Initialize the dispatcher
   * Registers socket listener on ALL clients (GM + players)
   * Should be called during Foundry's init hook
   */
  initialize(): void {
    if (this.initialized) {
      console.log('[ActionDispatcher] Already initialized, skipping');
      return;
    }

    console.log('[ActionDispatcher] Initializing...');

    const game = (globalThis as any).game;
    if (!game?.socket) {
      console.error('[ActionDispatcher] ❌ game.socket not available! Cannot initialize.');
      return;
    }

    // Register socket listener (runs on ALL clients)
    game.socket.on(this.SOCKET_NAME, (message: ActionMessage) => {
      this.handleSocketMessage(message);
    });

    this.initialized = true;
    console.log('✅ [ActionDispatcher] Initialized - listening on', this.SOCKET_NAME);
  }

  /**
   * Register an action handler
   * Handler will be executed on GM's client only
   * 
   * @param action - Action name (e.g., 'createArmy')
   * @param handler - Async function to execute on GM
   */
  register(action: string, handler: ActionHandler): void {
    this.handlers.set(action, handler);
    console.log(`[ActionDispatcher] Registered handler: ${action}`);
  }

  /**
   * Dispatch an action
   * If user is GM, executes locally
   * If user is player, routes to GM via socket
   * 
   * @param action - Action name
   * @param data - Action data
   * @returns Promise that resolves when action completes (GM only)
   */
  async dispatch(action: string, data: any): Promise<any> {
    const game = (globalThis as any).game;

    if (!this.initialized) {
      throw new Error('[ActionDispatcher] Not initialized. Call initialize() first.');
    }

    console.log(`[ActionDispatcher] Dispatching action: ${action}`, data);

    // If we're GM, execute directly
    if (game?.user?.isGM) {
      console.log(`[ActionDispatcher] User is GM, executing locally`);
      return await this.executeHandler(action, data);
    }

    // We're a player - check if GM is online before routing
    const gmOnline = this.isGMOnline();
    if (!gmOnline) {
      const errorMsg = 'No GM is currently online. This action requires a GM to execute.';
      console.warn(`[ActionDispatcher] ${errorMsg}`);
      
      // Don't show notification here - let the calling code handle user feedback
      // Just throw the error so caller can handle it appropriately
      throw new Error(errorMsg);
    }

    // GM is online, send to GM
    console.log(`[ActionDispatcher] User is player, routing to GM via socket`);
    this.sendToGM(action, data);

    // Fire-and-forget for now
    // Players will see the result via reactive store updates
    return undefined;
  }

  /**
   * Send action to GM via socket
   * Emits to all clients, but only GM will execute
   * 
   * @param action - Action name
   * @param data - Action data
   */
  private sendToGM(action: string, data: any): void {
    const game = (globalThis as any).game;

    const message: ActionMessage = {
      action,
      data,
      senderId: game?.user?.id
    };

    console.log(`[ActionDispatcher] Emitting to socket:`, message);
    game.socket.emit(this.SOCKET_NAME, message);
  }

  /**
   * Handle incoming socket messages
   * Only GM executes handlers
   * 
   * @param message - Action message from socket
   */
  private async handleSocketMessage(message: ActionMessage): Promise<void> {
    const game = (globalThis as any).game;

    console.log('[ActionDispatcher] Received socket message:', message);

    // Only GM executes handlers
    if (!game?.user?.isGM) {
      console.log('[ActionDispatcher] Not GM, ignoring message');
      return;
    }

    console.log(`[ActionDispatcher] GM executing action: ${message.action}`);

    try {
      await this.executeHandler(message.action, message.data);
      console.log(`✅ [ActionDispatcher] Action completed: ${message.action}`);
    } catch (error) {
      console.error(`❌ [ActionDispatcher] Action failed: ${message.action}`, error);
      
      // Notify sender of failure
      if (message.senderId && game?.users) {
        const sender = game.users.get(message.senderId);
        if (sender) {
          game.socket.emit(this.SOCKET_NAME, {
            action: 'actionError',
            data: {
              originalAction: message.action,
              error: error instanceof Error ? error.message : String(error)
            },
            senderId: game.user.id
          });
        }
      }
    }
  }

  /**
   * Execute a registered handler
   * 
   * @param action - Action name
   * @param data - Action data
   * @returns Handler result
   */
  private async executeHandler(action: string, data: any): Promise<any> {
    const handler = this.handlers.get(action);

    if (!handler) {
      const error = `No handler registered for action: ${action}`;
      console.error(`[ActionDispatcher] ${error}`);
      throw new Error(error);
    }

    return await handler(data);
  }

  /**
   * Check if dispatcher is ready to use
   * Unlike socketlib, this is always true after initialize()
   */
  isAvailable(): boolean {
    return this.initialized;
  }

  /**
   * Check if a GM is currently online
   * Used to prevent players from attempting operations when no GM can execute them
   */
  private isGMOnline(): boolean {
    const game = (globalThis as any).game;
    
    if (!game?.users) {
      return false;
    }

    // Check if any GM user is active (logged in)
    return Array.from(game.users).some((user: any) => 
      user.isGM && user.active
    );
  }
}

// Export singleton instance
export const actionDispatcher = ActionDispatcher.getInstance();

// Export initialization function
export function initializeActionDispatcher(): void {
  console.log('[ActionDispatcher] initializeActionDispatcher() called');
  actionDispatcher.initialize();
}
