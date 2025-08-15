import React, { useState, useEffect } from 'react';
import { useGameContext } from '../context/GameContext';

const LeverageDisplay: React.FC = () => {
  const { gameState, character, territories, sendMessage } = useGameContext();
  const [leverageData, setLeverageData] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    // Request leverage calculation
    sendMessage({ type: 'calculate_leverage' });
  }, [territories, character]);

  useEffect(() => {
    if (gameState && gameState.leverage_analysis) {
      setLeverageData(gameState.leverage_analysis);
    }
  }, [gameState]);

  const mockLeverageData = leverageData || {
    total: 2.45,
    base_rate: 1.0,
    bonuses: {
      territory_control: { value: 0.8, description: "Territory Dominance", max: 2.0, progress: 40 },
      resource_diversity: { value: 0.3, description: "Resource Variety", max: 1.0, progress: 30 },
      mission_completion: { value: 0.2, description: "Mission Success", max: 1.5, progress: 13 },
      character_level: { value: 0.15, description: "Commander Experience", max: 1.0, progress: 15 },
      special_achievements: { value: 0.0, description: "Special Achievements", max: 2.0, progress: 0 }
    },
    efficiency: 78,
    potential_increase: 0.95,
    recommendations: [
      "Claim 2 more territories for +0.4 leverage bonus",
      "Complete exploration mission for +0.1 efficiency",
      "Research advanced harvesting for +0.2 base rate",
      "Diversify resource collection for +0.1 bonus"
    ]
  };

  const getBonusColor = (progress: number) => {
    if (progress >= 80) return '#44ff44';
    if (progress >= 50) return '#ffff44';
    if (progress >= 25) return '#ff8844';
    return '#ff4444';
  };

  const calculateOptimalStrategy = () => {
    const strategies = [
      {
        action: "Territorial Expansion",
        impact: "+0.4 Leverage",
        difficulty: "Medium",
        description: "Claim 2-3 unclaimed territories to increase your domain multiplier",
        priority: "High",
        timeEstimate: "10-15 minutes"
      },
      {
        action: "Mission Completion",
        impact: "+0.3 Leverage",
        difficulty: "Easy",
        description: "Complete available exploration and research missions",
        priority: "High",
        timeEstimate: "5-10 minutes"
      },
      {
        action: "Resource Diversification",
        impact: "+0.2 Leverage",
        difficulty: "Medium",
        description: "Harvest from territories with different resource types",
        priority: "Medium",
        timeEstimate: "15-20 minutes"
      },
      {
        action: "Defense Optimization",
        impact: "+0.15 Leverage",
        difficulty: "Hard",
        description: "Build comprehensive defense networks across all territories",
        priority: "Medium",
        timeEstimate: "20-30 minutes"
      },
      {
        action: "Technology Research",
        impact: "+0.25 Leverage",
        difficulty: "Hard",
        description: "Unlock advanced research to boost base efficiency",
        priority: "Low",
        timeEstimate: "30+ minutes"
      }
    ];

    return strategies.sort((a, b) => {
      const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  const strategies = calculateOptimalStrategy();

  return (
    <div className="leverage-display">
      <div className="leverage-header">
        <h2>⚖️ Empire Leverage Analysis</h2>
        <div className="leverage-score">
          <div className="score-circle">
            <span className="score-value">{formatNumber(mockLeverageData.total)}x</span>
            <span className="score-label">Total Leverage</span>
          </div>
          <div className="efficiency-meter">
            <div className="efficiency-label">Efficiency Rating</div>
            <div className="efficiency-bar">
              <div 
                className="efficiency-fill"
                style={{ 
                  width: `${mockLeverageData.efficiency}%`,
                  background: getBonusColor(mockLeverageData.efficiency)
                }}
              ></div>
            </div>
            <div className="efficiency-value">{mockLeverageData.efficiency}%</div>
          </div>
        </div>
      </div>

      <div className="metric-tabs">
        {[
          { id: 'overview', name: 'Overview' },
          { id: 'bonuses', name: 'Bonus Analysis' },
          { id: 'strategy', name: 'Optimization' },
          { id: 'predictions', name: 'Forecasting' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`metric-tab ${selectedMetric === tab.id ? 'active' : ''}`}
            onClick={() => setSelectedMetric(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="metric-content">
        {selectedMetric === 'overview' && (
          <div className="overview-metrics">
            <div className="metric-grid">
              <div className="metric-card primary">
                <h4>📊 Base Leverage</h4>
                <div className="metric-value">{formatNumber(mockLeverageData.base_rate)}x</div>
                <div className="metric-description">Your fundamental multiplier</div>
              </div>
              
              <div className="metric-card secondary">
                <h4>🚀 Bonus Multiplier</h4>
                <div className="metric-value">
                  +{formatNumber(mockLeverageData.total - mockLeverageData.base_rate)}x
                </div>
                <div className="metric-description">Additional bonuses earned</div>
              </div>
              
              <div className="metric-card tertiary">
                <h4>📈 Potential Growth</h4>
                <div className="metric-value">+{formatNumber(mockLeverageData.potential_increase)}x</div>
                <div className="metric-description">Available improvements</div>
              </div>
            </div>

            <div className="performance-summary">
              <h4>🎯 Performance Summary</h4>
              <div className="summary-items">
                <div className="summary-item">
                  <span className="summary-label">Empire Size:</span>
                  <span className="summary-value">{territories?.filter(t => t.controlled)?.length || 1} territories</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Resource Income:</span>
                  <span className="summary-value">{Math.round((mockLeverageData.total * 100))} units/min</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Expansion Rate:</span>
                  <span className="summary-value">{formatNumber(mockLeverageData.efficiency / 10, 1)} territories/hour</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Overall Rating:</span>
                  <span className={`summary-value rating-${mockLeverageData.efficiency >= 80 ? 'excellent' : mockLeverageData.efficiency >= 60 ? 'good' : mockLeverageData.efficiency >= 40 ? 'average' : 'poor'}`}>
                    {mockLeverageData.efficiency >= 80 ? 'Excellent' : 
                     mockLeverageData.efficiency >= 60 ? 'Good' : 
                     mockLeverageData.efficiency >= 40 ? 'Average' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMetric === 'bonuses' && (
          <div className="bonus-analysis">
            <h4>🎁 Leverage Bonus Breakdown</h4>
            <div className="bonus-list">
              {Object.entries(mockLeverageData.bonuses).map(([key, bonus]: [string, any]) => (
                <div key={key} className="bonus-item">
                  <div className="bonus-header">
                    <h5>{bonus.description}</h5>
                    <div className="bonus-value">+{formatNumber(bonus.value)}</div>
                  </div>
                  <div className="bonus-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${bonus.progress}%`,
                          background: getBonusColor(bonus.progress)
                        }}
                      ></div>
                    </div>
                    <div className="progress-info">
                      <span>{bonus.progress}% of maximum</span>
                      <span>Max: +{formatNumber(bonus.max)}</span>
                    </div>
                  </div>
                  <div className="bonus-potential">
                    Potential: +{formatNumber(bonus.max - bonus.value)} additional leverage
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedMetric === 'strategy' && (
          <div className="optimization-strategy">
            <h4>🎯 Optimization Recommendations</h4>
            <div className="strategy-list">
              {strategies.map((strategy, index) => (
                <div key={index} className={`strategy-card priority-${strategy.priority.toLowerCase()}`}>
                  <div className="strategy-header">
                    <h5>{strategy.action}</h5>
                    <div className="strategy-badges">
                      <span className={`priority-badge ${strategy.priority.toLowerCase()}`}>
                        {strategy.priority} Priority
                      </span>
                      <span className={`difficulty-badge ${strategy.difficulty.toLowerCase()}`}>
                        {strategy.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="strategy-impact">
                    <span className="impact-label">Expected Impact:</span>
                    <span className="impact-value">{strategy.impact}</span>
                  </div>
                  <div className="strategy-description">
                    {strategy.description}
                  </div>
                  <div className="strategy-time">
                    ⏱️ Estimated Time: {strategy.timeEstimate}
                  </div>
                  <button 
                    className="strategy-action-btn"
                    onClick={() => sendMessage({ 
                      type: 'execute_strategy', 
                      strategy: strategy.action.toLowerCase().replace(' ', '_') 
                    })}
                  >
                    Execute Strategy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedMetric === 'predictions' && (
          <div className="forecasting">
            <h4>🔮 Empire Growth Forecasting</h4>
            <div className="forecast-grid">
              <div className="forecast-card">
                <h5>📊 1 Hour Projection</h5>
                <div className="forecast-value">{formatNumber(mockLeverageData.total * 1.2)}x leverage</div>
                <div className="forecast-description">
                  With current optimization rate
                </div>
              </div>
              <div className="forecast-card">
                <h5>🚀 1 Day Projection</h5>
                <div className="forecast-value">{formatNumber(mockLeverageData.total * 2.5)}x leverage</div>
                <div className="forecast-description">
                  Following recommended strategies
                </div>
              </div>
              <div className="forecast-card">
                <h5>🌟 1 Week Projection</h5>
                <div className="forecast-value">{formatNumber(mockLeverageData.total * 6.8)}x leverage</div>
                <div className="forecast-description">
                  With optimal empire management
                </div>
              </div>
            </div>

            <div className="forecast-chart">
              <h5>📈 Growth Trajectory</h5>
              <div className="chart-container">
                <div className="chart-bars">
                  {[
                    { label: 'Current', value: mockLeverageData.total, color: '#4444ff' },
                    { label: '1 Hour', value: mockLeverageData.total * 1.2, color: '#6666ff' },
                    { label: '6 Hours', value: mockLeverageData.total * 1.8, color: '#8888ff' },
                    { label: '1 Day', value: mockLeverageData.total * 2.5, color: '#aaaaff' },
                    { label: '3 Days', value: mockLeverageData.total * 4.2, color: '#ccccff' },
                    { label: '1 Week', value: mockLeverageData.total * 6.8, color: '#eeeeff' }
                  ].map((bar, index) => (
                    <div key={index} className="chart-bar">
                      <div 
                        className="bar-fill"
                        style={{ 
                          height: `${(bar.value / 7) * 100}%`,
                          background: bar.color
                        }}
                      ></div>
                      <div className="bar-label">{bar.label}</div>
                      <div className="bar-value">{formatNumber(bar.value)}x</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .leverage-display {
          padding: 20px;
          color: white;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .leverage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid rgba(0, 255, 255, 0.3);
        }

        .leverage-header h2 {
          margin: 0;
          color: #00ffff;
          font-size: 24px;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }

        .leverage-score {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .score-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(45deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 255, 0.2));
          border: 3px solid #00ffff;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .score-value {
          font-size: 24px;
          font-weight: bold;
          color: #00ffff;
        }

        .score-label {
          font-size: 12px;
          color: #aaaaaa;
          text-align: center;
        }

        .efficiency-meter {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .efficiency-label {
          font-size: 14px;
          color: #aaaaaa;
        }

        .efficiency-bar {
          width: 150px;
          height: 12px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .efficiency-fill {
          height: 100%;
          transition: width 0.5s ease;
        }

        .efficiency-value {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
        }

        .metric-tabs {
          display: flex;
          gap: 2px;
          margin-bottom: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          padding: 4px;
        }

        .metric-tab {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: none;
          color: #aaaaaa;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 4px;
          font-size: 14px;
        }

        .metric-tab.active {
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
        }

        .metric-tab:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .metric-content {
          min-height: 400px;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .metric-card {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
        }

        .metric-card.primary {
          border-color: #00ffff;
          background: rgba(0, 255, 255, 0.1);
        }

        .metric-card.secondary {
          border-color: #44ff44;
          background: rgba(68, 255, 68, 0.1);
        }

        .metric-card.tertiary {
          border-color: #ffff44;
          background: rgba(255, 255, 68, 0.1);
        }

        .metric-card h4 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #ffffff;
        }

        .metric-value {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #00ffff;
        }

        .metric-description {
          font-size: 12px;
          color: #aaaaaa;
        }

        .performance-summary {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 20px;
        }

        .performance-summary h4 {
          margin: 0 0 15px 0;
          color: #00ffff;
          font-size: 18px;
        }

        .summary-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 10px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .summary-label {
          color: #aaaaaa;
          font-size: 14px;
        }

        .summary-value {
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        .rating-excellent { color: #44ff44; }
        .rating-good { color: #88ff44; }
        .rating-average { color: #ffff44; }
        .rating-poor { color: #ff4444; }

        .bonus-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .bonus-item {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bonus-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .bonus-header h5 {
          margin: 0;
          color: #00ffff;
          font-size: 16px;
        }

        .bonus-value {
          color: #44ff44;
          font-weight: bold;
          font-size: 18px;
        }

        .bonus-progress {
          margin-bottom: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 5px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .progress-fill {
          height: 100%;
          transition: width 0.5s ease;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #aaaaaa;
        }

        .bonus-potential {
          font-size: 12px;
          color: #ffff44;
          font-style: italic;
        }

        .strategy-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .strategy-card {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 20px;
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }

        .strategy-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .strategy-card.priority-high {
          border-color: #ff4444;
          background: rgba(255, 68, 68, 0.1);
        }

        .strategy-card.priority-medium {
          border-color: #ffff44;
          background: rgba(255, 255, 68, 0.1);
        }

        .strategy-card.priority-low {
          border-color: #4444ff;
          background: rgba(68, 68, 255, 0.1);
        }

        .strategy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .strategy-header h5 {
          margin: 0;
          color: #00ffff;
          font-size: 18px;
        }

        .strategy-badges {
          display: flex;
          gap: 8px;
        }

        .priority-badge,
        .difficulty-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .priority-badge.high { background: #ff4444; color: white; }
        .priority-badge.medium { background: #ffff44; color: black; }
        .priority-badge.low { background: #4444ff; color: white; }

        .difficulty-badge.easy { background: #44ff44; color: black; }
        .difficulty-badge.medium { background: #ffaa44; color: black; }
        .difficulty-badge.hard { background: #ff6644; color: white; }

        .strategy-impact {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .impact-label {
          color: #aaaaaa;
          font-size: 14px;
        }

        .impact-value {
          color: #44ff44;
          font-weight: bold;
          font-size: 14px;
        }

        .strategy-description {
          color: white;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 10px;
        }

        .strategy-time {
          color: #ffff44;
          font-size: 12px;
          margin-bottom: 15px;
        }

        .strategy-action-btn {
          background: linear-gradient(45deg, #00ff44, #44ff88);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }

        .strategy-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 68, 0.3);
        }

        .forecast-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .forecast-card {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .forecast-card h5 {
          margin: 0 0 10px 0;
          color: #00ffff;
          font-size: 16px;
        }

        .forecast-value {
          font-size: 24px;
          font-weight: bold;
          color: #44ff44;
          margin-bottom: 8px;
        }

        .forecast-description {
          font-size: 12px;
          color: #aaaaaa;
        }

        .forecast-chart {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 20px;
        }

        .forecast-chart h5 {
          margin: 0 0 15px 0;
          color: #00ffff;
          font-size: 18px;
        }

        .chart-container {
          height: 200px;
          display: flex;
          align-items: end;
          justify-content: center;
        }

        .chart-bars {
          display: flex;
          align-items: end;
          gap: 15px;
          height: 100%;
        }

        .chart-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          min-width: 60px;
        }

        .bar-fill {
          width: 40px;
          min-height: 10px;
          border-radius: 4px 4px 0 0;
          transition: height 0.5s ease;
          position: relative;
        }

        .bar-label {
          font-size: 11px;
          color: #aaaaaa;
          margin-top: 8px;
          text-align: center;
        }

        .bar-value {
          font-size: 12px;
          color: white;
          font-weight: bold;
          margin-top: 4px;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .leverage-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .leverage-score {
            justify-content: center;
          }

          .metric-grid {
            grid-template-columns: 1fr;
          }

          .summary-items {
            grid-template-columns: 1fr;
          }

          .forecast-grid {
            grid-template-columns: 1fr;
          }

          .chart-bars {
            gap: 8px;
          }

          .chart-bar {
            min-width: 40px;
          }

          .bar-fill {
            width: 30px;
          }
        }
      `}</style>
    </div>
  );
};

export default LeverageDisplay;