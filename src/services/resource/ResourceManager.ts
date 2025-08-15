/**
 * Resource Manager Service
 * Handles resource system and crafting mechanics
 * @see https://docs.honeycombprotocol.com/
 */

import { Resource, CraftingRecipe, ResourceTransaction } from '../../types/game';

export class ResourceManager {
  private resources: Map<string, Map<string, number>> = new Map(); // player -> {resource -> amount}
  private recipes: Map<string, CraftingRecipe> = new Map();
  private craftingQueue: Map<string, {
    playerId: string;
    recipeId: string;
    startTime: number;
    endTime: number;
  }[]> = new Map();

  async defineResource(params: {
    id: string;
    name: string;
    description: string;
    rarity: number;
  }): Promise<void> {
    // In real implementation, this would create the resource definition on-chain
  }

  async getResources(playerId: string): Promise<Map<string, number>> {
    return this.resources.get(playerId) || new Map();
  }

  async addResource(playerId: string, resourceId: string, amount: number): Promise<void> {
    let playerResources = this.resources.get(playerId);
    if (!playerResources) {
      playerResources = new Map();
      this.resources.set(playerId, playerResources);
    }

    const current = playerResources.get(resourceId) || 0;
    playerResources.set(resourceId, current + amount);
  }

  async defineRecipe(recipe: CraftingRecipe): Promise<void> {
    this.recipes.set(recipe.id, recipe);
  }

  async startCrafting(params: {
    playerId: string;
    recipeId: string;
  }): Promise<{ craftingId: string; endTime: number }> {
    const recipe = this.recipes.get(params.recipeId);
    if (!recipe) throw new Error('Recipe not found');

    // Check resources
    const playerResources = await this.getResources(params.playerId);
    for (const input of recipe.inputs) {
      const available = playerResources.get(input.resourceId) || 0;
      if (available < input.amount) {
        throw new Error(`Insufficient ${input.resourceId}`);
      }
    }

    // Deduct resources
    for (const input of recipe.inputs) {
      await this.addResource(params.playerId, input.resourceId, -input.amount);
    }

    // Start crafting
    const craftingId = `craft_${Date.now()}`;
    const now = Date.now();
    const endTime = now + recipe.craftingTime;

    let playerCrafting = this.craftingQueue.get(params.playerId);
    if (!playerCrafting) {
      playerCrafting = [];
      this.craftingQueue.set(params.playerId, playerCrafting);
    }

    playerCrafting.push({
      playerId: params.playerId,
      recipeId: params.recipeId,
      startTime: now,
      endTime
    });

    return { craftingId, endTime };
  }

  async claimCrafting(params: {
    playerId: string;
    craftingId: string;
  }): Promise<ResourceTransaction[]> {
    const playerCrafting = this.craftingQueue.get(params.playerId) || [];
    const craftingIndex = playerCrafting.findIndex(c => 
      `craft_${c.startTime}` === params.craftingId
    );

    if (craftingIndex === -1) throw new Error('Crafting not found');

    const crafting = playerCrafting[craftingIndex];
    if (Date.now() < crafting.endTime) {
      throw new Error('Crafting not complete');
    }

    // Remove from queue
    playerCrafting.splice(craftingIndex, 1);

    // Award resources
    const recipe = this.recipes.get(crafting.recipeId);
    if (!recipe) throw new Error('Recipe not found');

    const transactions: ResourceTransaction[] = [];
    for (const output of recipe.outputs) {
      await this.addResource(params.playerId, output.resourceId, output.amount);
      transactions.push({
        resourceId: output.resourceId,
        amount: output.amount,
        type: 'CRAFTING_OUTPUT',
        timestamp: Date.now()
      });
    }

    return transactions;
  }

  async getActiveCrafting(playerId: string): Promise<{
    recipeId: string;
    startTime: number;
    endTime: number;
  }[]> {
    return this.craftingQueue.get(playerId) || [];
  }
}
