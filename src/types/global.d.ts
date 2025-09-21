// Global type definitions for PF2e Kingdom Lite

declare global {
  interface Window {
    Hooks: typeof Hooks;
    game: Game;
    CONFIG: any;
    ui: any;
  }
  
  const Hooks: {
    once(hook: string, callback: Function): void;
    on(hook: string, callback: Function): void;
    off(hook: string, callback: Function): void;
    callAll(hook: string, ...args: any[]): void;
    call(hook: string, ...args: any[]): boolean;
  };
  
  interface Game {
    settings: ClientSettings;
    user: User;
    users: Users;
    modules: Map<string, Module>;
    system: System;
    i18n: Localization;
    scenes: Scenes;
    [key: string]: any;
  }
  
  interface Scenes {
    contents: Scene[];
    current: Scene | null;
    get(id: string): Scene | null;
  }
  
  interface Scene {
    id: string;
    name: string;
    [key: string]: any;
  }
  
  interface ClientSettings {
    register(module: string, key: string, data: any): void;
    get(module: string | "core", key: string): any;
    set(module: string | "core", key: string, value: any): Promise<any>;
  }
  
  interface User {
    id: string;
    name: string;
    isGM: boolean;
  }
  
  interface Users {
    current: User;
  }
  
  interface Module {
    id: string;
    active: boolean;
    [key: string]: any;
  }
  
  interface System {
    id: string;
    version: string;
    [key: string]: any;
  }
  
  interface Localization {
    localize(key: string): string;
    format(key: string, data: any): string;
  }
}

export {};
