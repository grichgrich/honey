import React, { useState, useEffect } from 'react';
import { useGameContext } from '../context/GameContext';
import { HoneycombService } from '../services/honeycomb';
import { Mission } from '../types/game';

interface MissionsPanelProps {
  onClose?: () => void;
}

const MissionsPanel: React.FC<MissionsPanelProps> = ({ onClose }) => {
  const { playerId } = useGameContext();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionProgress, setMissionProgress] = useState<Record<string, number>>({});
  const [achievements, setAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadMissionData = async () => {
      if (!playerId) return;
      
      setLoading(true);
      const honeycombService = new HoneycombService();
      
      try {
        // Load missions
        const availableMissions = await honeycombService.getMissions();
        setMissions(availableMissions);
        
        // Load mission progress
        const progress: Record<string, number> = {};
        for (const mission of availableMissions) {
          progress[mission.id] = await honeycombService.getMissionProgress(playerId, mission.id);
        }
        setMissionProgress(progress);
        
        // Load achievements
        const playerAchievements = await honeycombService.getPlayerAchievements(playerId);
        setAchievements(playerAchievements);
      } catch (error) {
        console.error('Error loading mission data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMissionData();
  }, [playerId]);
  
  const getMissionProgressPercent = (missionId: string, targetProgress?: number) => {
    const current = missionProgress[missionId] || 0;
    const target = targetProgress || 1;
    return Math.min(100, Math.floor((current / target) * 100));
  };
  
  const getMissionStatus = (missionId: string, targetProgress?: number) => {
    const current = missionProgress[missionId] || 0;
    const target = targetProgress || 1;
    
    if (current >= target) {
      return 'Completed';
    } else if (current > 0) {
      return 'In Progress';
    } else {
      return 'Not Started';
    }
  };

  return (
    <div style={{ 
      position: 'absolute', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      width: '600px',
      maxHeight: '80vh',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '20px',
      color: 'white',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Missions & Achievements</h2>
        <button 
          onClick={onClose} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            fontSize: '20px', 
            cursor: 'pointer' 
          }}
        >
          ×
        </button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading mission data...</div>
      ) : (
        <>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>Active Missions</h3>
            {missions.map(mission => (
              <div 
                key={mission.id} 
                style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  backgroundColor: 'rgba(20, 20, 40, 0.5)',
                  borderRadius: '4px',
                  border: '1px solid #333'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{mission.name}</h4>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    fontSize: '12px',
                    backgroundColor: getMissionStatus(mission.id, mission.targetProgress) === 'Completed' ? '#44aa44' : 
                                    getMissionStatus(mission.id, mission.targetProgress) === 'In Progress' ? '#aaaa44' : '#666'
                  }}>
                    {getMissionStatus(mission.id, mission.targetProgress)}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#aaa' }}>{mission.description}</p>
                
                <div style={{ marginBottom: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Progress</span>
                    <span>{missionProgress[mission.id] || 0}/{mission.targetProgress || 1}</span>
                  </div>
                  <div style={{ 
                    height: '6px', 
                    backgroundColor: '#333', 
                    borderRadius: '3px', 
                    overflow: 'hidden',
                    marginTop: '5px'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${getMissionProgressPercent(mission.id, mission.targetProgress)}%`, 
                      backgroundColor: '#44aaff',
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Rewards:</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                    {mission.rewards?.map((reward, index) => (
                      <li key={index}>
                        {reward.type === 'experience' && `${reward.amount} XP`}
                        {reward.type === 'trait' && `${reward.amount} ${reward.traitType} Experience`}
                        {reward.type === 'achievement' && `Achievement: ${reward.name}`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>Achievements ({achievements.length})</h3>
            {achievements.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>
                Complete missions to earn achievements!
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {achievements.map((achievement, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: '8px 12px',
                      backgroundColor: 'rgba(40, 80, 120, 0.5)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      border: '1px solid #446'
                    }}
                  >
                    {achievement}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MissionsPanel;
