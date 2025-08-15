import { Character, TraitType } from '../types/game';
import { LeverageService } from './LeverageService';
import { HoneycombService } from './honeycomb';
import { ResourceManager } from './ResourceManager';
import { TraitEvolutionSystem } from './TraitEvolutionSystem';

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: 'weapon' | 'armor' | 'consumable' | 'special';
  ingredients: Array<{
    resourceId: string;
    amount: number;
  }>;
  requiredTraits?: Array<{
    type: TraitType;
    minLevel: number;
  }>;
  craftingTime: number; // in milliseconds
  baseSuccessRate: number;
  output: {
    itemId: string;
    amount: number;
    quality: number;
    traits?: Array<{
      type: string;
      value: number;
    }>;
  };
}

interface CraftingSession {
  id: string;
  recipeId: string;
  character: Character;
  startTime: number;
  leverageMultiplier: number;
  qualityBonus: number;
  status: 'in_progress' | 'completed' | 'failed';
}

export class CraftingSystem {
  private recipes: Map<string, Recipe>;
  private activeSessions: Map<string, CraftingSession>;
  private leverageService: LeverageService;
  private honeycomb: HoneycombService;
  private resourceManager: ResourceManager;
  private traitSystem: TraitEvolutionSystem;

  constructor(
    leverageService: LeverageService,
    honeycomb: HoneycombService,
    resourceManager: ResourceManager,
    traitSystem: TraitEvolutionSystem
  ) {
    this.leverageService = leverageService;
    this.honeycomb = honeycomb;
    this.resourceManager = resourceManager;
    this.traitSystem = traitSystem;
    this.recipes = this.initializeRecipes();
    this.activeSessions = new Map();
  }

  private initializeRecipes(): Map<string, Recipe> {
    const recipes = new Map<string, Recipe>();

    // Weapons
    recipes.set('dragon_blade', {
      id: 'dragon_blade',
      name: 'Dragon Blade',
      description: 'A legendary sword infused with dragon essence',
      category: 'weapon',
      ingredients: [
        { resourceId: 'dragon_essence', amount: 2 },
        { resourceId: 'ancient_core', amount: 1 },
        { resourceId: 'crystal', amount: 5 }
      ],
      requiredTraits: [
        { type: TraitType.Strength, minLevel: 5 },
        { type: TraitType.DragonSlayer, minLevel: 1 }
      ],
      craftingTime: 3600000, // 1 hour
      baseSuccessRate: 0.7,
      output: {
        itemId: 'dragon_blade',
        amount: 1,
        quality: 100,
        traits: [
          { type: 'fire_damage', value: 50 },
          { type: 'dragon_slaying', value: 25 }
        ]
      }
    });

    // Armor
    recipes.set('crystal_armor', {
      id: 'crystal_armor',
      name: 'Crystal Armor',
      description: 'Armor forged from magical crystals',
      category: 'armor',
      ingredients: [
        { resourceId: 'crystal', amount: 10 },
        { resourceId: 'stone', amount: 20 }
      ],
      requiredTraits: [
        { type: TraitType.Strength, minLevel: 3 }
      ],
      craftingTime: 1800000, // 30 minutes
      baseSuccessRate: 0.8,
      output: {
        itemId: 'crystal_armor',
        amount: 1,
        quality: 80,
        traits: [
          { type: 'magic_resistance', value: 30 },
          { type: 'durability', value: 100 }
        ]
      }
    });

    // Consumables
    recipes.set('healing_potion', {
      id: 'healing_potion',
      name: 'Advanced Healing Potion',
      description: 'Restores health and grants temporary regeneration',
      category: 'consumable',
      ingredients: [
        { resourceId: 'crystal', amount: 1 },
        { resourceId: 'wood', amount: 5 }
      ],
      requiredTraits: [
        { type: TraitType.Wisdom, minLevel: 2 }
      ],
      craftingTime: 300000, // 5 minutes
      baseSuccessRate: 0.9,
      output: {
        itemId: 'healing_potion',
        amount: 3,
        quality: 75,
        traits: [
          { type: 'heal_amount', value: 50 },
          { type: 'duration', value: 30 }
        ]
      }
    });

    return recipes;
  }

  async startCrafting(
    recipeId: string,
    character: Character
  ): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
    estimatedCompletion?: number;
  }> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    try {
      // Check requirements
      const requirementCheck = await this.checkCraftingRequirements(
        recipe,
        character
      );
      if (!requirementCheck.success) {
        return { success: false, error: requirementCheck.error };
      }

      // Calculate crafting modifiers using leverage system
      const leverageMultiplier = await this.leverageService.calculateTraitEvolution(
        character,
        recipe.requiredTraits?.[0]?.type || TraitType.Wisdom
      );

      // Calculate quality bonus based on traits and leverage
      const qualityBonus = await this.calculateQualityBonus(
        recipe,
        character,
        leverageMultiplier
      );

      // Create crafting session
      const sessionId = `craft_${Date.now()}_${character.publicKey.toString()}`;
      const session: CraftingSession = {
        id: sessionId,
        recipeId,
        character,
        startTime: Date.now(),
        leverageMultiplier,
        qualityBonus,
        status: 'in_progress'
      };

      this.activeSessions.set(sessionId, session);

      // Consume resources
      await this.consumeIngredients(recipe, character);

      // Start crafting process
      this.processCrafting(session);

      return {
        success: true,
        sessionId,
        estimatedCompletion: session.startTime + recipe.craftingTime
      };
    } catch (error) {
      console.error('Failed to start crafting:', error);
      return {
        success: false,
        error: 'Failed to start crafting: ' + (error as Error).message
      };
    }
  }

  private async checkCraftingRequirements(
    recipe: Recipe,
    character: Character
  ): Promise<{ success: boolean; error?: string }> {
    // Check trait requirements
    if (recipe.requiredTraits) {
      for (const req of recipe.requiredTraits) {
        const trait = character.traits.find(t => t.type === req.type);
        if (!trait || trait.level < req.minLevel) {
          return {
            success: false,
            error: `Required trait ${req.type} level ${req.minLevel} not met`
          };
        }
      }
    }

    // Check ingredients
    for (const ingredient of recipe.ingredients) {
      const hasResource = await this.resourceManager.checkResourceAmount(
        character,
        ingredient.resourceId,
        ingredient.amount
      );
      if (!hasResource) {
        return {
          success: false,
          error: `Insufficient ${ingredient.resourceId}`
        };
      }
    }

    return { success: true };
  }

  private async calculateQualityBonus(
    recipe: Recipe,
    character: Character,
    leverageMultiplier: number
  ): Promise<number> {
    let bonus = 1.0;

    // Trait bonuses
    character.traits.forEach(trait => {
      if (recipe.requiredTraits?.some(req => req.type === trait.type)) {
        bonus *= 1 + (trait.level * 0.1);
      }
    });

    // Category-specific bonuses
    switch (recipe.category) {
      case 'weapon':
        if (character.traits.some(t => t.type === TraitType.Strength)) {
          bonus *= 1.2;
        }
        break;
      case 'armor':
        if (character.traits.some(t => t.type === TraitType.SiegeEngineer)) {
          bonus *= 1.15;
        }
        break;
      case 'consumable':
        if (character.traits.some(t => t.type === TraitType.Wisdom)) {
          bonus *= 1.25;
        }
        break;
    }

    // Apply leverage multiplier
    bonus *= leverageMultiplier;

    return bonus;
  }

  private async consumeIngredients(
    recipe: Recipe,
    character: Character
  ): Promise<void> {
    for (const ingredient of recipe.ingredients) {
      await this.resourceManager.consumeResource(
        character,
        ingredient.resourceId,
        ingredient.amount
      );
    }
  }

  private async processCrafting(session: CraftingSession): Promise<void> {
    const recipe = this.recipes.get(session.recipeId)!;
    
    setTimeout(async () => {
      try {
        // Calculate success chance
        const successChance = this.calculateSuccessChance(
          recipe,
          session.character,
          session.leverageMultiplier
        );

        const success = Math.random() < successChance;

        if (success) {
          // Create output item with quality modifications
          const output = {
            ...recipe.output,
            quality: Math.floor(
              recipe.output.quality * session.qualityBonus
            )
          };

          // Award item using Honeycomb
          await this.honeycomb.awardItem(
            session.character.publicKey,
            output.itemId,
            output
          );

          // Update character traits based on successful crafting
          await this.updateCraftingExperience(session);

          session.status = 'completed';
        } else {
          session.status = 'failed';
          
          // Return some resources on failure
          await this.returnFailedCraftingResources(recipe, session.character);
        }

        // Clean up session
        this.activeSessions.delete(session.id);

      } catch (error) {
        console.error('Crafting process failed:', error);
        session.status = 'failed';
        this.activeSessions.delete(session.id);
      }
    }, recipe.craftingTime);
  }

  private calculateSuccessChance(
    recipe: Recipe,
    character: Character,
    leverageMultiplier: number
  ): number {
    let chance = recipe.baseSuccessRate;

    // Apply trait bonuses
    character.traits.forEach(trait => {
      if (recipe.requiredTraits?.some(req => req.type === trait.type)) {
        chance += trait.level * 0.05; // 5% per trait level
      }
    });

    // Apply leverage multiplier
    chance *= leverageMultiplier;

    // Cap at 95% success chance
    return Math.min(chance, 0.95);
  }

  private async updateCraftingExperience(session: CraftingSession): Promise<void> {
    const recipe = this.recipes.get(session.recipeId)!;
    
    // Calculate XP gain
    const baseXP = recipe.craftingTime / 60000; // 1 XP per minute of crafting
    const xpGain = Math.floor(baseXP * session.leverageMultiplier);

    // Update relevant traits
    if (recipe.requiredTraits) {
      for (const reqTrait of recipe.requiredTraits) {
        await this.traitSystem.gainTraitExperience(
          session.character,
          reqTrait.type,
          xpGain
        );
      }
    }

    // Award crafting-specific achievements or bonuses
    await this.honeycomb.updateCharacterProgress(
      session.character.publicKey,
      {
        craftingXP: xpGain,
        itemsCrafted: 1,
        category: recipe.category
      }
    );
  }

  private async returnFailedCraftingResources(
    recipe: Recipe,
    character: Character
  ): Promise<void> {
    // Return 50% of basic resources
    for (const ingredient of recipe.ingredients) {
      if (ingredient.resourceId === 'wood' || ingredient.resourceId === 'stone') {
        const returnAmount = Math.floor(ingredient.amount * 0.5);
        await this.resourceManager.awardResource(
          character,
          ingredient.resourceId,
          returnAmount
        );
      }
    }
  }

  async getCraftingAnalytics(character: Character): Promise<{
    recommendedRecipes: string[];
    craftingPotential: number;
    optimalPath: string[];
  }> {
    const analysis = await this.leverageService.analyzeGameState();
    const characterTraits = new Set(character.traits.map(t => t.type));

    // Calculate crafting potential for each recipe
    const recipePotentials = Array.from(this.recipes.entries()).map(
      ([id, recipe]) => {
        let potential = 1.0;

        // Trait alignment
        if (recipe.requiredTraits) {
          const matchingTraits = recipe.requiredTraits.filter(
            req => characterTraits.has(req.type)
          ).length;
          potential *= 1 + (matchingTraits * 0.2);
        }

        // Resource availability
        const hasResources = recipe.ingredients.every(
          ing => this.resourceManager.checkResourceAmount(
            character,
            ing.resourceId,
            ing.amount
          )
        );
        if (hasResources) {
          potential *= 1.5;
        }

        // Value potential
        potential *= recipe.output.quality / 100;

        return { id, potential };
      }
    );

    // Sort by potential
    const sortedRecipes = recipePotentials.sort(
      (a, b) => b.potential - a.potential
    );

    // Generate optimal crafting path
    const optimalPath = this.calculateOptimalCraftingPath(
      character,
      sortedRecipes
    );

    return {
      recommendedRecipes: sortedRecipes.slice(0, 3).map(r => r.id),
      craftingPotential: sortedRecipes[0]?.potential || 0,
      optimalPath
    };
  }

  private calculateOptimalCraftingPath(
    character: Character,
    recipePotentials: Array<{ id: string; potential: number }>
  ): string[] {
    const path: string[] = [];
    const resources = new Map<string, number>();
    let currentTime = 0;

    // Initialize available resources
    character.resources?.forEach((amount, resourceId) => {
      resources.set(resourceId, amount);
    });

    // Calculate optimal path within a 24-hour window
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours in ms

    for (const { id } of recipePotentials) {
      const recipe = this.recipes.get(id)!;

      // Check if we have time and resources
      if (currentTime + recipe.craftingTime <= timeWindow) {
        let canCraft = true;

        // Check resources
        for (const ing of recipe.ingredients) {
          const available = resources.get(ing.resourceId) || 0;
          if (available < ing.amount) {
            canCraft = false;
            break;
          }
        }

        if (canCraft) {
          path.push(id);
          currentTime += recipe.craftingTime;

          // Deduct resources
          for (const ing of recipe.ingredients) {
            const available = resources.get(ing.resourceId) || 0;
            resources.set(ing.resourceId, available - ing.amount);
          }
        }
      }
    }

    return path;
  }
}