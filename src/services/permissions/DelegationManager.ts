/**
 * Delegation Manager Service
 * Handles fine-tuned permissions for game management
 * @see https://docs.honeycombprotocol.com/
 */

export type Permission = {
  id: string;
  name: string;
  description: string;
  scope: 'READ' | 'WRITE' | 'ADMIN';
  resource: string;
};

export type Delegate = {
  id: string;
  publicKey: string;
  permissions: Permission[];
  createdAt: number;
  expiresAt?: number;
};

export class DelegationManager {
  private delegates: Map<string, Delegate[]> = new Map(); // owner -> delegates
  private permissions: Map<string, Permission[]> = new Map(); // delegate -> permissions

  /**
   * Create a new delegate with specified permissions
   */
  async createDelegate(params: {
    owner: string;
    delegateKey: string;
    permissions: Permission[];
    expiration?: number;
  }): Promise<Delegate> {
    const delegate: Delegate = {
      id: `delegate_${Date.now()}`,
      publicKey: params.delegateKey,
      permissions: params.permissions,
      createdAt: Date.now(),
      expiresAt: params.expiration
    };

    let ownerDelegates = this.delegates.get(params.owner);
    if (!ownerDelegates) {
      ownerDelegates = [];
      this.delegates.set(params.owner, ownerDelegates);
    }

    ownerDelegates.push(delegate);
    this.permissions.set(params.delegateKey, params.permissions);

    return delegate;
  }

  /**
   * Check if a delegate has a specific permission
   */
  async checkPermission(params: {
    delegateKey: string;
    permission: string;
    resource: string;
  }): Promise<boolean> {
    const delegatePermissions = this.permissions.get(params.delegateKey);
    if (!delegatePermissions) return false;

    return delegatePermissions.some(p => 
      p.id === params.permission && 
      p.resource === params.resource &&
      !this.isExpired(p)
    );
  }

  /**
   * Revoke a delegate's permissions
   */
  async revokeDelegate(params: {
    owner: string;
    delegateKey: string;
  }): Promise<void> {
    const ownerDelegates = this.delegates.get(params.owner);
    if (!ownerDelegates) return;

    const index = ownerDelegates.findIndex(d => d.publicKey === params.delegateKey);
    if (index !== -1) {
      ownerDelegates.splice(index, 1);
    }

    this.permissions.delete(params.delegateKey);
  }

  /**
   * Update a delegate's permissions
   */
  async updateDelegatePermissions(params: {
    owner: string;
    delegateKey: string;
    permissions: Permission[];
  }): Promise<Delegate | null> {
    const ownerDelegates = this.delegates.get(params.owner);
    if (!ownerDelegates) return null;

    const delegate = ownerDelegates.find(d => d.publicKey === params.delegateKey);
    if (!delegate) return null;

    delegate.permissions = params.permissions;
    this.permissions.set(params.delegateKey, params.permissions);

    return delegate;
  }

  /**
   * Get all delegates for an owner
   */
  async getDelegates(owner: string): Promise<Delegate[]> {
    return this.delegates.get(owner) || [];
  }

  /**
   * Get permissions for a delegate
   */
  async getDelegatePermissions(delegateKey: string): Promise<Permission[]> {
    return this.permissions.get(delegateKey) || [];
  }

  private isExpired(permission: Permission): boolean {
    const delegate = Array.from(this.delegates.values())
      .flat()
      .find(d => d.permissions.includes(permission));

    if (!delegate || !delegate.expiresAt) return false;
    return Date.now() > delegate.expiresAt;
  }
}
