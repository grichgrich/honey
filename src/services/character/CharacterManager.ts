/**
 * Character Manager Service
 * Handles character models, minting, and progression
 * @see https://docs.honeycombprotocol.com/
 */

import { Character, CharacterModel, Trait } from '../../types/game';

export class CharacterManager {
  private models: Map<string, CharacterModel> = new Map();
  private characters: Map<string, Character> = new Map();
  private nftCharacters: Map<string, string> = new Map(); // NFT mint -> character ID

  async defineModel(params: {
    id: string;
    name: string;
    baseTraits: Trait[];
    allowedFactions: string[];
  }): Promise<CharacterModel> {
    const model: CharacterModel = {
      ...params,
      created: Date.now(),
      version: 1
    };
    this.models.set(params.id, model);
    return model;
  }

  async mintCharacter(params: {
    model: string;
    owner: string;
    faction: string;
    nftMint?: string;
  }): Promise<Character> {
    const model = this.models.get(params.model);
    if (!model) throw new Error('Model not found');

    if (!model.allowedFactions.includes(params.faction)) {
      throw new Error('Invalid faction for this model');
    }

    const character: Character = {
      id: `char_${Date.now()}`,
      modelId: params.model,
      owner: params.owner,
      faction: params.faction,
      level: 1,
      experience: 0,
      traits: model.baseTraits.map(t => ({ ...t })),
      created: Date.now(),
      nftMint: params.nftMint
    };

    this.characters.set(character.id, character);
    if (params.nftMint) {
      this.nftCharacters.set(params.nftMint, character.id);
    }

    return character;
  }

  async getCharacter(id: string): Promise<Character | null> {
    return this.characters.get(id) || null;
  }

  async getCharacterByNft(nftMint: string): Promise<Character | null> {
    const charId = this.nftCharacters.get(nftMint);
    if (!charId) return null;
    return this.getCharacter(charId);
  }

  async updateExperience(id: string, amount: number): Promise<void> {
    const character = await this.getCharacter(id);
    if (!character) throw new Error('Character not found');

    character.experience += amount;
    character.level = Math.floor(character.experience / 1000) + 1;
    
    this.characters.set(id, character);
  }

  async updateTrait(id: string, traitType: string, amount: number): Promise<void> {
    const character = await this.getCharacter(id);
    if (!character) throw new Error('Character not found');

    const trait = character.traits.find(t => t.type === traitType);
    if (trait) {
      trait.experience += amount;
      trait.level = Math.floor(trait.experience / 1000) + 1;
    }

    this.characters.set(id, character);
  }
}
