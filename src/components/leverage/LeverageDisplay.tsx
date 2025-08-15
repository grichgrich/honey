import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { leverageSystem, LeverageBonus, LeverageMultiplier } from '../../systems/LeverageSystem';
import { useGameContext } from '../../context/GameContext';

const Container = styled(motion.div)`
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #44f;
  border-radius: 12px;
  padding: 20px;
  color: white;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: #44f;
    font-size: 1.8em;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
`;

const TotalMultiplier = styled.div`
  font-size: 2em;
  font-weight: bold;
  color: #4f4;
`;

const EfficiencyBar = styled.div`
  background: rgba(68, 68, 255, 0.2);
  border-radius: 6px;
  height: 30px;
  position: relative;
  margin: 10px 0 20px;
  overflow: hidden;

  .fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: #44f;
    transition: width 0.5s ease;
  }

  .label {
    position: absolute;
    width: 100%;
    text-align: center;
    line-height: 30px;
    color: white;
    font-weight: bold;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const CategoryCard = styled(motion.div)`
  background: rgba(20, 30, 50, 0.95);
  border: 1px solid rgba(68, 68, 255, 0.3);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #44f;
    transform: translateY(-2px);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .title {
    color: #44f;
    font-weight: bold;
  }

  .value {
    color: #4f4;
    font-weight: bold;
  }
`;

const BonusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BonusItem = styled.div`
  .description {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .name {
    color: #ccc;
  }

  .bonus {
    color: #4f4;
    font-weight: bold;
  }

  .progress-bar {
    background: rgba(68, 68, 255, 0.2);
    border-radius: 4px;
    height: 6px;
    overflow: hidden;

    .fill {
      height: 100%;
      background: #44f;
      transition: width 0.5s ease;
    }
  }
`;

const PotentialSection = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(68, 68, 255, 0.3);

  h3 {
    color: #44f;
    margin: 0 0 15px 0;
  }
`;

const ActionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const ActionCard = styled.div<{ difficulty: string }>`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(68, 68, 255, 0.3);
  border-radius: 6px;
  padding: 12px;

  .impact {
    color: ${props => {
      switch (props.difficulty) {
        case 'easy': return '#4f4';
        case 'medium': return '#ff4';
        case 'hard': return '#f44';
        default: return '#fff';
      }
    }};
    font-weight: bold;
    margin-bottom: 5px;
  }

  .description {
    color: #ccc;
    font-size: 0.9em;
  }

  .difficulty {
    color: #666;
    font-size: 0.8em;
    margin-top: 5px;
  }
`;

interface LeverageDisplayProps {
  onClose?: () => void;
}

const LeverageDisplay: React.FC<LeverageDisplayProps> = ({ onClose }) => {
  const { gameState } = useGameContext();
  const [multiplier, setMultiplier] = useState<LeverageMultiplier | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (gameState) {
      const newMultiplier = leverageSystem.calculateLeverageMultiplier(gameState);
      setMultiplier(newMultiplier);
    }
  }, [gameState]);

  if (!multiplier) return null;

  const formatValue = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const calculateCategoryTotal = (bonuses: LeverageBonus[]): number => {
    return bonuses.reduce((sum, bonus) => sum + (bonus.value * (bonus.progress / 100)), 0);
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Header>
        <h2>Leverage System</h2>
        <TotalMultiplier>×{multiplier.total.toFixed(2)}</TotalMultiplier>
      </Header>

      <EfficiencyBar>
        <div
          className="fill"
          style={{ width: `${multiplier.efficiency * 100}%` }}
        />
        <div className="label">
          System Efficiency: {formatValue(multiplier.efficiency)}
        </div>
      </EfficiencyBar>

      <CategoryGrid>
        {Object.entries(multiplier.bonuses).map(([category, bonuses]) => {
          if (bonuses.length === 0) return null;
          const categoryTotal = calculateCategoryTotal(bonuses);

          return (
            <CategoryCard
              key={category}
              onClick={() => setSelectedCategory(
                selectedCategory === category ? null : category
              )}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="header">
                <div className="title">
                  {category.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </div>
                <div className="value">+{formatValue(categoryTotal)}</div>
              </div>

              <AnimatePresence>
                {selectedCategory === category && (
                  <BonusList>
                    {bonuses.map((bonus, index) => (
                      <BonusItem key={index}>
                        <div className="description">
                          <div className="name">{bonus.description}</div>
                          <div className="bonus">
                            +{formatValue(bonus.value * (bonus.progress / 100))}
                          </div>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="fill"
                            style={{ width: `${bonus.progress}%` }}
                          />
                        </div>
                      </BonusItem>
                    ))}
                  </BonusList>
                )}
              </AnimatePresence>
            </CategoryCard>
          );
        })}
      </CategoryGrid>

      <PotentialSection>
        <h3>Potential Improvements</h3>
        <ActionList>
          {multiplier.potential_increase.actions.map((action, index) => (
            <ActionCard
              key={index}
              difficulty={action.difficulty}
            >
              <div className="impact">+{formatValue(action.impact)}</div>
              <div className="description">{action.description}</div>
              <div className="difficulty">
                Difficulty: {action.difficulty.charAt(0).toUpperCase() + action.difficulty.slice(1)}
              </div>
            </ActionCard>
          ))}
        </ActionList>
      </PotentialSection>
    </Container>
  );
};

export default LeverageDisplay;