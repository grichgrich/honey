import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position: 'top' | 'right' | 'bottom' | 'left';
  required?: boolean;
  completion?: {
    type: 'action' | 'click' | 'wait';
    value: string | number;
  };
  rewards?: {
    type: string;
    amount: number;
  }[];
}

interface TutorialSection {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  unlockCondition?: {
    type: string;
    value: any;
  };
}

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  pointer-events: none;
`;

const Highlight = styled(motion.div)<{ position: string }>`
  position: absolute;
  background: rgba(68, 68, 255, 0.2);
  border: 2px solid #44f;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(68, 68, 255, 0.5);
  pointer-events: none;
  z-index: 1001;
`;

const TutorialCard = styled(motion.div)`
  position: fixed;
  background: rgba(20, 30, 50, 0.95);
  border: 2px solid #44f;
  border-radius: 12px;
  padding: 20px;
  max-width: 400px;
  color: white;
  z-index: 1002;
  pointer-events: auto;
  box-shadow: 0 0 30px rgba(68, 68, 255, 0.3);

  h2 {
    margin: 0 0 10px 0;
    color: #44f;
    font-size: 1.4em;
  }

  p {
    margin: 0 0 15px 0;
    line-height: 1.6;
    color: #ccc;
  }
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin: 15px 0;
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

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'primary' ? 'rgba(68, 68, 255, 0.2)' : 'transparent'};
  border: 2px solid ${props => props.variant === 'primary' ? '#44f' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.variant === 'primary' ? '#fff' : '#aaa'};
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 10px;

  &:hover {
    background: rgba(68, 68, 255, 0.3);
    border-color: #44f;
    color: #fff;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
`;

const RewardsList = styled.div`
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    color: #4f4;
    margin: 0 0 10px 0;
    font-size: 1.1em;
  }

  .reward {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #aaa;
    margin-bottom: 5px;

    .amount {
      color: #4f4;
      font-weight: bold;
    }
  }
`;

interface TutorialSystemProps {
  sections: TutorialSection[];
  onComplete: (sectionId: string, stepId: string) => void;
  onSkip: (sectionId: string, stepId: string) => void;
  progress: {
    [sectionId: string]: {
      completed: boolean;
      currentStep: number;
    };
  };
}

const TutorialSystem: React.FC<TutorialSystemProps> = ({
  sections,
  onComplete,
  onSkip,
  progress
}) => {
  const [currentSection, setCurrentSection] = useState<TutorialSection | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Find first incomplete section
    const nextSection = sections.find(section => !progress[section.id]?.completed);
    if (nextSection) {
      setCurrentSection(nextSection);
      setCurrentStep(nextSection.steps[progress[nextSection.id]?.currentStep || 0]);
    }
  }, [sections, progress]);

  useEffect(() => {
    if (currentStep?.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
      }
    }
  }, [currentStep]);

  const getCardPosition = () => {
    if (!highlightRect || !currentStep) return {};
    
    const padding = 20;
    switch (currentStep.position) {
      case 'top':
        return {
          left: highlightRect.left + (highlightRect.width / 2) - 200,
          bottom: window.innerHeight - highlightRect.top + padding
        };
      case 'right':
        return {
          left: highlightRect.right + padding,
          top: highlightRect.top + (highlightRect.height / 2) - 100
        };
      case 'bottom':
        return {
          left: highlightRect.left + (highlightRect.width / 2) - 200,
          top: highlightRect.bottom + padding
        };
      case 'left':
        return {
          right: window.innerWidth - highlightRect.left + padding,
          top: highlightRect.top + (highlightRect.height / 2) - 100
        };
    }
  };

  const handleNext = () => {
    if (!currentSection || !currentStep) return;
    
    const currentIndex = currentSection.steps.findIndex(step => step.id === currentStep.id);
    if (currentIndex < currentSection.steps.length - 1) {
      setCurrentStep(currentSection.steps[currentIndex + 1]);
    } else {
      onComplete(currentSection.id, currentStep.id);
    }
  };

  const handleSkip = () => {
    if (!currentSection || !currentStep) return;
    onSkip(currentSection.id, currentStep.id);
  };

  if (!currentSection || !currentStep) return null;

  const sectionProgress = progress[currentSection.id];
  const progressPercent = ((sectionProgress?.currentStep || 0) / currentSection.steps.length) * 100;

  return (
    <>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {highlightRect && (
        <Highlight
          position={currentStep.position}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            top: highlightRect.top - 10,
            left: highlightRect.left - 10,
            width: highlightRect.width + 20,
            height: highlightRect.height + 20
          }}
        />
      )}

      <TutorialCard
        style={getCardPosition()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <h2>{currentStep.title}</h2>
        <p>{currentStep.description}</p>

        <ProgressBar progress={progressPercent} />

        {currentStep.rewards && (
          <RewardsList>
            <h3>Rewards</h3>
            {currentStep.rewards.map((reward, index) => (
              <div key={index} className="reward">
                <span>{reward.type}:</span>
                <span className="amount">+{reward.amount}</span>
              </div>
            ))}
          </RewardsList>
        )}

        <ButtonGroup>
          {!currentStep.required && (
            <Button onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button variant="primary" onClick={handleNext}>
            {currentStep.completion?.type === 'action' ? 'Complete' : 'Next'}
          </Button>
        </ButtonGroup>
      </TutorialCard>
    </>
  );
};

export default TutorialSystem;