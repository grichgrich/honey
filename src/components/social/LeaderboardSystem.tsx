import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../../systems/Analytics';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
  achievements: number;
  level: number;
  lastActive: number;
  stats: {
    territoriesControlled: number;
    resourcesCollected: number;
    missionsCompleted: number;
    combatRating: number;
  };
}

interface LeaderboardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  sortKey: keyof LeaderboardEntry['stats'] | 'score';
}

const Container = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  padding: 30px;
  color: white;
  z-index: 1000;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    color: #44f;
    margin: 0;
    font-size: 2em;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
`;

const Categories = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  overflow-x: auto;
  padding-bottom: 10px;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #44f;
    border-radius: 4px;
  }
`;

const CategoryButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'rgba(68, 68, 255, 0.2)' : 'transparent'};
  border: 2px solid ${props => props.active ? '#44f' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.active ? '#fff' : '#aaa'};
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(68, 68, 255, 0.1);
    border-color: #44f;
    color: white;
  }

  .icon {
    margin-right: 8px;
  }
`;

const TimeFilter = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(68, 68, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  outline: none;

  option {
    background: #1a1a2e;
    color: white;
  }
`;

const LeaderboardTable = styled(motion.div)`
  background: rgba(20, 30, 50, 0.95);
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr repeat(4, minmax(100px, 1fr));
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: bold;
  color: #aaa;
  text-transform: uppercase;
  font-size: 0.9em;
  letter-spacing: 1px;
`;

const TableBody = styled.div`
  overflow-y: auto;
  max-height: calc(100vh - 250px);

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

const EntryRow = styled(motion.div)<{ isPlayer?: boolean }>`
  display: grid;
  grid-template-columns: 80px 1fr repeat(4, minmax(100px, 1fr));
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: ${props => props.isPlayer ? 'rgba(68, 68, 255, 0.1)' : 'transparent'};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(68, 68, 255, 0.05);
  }
`;

const Rank = styled.div<{ rank: number }>`
  font-weight: bold;
  color: ${props => {
    if (props.rank === 1) return '#ffd700';
    if (props.rank === 2) return '#c0c0c0';
    if (props.rank === 3) return '#cd7f32';
    return '#aaa';
  }};
`;

const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div<{ src?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.src ? `url(${props.src})` : '#44f'} center/cover;
`;

const PlayerName = styled.div`
  display: flex;
  flex-direction: column;

  .name {
    color: white;
    font-weight: bold;
  }

  .level {
    color: #aaa;
    font-size: 0.9em;
  }
`;

const StatValue = styled.div`
  color: #4f4;
  font-weight: bold;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #44f;
  font-size: 1.2em;
`;

interface LeaderboardSystemProps {
  playerId: string;
  onClose: () => void;
}

const LeaderboardSystem: React.FC<LeaderboardSystemProps> = ({ playerId, onClose }) => {
  const [categories] = useState<LeaderboardCategory[]>([
    {
      id: 'overall',
      name: 'Overall Score',
      description: 'Total game score across all activities',
      icon: '🏆',
      sortKey: 'score'
    },
    {
      id: 'territories',
      name: 'Territory Control',
      description: 'Most territories controlled',
      icon: '🏰',
      sortKey: 'territoriesControlled'
    },
    {
      id: 'resources',
      name: 'Resource Collection',
      description: 'Most resources collected',
      icon: '💎',
      sortKey: 'resourcesCollected'
    },
    {
      id: 'missions',
      name: 'Mission Completion',
      description: 'Most missions completed',
      icon: '📜',
      sortKey: 'missionsCompleted'
    },
    {
      id: 'combat',
      name: 'Combat Rating',
      description: 'Highest combat performance',
      icon: '⚔️',
      sortKey: 'combatRating'
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [timeFrame, setTimeFrame] = useState('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
    analytics.trackEvent('leaderboard', 'view', selectedCategory);
  }, [selectedCategory, timeFrame]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      // In a real game, fetch from server
      // Simulated data for now
      const mockData: LeaderboardEntry[] = Array.from({ length: 100 }, (_, i) => ({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
        score: Math.floor(Math.random() * 10000),
        rank: i + 1,
        achievements: Math.floor(Math.random() * 50),
        level: Math.floor(Math.random() * 100) + 1,
        lastActive: Date.now() - Math.random() * 1000000,
        stats: {
          territoriesControlled: Math.floor(Math.random() * 100),
          resourcesCollected: Math.floor(Math.random() * 100000),
          missionsCompleted: Math.floor(Math.random() * 500),
          combatRating: Math.floor(Math.random() * 1000)
        }
      }));

      const category = categories.find(c => c.id === selectedCategory);
      if (category) {
        mockData.sort((a, b) => {
          const valueA = category.sortKey === 'score' ? a.score : a.stats[category.sortKey];
          const valueB = category.sortKey === 'score' ? b.score : b.stats[category.sortKey];
          return valueB - valueA;
        });
      }

      setEntries(mockData);
    } catch (error) {
      console.error('Failed to load leaderboard data:', error);
    }
    setLoading(false);
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Header>
        <h1>Leaderboards</h1>
        <TimeFilter
          value={timeFrame}
          onChange={e => setTimeFrame(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
          <option value="day">Today</option>
        </TimeFilter>
      </Header>

      <Categories>
        {categories.map(category => (
          <CategoryButton
            key={category.id}
            active={category.id === selectedCategory}
            onClick={() => setSelectedCategory(category.id)}
          >
            <span className="icon">{category.icon}</span>
            {category.name}
          </CategoryButton>
        ))}
      </Categories>

      <LeaderboardTable
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <TableHeader>
          <div>Rank</div>
          <div>Player</div>
          <div>Level</div>
          <div>Score</div>
          <div>Achievements</div>
          <div>Last Active</div>
        </TableHeader>

        <TableBody>
          <AnimatePresence>
            {entries.map((entry, index) => (
              <EntryRow
                key={entry.id}
                isPlayer={entry.id === playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.02 }}
              >
                <Rank rank={entry.rank}>#{entry.rank}</Rank>
                <PlayerInfo>
                  <Avatar src={entry.avatar} />
                  <PlayerName>
                    <span className="name">{entry.name}</span>
                    <span className="level">Level {entry.level}</span>
                  </PlayerName>
                </PlayerInfo>
                <StatValue>{entry.level}</StatValue>
                <StatValue>
                  {formatValue(
                    selectedCategory === 'overall'
                      ? entry.score
                      : entry.stats[categories.find(c => c.id === selectedCategory)?.sortKey as keyof LeaderboardEntry['stats']]
                  )}
                </StatValue>
                <StatValue>{entry.achievements}</StatValue>
                <div>
                  {new Date(entry.lastActive).toLocaleDateString()}
                </div>
              </EntryRow>
            ))}
          </AnimatePresence>
        </TableBody>

        {loading && (
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Loading leaderboard data...
          </LoadingOverlay>
        )}
      </LeaderboardTable>
    </Container>
  );
};

export default LeaderboardSystem;