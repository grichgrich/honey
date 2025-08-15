import { FactionType, Territory, Character } from '../types/game';
import { LeverageService } from './LeverageService';
import { TerritoryManager } from './TerritoryManager';
import { MissionGenerator } from './MissionGenerator';
import * as THREE from 'three';

interface FactionState {
  influence: number;
  territories: string[];
  activeMembers: number;
  resources: Map<string, number>;
  alliances: FactionType[];
  rivals: FactionType[];
}

interface StrategicAction {
  type: 'expand' | 'defend' | 'alliance' | 'trade';
  targetTerritory?: string;
  targetFaction?: FactionType;
  priority: number;
  estimatedValue: number;
}

export class FactionDynamics {
  private factionStates: Map<FactionType, FactionState>;
  private leverageService: LeverageService;
  private territoryManager: TerritoryManager;
  private missionGenerator: MissionGenerator;
  private lastUpdate: number;
  private updateInterval: number;

  constructor(
    leverageService: LeverageService,
    territoryManager: TerritoryManager,
    missionGenerator: MissionGenerator
  ) {
    this.leverageService = leverageService;
    this.territoryManager = territoryManager;
    this.missionGenerator = missionGenerator;
    this.factionStates = new Map();
    this.lastUpdate = Date.now();
    this.updateInterval = 300000; // 5 minutes

    // Initialize faction states
    Object.values(FactionType).forEach(faction => {
      this.factionStates.set(faction, {
        influence: 1000,
        territories: [],
        activeMembers: 0,
        resources: new Map(),
        alliances: [],
        rivals: []
      });
    });
  }

  async updateFactionDynamics(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;

    for (const [faction, state] of this.factionStates) {
      // Get strategic territories for the faction
      const strategicTerritories = await this.territoryManager.getFactionStrategicPositions(faction);

      // Analyze faction's position using leverage system
      const analysis = await this.leverageService.analyzeGameState();

      // Generate strategic actions
      const actions = await this.generateStrategicActions(faction, strategicTerritories, analysis);

      // Execute highest priority actions
      await this.executeStrategicActions(faction, actions);

      // Update faction relationships
      await this.updateFactionRelationships(faction);

      // Apply dynamic resource generation
      this.generateResources(faction, state);
    }

    this.lastUpdate = now;
  }

  private async generateStrategicActions(
    faction: FactionType,
    territories: Territory[],
    analysis: any
  ): Promise<StrategicAction[]> {
    const actions: StrategicAction[] = [];
    const state = this.factionStates.get(faction)!;

    // Territory expansion actions
    for (const territory of territories) {
      if (!territory.controlledBy) {
        // Unclaimed territory
        actions.push({
          type: 'expand',
          targetTerritory: territory.id,
          priority: this.calculateExpansionPriority(territory),
          estimatedValue: this.calculateTerritoryValue(territory)
        });
      } else if (territory.controlledBy === faction && territory.contestedBy.length > 0) {
        // Defensive actions
        actions.push({
          type: 'defend',
          targetTerritory: territory.id,
          priority: this.calculateDefensePriority(territory),
          estimatedValue: this.calculateTerritoryValue(territory) * 1.5
        });
      }
    }

    // Alliance actions
    for (const otherFaction of Object.values(FactionType)) {
      if (otherFaction !== faction && !state.alliances.includes(otherFaction)) {
        const allianceValue = this.calculateAllianceValue(faction, otherFaction);
        if (allianceValue > 0) {
          actions.push({
            type: 'alliance',
            targetFaction: otherFaction,
            priority: this.calculateAlliancePriority(otherFaction),
            estimatedValue: allianceValue
          });
        }
      }
    }

    // Trade actions
    for (const ally of state.alliances) {
      const tradeValue = this.calculateTradeValue(faction, ally);
      if (tradeValue > 0) {
        actions.push({
          type: 'trade',
          targetFaction: ally,
          priority: this.calculateTradePriority(ally),
          estimatedValue: tradeValue
        });
      }
    }

    // Sort by priority and estimated value
    return actions.sort((a, b) => 
      (b.priority * b.estimatedValue) - (a.priority * a.estimatedValue)
    );
  }

  private calculateExpansionPriority(territory: Territory): number {
    let priority = 1.0;

    // Strategic position value
    const distanceFromCenter = new THREE.Vector3(
      territory.position.x,
      territory.position.y,
      territory.position.z
    ).length();
    priority *= 1 + (1 / (1 + distanceFromCenter));

    // Resource value
    priority *= 1 + (territory.position.y * 0.1);

    // Contestation factor
    if (territory.contestedBy.length > 0) {
      priority *= 1.5;
    }

    return priority;
  }

  private calculateDefensePriority(territory: Territory): number {
    let priority = 1.5; // Base priority for defense is higher

    // Number of contesting factions
    priority *= (1 + territory.contestedBy.length * 0.5);

    // Strategic value
    const strategicValue = this.calculateTerritoryValue(territory);
    priority *= strategicValue;

    return priority;
  }

  private calculateTerritoryValue(territory: Territory): number {
    let value = 1.0;

    // Position value
    const distanceFromCenter = new THREE.Vector3(
      territory.position.x,
      territory.position.y,
      territory.position.z
    ).length();
    value *= 1 + (1 / (1 + distanceFromCenter));

    // Resource value
    value *= 1 + (territory.position.y * 0.1);

    // Control value
    if (territory.controlledBy) {
      value *= 1.2;
    }

    // Contestation value
    value *= 1 + (territory.contestedBy.length * 0.3);

    return value;
  }

  private calculateAllianceValue(
    faction: FactionType,
    potentialAlly: FactionType
  ): number {
    const factionState = this.factionStates.get(faction)!;
    const allyState = this.factionStates.get(potentialAlly)!;

    let value = 1.0;

    // Territory synergy
    const territoryOverlap = this.calculateTerritoryOverlap(
      factionState.territories,
      allyState.territories
    );
    value *= 1 - territoryOverlap; // Less overlap is better

    // Resource complementarity
    const resourceSynergy = this.calculateResourceSynergy(
      factionState.resources,
      allyState.resources
    );
    value *= 1 + resourceSynergy;

    // Common rivals bonus
    const commonRivals = factionState.rivals.filter(rival => 
      allyState.rivals.includes(rival)
    ).length;
    value *= 1 + (commonRivals * 0.2);

    return value;
  }

  private calculateAlliancePriority(targetFaction: FactionType): number {
    const targetState = this.factionStates.get(targetFaction)!;
    let priority = 1.0;

    // Strength consideration
    priority *= targetState.influence / 1000;

    // Territory control
    priority *= 1 + (targetState.territories.length * 0.1);

    // Active members
    priority *= 1 + (Math.log(targetState.activeMembers + 1) * 0.2);

    return priority;
  }

  private calculateTradeValue(
    faction: FactionType,
    tradingPartner: FactionType
  ): number {
    const factionState = this.factionStates.get(faction)!;
    const partnerState = this.factionStates.get(tradingPartner)!;

    let value = 1.0;

    // Resource complementarity
    const resourceSynergy = this.calculateResourceSynergy(
      factionState.resources,
      partnerState.resources
    );
    value *= 1 + resourceSynergy;

    // Alliance strength multiplier
    if (factionState.alliances.includes(tradingPartner)) {
      value *= 1.5;
    }

    return value;
  }

  private calculateTradePriority(tradingPartner: FactionType): number {
    const partnerState = this.factionStates.get(tradingPartner)!;
    let priority = 1.0;

    // Resource wealth
    const partnerResourceTotal = Array.from(partnerState.resources.values())
      .reduce((sum, value) => sum + value, 0);
    priority *= 1 + (Math.log(partnerResourceTotal + 1) * 0.1);

    // Active members influence
    priority *= 1 + (Math.log(partnerState.activeMembers + 1) * 0.1);

    return priority;
  }

  private calculateTerritoryOverlap(
    territories1: string[],
    territories2: string[]
  ): number {
    const set1 = new Set(territories1);
    const set2 = new Set(territories2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private calculateResourceSynergy(
    resources1: Map<string, number>,
    resources2: Map<string, number>
  ): number {
    let synergy = 0;
    const allResources = new Set([
      ...Array.from(resources1.keys()),
      ...Array.from(resources2.keys())
    ]);

    allResources.forEach(resource => {
      const amount1 = resources1.get(resource) || 0;
      const amount2 = resources2.get(resource) || 0;
      // Higher synergy when resources are complementary
      synergy += Math.abs(Math.log((amount1 + 1) / (amount2 + 1)));
    });

    return synergy / allResources.size;
  }

  private async executeStrategicActions(
    faction: FactionType,
    actions: StrategicAction[]
  ): Promise<void> {
    const state = this.factionStates.get(faction)!;

    for (const action of actions.slice(0, 3)) { // Execute top 3 priority actions
      switch (action.type) {
        case 'expand':
          if (action.targetTerritory) {
            // Generate expansion missions
            const territory = await this.territoryManager.getTerritoryById(action.targetTerritory);
            if (territory) {
              await this.missionGenerator.generateMissionsForTerritory(territory, {
                type: 'expansion',
                faction: faction
              } as any);
            }
          }
          break;

        case 'defend':
          if (action.targetTerritory) {
            // Generate defensive missions
            const territory = await this.territoryManager.getTerritoryById(action.targetTerritory);
            if (territory) {
              await this.missionGenerator.generateMissionsForTerritory(territory, {
                type: 'defense',
                faction: faction
              } as any);
            }
          }
          break;

        case 'alliance':
          if (action.targetFaction) {
            // Attempt to form alliance
            const success = Math.random() < action.priority * 0.5;
            if (success && !state.alliances.includes(action.targetFaction)) {
              state.alliances.push(action.targetFaction);
              const targetState = this.factionStates.get(action.targetFaction)!;
              targetState.alliances.push(faction);
            }
          }
          break;

        case 'trade':
          if (action.targetFaction) {
            // Execute trade
            this.executeResourceTrade(faction, action.targetFaction);
          }
          break;
      }
    }
  }

  private async updateFactionRelationships(faction: FactionType): Promise<void> {
    const state = this.factionStates.get(faction)!;

    // Update rivalries based on territory conflicts
    const contestedTerritories = state.territories.filter(territoryId => {
      const territory = this.territoryManager.getTerritoryById(territoryId);
      return territory && territory.contestedBy.length > 0;
    });

    // Count conflicts with each faction
    const conflictCounts = new Map<FactionType, number>();
    for (const territoryId of contestedTerritories) {
      const territory = await this.territoryManager.getTerritoryById(territoryId);
      if (territory) {
        territory.contestedBy.forEach(contestingFaction => {
          conflictCounts.set(
            contestingFaction,
            (conflictCounts.get(contestingFaction) || 0) + 1
          );
        });
      }
    }

    // Update rivals based on conflict frequency
    state.rivals = Array.from(conflictCounts.entries())
      .filter(([_, count]) => count >= 3) // Become rivals if 3+ territory conflicts
      .map(([faction, _]) => faction);

    // Remove allies that became rivals
    state.alliances = state.alliances.filter(ally => !state.rivals.includes(ally));
  }

  private generateResources(faction: FactionType, state: FactionState): void {
    // Base resource generation
    const baseResources = new Map<string, number>([
      ['gold', 10],
      ['wood', 20],
      ['stone', 15],
      ['influence', 5]
    ]);

    // Calculate resource generation multipliers
    const territoryMultiplier = 1 + (state.territories.length * 0.1);
    const allianceMultiplier = 1 + (state.alliances.length * 0.05);
    const activeMultiplier = 1 + (Math.log(state.activeMembers + 1) * 0.1);

    // Apply multipliers and add resources
    baseResources.forEach((amount, resource) => {
      const currentAmount = state.resources.get(resource) || 0;
      const generation = Math.floor(
        amount * territoryMultiplier * allianceMultiplier * activeMultiplier
      );
      state.resources.set(resource, currentAmount + generation);
    });
  }

  private executeResourceTrade(
    faction1: FactionType,
    faction2: FactionType
  ): void {
    const state1 = this.factionStates.get(faction1)!;
    const state2 = this.factionStates.get(faction2)!;

    // Find complementary resources
    const trades: Array<{
      resource: string;
      amount: number;
      from: FactionType;
      to: FactionType;
    }> = [];

    state1.resources.forEach((amount1, resource1) => {
      const amount2 = state2.resources.get(resource1) || 0;
      if (amount1 > amount2 * 2) { // Significant excess
        trades.push({
          resource: resource1,
          amount: Math.floor(amount1 * 0.2), // Trade 20% of excess
          from: faction1,
          to: faction2
        });
      }
    });

    state2.resources.forEach((amount2, resource2) => {
      const amount1 = state1.resources.get(resource2) || 0;
      if (amount2 > amount1 * 2) {
        trades.push({
          resource: resource2,
          amount: Math.floor(amount2 * 0.2),
          from: faction2,
          to: faction1
        });
      }
    });

    // Execute trades
    trades.forEach(trade => {
      const fromState = this.factionStates.get(trade.from)!;
      const toState = this.factionStates.get(trade.to)!;

      const currentAmount = fromState.resources.get(trade.resource) || 0;
      if (currentAmount >= trade.amount) {
        fromState.resources.set(trade.resource, currentAmount - trade.amount);
        toState.resources.set(
          trade.resource,
          (toState.resources.get(trade.resource) || 0) + trade.amount
        );
      }
    });
  }

  // Public methods for game interface
  async getFactionStatus(faction: FactionType): Promise<{
    influence: number;
    territoryCount: number;
    activeMembers: number;
    resources: Map<string, number>;
    allies: FactionType[];
    rivals: FactionType[];
  }> {
    const state = this.factionStates.get(faction)!;
    return {
      influence: state.influence,
      territoryCount: state.territories.length,
      activeMembers: state.activeMembers,
      resources: new Map(state.resources),
      allies: [...state.alliances],
      rivals: [...state.rivals]
    };
  }

  async getFactionRecommendations(faction: FactionType): Promise<string[]> {
    const state = this.factionStates.get(faction)!;
    const analysis = await this.leverageService.analyzeGameState();

    const recommendations: string[] = [];

    // Territory recommendations
    if (state.territories.length < 3) {
      recommendations.push('Expand territory control through conquest missions');
    }

    // Alliance recommendations
    if (state.alliances.length < 2) {
      recommendations.push('Seek diplomatic alliances with other factions');
    }

    // Defense recommendations
    const contestedCount = state.territories.filter(t => {
      const territory = this.territoryManager.getTerritoryById(t);
      return territory && territory.contestedBy.length > 0;
    }).length;

    if (contestedCount > state.territories.length * 0.3) {
      recommendations.push('Prioritize defending contested territories');
    }

    // Resource recommendations
    const lowResources = Array.from(state.resources.entries())
      .filter(([_, amount]) => amount < 100)
      .map(([resource, _]) => resource);

    if (lowResources.length > 0) {
      recommendations.push(
        `Focus on gathering ${lowResources.join(', ')} through resource missions`
      );
    }

    return recommendations;
  }
}