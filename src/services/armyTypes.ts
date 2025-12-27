/**
 * Army Types Service
 * Manages customizable army types stored as a module-level setting
 */

import type { ArmyTypeConfig, ArmyTypesConfig } from '../types/armyTypes';
import { DEFAULT_ARMY_TYPES_BASE } from '../types/armyTypes';
import { logger } from '../utils/Logger';

// Import default army token images
import cavalryImg from '../img/army_tokens/army-calvary.webp';
import engineersImg from '../img/army_tokens/army-engineers.webp';
import infantryImg from '../img/army_tokens/army-infantry.webp';
import koboldImg from '../img/army_tokens/army-kobold.webp';
import wolvesImg from '../img/army_tokens/army-wolves.webp';

/** Default token images mapped by army type key */
const DEFAULT_TOKEN_IMAGES: Record<string, string> = {
  cavalry: cavalryImg,
  engineers: engineersImg,
  infantry: infantryImg,
  kobold: koboldImg,
  wolves: wolvesImg
};

/** Default portrait images mapped by army type key (same as token for now) */
const DEFAULT_PORTRAIT_IMAGES: Record<string, string> = {
  cavalry: cavalryImg,
  engineers: engineersImg,
  infantry: infantryImg,
  kobold: koboldImg,
  wolves: wolvesImg
};

/** Module ID for settings */
const MODULE_ID = 'pf2e-reignmaker';
const SETTING_KEY = 'armyTypes';

/**
 * Service for managing army type configurations
 * Provides CRUD operations and caching for army types
 */
class ArmyTypesService {
  private static instance: ArmyTypesService;
  private cache: ArmyTypesConfig | null = null;

  private constructor() {}

  static getInstance(): ArmyTypesService {
    if (!ArmyTypesService.instance) {
      ArmyTypesService.instance = new ArmyTypesService();
    }
    return ArmyTypesService.instance;
  }

  /**
   * Get all army types from settings
   * Initializes with defaults if not set
   */
  async getArmyTypes(): Promise<ArmyTypesConfig> {
    // Return cache if available
    if (this.cache) {
      return this.cache;
    }

    const game = (globalThis as any).game;

    try {
      let types = game.settings.get(MODULE_ID, SETTING_KEY) as ArmyTypesConfig | null;

      if (!types || Object.keys(types).length === 0) {
        // Initialize with defaults
        logger.info('[ArmyTypesService] Initializing default army types');
        types = this.getDefaultTypes();
        await this.saveArmyTypes(types);
      }

      this.cache = types;
      return types;
    } catch (error) {
      logger.error('[ArmyTypesService] Failed to get army types:', error);
      // Return defaults if settings fail
      return this.getDefaultTypes();
    }
  }

  /**
   * Get army types synchronously from cache
   * Returns defaults if cache not populated
   */
  getArmyTypesSync(): ArmyTypesConfig {
    if (this.cache) {
      return this.cache;
    }
    return this.getDefaultTypes();
  }

  /**
   * Get default types with bundled images
   */
  getDefaultTypes(): ArmyTypesConfig {
    const types: ArmyTypesConfig = {};
    for (const config of DEFAULT_ARMY_TYPES_BASE) {
      types[config.key] = {
        ...config,
        portraitImage: DEFAULT_PORTRAIT_IMAGES[config.key] || '',
        tokenImage: DEFAULT_TOKEN_IMAGES[config.key] || ''
      };
    }
    return types;
  }

  /**
   * Save army types to settings
   */
  async saveArmyTypes(types: ArmyTypesConfig): Promise<void> {
    const game = (globalThis as any).game;

    try {
      await game.settings.set(MODULE_ID, SETTING_KEY, types);
      this.cache = types;
      logger.info('[ArmyTypesService] Army types saved');
    } catch (error) {
      logger.error('[ArmyTypesService] Failed to save army types:', error);
      throw error;
    }
  }

  /**
   * Get army types enabled for player recruitment
   */
  async getPlayerArmyTypes(): Promise<ArmyTypesConfig> {
    const all = await this.getArmyTypes();
    return Object.fromEntries(
      Object.entries(all).filter(([_, config]) => config.enabledForPlayers)
    );
  }

  /**
   * Add or update an army type
   */
  async upsertArmyType(config: ArmyTypeConfig): Promise<void> {
    const types = await this.getArmyTypes();
    types[config.key] = config;
    await this.saveArmyTypes(types);
  }

  /**
   * Remove an army type
   */
  async removeArmyType(key: string): Promise<void> {
    const types = await this.getArmyTypes();
    delete types[key];
    await this.saveArmyTypes(types);
  }

  /**
   * Check if a type key exists
   */
  async typeExists(key: string): Promise<boolean> {
    const types = await this.getArmyTypes();
    return key in types;
  }

  /**
   * Get type config by key (returns undefined if not found)
   */
  async getType(key: string): Promise<ArmyTypeConfig | undefined> {
    const types = await this.getArmyTypes();
    return types[key];
  }

  /**
   * Reset to default army types
   */
  async resetToDefaults(): Promise<void> {
    logger.info('[ArmyTypesService] Resetting to default army types');
    await this.saveArmyTypes(this.getDefaultTypes());
  }

  /**
   * Invalidate the cache (call when types are updated externally)
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Pre-populate the cache (call on module ready)
   */
  async initializeCache(): Promise<void> {
    await this.getArmyTypes();
    logger.info('[ArmyTypesService] Cache initialized');
  }
}

export const armyTypesService = ArmyTypesService.getInstance();
