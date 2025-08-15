/**
 * Hive Control Service
 * Manages game/app state, users, profiles, and permissions
 * @see https://docs.honeycombprotocol.com/
 */

import { Character, Profile, Permission } from '../../types/game';

export class HiveControl {
  private profiles: Map<string, Profile> = new Map();
  private permissions: Map<string, Permission[]> = new Map();
  private delegates: Map<string, string[]> = new Map();

  async createProfile(publicKey: string, data: Partial<Profile>): Promise<Profile> {
    const profile: Profile = {
      id: publicKey,
      publicKey,
      name: data.name || 'Player',
      created: Date.now(),
      lastLogin: Date.now(),
      characters: [],
      permissions: [],
      ...data
    };
    this.profiles.set(publicKey, profile);
    return profile;
  }

  async getProfile(publicKey: string): Promise<Profile | null> {
    return this.profiles.get(publicKey) || null;
  }

  async addDelegate(publicKey: string, delegateKey: string, permissions: Permission[]): Promise<void> {
    const delegates = this.delegates.get(publicKey) || [];
    delegates.push(delegateKey);
    this.delegates.set(publicKey, delegates);
    this.permissions.set(delegateKey, permissions);
  }

  async checkPermission(publicKey: string, permission: Permission): Promise<boolean> {
    const permissions = this.permissions.get(publicKey) || [];
    return permissions.includes(permission);
  }

  async updateLastLogin(publicKey: string): Promise<void> {
    const profile = await this.getProfile(publicKey);
    if (profile) {
      profile.lastLogin = Date.now();
      this.profiles.set(publicKey, profile);
    }
  }
}
