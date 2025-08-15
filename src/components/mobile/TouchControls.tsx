import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

const TouchArea = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  height: 120px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  z-index: 1000;

  @media (min-width: 768px) {
    display: none;
  }
`;

const JoystickBase = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(68, 68, 255, 0.3);
  border-radius: 50%;
  pointer-events: auto;
`;

const JoystickHandle = styled(motion.div)`
  position: absolute;
  width: 50px;
  height: 50px;
  background: rgba(68, 68, 255, 0.2);
  border: 2px solid #44f;
  border-radius: 50%;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const ActionButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  pointer-events: auto;
`;

const ActionButton = styled(motion.button)<{ color?: string }>`
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid ${props => props.color || '#44f'};
  border-radius: 50%;
  color: ${props => props.color || '#44f'};
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;

  &:active {
    background: ${props => props.color || '#44f'}33;
  }
`;

interface TouchControlsProps {
  onMove: (x: number, y: number) => void;
  onAction: (action: string) => void;
  actions: {
    id: string;
    icon: string;
    color?: string;
  }[];
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onAction,
  actions
}) => {
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleX = useTransform(x, [-50, 50], [-1, 1]);
  const handleY = useTransform(y, [-50, 50], [-1, 1]);

  useEffect(() => {
    const unsubscribeX = handleX.onChange(value => {
      const yValue = handleY.get();
      onMove(value, yValue);
    });

    const unsubscribeY = handleY.onChange(value => {
      const xValue = handleX.get();
      onMove(xValue, value);
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [handleX, handleY, onMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const newTouchPoints = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    }));
    setTouchPoints(newTouchPoints);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const newTouchPoints = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY
    }));
    setTouchPoints(newTouchPoints);

    // Update joystick position
    if (newTouchPoints.length > 0) {
      const touch = newTouchPoints[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      let deltaX = touch.x - centerX;
      let deltaY = touch.y - centerY;
      
      // Limit to circle
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 50;
      
      if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
      }

      x.set(deltaX);
      y.set(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setTouchPoints([]);
    x.set(0);
    y.set(0);
  };

  return (
    <TouchArea>
      <JoystickBase
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <JoystickHandle
          style={{
            x: x,
            y: y,
            top: '35px',
            left: '35px'
          }}
        />
      </JoystickBase>

      <ActionButtons>
        {actions.map(action => (
          <ActionButton
            key={action.id}
            color={action.color}
            whileTap={{ scale: 0.9 }}
            onTouchStart={() => onAction(action.id)}
          >
            {action.icon}
          </ActionButton>
        ))}
      </ActionButtons>
    </TouchArea>
  );
};

export default TouchControls;