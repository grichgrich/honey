import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

interface StoryEvent {
  id: string;
  title: string;
  description: string;
  type: 'discovery' | 'combat' | 'achievement' | 'story';
  importance: 'normal' | 'major' | 'critical';
}

const StyledOverlay = styled(motion.div)`
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
`;

const EventContent = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid;
  border-radius: 8px;
  padding: 20px;
  max-width: 600px;
  text-align: center;

  h3 {
    margin: 0 0 10px 0;
    font-size: 1.4em;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  p {
    margin: 0;
    color: #fff;
    line-height: 1.6;
    font-size: 1.1em;
  }
`;

const StoryOverlay: React.FC<{ events: StoryEvent[] }> = ({ events }) => {
  const [currentEvent, setCurrentEvent] = useState<StoryEvent | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (events.length > 0) {
      setCurrentEvent(events[0]);
      setShowOverlay(true);
      const timer = setTimeout(() => setShowOverlay(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [events]);

  if (!currentEvent || !showOverlay) return null;

  const getEventColors = (type: string, importance: string) => {
    const baseColors = {
      discovery: ['#4f4', '#040'],
      combat: ['#f44', '#400'],
      achievement: ['#44f', '#004'],
      story: ['#f4f', '#404']
    };
    
    const importanceMultiplier = {
      normal: 1,
      major: 1.2,
      critical: 1.5
    };

    const [primary, secondary] = baseColors[type as keyof typeof baseColors];
    const intensity = importanceMultiplier[importance as keyof typeof importanceMultiplier];

    return {
      primary: primary,
      secondary: secondary,
      glow: `0 0 ${20 * intensity}px ${primary}`
    };
  };

  const colors = getEventColors(currentEvent.type, currentEvent.importance);

  return (
    <AnimatePresence>
      <StyledOverlay
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.5 }}
      >
        <EventContent style={{ 
          borderColor: colors.primary,
          boxShadow: colors.glow
        }}>
          <h3 style={{ color: colors.primary }}>{currentEvent.title}</h3>
          <p>{currentEvent.description}</p>
        </EventContent>
      </StyledOverlay>
    </AnimatePresence>
  );
};

export default StoryOverlay;