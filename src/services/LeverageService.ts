interface LeverageMetrics {
  analysisTime: number;
  baseMultiplier: number;
  levelBonus: number;
  factionBonus: number;
  territoryBonus: number;
  missionBonus: number;
}

interface LeverageAnalysis {
  overallMultiplier: number;
  recommendations?: string[];
  opportunities?: string[];
  synergies?: string[];
  metrics?: LeverageMetrics;
}

export class LeverageService {
  private ws: WebSocket | null = null;
  private messageQueue: any[] = [];
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private useMockService: boolean = false;
  private pendingRequests: Map<string, { resolve: Function, timer: NodeJS.Timeout }> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds
  private readonly HEALTH_CHECK_THRESHOLD = 5000; // 5 seconds

  constructor() {
    this.checkServerHealth();
  }

  private async checkServerHealth() {
    const now = Date.now();
    // Skip health check if we've checked recently
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_THRESHOLD) {
      return;
    }

    try {
      const response = await fetch('http://localhost:8001/health');
      if (response.ok) {
        const wasHealthy = !this.useMockService;
        this.lastHealthCheck = now;
        
        if (!wasHealthy) {
          console.log('[LeverageService] Python server is now available');
          this.useMockService = false;
          this.connect();
        }

        // Start periodic health checks if not already running
        if (!this.healthCheckInterval) {
          this.healthCheckInterval = setInterval(() => this.checkServerHealth(), this.HEALTH_CHECK_INTERVAL);
        }
      } else {
        this.handleServerUnavailable();
      }
    } catch (error) {
      this.handleServerUnavailable();
    }
  }

  private handleServerUnavailable() {
    if (!this.useMockService) {
      console.log('[LeverageService] Python server unavailable, using mock service');
      this.useMockService = true;
      // Resolve any pending requests with mock data
      this.pendingRequests.forEach((request, requestId) => {
        clearTimeout(request.timer);
        request.resolve(this.getMockAnalysis());
      });
      this.pendingRequests.clear();
    }
  }

  private async connect() {
    if (this.isConnecting || this.useMockService) return;

    this.isConnecting = true;

    try {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.ws = new WebSocket(`ws://${window.location.host}/ws`);
        
        this.ws.onopen = () => {
          console.log('[LeverageService] WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.processQueue();
        };

        this.ws.onclose = () => {
          console.log('[LeverageService] WebSocket closed');
          this.ws = null;
          if (!this.useMockService) {
            this.reconnectWithBackoff();
          }
        };

        this.ws.onerror = (error) => {
          console.warn('[LeverageService] WebSocket error:', error);
          this.ws = null;
          if (!this.useMockService) {
            this.reconnectWithBackoff();
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'analysis_result' && data.requestId) {
              const request = this.pendingRequests.get(data.requestId);
              if (request) {
                clearTimeout(request.timer);
                this.pendingRequests.delete(data.requestId);
                console.debug('[LeverageService] Received analysis:', {
                  requestId: data.requestId,
                  multiplier: data.payload.overallMultiplier,
                  recommendations: data.payload.recommendations?.length || 0,
                  synergies: data.payload.synergies?.length || 0,
                  opportunities: data.payload.opportunities?.length || 0,
                  analysisTime: data.payload.metrics?.analysisTime.toFixed(3) + 's'
                });
                request.resolve(data.payload);
              }
            } else if (data.type === 'error') {
              console.error('[LeverageService] Server error:', data.error);
              const request = this.pendingRequests.get(data.requestId);
              if (request) {
                clearTimeout(request.timer);
                this.pendingRequests.delete(data.requestId);
                request.resolve(this.getMockAnalysis());
              }
            }
          } catch (error) {
            console.warn('[LeverageService] Error processing message:', error);
          }
        };
      }
    } catch (error) {
      console.warn('[LeverageService] Connection error:', error);
      this.isConnecting = false;
      this.ws = null;
      this.handleServerUnavailable();
    }
  }

  private reconnectWithBackoff() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[LeverageService] Max reconnection attempts reached, using mock service');
      this.handleServerUnavailable();
      return;
    }

    const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.isConnecting = false;

    console.debug(`[LeverageService] Reconnecting in ${backoffTime}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => {
      if (!this.useMockService) {
        this.connect();
      }
    }, backoffTime);
  }

  private processQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.useMockService) return;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(message));
        console.debug('[LeverageService] Sent message:', {
          requestId: message.requestId,
          type: message.type,
          context: {
            hasPlayer: !!message.payload?.player,
            factionsCount: message.payload?.factions?.length || 0,
            territoriesCount: message.payload?.territories?.length || 0,
            missionsCount: message.payload?.missions?.length || 0
          }
        });
      } catch (error) {
        console.warn('[LeverageService] Error sending message:', error);
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  // Simple helper used by combat/traits to get a leverage-based multiplier
  async calculateTraitEvolution(character: any, traitType: any): Promise<number> {
    try {
      const analysis = await this.analyzeGameState({ player: character, leverageAnalysis: {} });
      const mult = analysis?.overallMultiplier ?? 1;
      return Math.max(1, Math.min(mult, 2));
    } catch {
      return 1;
    }
  }

  private getMockAnalysis(context: any = {}): LeverageAnalysis {
    const baseMultiplier = 1.2;
    const characterLevel = context?.player?.level || 1;
    const territoryCount = context?.territories?.length || 0;
    const factionCount = context?.factions?.length || 0;

    // Calculate dynamic multiplier based on context
    const levelBonus = (characterLevel - 1) * 0.1;
    const territoryBonus = territoryCount * 0.05;
    const factionBonus = factionCount * 0.03;
    const missionBonus = 0.02;

    const dynamicMultiplier = baseMultiplier + levelBonus + territoryBonus + factionBonus;

    const result: LeverageAnalysis = {
      overallMultiplier: Math.min(Math.max(dynamicMultiplier, 1.0), 2.0),
      recommendations: [
        "Focus on resource gathering",
        "Consider forming alliances",
        "Upgrade defensive structures"
      ],
      opportunities: [
        "Resource-rich territory nearby",
        "Potential trade routes available"
      ],
      synergies: [
        "Strength + Combat = Bonus Damage",
        "Wisdom + Gathering = Extra Resources"
      ],
      metrics: {
        analysisTime: 0.001,
        baseMultiplier,
        levelBonus,
        factionBonus,
        territoryBonus,
        missionBonus
      }
    };

    console.debug('[LeverageService] Using mock analysis:', result);
    return result;
  }

  async analyzeGameState(context: any = {}): Promise<LeverageAnalysis> {
    // If using mock service or WebSocket is not available, use mock service
    if (this.useMockService || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return this.getMockAnalysis(context);
    }

    return new Promise((resolve) => {
      const requestId = Math.random().toString(36).substring(2, 15);
      const message = {
        type: 'analyze_game_state',
        requestId,
        payload: {
          player: context.player || {},
          factions: context.factions || [],
          territories: context.territories || [],
          missions: context.missions || [],
          leverageAnalysis: context.leverageAnalysis
        }
      };

      // Set up timeout handler
      const timer = setTimeout(() => {
        console.warn('[LeverageService] Analysis request timed out:', requestId);
        this.pendingRequests.delete(requestId);
        resolve(this.getMockAnalysis(context));
      }, 2000);

      // Store the pending request
      this.pendingRequests.set(requestId, { resolve, timer });

      // Send the request
      this.messageQueue.push(message);
      this.processQueue();
    });
  }

  // Missing methods for MissionGenerator and other services
  async getOptimalMissionPath(character: any): Promise<any[]> {
    // Calculate optimal mission path based on character level and traits
    const missions = [];
    const baseLevel = character.level || 1;
    
    // Generate missions based on character capabilities
    for (let i = 0; i < 3; i++) {
      missions.push({
        id: `mission-${baseLevel}-${i}`,
        type: 'gather',
        requiredLevel: baseLevel + i,
        title: `Level ${baseLevel + i} Mission`,
        description: `A mission suitable for level ${baseLevel + i} characters`,
        rewards: {
          xp: (baseLevel + i) * 50,
          resources: [{ type: 'gold', amount: (baseLevel + i) * 10 }]
        }
      });
    }
    
    return missions;
  }

  async analyzeMissionCompletion(mission: any, character: any): Promise<any> {
    // Analyze mission completion and calculate leverage effects
    const baseValue = mission.rewards?.xp || 100;
    const characterBonus = character.level * 0.1;
    
    return {
      baseValue,
      characterBonus,
      exponentialValue: baseValue * (1 + characterBonus),
      leverageMultiplier: 1 + characterBonus
    };
  }

  // Clean up when the service is no longer needed
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timer);
    });
    this.pendingRequests.clear();
  }
}