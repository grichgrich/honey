import React, { useState } from 'react';
import { useGameContext } from '../context/GameContext';

interface CreateCharacterModalProps {
  onClose: () => void;
}

const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({ onClose }) => {
  const { createCharacter } = useGameContext();
  const [name, setName] = useState('');
  const [faction, setFaction] = useState('');
  const [error, setError] = useState('');

  const factions = ['Rebels', 'Empire', 'Mercenaries'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!faction) {
      setError('Faction selection is required');
      return;
    }

    try {
      await createCharacter({
        name: name.trim(),
        faction,
        level: 1,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create Character</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Character Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter character name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="faction">Choose Faction</label>
            <select
              id="faction"
              value={faction}
              onChange={(e) => setFaction(e.target.value)}
            >
              <option value="">Select a faction</option>
              {factions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="button-group">
            <button type="submit" className="create-btn">
              Create
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1a1a1a;
          padding: 2rem;
          border-radius: 10px;
          min-width: 300px;
          color: white;
        }

        h2 {
          margin: 0 0 1.5rem;
          color: #88f;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #aaa;
        }

        input, select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #444;
          background: #222;
          color: white;
          border-radius: 4px;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #66f;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          flex: 1;
        }

        .create-btn {
          background: #44f;
          color: white;
        }

        .create-btn:hover {
          background: #66f;
        }

        .cancel-btn {
          background: #444;
          color: white;
        }

        .cancel-btn:hover {
          background: #555;
        }

        .error-message {
          background: rgba(255, 0, 0, 0.2);
          color: #ff4444;
          padding: 0.5rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default CreateCharacterModal;