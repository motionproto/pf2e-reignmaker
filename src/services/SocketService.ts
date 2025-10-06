/**
 * SocketService - Wrapper for socketlib to handle GM delegation
 * 
 * This service allows players to execute KingdomActor updates by routing them
 * through the GM client when they lack direct permission.
 */

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
  private isReady: boolean = false;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize the socket service
   */
  initialize(): void {
    console.log('[SocketService] Initializing...');
    
    // Check if socketlib is available
    if (!window.socketlib) {
      console.error('[SocketService] ❌ socketlib not found! Module may not be installed or enabled.');
      console.error('[SocketService] Please install and enable the "socketlib" module.');
      return;
    }
    
    console.log('[SocketService] socketlib detected');
    
    // Try to register immediately - socketlib might already be ready
    try {
      this.registerSocket();
      console.log('[SocketService] ✅ Registered immediately (socketlib already ready)');
    } catch (error) {
      // If immediate registration fails, wait for socketlib.ready hook
      console.log('[SocketService] Immediate registration failed, waiting for socketlib.ready hook...');
      
      Hooks.once('socketlib.ready', () => {
        try {
          console.log('[SocketService] 🎉 socketlib.ready hook fired!');
          this.registerSocket();
        } catch (error) {
          console.error('[SocketService] ❌ Failed to initialize:', error);
          ui.notifications?.error('Failed to initialize socket service. Check console for details.');
        }
      });
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
    
    this.isReady = true;
    console.log('✅ [SocketService] Fully initialized - kingdom updates can now be delegated to GM');
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
   * Check if socketlib is available
   */
  isAvailable(): boolean {
    return !!window.socketlib && !!this.socket;
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();

// Export function to initialize (called from module init hook)
export function initializeSocketService(): void {
  socketService.initialize();
}
