import React, { Suspense } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const LoadingContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  color: white;
`;

const LoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid transparent;
  border-top-color: #44f;
  border-radius: 50%;
  margin-bottom: 20px;
`;

const LoadingText = styled(motion.div)`
  font-size: 1.2em;
  color: #44f;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 15px;
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

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  progress?: number;
}

const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  children,
  fallback,
  progress = 0
}) => {
  const defaultFallback = (
    <LoadingContainer>
      <LoadingSpinner
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <LoadingText
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Loading...
      </LoadingText>
      <ProgressBar progress={progress} />
    </LoadingContainer>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LoadingBoundary;