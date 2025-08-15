import React from 'react';
import { useGameContext } from '../context/GameContext';

// Define types for our resource and mission update objects
interface Resource {
  type: string;
  total_amount: number;
  base_amount: number;
  bonus_amount: number;
}

interface MissionUpdate {
  id: string;
  type: string;
  previous_progress: number;
  new_progress: number;
  increase: number;
}

interface HarvestResultData {
  territory_name: string;
  multiplier: number;
  resources: Resource[];
  total_value: number;
  mission_updates?: MissionUpdate[];
}

const HarvestResults: React.FC = () => {
  const { harvestResults } = useGameContext();

  if (!harvestResults.show || !harvestResults.results) {
    return null;
  }

  const { territory_name, multiplier, resources, mission_updates } = harvestResults.results as HarvestResultData;

  return (
    <div className="harvest-results">
      <div className="harvest-header">
        <h3>Resource Harvest Results</h3>
        <span className="territory-name">{territory_name}</span>
      </div>

      <div className="multiplier-info">
        <span className="label">Leverage Multiplier:</span>
        <span className="value">{(multiplier || 1).toFixed(2)}x</span>
      </div>

      <div className="resources-list">
        {(resources || []).map((resource: Resource, index: number) => (
          <div key={`${resource.type}-${index}`} className="resource-item">
            <div className="resource-header">
              <span className="resource-type">{resource.type}</span>
              <span className="resource-total">+{resource.total_amount}</span>
            </div>
            <div className="resource-breakdown">
              <div className="base-amount">
                Base: {resource.base_amount}
              </div>
              <div className="bonus-amount">
                Bonus: +{resource.bonus_amount}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(mission_updates || []).length > 0 && (
        <div className="mission-updates">
          <h4>Mission Progress</h4>
          {(mission_updates || []).map((update: MissionUpdate) => (
            <div key={update.id} className="mission-update">
              <div className="mission-type">{update.type}</div>
              <div className="progress-update">
                <div className="progress-bar">
                  <div 
                    className="progress-fill previous" 
                    style={{ width: `${update.previous_progress}%` }} 
                  />
                  <div 
                    className="progress-fill increase" 
                    style={{ 
                      width: `${update.increase}%`,
                      left: `${update.previous_progress}%`
                    }} 
                  />
                </div>
                <div className="progress-numbers">
                  <span>{update.previous_progress}%</span>
                  <span className="progress-arrow">→</span>
                  <span>{update.new_progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .harvest-results {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #44f;
          border-radius: 12px;
          padding: 20px;
          color: white;
          min-width: 300px;
          max-width: 500px;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .harvest-header {
          text-align: center;
          margin-bottom: 20px;
        }

        h3 {
          color: #88f;
          margin: 0 0 5px 0;
          font-size: 1.4em;
        }

        .territory-name {
          color: #aaa;
          font-size: 1.1em;
        }

        .multiplier-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(68, 68, 255, 0.1);
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .label {
          color: #aaa;
        }

        .value {
          color: #44f;
          font-weight: bold;
          font-size: 1.2em;
        }

        .resources-list {
          display: grid;
          gap: 15px;
          margin-bottom: 20px;
        }

        .resource-item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
        }

        .resource-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .resource-type {
          color: #88f;
          font-weight: bold;
          text-transform: capitalize;
        }

        .resource-total {
          color: #4f4;
          font-weight: bold;
        }

        .resource-breakdown {
          display: flex;
          gap: 15px;
          font-size: 0.9em;
        }

        .base-amount {
          color: #aaa;
        }

        .bonus-amount {
          color: #4f4;
        }

        .mission-updates {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
        }

        h4 {
          color: #88f;
          margin: 0 0 15px 0;
        }

        .mission-update {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        }

        .mission-type {
          color: #88f;
          margin-bottom: 8px;
        }

        .progress-bar {
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .progress-fill {
          position: absolute;
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-fill.previous {
          background: #44f;
        }

        .progress-fill.increase {
          background: #4f4;
          animation: fillProgress 1s ease;
        }

        .progress-numbers {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          color: #aaa;
          font-size: 0.9em;
        }

        .progress-arrow {
          color: #4f4;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }

        @keyframes fillProgress {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default HarvestResults;