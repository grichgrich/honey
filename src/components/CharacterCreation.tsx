import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useGameContext } from '../context/GameContext';
import { FactionType } from '../types/game';

export function CharacterCreation() {
  const { publicKey } = useWallet();
  const { createCharacter } = useGameContext();
  const [name, setName] = useState('');
  const [faction, setFaction] = useState<FactionType | ''>('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!name || !faction) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await createCharacter(name, faction as FactionType);
    } catch (err) {
      setError('Failed to create character. Please try again.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#1a1a1a',
      color: 'white'
    }}>
      <div style={{
        background: '#2a2a2a',
        padding: '2rem',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Create Your Hero
        </h1>

        {!publicKey ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem' }}>
              Connect your wallet to begin your journey
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Hero Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid #444',
                  background: '#333',
                  color: 'white'
                }}
              />
            </div>

            <div>
              <label htmlFor="faction" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Choose Your Faction
              </label>
              <select
                id="faction"
                value={faction}
                onChange={(e) => setFaction(e.target.value as FactionType)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid #444',
                  background: '#333',
                  color: 'white'
                }}
              >
                <option value="">Select a faction</option>
                <option value={FactionType.Sun}>Sun Warriors</option>
                <option value={FactionType.Ocean}>Ocean Nomads</option>
                <option value={FactionType.Forest}>Forest Keepers</option>
              </select>
            </div>

            {error && (
              <div style={{
                color: '#ff4444',
                textAlign: 'center',
                marginTop: '1rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                padding: '0.75rem',
                borderRadius: '5px',
                border: 'none',
                background: '#4CAF50',
                color: 'white',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Create Character
            </button>
          </form>
        )}

        {/* Faction Descriptions */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Faction Lore</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ color: '#FFD700' }}>Sun Warriors</h4>
            <p>Masters of light and fire, the Sun Warriors draw their power from the celestial forces above.</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ color: '#4169E1' }}>Ocean Nomads</h4>
            <p>Wielding the fluid power of water, the Ocean Nomads are adaptable and ever-changing.</p>
          </div>

          <div>
            <h4 style={{ color: '#228B22' }}>Forest Keepers</h4>
            <p>Connected to nature's essence, the Forest Keepers command the forces of growth and life.</p>
          </div>
        </div>
      </div>
    </div>
  );
}