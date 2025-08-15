import React, { Component, ErrorInfo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { analytics } from './Analytics';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px;
  z-index: 9999;
`;

const ErrorCard = styled(motion.div)`
  background: rgba(255, 68, 68, 0.1);
  border: 2px solid #f44;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  text-align: center;
`;

const ErrorTitle = styled.h2`
  color: #f44;
  margin: 0 0 20px 0;
  font-size: 1.6em;
`;

const ErrorMessage = styled.p`
  color: #ccc;
  margin: 0 0 20px 0;
  line-height: 1.6;
`;

const ErrorStack = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  color: #aaa;
  font-size: 0.9em;
  overflow: auto;
  max-height: 200px;
  margin: 20px 0;
  text-align: left;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'primary' ? 'rgba(255, 68, 68, 0.2)' : 'transparent'};
  border: 2px solid ${props => props.variant === 'primary' ? '#f44' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.variant === 'primary' ? '#fff' : '#aaa'};
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.variant === 'primary' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.variant === 'primary' ? '#f44' : '#aaa'};
    color: white;
  }
`;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Track error in analytics
    analytics.trackEvent('error', 'uncaught', error.message, undefined, {
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Log to console for debugging
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReport = () => {
    const errorReport = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // In a real game, send to error reporting service
    console.log('Error report:', errorReport);

    // Show confirmation to user
    alert('Error report sent. Thank you for helping us improve the game!');
  };

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback || (
        <ErrorContainer>
          <ErrorCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ErrorTitle>Oops! Something went wrong</ErrorTitle>
            <ErrorMessage>
              We're sorry, but something unexpected happened. You can try reloading the game
              or report this error to help us fix it.
            </ErrorMessage>

            {this.state.error && (
              <ErrorStack>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </ErrorStack>
            )}

            <ButtonGroup>
              <Button onClick={this.handleReport}>
                Report Error
              </Button>
              <Button variant="primary" onClick={this.handleReload}>
                Reload Game
              </Button>
            </ButtonGroup>
          </ErrorCard>
        </ErrorContainer>
      );

      return fallback;
    }

    return this.props.children;
  }
}

// Error boundary hook for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = (error: Error) => {
    // Track error in analytics
    analytics.trackEvent('error', 'caught', error.message, undefined, {
      stack: error.stack
    });

    setError(error);
    console.error('Caught error:', error);
  };

  if (error) {
    throw error;
  }

  return handleError;
};

export default ErrorBoundary;