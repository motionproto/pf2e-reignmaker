/**
 * Game Command Handler Registry
 * 
 * Central registry for all game command handlers.
 * Routes game commands to appropriate handlers using the handler pattern.
 */

import type { GameCommandHandler, GameCommandContext, GameCommandResult } from './GameCommandHandler';
import type { PreparedCommand } from '../../types/game-commands';

// Import all handlers
import { GiveActorGoldHandler } from './handlers/GiveActorGoldHandler';
import { RecruitArmyHandler } from './handlers/RecruitArmyHandler';
// Note: DisbandArmyHandler and TrainArmyHandler removed - pipelines use direct execution functions
import { FoundSettlementHandler } from './handlers/FoundSettlementHandler';
import { AdjustFactionHandler } from './handlers/AdjustFactionHandler';
import { OutfitArmyHandler } from './handlers/OutfitArmyHandler';
import { RequestMilitaryAidHandler } from './handlers/RequestMilitaryAidHandler';
import { DestroyWorksiteHandler } from './handlers/DestroyWorksiteHandler';
import { SpendPlayerActionHandler } from './handlers/SpendPlayerActionHandler';
import { DamageStructureHandler } from './handlers/DamageStructureHandler';
import { DestroyStructureHandler } from './handlers/DestroyStructureHandler';
import { ReleaseImprisonedHandler } from './handlers/ReleaseImprisonedHandler';
import { RemoveBorderHexesHandler } from './handlers/RemoveBorderHexesHandler';
import { ReduceImprisonedHandler } from './handlers/ReduceImprisonedHandler';
import { DeployArmyHandler } from './handlers/DeployArmyHandler';
import { ReduceSettlementLevelHandler } from './handlers/ReduceSettlementLevelHandler';
import { IncreaseSettlementLevelHandler } from './handlers/IncreaseSettlementLevelHandler';
import { SeizeHexesHandler } from './handlers/SeizeHexesHandler';
import { SpawnEnemyArmyHandler } from './handlers/SpawnEnemyArmyHandler';
import { TransferSettlementHandler } from './handlers/TransferSettlementHandler';
import { DefectArmiesHandler } from './handlers/DefectArmiesHandler';
import { ConvertUnrestToImprisonedHandler } from './handlers/ConvertUnrestToImprisonedHandler';
import { RandomArmyEquipmentHandler } from './handlers/RandomArmyEquipmentHandler';
import { BuildKnowledgeStructureHandler } from './handlers/BuildKnowledgeStructureHandler';
import { AddImprisonedHandler } from './handlers/AddImprisonedHandler';

/**
 * Registry manages all game command handlers
 */
export class GameCommandHandlerRegistry {
  private handlers: GameCommandHandler[] = [
    new GiveActorGoldHandler(),
    new RecruitArmyHandler(),
    new FoundSettlementHandler(),
    new AdjustFactionHandler(),
    new OutfitArmyHandler(),
    new RequestMilitaryAidHandler(),
    new DestroyWorksiteHandler(),
    new SpendPlayerActionHandler(),
    new DamageStructureHandler(),
    new DestroyStructureHandler(),
    new ReleaseImprisonedHandler(),
    new RemoveBorderHexesHandler(),
    new ReduceImprisonedHandler(),
    new DeployArmyHandler(),
    new ReduceSettlementLevelHandler(),
    new IncreaseSettlementLevelHandler(),
    new SeizeHexesHandler(),
    new SpawnEnemyArmyHandler(),
    new TransferSettlementHandler(),
    new DefectArmiesHandler(),
    new ConvertUnrestToImprisonedHandler(),
    new RandomArmyEquipmentHandler(),
    new BuildKnowledgeStructureHandler(),
    new AddImprisonedHandler()
  ];
  
  /**
   * Process a game command through registered handlers
   * 
   * @param command - Game command from action outcome
   * @param ctx - Context with kingdom data, outcome, metadata
   * @returns PreparedCommand with preview and commit, or null to skip
   */
  async process(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    // Find handler that can handle this command type
    const handler = this.handlers.find(h => h.canHandle(command));
    
    if (!handler) {
      console.warn(`[GameCommandHandlerRegistry] No handler found for command type: ${command.type}`);
      return null;
    }
    
    try {
      console.log(`[GameCommandHandlerRegistry] Processing command: ${command.type}`);
      const result = await handler.prepare(command, ctx);
      
      if (result) {
        console.log(`[GameCommandHandlerRegistry] Command prepared successfully: ${command.type}`);
      } else {
        console.log(`[GameCommandHandlerRegistry] Command returned null (user cancelled or no-op): ${command.type}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[GameCommandHandlerRegistry] Handler failed for ${command.type}:`, error);
      throw error;
    }
  }
  
  /**
   * Register a custom handler (for plugins/extensions)
   */
  registerHandler(handler: GameCommandHandler): void {
    this.handlers.push(handler);
    console.log(`[GameCommandHandlerRegistry] Registered custom handler`);
  }
  
  /**
   * Execute a game command immediately (process + commit)
   * 
   * Use this method when commands should execute automatically without
   * user preview/confirmation. Typically used by:
   * - UnifiedCheckHandler for `pipeline.outcomes.gameCommands`
   * - Any automatic outcome effect
   * 
   * For interactive commands that need user preview/selection,
   * use process() instead and call commit() after user confirms.
   * 
   * @param command - Game command from action outcome
   * @param ctx - Context with kingdom data, outcome, metadata
   * @returns Result with success status
   */
  async executeCommand(command: any, ctx: GameCommandContext): Promise<GameCommandResult> {
    try {
      const prepared = await this.process(command, ctx);
      
      if (!prepared) {
        // Handler returned null - command was skipped (user cancelled or no-op)
        return { success: true, skipped: true };
      }
      
      // Execute the commit function
      await prepared.commit();
      
      console.log(`[GameCommandHandlerRegistry] Command executed successfully: ${command.type}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GameCommandHandlerRegistry] Command execution failed: ${command.type}`, error);
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Get list of all registered command types
   */
  getSupportedCommands(): string[] {
    const commands = new Set<string>();
    
    // Test each handler with sample commands to discover supported types
    // This is a simple heuristic - handlers could expose this metadata directly
    const knownTypes = [
      'giveActorGold',
      'recruitArmy',
      'foundSettlement',
      'adjustFactionAttitude',
      'requestMilitaryAidFactionAttitude',
      'outfitArmy',
      'requestMilitaryAidRecruitment',
      'requestMilitaryAidEquipment'
    ];
    
    for (const type of knownTypes) {
      const handler = this.handlers.find(h => h.canHandle({ type }));
      if (handler) {
        commands.add(type);
      }
    }
    
    return Array.from(commands);
  }
}

// Singleton instance
let registryInstance: GameCommandHandlerRegistry | null = null;

/**
 * Get the singleton registry instance
 */
export function getGameCommandRegistry(): GameCommandHandlerRegistry {
  if (!registryInstance) {
    registryInstance = new GameCommandHandlerRegistry();
    console.log(`[GameCommandHandlerRegistry] Registry initialized with 22 handlers`);
  }
  return registryInstance;
}

/**
 * Create a new registry instance (for testing)
 */
export function createGameCommandRegistry(): GameCommandHandlerRegistry {
  return new GameCommandHandlerRegistry();
}
