import { Character, Territory, FactionType } from '../types/game';
import { LeverageService } from './LeverageService';
import { HoneycombService } from './honeycomb';
import { TraitEvolutionSystem } from './TraitEvolutionSystem';
import { ResourceManager } from './ResourceManager';
import { CraftingSystem } from './CraftingSystem';
import { CombatSystem } from './CombatSystem';
import { FactionDynamics } from './FactionDynamics';
import * as THREE from 'three';

interface SystemState {
  territories: Map<string, Territory>;
  activeCombats: Set<string>;
  activeCrafting: Set<string>;
  resourceNodes: Map<string, any>;
  factionStates: Map<FactionType, any>;
}

interface GameEvent {
  type: 'combat' | 'craft' | 'resource' | 'territory' | 'trait';
  timestamp: number;
  data: any;
  affectedSystems: string[];
}

export class SystemOrchestrator {
  private leverageService: LeverageService;
  private honeycomb: HoneycombService;
  private traitSystem: TraitEvolutionSystem;
  private resourceManager: ResourceManager;
  private craftingSystem: CraftingSystem;
  private combatSystem: CombatSystem;
  private factionDynamics: FactionDynamics;

  private systemState: SystemState;
  private eventQueue: GameEvent[];
  private visualEffects: Map<string, THREE.Object3D>;
  private particleSystems: Map<string, THREE.Points>;

  constructor(
    leverageService: LeverageService,
    honeycomb: HoneycombService
  ) {
    this.leverageService = leverageService;
    this.honeycomb = honeycomb;

    // Initialize subsystems
    this.traitSystem = new TraitEvolutionSystem(leverageService, honeycomb);
    this.resourceManager = new ResourceManager(leverageService, honeycomb, this.traitSystem);
    this.craftingSystem = new CraftingSystem(leverageService, honeycomb, this.resourceManager, this.traitSystem);
    this.combatSystem = new CombatSystem(leverageService, honeycomb, this.traitSystem, this.resourceManager);
    this.factionDynamics = new FactionDynamics(leverageService, honeycomb, this);

    // Initialize state
    this.systemState = {
      territories: new Map(),
      activeCombats: new Set(),
      activeCrafting: new Set(),
      resourceNodes: new Map(),
      factionStates: new Map()
    };

    this.eventQueue = [];
    this.visualEffects = new Map();
    this.particleSystems = new Map();

    // Start event processing loop
    this.startEventProcessing();
  }

  private startEventProcessing(): void {
    setInterval(() => {
      this.processEventQueue();
    }, 100); // Process events every 100ms
  }

  private async processEventQueue(): Promise<void> {
    const now = Date.now();
    const eventsToProcess = this.eventQueue.filter(e => e.timestamp <= now);
    this.eventQueue = this.eventQueue.filter(e => e.timestamp > now);

    for (const event of eventsToProcess) {
      await this.processGameEvent(event);
    }
  }

  private async processGameEvent(event: GameEvent): Promise<void> {
    try {
      // Get leverage analysis for event
      const analysis = await this.leverageService.analyzeGameState();
      const leverageMultiplier = analysis.exponentialValue || 1;

      switch (event.type) {
        case 'combat':
          await this.processCombatEvent(event, leverageMultiplier);
          break;
        case 'craft':
          await this.processCraftingEvent(event, leverageMultiplier);
          break;
        case 'resource':
          await this.processResourceEvent(event, leverageMultiplier);
          break;
        case 'territory':
          await this.processTerritoryEvent(event, leverageMultiplier);
          break;
        case 'trait':
          await this.processTraitEvent(event, leverageMultiplier);
          break;
      }

      // Create visual effects
      this.createEventVisuals(event);

      // Update affected systems
      await this.updateAffectedSystems(event);

    } catch (error) {
      console.error('Failed to process game event:', error);
    }
  }

  private async processCombatEvent(
    event: GameEvent,
    leverageMultiplier: number
  ): Promise<void> {
    const { combatId, participants } = event.data;

    // Update territory control if combat is territory-related
    if (event.data.territory) {
      const territoryInfluence = Math.floor(
        event.data.baseInfluence * leverageMultiplier
      );
      await this.factionDynamics.updateTerritoryControl(
        event.data.territory,
        new Map([[event.data.winner.faction, territoryInfluence]])
      );
    }

    // Create combat particles
    this.createCombatParticles(event.data.position, event.data.intensity);

    // Update faction dynamics
    await this.factionDynamics.processCombatOutcome(
      event.data.winner,
      event.data.loser,
      event.data.territory
    );
  }

  private async processCraftingEvent(
    event: GameEvent,
    leverageMultiplier: number
  ): Promise<void> {
    const { craftingId, recipe, character } = event.data;

    // Apply leverage multiplier to crafting quality
    const qualityBonus = Math.floor(event.data.baseQuality * leverageMultiplier);

    // Create crafting visual effects
    this.createCraftingEffects(event.data.position, recipe.category);

    // Update resource nodes if crafting consumed resources
    if (event.data.consumedResources) {
      await this.resourceManager.updateResourceNodes(
        event.data.consumedResources
      );
    }
  }

  private async processResourceEvent(
    event: GameEvent,
    leverageMultiplier: number
  ): Promise<void> {
    const { nodeId, character, amount } = event.data;

    // Apply leverage multiplier to resource yield
    const finalYield = Math.floor(amount * leverageMultiplier);

    // Create resource collection particles
    this.createResourceParticles(
      event.data.position,
      event.data.resourceType
    );

    // Update territory resource state
    if (event.data.territory) {
      await this.resourceManager.updateTerritoryResources(
        event.data.territory,
        event.data.resourceType,
        finalYield
      );
    }
  }

  private async processTerritoryEvent(
    event: GameEvent,
    leverageMultiplier: number
  ): Promise<void> {
    const { territoryId, faction, influence } = event.data;

    // Apply leverage multiplier to territory influence
    const finalInfluence = Math.floor(influence * leverageMultiplier);

    // Create territory control visual effects
    this.createTerritoryEffects(
      event.data.position,
      event.data.faction
    );

    // Update faction dynamics
    await this.factionDynamics.updateTerritoryControl(
      event.data.territory,
      new Map([[faction, finalInfluence]])
    );
  }

  private async processTraitEvent(
    event: GameEvent,
    leverageMultiplier: number
  ): Promise<void> {
    const { character, trait, experience } = event.data;

    // Apply leverage multiplier to trait experience
    const finalExperience = Math.floor(experience * leverageMultiplier);

    // Create trait evolution particles
    this.createTraitEvolutionEffects(
      event.data.position,
      trait.type
    );

    // Update character progression
    await this.traitSystem.gainTraitExperience(
      character,
      trait.type,
      finalExperience
    );
  }

  private createEventVisuals(event: GameEvent): void {
    const position = new THREE.Vector3(
      event.data.position.x,
      event.data.position.y,
      event.data.position.z
    );

    switch (event.type) {
      case 'combat':
        this.createCombatParticles(position, event.data.intensity);
        break;
      case 'craft':
        this.createCraftingEffects(position, event.data.recipe.category);
        break;
      case 'resource':
        this.createResourceParticles(position, event.data.resourceType);
        break;
      case 'territory':
        this.createTerritoryEffects(position, event.data.faction);
        break;
      case 'trait':
        this.createTraitEvolutionEffects(position, event.data.trait.type);
        break;
    }
  }

  private createCombatParticles(position: THREE.Vector3, intensity: number): void {
    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.1,
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
      })
    );

    const particleCount = Math.floor(intensity * 100);
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = position.x + (Math.random() - 0.5) * intensity;
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * intensity;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * intensity;
    }

    particles.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    this.particleSystems.set(`combat_${Date.now()}`, particles);
  }

  private createCraftingEffects(
    position: THREE.Vector3,
    category: string
  ): void {
    const color = this.getCraftingColor(category);
    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.05,
        color,
        transparent: true,
        opacity: 0.6
      })
    );

    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.random() * 0.5;
      
      positions[i3] = position.x + Math.cos(angle) * radius;
      positions[i3 + 1] = position.y + Math.random() * 0.5;
      positions[i3 + 2] = position.z + Math.sin(angle) * radius;
    }

    particles.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    this.particleSystems.set(`craft_${Date.now()}`, particles);
  }

  private createResourceParticles(
    position: THREE.Vector3,
    resourceType: string
  ): void {
    const color = this.getResourceColor(resourceType);
    const particles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.03,
        color,
        transparent: true,
        opacity: 0.7
      })
    );

    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i3 + 1] = position.y + Math.random() * 0.5;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
    }

    particles.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    this.particleSystems.set(`resource_${Date.now()}`, particles);
  }

  private createTerritoryEffects(
    position: THREE.Vector3,
    faction: FactionType
  ): void {
    const color = this.getFactionColor(faction);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.2, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
    );

    ring.position.copy(position);
    ring.rotation.x = -Math.PI / 2;

    this.visualEffects.set(`territory_${Date.now()}`, ring);
  }

  private createTraitEvolutionEffects(
    position: THREE.Vector3,
    traitType: string
  ): void {
    const color = this.getTraitColor(traitType);
    const spiral = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.02,
        color,
        transparent: true,
        opacity: 0.8
      })
    );

    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const t = i / particleCount;
      const angle = t * Math.PI * 4;
      const radius = t * 0.5;
      
      positions[i3] = position.x + Math.cos(angle) * radius;
      positions[i3 + 1] = position.y + t * 1.0;
      positions[i3 + 2] = position.z + Math.sin(angle) * radius;
    }

    spiral.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    this.particleSystems.set(`trait_${Date.now()}`, spiral);
  }

  private getCraftingColor(category: string): number {
    switch (category) {
      case 'weapon':
        return 0xff4444;
      case 'armor':
        return 0x44ff44;
      case 'consumable':
        return 0x4444ff;
      default:
        return 0xffffff;
    }
  }

  private getResourceColor(resourceType: string): number {
    switch (resourceType) {
      case 'wood':
        return 0x8b4513;
      case 'stone':
        return 0x808080;
      case 'crystal':
        return 0x00ffff;
      case 'ancient_core':
        return 0xff00ff;
      default:
        return 0xffffff;
    }
  }

  private getFactionColor(faction: FactionType): number {
    switch (faction) {
      case FactionType.Sun:
        return 0xffd700;
      case FactionType.Ocean:
        return 0x4169e1;
      case FactionType.Forest:
        return 0x228b22;
      default:
        return 0x808080;
    }
  }

  private getTraitColor(traitType: string): number {
    switch (traitType) {
      case 'Strength':
        return 0xff0000;
      case 'Wisdom':
        return 0x0000ff;
      case 'Agility':
        return 0x00ff00;
      default:
        return 0xffffff;
    }
  }

  private async updateAffectedSystems(event: GameEvent): Promise<void> {
    // Update all affected systems
    for (const system of event.affectedSystems) {
      switch (system) {
        case 'combat':
          await this.combatSystem.updateState(event);
          break;
        case 'crafting':
          await this.craftingSystem.updateState(event);
          break;
        case 'resource':
          await this.resourceManager.updateState(event);
          break;
        case 'faction':
          await this.factionDynamics.updateState(event);
          break;
        case 'trait':
          await this.traitSystem.updateState(event);
          break;
      }
    }

    // Update visual effects
    this.updateVisualEffects();
  }

  private updateVisualEffects(): void {
    const now = Date.now();

    // Update particle systems
    this.particleSystems.forEach((particles, id) => {
      const age = now - parseInt(id.split('_')[1]);
      if (age > 2000) { // Remove after 2 seconds
        this.particleSystems.delete(id);
      } else {
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += 0.01; // Move particles up
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.material.opacity = Math.max(0, 1 - (age / 2000));
      }
    });

    // Update territory effects
    this.visualEffects.forEach((effect, id) => {
      const age = now - parseInt(id.split('_')[1]);
      if (age > 3000) { // Remove after 3 seconds
        this.visualEffects.delete(id);
      } else {
        effect.scale.addScalar(0.01);
        effect.material.opacity = Math.max(0, 1 - (age / 3000));
      }
    });
  }

  // Public methods for game interface
  async queueEvent(event: GameEvent): Promise<void> {
    this.eventQueue.push(event);
  }

  getVisualEffects(): {
    particles: THREE.Points[];
    effects: THREE.Object3D[];
  } {
    return {
      particles: Array.from(this.particleSystems.values()),
      effects: Array.from(this.visualEffects.values())
    };
  }

  async getSystemAnalytics(): Promise<{
    eventQueueLength: number;
    activeEffects: number;
    systemLoad: {
      combat: number;
      crafting: number;
      resource: number;
      territory: number;
      trait: number;
    };
  }> {
    return {
      eventQueueLength: this.eventQueue.length,
      activeEffects: this.particleSystems.size + this.visualEffects.size,
      systemLoad: {
        combat: this.systemState.activeCombats.size,
        crafting: this.systemState.activeCrafting.size,
        resource: this.systemState.resourceNodes.size,
        territory: this.systemState.territories.size,
        trait: 0 // Add trait analytics
      }
    };
  }
}