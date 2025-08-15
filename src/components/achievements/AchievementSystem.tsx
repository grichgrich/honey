import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  total: number;
  completed: boolean;
  rewards: {
    type: string;
    amount: number;
  }[];
  category: 'exploration' | 'combat' | 'resource' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  dateCompleted?: number;
}

const Container = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: white;
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
`;

const Tab = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'rgba(68, 68, 255, 0.3)' : 'transparent'};
  border: 1px solid ${props => props.active ? '#44f' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.active ? '#fff' : '#aaa'};
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(68, 68, 255, 0.2);
    border-color: #44f;
    color: #fff;
  }
`;

const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`;

const AchievementCard = styled(motion.div)<{ rarity: string; completed: boolean }>`
  background: ${props => props.completed ? 'rgba(20, 40, 20, 0.9)' : 'rgba(20, 30, 50, 0.9)'};
  border: 2px solid ${props => {
    if (props.completed) return '#4f4';
    switch (props.rarity) {
      case 'legendary': return '#f4f';
      case 'epic': return '#f44';
      case 'rare': return '#44f';
      default: return '#aaa';
    }
  }};
  border-radius: 8px;
  padding: 15px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg,
      ${props => {
        switch (props.rarity) {
          case 'legendary': return '#f4f, #ff4, #f4f';
          case 'epic': return '#f44, #f4f, #f44';
          case 'rare': return '#44f, #4ff, #44f';
          default: return '#aaa, #fff, #aaa';
        }
      }}
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite linear;
  }

  @keyframes shimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
`;

const AchievementIcon = styled.div<{ icon: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: url(${props => props.icon}) center/cover;
  margin-bottom: 10px;
`;

const ProgressBar = styled.div<{ progress: number; rarity: string }>`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin: 10px 0;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => (props.progress * 100)}%;
    height: 100%;
    background: ${props => {
      switch (props.rarity) {
        case 'legendary': return 'linear-gradient(90deg, #f4f, #ff4)';
        case 'epic': return 'linear-gradient(90deg, #f44, #f4f)';
        case 'rare': return 'linear-gradient(90deg, #44f, #4ff)';
        default: return 'linear-gradient(90deg, #aaa, #fff)';
      }
    }};
    transition: width 0.3s ease;
  }
`;

const RewardsList = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
  color: #aaa;

  .reward {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    .amount {
      color: #4f4;
    }
  }
`;

const CompletionDate = styled.div`
  font-size: 0.8em;
  color: #aaa;
  margin-top: 8px;
  text-align: right;
`;

interface AchievementSystemProps {
  achievements: Achievement[];
  onAchievementClick?: (id: string) => void;
}

const AchievementSystem: React.FC<AchievementSystemProps> = ({
  achievements,
  onAchievementClick
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredAchievements, setFilteredAchievements] = useState(achievements);

  useEffect(() => {
    setFilteredAchievements(
      selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory)
    );
  }, [selectedCategory, achievements]);

  const categories = ['all', 'exploration', 'combat', 'resource', 'special'];

  return (
    <Container>
      <CategoryTabs>
        {categories.map(category => (
          <Tab
            key={category}
            active={selectedCategory === category}
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Tab>
        ))}
      </CategoryTabs>

      <AchievementGrid>
        <AnimatePresence>
          {filteredAchievements.map(achievement => (
            <AchievementCard
              key={achievement.id}
              rarity={achievement.rarity}
              completed={achievement.completed}
              onClick={() => onAchievementClick?.(achievement.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <AchievementIcon icon={achievement.icon} />
              <h3>{achievement.title}</h3>
              <p>{achievement.description}</p>

              <ProgressBar
                progress={achievement.progress / achievement.total}
                rarity={achievement.rarity}
              />

              <div>
                {achievement.progress} / {achievement.total}
              </div>

              <RewardsList>
                {achievement.rewards.map((reward, index) => (
                  <div key={index} className="reward">
                    <span>{reward.type}:</span>
                    <span className="amount">+{reward.amount}</span>
                  </div>
                ))}
              </RewardsList>

              {achievement.completed && achievement.dateCompleted && (
                <CompletionDate>
                  Completed: {new Date(achievement.dateCompleted).toLocaleDateString()}
                </CompletionDate>
              )}
            </AchievementCard>
          ))}
        </AnimatePresence>
      </AchievementGrid>
    </Container>
  );
};

export default AchievementSystem;