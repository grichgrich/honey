import React, { useState, useEffect } from 'react';

interface MissionProps {
  title: string;
  description: string;
  reward: {
    type: string;
    amount: number;
  };
  progress: number;
  loading?: boolean;
  type: string;
  progress_rate: number;
  time_started?: number | null;
  onAccept: () => void;
  onComplete?: () => void;
}

const Mission: React.FC<MissionProps> = ({
  title,
  description,
  reward,
  progress,
  loading = false,
  type,
  progress_rate,
  time_started,
  onAccept,
  onComplete
}) => {
  const isActive = progress > 0 && progress < 100;
  const isComplete = progress >= 100;
  const progressColor = isComplete ? '#4f4' : '#44f';
  const glowIntensity = isActive ? Math.sin(Date.now() / 1000) * 0.5 + 0.5 : 0;

  // Calculate estimated completion time
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progressPerSecond, setProgressPerSecond] = useState<number>(0);

  useEffect(() => {
    if (isActive && time_started) {
      const elapsedTime = (Date.now() - time_started) / 1000; // in seconds
      const progressMade = progress - 10; // Initial progress is 10%
      const currentRate = progressMade / elapsedTime;
      setProgressPerSecond(currentRate);

      const remainingProgress = 100 - progress;
      const estimatedSecondsLeft = remainingProgress / (currentRate * progress_rate);
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsedSinceStart = (now - time_started) / 1000;
        const currentProgress = Math.min(100, 10 + (elapsedSinceStart * currentRate * progress_rate));
        const remainingTime = Math.max(0, estimatedSecondsLeft - elapsedSinceStart);
        
        if (remainingTime > 0) {
          const minutes = Math.floor(remainingTime / 60);
          const seconds = Math.floor(remainingTime % 60);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining('Complete!');
        }
      };

      const timer = setInterval(updateTimer, 1000);
      updateTimer(); // Initial update

      return () => clearInterval(timer);
    }
  }, [isActive, time_started, progress, progress_rate]);

  return (
    <div className={`mission-card ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
      <div className="mission-header">
        <h3>{title}</h3>
        <div className="mission-status">
          {isComplete && <span className="status complete">✓ Complete</span>}
          {isActive && <span className="status active">⚡ In Progress</span>}
          {!isActive && !isComplete && <span className="status available">New</span>}
        </div>
      </div>

      <p className="mission-description">{description}</p>

      <div className="mission-progress">
        <div className="progress-label">
          <span>Progress</span>
          <div className="progress-stats">
            <span>{progress}%</span>
            {isActive && (
              <>
                <span className="progress-rate">
                  ({(progressPerSecond * progress_rate).toFixed(1)}%/s)
                </span>
                <span className="time-remaining">
                  {timeRemaining}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ 
              width: `${progress}%`,
              backgroundColor: progressColor,
              boxShadow: `0 0 ${10 * glowIntensity}px ${progressColor}`
            }}
          />
        </div>
      </div>

      <div className="mission-details">
        <div className="mission-reward">
          <span className="reward-label">Reward:</span>
          <span className="reward-value">
            {reward.amount} {reward.type}
            <span className="reward-icon">💎</span>
          </span>
        </div>
        
        <div className="mission-action">
          {progress < 100 ? (
            <button 
              onClick={onAccept} 
              className={`action-btn accept-btn ${loading ? 'loading' : ''}`}
              disabled={loading || isActive}
            >
              {loading ? 'Accepting...' : isActive ? 'In Progress' : 'Accept Mission'}
            </button>
          ) : (
            <button 
              onClick={onComplete} 
              className={`action-btn complete-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Completing...' : 'Claim Reward'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .mission-card {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #44f;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          color: white;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .mission-card.active {
          border-color: #44f;
          box-shadow: 0 0 15px rgba(68, 68, 255, 0.3);
        }

        .mission-card.complete {
          border-color: #4f4;
          box-shadow: 0 0 15px rgba(68, 255, 68, 0.3);
        }

        .mission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        h3 {
          color: #88f;
          margin: 0;
          font-size: 1.2em;
          text-shadow: 0 0 10px rgba(136, 136, 255, 0.5);
        }

        .mission-status {
          font-size: 0.9em;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }

        .status.complete {
          background: rgba(68, 255, 68, 0.2);
          color: #4f4;
        }

        .status.active {
          background: rgba(68, 68, 255, 0.2);
          color: #44f;
          animation: pulse 2s infinite;
        }

        .status.available {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .mission-description {
          color: #ccc;
          margin: 10px 0;
          line-height: 1.4;
        }

        .mission-progress {
          margin: 20px 0;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          color: #aaa;
          font-size: 0.9em;
        }

        .progress-stats {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .progress-rate {
          color: #88f;
          font-size: 0.9em;
        }

        .time-remaining {
          color: #4f4;
          font-weight: bold;
          min-width: 60px;
          text-align: right;
        }

        .progress-bar {
          background: rgba(255, 255, 255, 0.1);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: all 0.3s ease;
        }

        .mission-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
        }

        .mission-reward {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reward-label {
          color: #aaa;
        }

        .reward-value {
          color: #88f;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .reward-icon {
          font-size: 1.2em;
        }

        .action-btn {
          background: #44f;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 0.9em;
          letter-spacing: 0.5px;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(68, 68, 255, 0.3);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-btn.loading {
          opacity: 0.8;
          cursor: wait;
        }

        .complete-btn {
          background: #4f4;
        }

        .complete-btn:hover:not(:disabled) {
          background: #3d3;
          box-shadow: 0 4px 12px rgba(68, 255, 68, 0.3);
        }

        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default Mission;