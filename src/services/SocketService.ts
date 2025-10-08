/**
 * SocketService - Wrapper for socketlib to handle GM delegation
 * 
 * This service allows players to execute KingdomActor updates by routing them
 * through the GM client when they lack direct permission.
 */

console.log('[SocketService] Module loading...');

import type { KingdomData } from '../actors/KingdomActor';

interface SocketlibSocket {
  register(name: string, handler: Function): void;
  executeAsGM(name: string, ...args: any[]): Promise<any>;
}

interface Socketlib {
  registerModule(moduleId: string): SocketlibSocket;
}

declare global {
  interface Window {
    socketlib?: Socketlib;
  }
  interface HookCallbacks {
    'socketlib.ready'?: () => void;
  }
}

class SocketService {
  private static instance: SocketService | null = null;
  private socket: SocketlibSocket | null = null;
  private readonly MODULE_ID = 'pf2e-reignmaker';
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  private constructor() {
    // Create a promise that will resolve when socketlib is ready
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize the socket service
   * This should be called during Foundry's init hook, but socketlib may already be ready
   */
  initialize(): void {
    console.log('PF2E ReignMaker | [SocketService] Initializing...');
    console.log('PF2E ReignMaker | [SocketService] window.socketlib:', window.socketlib);
    console.log('PF2E ReignMaker | [SocketService] typeof window.socketlib:', typeof window.socketlib);
    
    // Check if socketlib is available
    if (!window.socketlib) {
      console.warn('PF2E ReignMaker | [SocketService] ⚠️ socketlib not found! Module may not be installed or enabled.');
      console.warn('PF2E ReignMaker | [SocketService] Socket-based operations will not be available for non-GM users.');
      console.warn('PF2E ReignMaker | [SocketService] Please install and enable the "socketlib" module for full functionality.');
      console.warn('PF2E ReignMaker | [SocketService] Without socketlib, only GM users can create/delete armies.');
      // Resolve the ready promise even if socketlib is not available
      if (this.readyResolve) {
        this.readyResolve();
      }
      return;
    }
    
    console.log('PF2E ReignMaker | [SocketService] ✅ socketlib detected:', window.socketlib);
    
    // socketlib is already initialized by this point (init hook runs after socketlib.ready)
    // Register immediately
    try {
      console.log('PF2E ReignMaker | [SocketService] Registering with socketlib...');
      this.registerSocket();
      console.log('PF2E ReignMaker | [SocketService] ✅ Registration successful');
      // Resolve the ready promise
      if (this.readyResolve) {
        this.readyResolve();
      }
    } catch (error) {
      console.error('PF2E ReignMaker | [SocketService] ❌ Failed to register:', error);
      ui.notifications?.error('Failed to initialize socket service. Check console for details.');
      // Still resolve the promise to prevent hanging
      if (this.readyResolve) {
        this.readyResolve();
      }
    }
  }
  
  /**
   * Register the socket with socketlib
   */
  private registerSocket(): void {
    // Register this module's socket
    this.socket = (window.socketlib as Socketlib).registerModule(this.MODULE_ID);
    console.log('[SocketService] Module registered with socketlib');

    // Register the updateKingdom handler (executed on GM's client)
    this.socket.register('updateKingdom', this.handleUpdateKingdom.bind(this));
    console.log('[SocketService] updateKingdom handler registered');
    
    // Register army operation handlers
    this.socket.register('createArmy', this.handleCreateArmy.bind(this));
    console.log('[SocketService] createArmy handler registered');
    
    this.socket.register('disbandArmy', this.handleDisbandArmy.bind(this));
    console.log('[SocketService] disbandArmy handler registered');
    
    console.log('✅ [SocketService] Fully initialized - kingdom updates and army operations can now be delegated to GM');
  }

  /**
   * Execute a kingdom update on the GM's client
   * This is called by players who lack direct permission
   */
  async executeAsGM(actorId: string, updater: (kingdom: KingdomData) => void): Promise<void> {
    if (!this.socket) {
      throw new Error('[SocketService] Socket not initialized. Call initialize() first.');
    }

    console.log(`[SocketService] Routing kingdom update to GM for actor ${actorId}`);
    
    try {
      // Apply updater locally to get the changes
      const actor = game.actors?.get(actorId);
      if (!actor) {
        throw new Error(`Actor ${actorId} not found`);
      }

      const kingdom = actor.getFlag(this.MODULE_ID, 'kingdom-data') as KingdomData;
      if (!kingdom) {
        throw new Error('No kingdom data found on actor');
      }

      // Clone the kingdom and apply changes locally
      const before = JSON.parse(JSON.stringify(kingdom));
      updater(kingdom);
      const after = JSON.parse(JSON.stringify(kingdom));

      // Send the complete updated kingdom data to GM
      await this.socket.executeAsGM('updateKingdom', actorId, after);
      console.log('[SocketService] ✅ Update executed successfully on GM client');
    } catch (error) {
      console.error('[SocketService] Failed to execute update on GM:', error);
      throw error;
    }
  }

  /**
   * Handler executed on GM's client to perform the actual update
   * This runs with GM permissions, so it can modify the actor
   */
  private async handleUpdateKingdom(actorId: string, updatedKingdom: KingdomData): Promise<void> {
    console.log(`[SocketService] GM executing kingdom update for actor ${actorId}`);

    // Get the actor
    const actor = game.actors?.get(actorId);
    if (!actor) {
      console.error(`[SocketService] Actor ${actorId} not found`);
      return;
    }

    try {
      // Save the updated kingdom data (GM has permission)
      await actor.setFlag(this.MODULE_ID, 'kingdom-data', updatedKingdom);
      
      console.log('[SocketService] ✅ Kingdom updated successfully by GM');
    } catch (error) {
      console.error('[SocketService] Failed to apply kingdom update:', error);
      throw error;
    }
  }

  /**
   * Execute any registered handler on the GM's client
   * This is a public wrapper around socket.executeAsGM
   * Waits for socketlib to be ready before executing
   */
  async executeOperation(handlerName: string, ...args: any[]): Promise<any> {
    // Wait for socketlib to be ready
    await this.readyPromise;
    
    if (!this.socket) {
      throw new Error('[SocketService] Socket not initialized. Socketlib may not be installed or enabled.');
    }

    console.log(`[SocketService] Executing '${handlerName}' on GM client...`);
    
    try {
      const result = await this.socket.executeAsGM(handlerName, ...args);
      console.log(`[SocketService] ✅ '${handlerName}' executed successfully`);
      return result;
    } catch (error) {
      console.error(`[SocketService] Failed to execute '${handlerName}' on GM:`, error);
      throw error;
    }
  }

  /**
   * Handler executed on GM's client to create an army
   * This runs with GM permissions, so it can create NPC actors
   */
  private async handleCreateArmy(name: string, level: number, actorData?: any): Promise<any> {
    console.log(`[SocketService] GM creating army: ${name} (Level ${level})`);

    try {
      // Dynamically import to avoid circular dependencies
      const { armyService } = await import('./army');
      // Call internal method directly - we're already on GM client
      const army = await armyService._createArmyInternal(name, level, actorData);
      
      console.log(`[SocketService] ✅ Army created successfully: ${army.id}`);
      return army;
    } catch (error) {
      console.error('[SocketService] Failed to create army:', error);
      throw error;
    }
  }

  /**
   * Handler executed on GM's client to disband an army
   * This runs with GM permissions, so it can delete NPC actors
   */
  private async handleDisbandArmy(armyId: string): Promise<any> {
    console.log(`[SocketService] GM disbanding army: ${armyId}`);

    try {
      // Dynamically import to avoid circular dependencies
      const { armyService } = await import('./army');
      // Call internal method directly - we're already on GM client
      const result = await armyService._disbandArmyInternal(armyId);
      
      console.log(`[SocketService] ✅ Army disbanded successfully: ${result.armyName}`);
      return result;
    } catch (error) {
      console.error('[SocketService] Failed to disband army:', error);
      throw error;
    }
  }

  /**
   * Check if socketlib is available
   * This is synchronous and may return false even if socketlib will be available soon
   */
  isAvailable(): boolean {
    return !!window.socketlib && !!this.socket;
  }
  
  /**
   * Wait for socketlib to be ready (async version)
   * Returns true if available, false if not (e.g., socketlib not installed)
   */
  async waitForReady(): Promise<boolean> {
    await this.readyPromise;
    return this.isAvailable();
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();

// Export function to initialize (called from module init hook)
export function initializeSocketService(): void {
  console.log('[SocketService] initializeSocketService() called');
  console.log('[SocketService] socketService instance:', socketService);
  console.log('[SocketService] About to call socketService.initialize()');
  socketService.initialize();
  console.log('[SocketService] socketService.initialize() returned');
}
