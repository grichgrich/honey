import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';

interface TechNode {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: {
    type: string;
    amount: number;
  }[];
  bonuses: {
    type: string;
    value: number;
    description: string;
  }[];
  prerequisites: string[];
  unlocked: boolean;
  progress: number;
}

const TechTreeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  padding: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
`;

const TechNodeContainer = styled(motion.div)<{ level: number }>`
  position: absolute;
  left: ${props => props.level * 200}px;
  width: 180px;
  background: rgba(20, 30, 50, 0.9);
  border: 2px solid #44f;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(68, 68, 255, 0.5);
  }

  &.unlocked {
    border-color: #4f4;
    background: rgba(20, 50, 30, 0.9);
  }

  &.locked {
    filter: brightness(0.5);
    cursor: not-allowed;
  }
`;

const TechConnector = styled.div<{ x1: number; y1: number; x2: number; y2: number }>`
  position: absolute;
  left: ${props => props.x1}px;
  top: ${props => props.y1}px;
  width: ${props => Math.sqrt(Math.pow(props.x2 - props.x1, 2) + Math.pow(props.y2 - props.y1, 2))}px;
  height: 2px;
  background: #44f;
  transform: rotate(${props => Math.atan2(props.y2 - props.y1, props.x2 - props.x1)}rad);
  transform-origin: left center;
  opacity: 0.5;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 10px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => props.progress}%;
    height: 100%;
    background: linear-gradient(90deg, #44f, #4f4);
    transition: width 0.3s ease;
  }
`;

const CostIndicator = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
  font-size: 0.9em;
  color: #aaa;

  .resource {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .amount {
    color: #4f4;
  }
`;

const BonusList = styled.div`
  margin-top: 10px;
  font-size: 0.9em;

  .bonus {
    color: #4f4;
    margin-bottom: 4px;
  }
`;

interface TechTreeProps {
  nodes: TechNode[];
  onNodeClick: (nodeId: string) => void;
}

const TechTree: React.FC<TechTreeProps> = ({ nodes, onNodeClick }) => {
  const getNodePosition = (node: TechNode) => {
    const baseY = 100 + (node.level % 2) * 150;
    return { x: node.level * 200 + 50, y: baseY };
  };

  return (
    <TechTreeContainer>
      {nodes.map(node => {
        const pos = getNodePosition(node);
        return node.prerequisites.map(preReqId => {
          const preReqNode = nodes.find(n => n.id === preReqId);
          if (!preReqNode) return null;
          const preReqPos = getNodePosition(preReqNode);
          return (
            <TechConnector
              key={`${node.id}-${preReqId}`}
              x1={preReqPos.x}
              y1={preReqPos.y}
              x2={pos.x}
              y2={pos.y}
            />
          );
        });
      })}

      {nodes.map(node => {
        const pos = getNodePosition(node);
        return (
          <TechNodeContainer
            key={node.id}
            level={node.level}
            className={node.unlocked ? 'unlocked' : 'locked'}
            style={{ top: pos.y }}
            onClick={() => onNodeClick(node.id)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3>{node.name}</h3>
            <p>{node.description}</p>
            
            <CostIndicator>
              {node.cost.map((cost, index) => (
                <div key={index} className="resource">
                  <span>{cost.type}:</span>
                  <span className="amount">{cost.amount}</span>
                </div>
              ))}
            </CostIndicator>

            <BonusList>
              {node.bonuses.map((bonus, index) => (
                <div key={index} className="bonus">
                  +{bonus.value}% {bonus.description}
                </div>
              ))}
            </BonusList>

            <ProgressBar progress={node.progress} />
          </TechNodeContainer>
        );
      })}
    </TechTreeContainer>
  );
};

export default TechTree;