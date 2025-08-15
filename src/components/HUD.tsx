import React, { useState, useEffect } from 'react';
import { useGameContext } from '../context/GameContext';
import Mission from './Mission';
import LeverageDisplay from './LeverageDisplay';
import HarvestResults from './HarvestResults';
import Tutorial from './Tutorial';

const HUD: React.FC = () => {
  const { 
    gameState, 
    character, 
    activeCharacter,
    missions, 
    territories, 
    error, 
    loading,
    sendMessage,
    world,
    getWorld
  } = useGameContext();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showTutorial, setShowTutorial] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    timestamp: number;
  }>>([]);

  // Add notifications when game state changes
  useEffect(() => {
    if (gameState && typeof gameState === 'object') {
      // Check for resource changes
      if (gameState.resources_gained) {
        addNotification(
          `+${gameState.resources_gained.amount} ${gameState.resources_gained.type}`,
          'success'
        );
      }
      
      // Check for level ups
      if (gameState.level_up) {
        addNotification(
          `🎉 Level Up! Now level ${gameState.character?.level || 1}`,
          'success'
        );
      }
      
      // Check for new territories
      if (gameState.territory_claimed) {
        addNotification(
          `🚩 Territory "${gameState.territory_claimed}" claimed!`,
          'success'
        );
      }
    }
  }, [gameState]);

  // Listen for mission and strategy events
  useEffect(() => {
    const handleMissionAccepted = (e: any) => {
      const detail = e.detail;
      addNotification(detail.message, 'info');
      // Additional detailed notification
      setTimeout(() => {
        addNotification(
          `📍 Mission target at ${detail.target?.name || 'unknown location'}. Progress will be tracked automatically.`,
          'info'
        );
      }, 1000);
    };

    const handleStrategyExecuted = (e: any) => {
      const detail = e.detail;
      addNotification(detail.detailedMessage, detail.success ? 'success' : 'warning');
      // Show additional results if available
      if (detail.message && detail.message !== 'Strategy executed successfully') {
        setTimeout(() => {
          addNotification(`📊 ${detail.message}`, 'info');
        }, 1000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mission-accepted', handleMissionAccepted);
      window.addEventListener('strategy-executed', handleStrategyExecuted);
      
      return () => {
        window.removeEventListener('mission-accepted', handleMissionAccepted);
        window.removeEventListener('strategy-executed', handleStrategyExecuted);
      };
    }
  }, []);

  const addNotification = (message: string, type: 'success' | 'warning' | 'info' | 'error') => {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // const calculateProgress = () => {
  //   const totalTerritories = territories?.length || 5;
  //   const controlledTerritories = territories?.filter((t: any) => t.controlled)?.length || 1;
  //   return (controlledTerritories / totalTerritories) * 100;
  // };

  // const getCurrentObjective = () => {
  //   const controlledCount = territories?.filter((t: any) => t.controlled)?.length || 1;
  //   const totalCount = territories?.length || 5;
  //   
  //   if (controlledCount === 0) {
  //     return "Claim your first territory to begin your galactic expansion";
  //   } else if (controlledCount < totalCount / 2) {
  //     return "Expand your control to dominate the sector";
  //   } else if (controlledCount < totalCount) {
  //     return "Complete your territorial conquest";
  //   } else {
  //     return "Empire complete! Research new technologies";
  //   }
  // };

  const getAllControlledPlanets = () => {
    // Get planets from world data
    const worldPlanets = (world?.galaxies?.[0]?.systems || [])
      .flatMap((system: any) => 
        (system.planets || []).map((planet: any) => ({
          id: planet.id,
          name: planet.name || `${system.name} - ${planet.name}`,
          controlled: planet.controlledBy && (
            planet.controlledBy.includes('127.0.0.1') || 
            planet.controlledBy.includes('localhost') ||
            planet.controlledBy.includes('player') ||
            planet.controlledBy === 'guest_local'
          ),
          defense: planet.defense || 0,
          resources: planet.resources || [],
          system: system.name || 'Unknown System',
          position: planet.position
        }))
      );

    // Combine with territories from context
    const contextTerritories = territories?.map((t: any) => ({
      id: t.id,
      name: t.name || 'Territory',
      controlled: t.controlled,
      defense: t.defense || 0,
      resources: t.resources || [],
      system: 'Legacy Territory',
      position: null
    })) || [];

    return [...worldPlanets, ...contextTerritories];
  };

  const getTotalResources = () => {
    if (!character || !character.resources) return { energy: 0, minerals: 0, crystals: 0, gas: 0 };
    
    return {
      energy: character.resources.energy || 0,
      minerals: character.resources.minerals || 0,
      crystals: character.resources.crystals || 0,
      gas: character.resources.gas || 0
    };
  };

  // const quickActions = [
  //   {
  //     name: 'Auto-Harvest',
  //     icon: '⚡',
  //     action: () => sendMessage({ type: 'auto_harvest', enabled: true }),
  //     description: 'Automatically harvest from all controlled territories'
  //   },
  //   {
  //     name: 'Research',
  //     icon: '🔬',
  //     action: () => sendMessage({ type: 'research', tech: 'efficiency' }),
  //     description: 'Research efficiency improvements'
  //   },
  //   {
  //     name: 'Defend All',
  //     icon: '🛡️',
  //     action: () => sendMessage({ type: 'defend_all' }),
  //     description: 'Upgrade defenses on all territories'
  //   },
  //   {
  //     name: 'Explore',
  //     icon: '🚀',
  //     action: () => sendMessage({ type: 'explore_new_sectors' }),
  //     description: 'Search for new territories to claim'
  //   }
  // ];

  return (
    <>
      {/* Galaxy Status Header Bar */}
      <div className="galaxy-status-bar" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(180deg, rgba(0,20,40,0.95) 0%, rgba(0,10,30,0.8) 100%)',
        borderBottom: '2px solid #00ffff',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: '#00ffff',
            textShadow: '0 0 10px #00ffff'
          }}>
            🌌 GALACTIC COMMAND
          </div>
          <div style={{
            background: 'rgba(0,255,255,0.1)',
            border: '1px solid #00ffff',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            color: '#88ccff'
          }}>
            SECTOR: ALPHA-7 | STATUS: OPERATIONAL
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '14px', color: '#88ccff' }}>
            ⚡ {getTotalResources().energy.toLocaleString()} | 
            🏛️ {territories?.filter((t: any) => t.controlled)?.length || 0}/{territories?.length || 5}
          </div>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#00ff00',
            boxShadow: '0 0 10px #00ff00',
            animation: 'pulse 2s infinite'
          }}></div>
        </div>
      </div>

      {/* Speed Controls */}
      <div className="quick-actions">
        <div className="speed-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#aaa', marginRight: '4px' }}>Speed:</span>
          <button 
            className="btn speed-btn" 
            onClick={() => window.dispatchEvent(new CustomEvent('set-speed', { detail: { speed: 1 } }))}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            1x
          </button>
          <button 
            className="btn speed-btn" 
            onClick={() => window.dispatchEvent(new CustomEvent('set-speed', { detail: { speed: 2 } }))}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            2x
          </button>
          <button 
            className="btn speed-btn" 
            onClick={() => window.dispatchEvent(new CustomEvent('set-speed', { detail: { speed: 3 } }))}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            3x
          </button>

        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="tab-container">
        <div className="tab-buttons">
          {[
            { id: 'overview', name: '📊 Overview', count: null },
            { id: 'resources', name: '💎 Resources', count: Object.values(getTotalResources()).reduce((a, b) => a + b, 0) },
            { id: 'territories', name: '🗺️ Territories', count: getAllControlledPlanets().filter(t => t.controlled).length },
            { id: 'missions', name: '🎯 Missions', count: missions?.length || 0 },
            { id: 'leverage', name: '⚖️ Leverage', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
              {tab.count !== null && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-panel">
              {/* Enhanced Navigation Controls */}
              <div className="navigation-controls" style={{ 
                marginBottom: '20px', 
                display: 'flex', 
                gap: '15px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button 
                  className="btn nav-btn" 
                  onClick={() => window.dispatchEvent(new CustomEvent('center-camera'))}
                  style={{
                    background: 'linear-gradient(145deg, #0066cc, #004499)',
                    border: '2px solid #0088ff',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,136,255,0.4)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,136,255,0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,136,255,0.4)';
                  }}
                >
                  📍 Center View
                </button>
                <button 
                  className="btn nav-btn" 
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle-galaxy-view'))}
                  style={{
                    background: 'linear-gradient(145deg, #6600cc, #4400aa)',
                    border: '2px solid #8800ff',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(136,0,255,0.4)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(136,0,255,0.6)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(136,0,255,0.4)';
                  }}
                >
                  🌌 Toggle Galaxy View
                </button>
              </div>

              <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                padding: '0 5px'
              }}>
                <div className="stat-card enhanced-card" style={{
                  background: 'linear-gradient(145deg, rgba(0,50,100,0.95), rgba(0,30,80,0.9))',
                  border: '2px solid #00aaff',
                  borderRadius: '16px',
                  padding: '18px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(0,170,255,0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #00aaff, #0066cc, #00aaff)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite'
                  }}></div>
                  <h4 style={{ 
                    color: '#00ccff', 
                    fontSize: '16px', 
                    marginBottom: '8px',
                    textShadow: '0 0 10px rgba(0,204,255,0.5)'
                  }}>🏛️ Empire Status</h4>
                  <div className="stat-value" style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {world && world.galaxies ? 
                      world.galaxies.flatMap((g: any) => 
                        g.systems.flatMap((s: any) => 
                          s.planets.filter((p: any) => p.controlledBy === 'player')
                        )
                      ).length : 0}
                    {' / '}
                    {world && world.galaxies ? 
                      world.galaxies.flatMap((g: any) => 
                        g.systems.flatMap((s: any) => s.planets)
                      ).length : 0}
                  </div>
                  <div className="stat-label" style={{ 
                    color: '#88ccff', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginTop: '4px'
                  }}>Territories Controlled</div>
                </div>

                <div className="stat-card enhanced-card" style={{
                  background: 'linear-gradient(145deg, rgba(100,50,0,0.95), rgba(80,30,0,0.9))',
                  border: '2px solid #ffaa00',
                  borderRadius: '16px',
                  padding: '18px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(255,170,0,0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #ffaa00, #cc8800, #ffaa00)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite'
                  }}></div>
                  <h4 style={{ 
                    color: '#ffcc00', 
                    fontSize: '16px', 
                    marginBottom: '8px',
                    textShadow: '0 0 10px rgba(255,204,0,0.5)'
                  }}>⚡ Total Energy</h4>
                  <div className="stat-value" style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {activeCharacter?.resources?.energy || 0}
                  </div>
                  <div className="stat-label" style={{ 
                    color: '#ffcc88', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginTop: '4px'
                  }}>Available Power</div>
                </div>

                <div className="stat-card enhanced-card" style={{
                  background: 'linear-gradient(145deg, rgba(0,100,50,0.95), rgba(0,80,30,0.9))',
                  border: '2px solid #00ff88',
                  borderRadius: '16px',
                  padding: '18px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(0,255,136,0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #00ff88, #00cc66, #00ff88)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite'
                  }}></div>
                  <h4 style={{ 
                    color: '#00ff88', 
                    fontSize: '16px', 
                    marginBottom: '8px',
                    textShadow: '0 0 10px rgba(0,255,136,0.5)'
                  }}>🏗️ Production Rate</h4>
                  <div className="stat-value" style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {world && world.galaxies ? 
                      world.galaxies.flatMap((g: any) => 
                        g.systems.flatMap((s: any) => 
                          s.planets.filter((p: any) => p.controlledBy === 'player')
                        )
                      ).length * 25 : 0}/min
                  </div>
                  <div className="stat-label" style={{ 
                    color: '#88ffcc', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginTop: '4px'
                  }}>Resource Generation</div>
                </div>

                <div className="stat-card enhanced-card" style={{
                  background: 'linear-gradient(145deg, rgba(100,0,50,0.95), rgba(80,0,30,0.9))',
                  border: '2px solid #ff0088',
                  borderRadius: '16px',
                  padding: '18px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 20px rgba(255,0,136,0.25)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #ff0088, #cc0066, #ff0088)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite'
                  }}></div>
                  <h4 style={{ 
                    color: '#ff0088', 
                    fontSize: '16px', 
                    marginBottom: '8px',
                    textShadow: '0 0 10px rgba(255,0,136,0.5)'
                  }}>🛡️ Defense Rating</h4>
                  <div className="stat-value" style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    {territories?.reduce((sum: number, t: any) => sum + (t.defense || 0), 0) || 0}
                  </div>
                  <div className="stat-label" style={{ 
                    color: '#ff88cc', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    marginTop: '4px'
                  }}>Total Protection</div>
                </div>
              </div>

              <div className="recent-activity">
                <h4>📈 Recent Activity</h4>
                <div className="activity-feed">
                  <div className="activity-item">
                    <span className="activity-icon">🔋</span>
                    <span className="activity-text">Harvested 150 energy from Alpha Sector</span>
                    <span className="activity-time">2 min ago</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">🚩</span>
                    <span className="activity-text">Successfully claimed Beta Quadrant</span>
                    <span className="activity-time">5 min ago</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">🛡️</span>
                    <span className="activity-text">Defense systems upgraded</span>
                    <span className="activity-time">8 min ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="resources-panel">
              <div className="resources-grid">
                {Object.entries(getTotalResources()).map(([type, amount]) => (
                  <div key={type} className="resource-card">
                    <div className="resource-icon">
                      {type === 'energy' && '⚡'}
                      {type === 'minerals' && '🗿'}
                      {type === 'crystals' && '💎'}
                      {type === 'gas' && '☁️'}
                    </div>
                    <div className="resource-info">
                      <h4>{type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                      <div className="resource-amount">{amount}</div>
                      <div className="resource-rate">+{Math.floor(amount * 0.1)}/min</div>
                    </div>
                  </div>
                ))}
              </div>
              <HarvestResults />
            </div>
          )}

          {activeTab === 'territories' && (
            <div className="territories-panel">
              <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(0, 100, 200, 0.2)', borderRadius: '6px', border: '1px solid #66aaff' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#88ccff' }}>🌌 Your Galactic Empire</h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                  Controlled: {getAllControlledPlanets().filter(t => t.controlled).length} | 
                  Total Discovered: {getAllControlledPlanets().length}
                </p>
              </div>
              <div className="territories-list">
                {getAllControlledPlanets().map((territory, index) => (
                  <div key={territory.id || index} className={`territory-item ${territory.controlled ? 'controlled' : 'unclaimed'}`}>
                    <div className="territory-header">
                      <h4>{territory.name}</h4>
                      <div className="territory-status">
                        {territory.controlled ? '🟢 Controlled' : '🔴 Unclaimed'}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaaaaa', marginBottom: '8px' }}>
                      📍 System: {territory.system}
                      {territory.position && (
                        <span style={{ marginLeft: '10px' }}>
                          🎯 Position: ({territory.position.x?.toFixed(1)}, {territory.position.y?.toFixed(1)}, {territory.position.z?.toFixed(1)})
                        </span>
                      )}
                    </div>
                    <div className="territory-resources">
                      {territory.resources?.map((resource: any, rIndex: number) => (
                        <span key={rIndex} className="resource-tag">
                          {resource.type}: {resource.amount}
                        </span>
                      ))}
                      {(!territory.resources || territory.resources.length === 0) && (
                        <span className="resource-tag" style={{ opacity: 0.6 }}>
                          No resources detected
                        </span>
                      )}
                    </div>
                    {(territory.defense || 0) > 0 && (
                      <div className="territory-defense">
                        🛡️ Defense Level: {territory.defense}
                      </div>
                    )}
                  </div>
                ))}
                {getAllControlledPlanets().length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaaaaa' }}>
                    <h3>🌌 No Territories Discovered</h3>
                    <p>Explore the galaxy to discover and claim new territories!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'missions' && (
            <div className="missions-panel">
              {missions && missions.length > 0 ? (
                missions.map((mission: any, index: number) => (
                  <Mission
                    key={mission.id || index}
                    {...mission}
                    type={mission.type || 'exploration'}
                    progress_rate={mission.progress_rate || 0.1}
                    time_started={mission.time_started || Date.now()}
                    onAccept={() => {
                      if (mission.id && sendMessage) {
                        sendMessage({ type: 'accept_mission', mission_id: mission.id });
                        addNotification(
                          `🎯 Mission "${mission.title}" accepted! Check progress in the missions tab.`,
                          'info'
                        );
                      }
                    }}
                    onComplete={() => {
                      if (mission.id && sendMessage) {
                        sendMessage({ type: 'complete_mission', mission_id: mission.id });
                        addNotification(
                          `🏆 Mission "${mission.title}" completed! Rewards claimed.`,
                          'success'
                        );
                      }
                    }}
                  />
                ))
              ) : (
                <div className="no-missions">
                  <h3>🎯 No Active Missions</h3>
                  <p>New missions will appear as you expand your empire and explore the galaxy.</p>
                  <button 
                    className="explore-btn"
                    onClick={() => sendMessage({ type: 'request_new_missions' })}
                  >
                    🚀 Explore for New Missions
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leverage' && (
            <div className="leverage-panel">
              <LeverageDisplay />
            </div>
          )}
        </div>
      </div>

      {/* Tutorial Component */}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

      {/* Tutorial Toggle Button */}
      <button 
        className="tutorial-btn"
        onClick={() => setShowTutorial(true)}
        title="Show Tutorial"
      >
        ❓
      </button>

      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification ${notification.type}`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">🌌</div>
          <div className="loading-text">Processing...</div>
        </div>
      )}

      <style>{`
        .game-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .hud-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
        }

        .hud-overlay > * {
          pointer-events: auto;
        }

        .header-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 120px;
          background: linear-gradient(180deg, rgba(0, 20, 40, 0.95) 0%, rgba(0, 20, 40, 0.8) 100%);
          border-bottom: 2px solid #00ffff;
          display: flex;
          align-items: center;
          padding: 10px 20px;
          backdrop-filter: blur(10px);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
        }

        .avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(45deg, #00ffff, #0088ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border: 3px solid #00ffff;
        }

        .player-details h3 {
          margin: 0;
          color: #00ffff;
          font-size: 18px;
        }

        .level-badge {
          background: linear-gradient(45deg, #ff6600, #ff8800);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          display: inline-block;
          margin: 4px 0;
        }

        .experience-bar {
          position: relative;
          width: 200px;
          height: 20px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #00ffff;
        }

        .experience-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff44, #44ff88);
          transition: width 0.5s ease;
        }

        .experience-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .current-objective {
          flex: 2;
          padding: 0 20px;
          color: white;
        }

        .current-objective h4 {
          margin: 0 0 8px 0;
          color: #ffff00;
          font-size: 16px;
        }

        .current-objective p {
          margin: 0 0 10px 0;
          font-size: 14px;
          line-height: 1.4;
        }

        .progress-bar {
          position: relative;
          width: 100%;
          height: 16px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #ffff00;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6600, #ffff00);
          transition: width 0.5s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 11px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }

        .quick-actions {
          flex: 1;
          color: white;
        }

        .quick-actions h4 {
          margin: 0 0 10px 0;
          color: #ff44ff;
          font-size: 16px;
        }

        .action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .quick-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 11px;
        }

        .quick-action-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .action-icon {
          font-size: 16px;
          margin-bottom: 4px;
        }

        .tab-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100vw;
          height: 300px;
          background: linear-gradient(0deg, rgba(0, 20, 40, 0.95) 0%, rgba(0, 20, 40, 0.8) 100%);
          border-top: 2px solid #00ffff;
          backdrop-filter: blur(10px);
          z-index: 100;
          pointer-events: auto;
        }

        .tab-buttons {
          display: flex;
          border-bottom: 2px solid #00ffff;
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: none;
          border-right: 1px solid rgba(0, 255, 255, 0.3);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          font-size: 14px;
        }

        .tab-btn:last-child {
          border-right: none;
        }

        .tab-btn.active {
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
        }

        .tab-btn:hover {
          background: rgba(0, 255, 255, 0.1);
        }

        .tab-count {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #ff4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
        }

        .tab-content {
          height: calc(100% - 50px);
          overflow-y: auto;
          padding: 20px;
          color: white;
        }

        .overview-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .stat-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }

        .stat-card h4 {
          margin: 0 0 10px 0;
          color: #00ffff;
          font-size: 14px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 12px;
          color: #aaaaaa;
        }

        .recent-activity h4 {
          margin: 0 0 15px 0;
          color: #00ffff;
          font-size: 16px;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 10px;
        }

        .activity-icon {
          font-size: 18px;
        }

        .activity-text {
          flex: 1;
          font-size: 14px;
        }

        .activity-time {
          font-size: 12px;
          color: #aaaaaa;
        }

        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .resource-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .resource-icon {
          font-size: 32px;
        }

        .resource-info h4 {
          margin: 0 0 5px 0;
          color: #00ffff;
          font-size: 16px;
        }

        .resource-amount {
          font-size: 20px;
          font-weight: bold;
          color: #ffffff;
        }

        .resource-rate {
          font-size: 12px;
          color: #44ff44;
        }

        .territories-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .territory-item {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          padding: 15px;
        }

        .territory-item.controlled {
          border-color: #44ff44;
          background: rgba(0, 255, 0, 0.1);
        }

        .territory-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 10px;
        }

        .territory-header h4 {
          margin: 0;
          color: #00ffff;
          font-size: 16px;
          flex: 1;
        }

        .territory-status {
          font-size: 14px;
          font-weight: bold;
        }

        .territory-resources {
          display: flex;
          gap: 10px;
          margin-bottom: 5px;
        }

        .resource-tag {
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .territory-defense {
          font-size: 14px;
          color: #ffff44;
        }

        .no-missions {
          text-align: center;
          padding: 40px;
        }

        .no-missions h3 {
          margin: 0 0 15px 0;
          color: #00ffff;
          font-size: 20px;
        }

        .no-missions p {
          margin: 0 0 20px 0;
          color: #aaaaaa;
          font-size: 14px;
        }

        .explore-btn {
          background: linear-gradient(45deg, #ff6600, #ff8800);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .explore-btn:hover {
          transform: translateY(-2px);
        }

        .tutorial-btn {
          position: absolute;
          top: 140px;
          right: 20px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(45deg, #ff44ff, #ff66ff);
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(255, 68, 255, 0.3);
        }

        .tutorial-btn:hover {
          transform: scale(1.1);
        }

        .notifications {
          position: absolute;
          top: 140px;
          left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 1001;
        }

        .notification {
          background: rgba(0, 0, 0, 0.9);
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          font-weight: bold;
          animation: slideInLeft 0.3s ease-out;
          max-width: 300px;
        }

        .notification.success {
          border-left: 4px solid #44ff44;
          background: rgba(0, 255, 0, 0.1);
        }

        .notification.error {
          border-left: 4px solid #ff4444;
          background: rgba(255, 0, 0, 0.1);
        }

        .notification.warning {
          border-left: 4px solid #ffff44;
          background: rgba(255, 255, 0, 0.1);
        }

        .notification.info {
          border-left: 4px solid #4444ff;
          background: rgba(0, 0, 255, 0.1);
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .error-banner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 0, 0, 0.9);
          color: white;
          padding: 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 15px;
          z-index: 1002;
        }

        .error-banner button {
          background: white;
          color: red;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
        }

        .loading-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          z-index: 1002;
        }

        .loading-spinner {
          font-size: 24px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-text {
          margin-top: 10px;
          font-size: 14px;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .header-bar {
            flex-direction: column;
            height: auto;
            padding: 10px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .resources-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-grid {
            grid-template-columns: 1fr;
          }

          .tab-container {
            height: 250px;
          }

          .tab-btn {
            font-size: 12px;
            padding: 8px;
          }
        }

        .quick-actions {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 1100;
          display: flex;
          gap: 8px;
        }
        .quick-actions .btn {
          background: #223;
          color: #fff;
          border: 1px solid #44f;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
        }
        .quick-actions .btn:hover { background: #334; }
        /* Enhanced card animations */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .enhanced-card {
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .enhanced-card:hover {
          transform: translateY(-4px) scale(1.02);
          filter: brightness(1.1);
        }

        .enhanced-card:hover .stat-value {
          text-shadow: 0 0 15px currentColor;
        }

        /* Enhanced button hover effects */
        .nav-btn:hover {
          transform: translateY(-2px) !important;
          filter: brightness(1.2) !important;
        }
        `}</style>
    </>
  );
};

export default HUD;