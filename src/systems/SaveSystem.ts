import { compress, decompress } from 'lz-string';
import { useState, useEffect } from 'react';
import { SecureStorage, InputValidator, SecurityLogger } from '../utils/security';

interface SaveData {
  version: string;
  timestamp: number;
  player: {
    name: string;
    level: number;
    experience: number;
    resources: Record<string, number>;
    achievements: string[];
    missions: {
      completed: string[];
      active: {
        id: string;
        progress: number;
        timeStarted: number;
      }[];
    };
    research: {
      unlocked: string[];
      inProgress: {
        id: string;
        progress: number;
        timeStarted: number;
      }[];
    };
    territories: {
      controlled: string[];
      discovered: string[];
    };
    stats: Record<string, number>;
    settings: {
      graphics: {
        quality: 'low' | 'medium' | 'high';
        effects: boolean;
        particles: boolean;
      };
      sound: {
        master: number;
        music: number;
        sfx: number;
        ambient: number;
        ui: number;
      };
      gameplay: {
        tutorialCompleted: boolean;
        autoSave: boolean;
        confirmations: boolean;
      };
    };
  };
  gameState: {
    territories: Record<string, {
      owner: string | null;
      resources: {
        type: string;
        amount: number;
      }[];
      lastHarvest: number;
    }>;
    globalEvents: {
      active: {
        id: string;
        type: string;
        startTime: number;
        duration: number;
        effects: Record<string, number>;
      }[];
      completed: string[];
    };
    leaderboard: {
      territories: { name: string; count: number }[];
      resources: { name: string; total: number }[];
      achievements: { name: string; count: number }[];
    };
  };
}

class SaveSystem {
  private readonly SAVE_KEY = 'honey_comb_game_save';
  private readonly VERSION = '1.0.0';
  private autoSaveInterval: number | null = null;
  private lastSave: SaveData | null = null;

  constructor() {
    this.initAutoSave();
  }

  private initAutoSave() {
    if (this.autoSaveInterval) {
      window.clearInterval(this.autoSaveInterval);
    }

    const settings = this.loadSettings();
    if (settings?.gameplay.autoSave) {
      this.autoSaveInterval = window.setInterval(() => {
        this.save();
      }, 5 * 60 * 1000); // Auto-save every 5 minutes
    }
  }

  async save(data?: Partial<SaveData>): Promise<boolean> {
    try {
      const currentSave = this.load();
      const newSave: SaveData = {
        version: this.VERSION,
        timestamp: Date.now(),
        player: {
          ...currentSave?.player,
          ...data?.player
        },
        gameState: {
          ...currentSave?.gameState,
          ...data?.gameState
        }
      } as SaveData;

      // Compress the save data
      const compressed = compress(JSON.stringify(newSave));
      SecureStorage.setItem(this.SAVE_KEY, compressed);

      this.lastSave = newSave;
      SecurityLogger.logEvent('Game saved', { timestamp: Date.now() }, 'low');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      SecurityLogger.logEvent('Save failed', { error: errorMessage }, 'medium');
      console.error('Failed to save game:', error);
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const compressed = SecureStorage.getItem<string>(this.SAVE_KEY);
      if (!compressed) return null;

      const decompressed = decompress(compressed);
      if (!decompressed) return null;

      const data = JSON.parse(decompressed) as SaveData;
      
      // Version check and migration if needed
      if (data.version !== this.VERSION) {
        return this.migrateSave(data);
      }

      this.lastSave = data;
      return data;
    } catch (error) {
      console.error('Failed to load save:', error);
      return null;
    }
  }

  private migrateSave(oldSave: SaveData): SaveData {
    // Implement version migration logic here
    // This is just a basic example
    const newSave: SaveData = {
      ...oldSave,
      version: this.VERSION,
      // Add any new fields with default values
      player: {
        ...oldSave.player,
        settings: {
          ...oldSave.player.settings,
          gameplay: {
            ...oldSave.player.settings.gameplay,
            confirmations: true // New field in version 1.0.0
          }
        }
      }
    };

    // Save the migrated data
    this.save(newSave);
    return newSave;
  }

  loadSettings() {
    const save = this.load();
    return save?.player.settings;
  }

  async saveSettings(settings: SaveData['player']['settings']): Promise<boolean> {
    const currentSave = this.load();
    if (!currentSave) return false;

    const success = await this.save({
      player: {
        ...currentSave.player,
        settings
      }
    });

    if (success) {
      this.initAutoSave(); // Reinitialize auto-save with new settings
    }

    return success;
  }

  exportSave(): string {
    const save = this.load();
    if (!save) return '';
    return btoa(JSON.stringify(save));
  }

  async importSave(saveString: string): Promise<boolean> {
    try {
      const save = JSON.parse(atob(saveString)) as SaveData;
      return await this.save(save);
    } catch (error) {
      console.error('Failed to import save:', error);
      return false;
    }
  }

  deleteSave(): boolean {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      this.lastSave = null;
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  hasSave(): boolean {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  }

  getLastSaveTime(): number | null {
    return this.lastSave?.timestamp || null;
  }

  cleanup() {
    if (this.autoSaveInterval) {
      window.clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

export const saveSystem = new SaveSystem();

// React hooks for save system
export const useSaveSystem = () => {
  const [lastSaveTime, setLastSaveTime] = useState(saveSystem.getLastSaveTime());

  useEffect(() => {
    const interval = setInterval(() => {
      const newLastSaveTime = saveSystem.getLastSaveTime();
      if (newLastSaveTime !== lastSaveTime) {
        setLastSaveTime(newLastSaveTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSaveTime]);

  return {
    save: saveSystem.save.bind(saveSystem),
    load: saveSystem.load.bind(saveSystem),
    exportSave: saveSystem.exportSave.bind(saveSystem),
    importSave: saveSystem.importSave.bind(saveSystem),
    deleteSave: saveSystem.deleteSave.bind(saveSystem),
    hasSave: saveSystem.hasSave.bind(saveSystem),
    lastSaveTime
  };
};