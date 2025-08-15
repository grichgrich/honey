import { useEffect } from 'react';

interface GameEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface GameMetrics {
  resourcesGained: Record<string, number>;
  resourcesSpent: Record<string, number>;
  territoriesClaimed: number;
  missionsCompleted: number;
  combatsWon: number;
  combatsLost: number;
  timeSpent: number;
  sessionCount: number;
  lastSession: number;
}

interface PlayerProfile {
  id: string;
  created: number;
  lastActive: number;
  playstyle: {
    combatFocus: number;
    explorationFocus: number;
    resourceFocus: number;
    socialFocus: number;
  };
  preferences: {
    favoriteResources: string[];
    favoriteActions: string[];
    playTimes: number[];
    sessionDurations: number[];
  };
}

class AnalyticsSystem {
  private events: GameEvent[] = [];
  private metrics: GameMetrics = {
    resourcesGained: {},
    resourcesSpent: {},
    territoriesClaimed: 0,
    missionsCompleted: 0,
    combatsWon: 0,
    combatsLost: 0,
    timeSpent: 0,
    sessionCount: 0,
    lastSession: 0
  };
  private profile: PlayerProfile | null = null;
  private sessionStartTime: number = 0;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private flushInterval: number | null = null;

  constructor() {
    this.loadStoredData();
    this.startSession();
  }

  private loadStoredData() {
    try {
      const storedMetrics = localStorage.getItem('game_metrics');
      if (storedMetrics) {
        this.metrics = JSON.parse(storedMetrics);
      }

      const storedProfile = localStorage.getItem('player_profile');
      if (storedProfile) {
        this.profile = JSON.parse(storedProfile);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  }

  private saveData() {
    try {
      localStorage.setItem('game_metrics', JSON.stringify(this.metrics));
      if (this.profile) {
        localStorage.setItem('player_profile', JSON.stringify(this.profile));
      }
    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  startSession() {
    this.sessionStartTime = Date.now();
    this.metrics.sessionCount++;
    this.metrics.lastSession = this.sessionStartTime;

    // Start periodic flushing
    if (this.flushInterval) {
      window.clearInterval(this.flushInterval);
    }
    this.flushInterval = window.setInterval(() => this.flush(), this.FLUSH_INTERVAL);

    this.trackEvent('session', 'start');
  }

  endSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.metrics.timeSpent += sessionDuration;

    if (this.profile) {
      this.profile.lastActive = Date.now();
      this.profile.preferences.sessionDurations.push(sessionDuration);
      // Keep only last 100 session durations
      if (this.profile.preferences.sessionDurations.length > 100) {
        this.profile.preferences.sessionDurations.shift();
      }
    }

    if (this.flushInterval) {
      window.clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.trackEvent('session', 'end', undefined, sessionDuration);
    this.flush();
  }

  createProfile(id: string) {
    this.profile = {
      id,
      created: Date.now(),
      lastActive: Date.now(),
      playstyle: {
        combatFocus: 0,
        explorationFocus: 0,
        resourceFocus: 0,
        socialFocus: 0
      },
      preferences: {
        favoriteResources: [],
        favoriteActions: [],
        playTimes: [],
        sessionDurations: []
      }
    };
    this.saveData();
  }

  trackEvent(category: string, action: string, label?: string, value?: number, metadata?: Record<string, any>) {
    const event: GameEvent = {
      category,
      action,
      label,
      value,
      metadata,
      timestamp: Date.now()
    };

    this.events.push(event);

    // Update playstyle metrics
    if (this.profile) {
      switch (category) {
        case 'combat':
          this.profile.playstyle.combatFocus += 0.1;
          break;
        case 'exploration':
          this.profile.playstyle.explorationFocus += 0.1;
          break;
        case 'resource':
          this.profile.playstyle.resourceFocus += 0.1;
          break;
        case 'social':
          this.profile.playstyle.socialFocus += 0.1;
          break;
      }

      // Normalize playstyle values
      const total = Object.values(this.profile.playstyle).reduce((a, b) => a + b, 0);
      if (total > 0) {
        for (const key in this.profile.playstyle) {
          this.profile.playstyle[key as keyof typeof this.profile.playstyle] /= total;
        }
      }
    }

    // Auto-flush if batch size reached
    if (this.events.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  trackResource(type: string, amount: number, action: 'gain' | 'spend') {
    if (action === 'gain') {
      this.metrics.resourcesGained[type] = (this.metrics.resourcesGained[type] || 0) + amount;
    } else {
      this.metrics.resourcesSpent[type] = (this.metrics.resourcesSpent[type] || 0) + amount;
    }

    if (this.profile) {
      // Update favorite resources
      const resourceIndex = this.profile.preferences.favoriteResources.indexOf(type);
      if (resourceIndex === -1) {
        this.profile.preferences.favoriteResources.push(type);
      } else {
        // Move to end (most recent)
        this.profile.preferences.favoriteResources.splice(resourceIndex, 1);
        this.profile.preferences.favoriteResources.push(type);
      }
      // Keep only top 5
      if (this.profile.preferences.favoriteResources.length > 5) {
        this.profile.preferences.favoriteResources.shift();
      }
    }

    this.trackEvent('resource', action, type, amount);
  }

  trackAction(action: string) {
    if (this.profile) {
      const actionIndex = this.profile.preferences.favoriteActions.indexOf(action);
      if (actionIndex === -1) {
        this.profile.preferences.favoriteActions.push(action);
      } else {
        // Move to end (most recent)
        this.profile.preferences.favoriteActions.splice(actionIndex, 1);
        this.profile.preferences.favoriteActions.push(action);
      }
      // Keep only top 5
      if (this.profile.preferences.favoriteActions.length > 5) {
        this.profile.preferences.favoriteActions.shift();
      }
    }

    this.trackEvent('action', action);
  }

  trackTerritoryClaim() {
    this.metrics.territoriesClaimed++;
    this.trackEvent('territory', 'claim');
  }

  trackMissionComplete() {
    this.metrics.missionsCompleted++;
    this.trackEvent('mission', 'complete');
  }

  trackCombat(won: boolean) {
    if (won) {
      this.metrics.combatsWon++;
    } else {
      this.metrics.combatsLost++;
    }
    this.trackEvent('combat', won ? 'victory' : 'defeat');
  }

  getPlaystyleAnalysis(): Record<string, number> {
    if (!this.profile) return {};
    return this.profile.playstyle;
  }

  getPlayerPreferences(): Record<string, any> {
    if (!this.profile) return {};
    return this.profile.preferences;
  }

  getMetrics(): GameMetrics {
    return { ...this.metrics };
  }

  private async flush() {
    if (this.events.length === 0) return;

    try {
      // In a real game, send to analytics server
      console.log('Flushing analytics events:', this.events);
      
      // Clear events after successful send
      this.events = [];
      
      // Save updated metrics and profile
      this.saveData();
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
    }
  }

  cleanup() {
    this.endSession();
    if (this.flushInterval) {
      window.clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

export const analytics = new AnalyticsSystem();

// React hooks

export const useAnalytics = () => {
  useEffect(() => {
    analytics.startSession();
    return () => analytics.endSession();
  }, []);

  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackResource: analytics.trackResource.bind(analytics),
    trackAction: analytics.trackAction.bind(analytics),
    trackTerritoryClaim: analytics.trackTerritoryClaim.bind(analytics),
    trackMissionComplete: analytics.trackMissionComplete.bind(analytics),
    trackCombat: analytics.trackCombat.bind(analytics),
    getPlaystyleAnalysis: analytics.getPlaystyleAnalysis.bind(analytics),
    getPlayerPreferences: analytics.getPlayerPreferences.bind(analytics),
    getMetrics: analytics.getMetrics.bind(analytics)
  };
};