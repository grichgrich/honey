import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../../systems/Analytics';

interface SocialProfile {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  achievements: number;
  status: 'online' | 'offline' | 'in_game';
  lastActive: number;
  stats: {
    territoriesControlled: number;
    resourcesCollected: number;
    missionsCompleted: number;
    combatRating: number;
  };
  achievements_list: {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: number;
  }[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: number;
  }[];
}

interface Alliance {
  id: string;
  name: string;
  description: string;
  icon: string;
  members: string[];
  level: number;
  territories: string[];
  resources: Record<string, number>;
}

const Container = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  color: white;
  z-index: 1000;
`;

const Sidebar = styled.div`
  width: 300px;
  background: rgba(20, 30, 50, 0.95);
  border-right: 1px solid rgba(68, 68, 255, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const SearchBar = styled.div`
  margin-bottom: 20px;

  input {
    width: 100%;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(68, 68, 255, 0.3);
    border-radius: 6px;
    color: white;
    outline: none;

    &:focus {
      border-color: #44f;
    }
  }
`;

const TabList = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Tab = styled.button<{ active: boolean }>`
  flex: 1;
  background: ${props => props.active ? 'rgba(68, 68, 255, 0.2)' : 'transparent'};
  border: 1px solid ${props => props.active ? '#44f' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.active ? '#fff' : '#aaa'};
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(68, 68, 255, 0.1);
    border-color: #44f;
    color: white;
  }
`;

const PlayerList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin: -5px;
  padding: 5px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }

  &::-webkit-scrollbar-thumb {
    background: #44f;
    border-radius: 4px;
  }
`;

const PlayerCard = styled.div<{ online: boolean }>`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(68, 68, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(68, 68, 255, 0.1);
    border-color: #44f;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.online ? '#4f4' : '#aaa'};
  }

  .name {
    font-weight: bold;
    color: white;
  }

  .level {
    color: #aaa;
    font-size: 0.9em;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
    font-size: 0.9em;
    color: #aaa;
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 30px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }

  &::-webkit-scrollbar-thumb {
    background: #44f;
    border-radius: 4px;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
`;

const ProfileAvatar = styled.div<{ src?: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${props => props.src ? `url(${props.src})` : '#44f'} center/cover;
  border: 3px solid #44f;
`;

const ProfileInfo = styled.div`
  flex: 1;

  h2 {
    margin: 0 0 10px 0;
    color: #44f;
    font-size: 1.8em;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #aaa;
    margin-bottom: 10px;

    .indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
  }
`;

const StatCard = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(68, 68, 255, 0.2);
  border-radius: 6px;
  padding: 12px;

  .label {
    color: #aaa;
    font-size: 0.9em;
    margin-bottom: 5px;
  }

  .value {
    color: #4f4;
    font-size: 1.2em;
    font-weight: bold;
  }
`;

const Section = styled.div`
  margin-bottom: 30px;

  h3 {
    color: #44f;
    margin: 0 0 15px 0;
    font-size: 1.4em;
  }
`;

const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
`;

const AchievementCard = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(68, 68, 255, 0.2);
  border-radius: 8px;
  padding: 15px;

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .icon {
    font-size: 1.5em;
  }

  .name {
    color: #44f;
    font-weight: bold;
  }

  .description {
    color: #aaa;
    font-size: 0.9em;
    margin-bottom: 10px;
  }

  .date {
    color: #666;
    font-size: 0.8em;
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ActivityItem = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(68, 68, 255, 0.2);
  border-radius: 6px;
  padding: 12px;

  .description {
    color: #ccc;
    margin-bottom: 5px;
  }

  .time {
    color: #666;
    font-size: 0.8em;
  }
`;

interface SocialSystemProps {
  playerId: string;
  onClose: () => void;
}

const SocialSystem: React.FC<SocialSystemProps> = ({ playerId, onClose }) => {
  const [activeTab, setActiveTab] = useState('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);
  const [players, setPlayers] = useState<SocialProfile[]>([]);
  const [alliances, setAlliances] = useState<Alliance[]>([]);

  useEffect(() => {
    loadSocialData();
    analytics.trackEvent('social', 'view', activeTab);
  }, [activeTab]);

  const loadSocialData = async () => {
    try {
      // In a real game, fetch from server
      // Simulated data for now
      const mockPlayers: SocialProfile[] = Array.from({ length: 50 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        level: Math.floor(Math.random() * 100) + 1,
        achievements: Math.floor(Math.random() * 50),
        status: Math.random() > 0.3 ? 'online' : 'offline',
        lastActive: Date.now() - Math.random() * 1000000,
        stats: {
          territoriesControlled: Math.floor(Math.random() * 100),
          resourcesCollected: Math.floor(Math.random() * 100000),
          missionsCompleted: Math.floor(Math.random() * 500),
          combatRating: Math.floor(Math.random() * 1000)
        },
        achievements_list: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) => ({
          id: `achievement${j}`,
          name: `Achievement ${j + 1}`,
          description: `Description for achievement ${j + 1}`,
          icon: '🏆',
          unlockedAt: Date.now() - Math.random() * 1000000
        })),
        recentActivity: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
          type: 'territory_claim',
          description: `Claimed a new territory in sector ${j + 1}`,
          timestamp: Date.now() - Math.random() * 1000000
        }))
      }));

      const mockAlliances: Alliance[] = Array.from({ length: 20 }, (_, i) => ({
        id: `alliance${i + 1}`,
        name: `Alliance ${i + 1}`,
        description: `Description for alliance ${i + 1}`,
        icon: '⚔️',
        members: mockPlayers.slice(0, Math.floor(Math.random() * 10) + 1).map(p => p.id),
        level: Math.floor(Math.random() * 50) + 1,
        territories: Array.from({ length: Math.floor(Math.random() * 20) + 1 }, (_, j) => `territory${j}`),
        resources: {
          energy: Math.floor(Math.random() * 10000),
          minerals: Math.floor(Math.random() * 10000),
          crystals: Math.floor(Math.random() * 10000)
        }
      }));

      setPlayers(mockPlayers);
      setAlliances(mockAlliances);
    } catch (error) {
      console.error('Failed to load social data:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAlliances = alliances.filter(alliance =>
    alliance.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Sidebar>
        <SearchBar>
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </SearchBar>

        <TabList>
          <Tab
            active={activeTab === 'players'}
            onClick={() => setActiveTab('players')}
          >
            Players
          </Tab>
          <Tab
            active={activeTab === 'alliances'}
            onClick={() => setActiveTab('alliances')}
          >
            Alliances
          </Tab>
        </TabList>

        <PlayerList>
          {activeTab === 'players' ? (
            filteredPlayers.map(player => (
              <PlayerCard
                key={player.id}
                online={player.status === 'online'}
                onClick={() => setSelectedProfile(player)}
              >
                <div className="header">
                  <div className="status" />
                  <div className="name">{player.name}</div>
                  <div className="level">Lvl {player.level}</div>
                </div>
                <div className="stats">
                  <div>🏰 {player.stats.territoriesControlled}</div>
                  <div>⚔️ {player.stats.combatRating}</div>
                  <div>🏆 {player.achievements}</div>
                  <div>📜 {player.stats.missionsCompleted}</div>
                </div>
              </PlayerCard>
            ))
          ) : (
            filteredAlliances.map(alliance => (
              <PlayerCard
                key={alliance.id}
                online={alliance.members.length > 0}
                onClick={() => {}}
              >
                <div className="header">
                  <div className="icon">{alliance.icon}</div>
                  <div className="name">{alliance.name}</div>
                  <div className="level">Lvl {alliance.level}</div>
                </div>
                <div className="stats">
                  <div>👥 {alliance.members.length}</div>
                  <div>🏰 {alliance.territories.length}</div>
                </div>
              </PlayerCard>
            ))
          )}
        </PlayerList>
      </Sidebar>

      <Content>
        {selectedProfile ? (
          <>
            <ProfileHeader>
              <ProfileAvatar src={selectedProfile.avatar} />
              <ProfileInfo>
                <h2>{selectedProfile.name}</h2>
                <div className="status">
                  <div
                    className="indicator"
                    style={{
                      background: selectedProfile.status === 'online' ? '#4f4' : '#aaa'
                    }}
                  />
                  {selectedProfile.status === 'online' ? 'Online' : `Last seen ${formatTime(selectedProfile.lastActive)}`}
                </div>
                <div className="stats">
                  <StatCard>
                    <div className="label">Level</div>
                    <div className="value">{selectedProfile.level}</div>
                  </StatCard>
                  <StatCard>
                    <div className="label">Territories</div>
                    <div className="value">{selectedProfile.stats.territoriesControlled}</div>
                  </StatCard>
                  <StatCard>
                    <div className="label">Combat Rating</div>
                    <div className="value">{selectedProfile.stats.combatRating}</div>
                  </StatCard>
                  <StatCard>
                    <div className="label">Missions</div>
                    <div className="value">{selectedProfile.stats.missionsCompleted}</div>
                  </StatCard>
                </div>
              </ProfileInfo>
            </ProfileHeader>

            <Section>
              <h3>Achievements</h3>
              <AchievementGrid>
                {selectedProfile.achievements_list.map(achievement => (
                  <AchievementCard key={achievement.id}>
                    <div className="header">
                      <div className="icon">{achievement.icon}</div>
                      <div className="name">{achievement.name}</div>
                    </div>
                    <div className="description">{achievement.description}</div>
                    <div className="date">Unlocked {formatTime(achievement.unlockedAt)}</div>
                  </AchievementCard>
                ))}
              </AchievementGrid>
            </Section>

            <Section>
              <h3>Recent Activity</h3>
              <ActivityList>
                {selectedProfile.recentActivity.map((activity, index) => (
                  <ActivityItem key={index}>
                    <div className="description">{activity.description}</div>
                    <div className="time">{formatTime(activity.timestamp)}</div>
                  </ActivityItem>
                ))}
              </ActivityList>
            </Section>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#aaa', marginTop: '100px' }}>
            Select a player or alliance to view details
          </div>
        )}
      </Content>
    </Container>
  );
};

export default SocialSystem;