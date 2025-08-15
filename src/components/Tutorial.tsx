import React, { useState, useEffect } from 'react';
import { useGameContext } from '../context/GameContext';
import { InputSanitizer } from '../utils/security';

interface TutorialProps {
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { sendMessage } = useGameContext();

  const tutorialSteps = [
    {
      title: "🌌 Welcome to HoneyComb Protocol",
      content: `
        <h3>Welcome, Commander!</h3>
        <p>You are now in command of a galactic empire. Your mission is to expand across the galaxy by claiming territories, harvesting resources, and building an unstoppable force.</p>
        <div class="highlight-box">
          <h4>🎯 Your Ultimate Goal:</h4>
          <p>Dominate the galaxy through strategic expansion and technological advancement!</p>
        </div>
      `,
      action: null
    },
    {
      title: "🗺️ Understanding the Galaxy Map",
      content: `
        <h3>The 3D Galaxy View</h3>
        <p>The center screen shows your galactic territory. Each sphere represents a different sector with unique resources and strategic value.</p>
        <ul>
          <li><span class="colored-text green">🟢 Green territories</span> - Under your control</li>
          <li><span class="colored-text blue">🔵 Blue territories</span> - Available to claim</li>
          <li><span class="colored-text yellow">🟡 Yellow glow</span> - Defended territories</li>
        </ul>
        <div class="tip-box">
          💡 <strong>Tip:</strong> Use your mouse to rotate, zoom, and explore the galaxy!
        </div>
      `,
      action: null
    },
    {
      title: "⚡ Resources: The Lifeblood of Empire",
      content: `
        <h3>Four Essential Resources</h3>
        <div class="resource-grid">
          <div class="resource-item">
            <span class="resource-icon">⚡</span>
            <div>
              <strong>Energy</strong><br>
              Powers all operations and expansion
            </div>
          </div>
          <div class="resource-item">
            <span class="resource-icon">🗿</span>
            <div>
              <strong>Minerals</strong><br>
              Essential for building and defense
            </div>
          </div>
          <div class="resource-item">
            <span class="resource-icon">💎</span>
            <div>
              <strong>Crystals</strong><br>
              Rare materials for advanced technology
            </div>
          </div>
          <div class="resource-item">
            <span class="resource-icon">☁️</span>
            <div>
              <strong>Gas</strong><br>
              Fuel for exploration and research
            </div>
          </div>
        </div>
        <p><strong>Remember:</strong> Different territories contain different resource concentrations!</p>
      `,
      action: null
    },
    {
      title: "🚩 Claiming Your First Territory",
      content: `
        <h3>Time for Action!</h3>
        <p>Let's claim your first territory to begin building your empire:</p>
        <ol>
          <li><strong>Click on any blue (unclaimed) territory</strong> in the 3D view</li>
          <li><strong>Select "🚩 Claim Territory"</strong> from the action panel</li>
          <li><strong>Watch as it turns green</strong> - you now control it!</li>
        </ol>
        <div class="action-box">
          <p>🎯 <strong>Try it now:</strong> Click on a blue territory to get started!</p>
        </div>
      `,
      action: () => {
        // Highlight unclaimed territories or provide visual cues
        setCurrentStep(currentStep + 1);
      }
    },
    {
      title: "🔋 Harvesting Resources",
      content: `
        <h3>Power Up Your Empire</h3>
        <p>Now that you control territory, you can harvest its resources:</p>
        <ol>
          <li><strong>Click on your green territory</strong></li>
          <li><strong>Select "🔋 Harvest Resources"</strong></li>
          <li><strong>Watch your resource counters increase!</strong></li>
        </ol>
        <div class="tip-box">
          💡 <strong>Pro Tip:</strong> Controlled territories automatically generate resources over time. Harvesting gives you an immediate boost!
        </div>
      `,
      action: null
    },
    {
      title: "🛡️ Defense and Protection",
      content: `
        <h3>Protect Your Assets</h3>
        <p>As your empire grows, you'll need to defend it from threats:</p>
        <ul>
          <li><strong>Build Defense Systems:</strong> Use the "🛡️ Build Defense" action</li>
          <li><strong>Higher defense rating</strong> protects your territories from attacks</li>
          <li><strong>Defended territories glow yellow</strong> and show shield effects</li>
        </ul>
        <div class="warning-box">
          ⚠️ <strong>Important:</strong> Undefended territories are vulnerable to hostile takeover!
        </div>
      `,
      action: null
    },
    {
      title: "🔬 Research and Technology",
      content: `
        <h3>Advance Your Civilization</h3>
        <p>Use the Research action to unlock powerful improvements:</p>
        <ul>
          <li><strong>Efficiency Improvements:</strong> Faster resource generation</li>
          <li><strong>Advanced Defense:</strong> Stronger protective systems</li>
          <li><strong>Exploration Tech:</strong> Discover new territories</li>
          <li><strong>Automation Systems:</strong> Auto-harvest and management</li>
        </ul>
        <div class="highlight-box">
          <h4>🎓 The Tech Tree:</h4>
          <p>Each research unlocks new possibilities for expansion and optimization!</p>
        </div>
      `,
      action: null
    },
    {
      title: "🎯 Missions and Objectives",
      content: `
        <h3>Guided Expansion</h3>
        <p>The Missions tab provides structured goals to guide your empire building:</p>
        <ul>
          <li><strong>Exploration Missions:</strong> Find new territories</li>
          <li><strong>Research Missions:</strong> Advance your technology</li>
          <li><strong>Defense Missions:</strong> Protect your empire</li>
          <li><strong>Expansion Missions:</strong> Grow your territory</li>
        </ul>
        <div class="tip-box">
          💡 <strong>Strategy Tip:</strong> Complete missions to earn experience, level up, and unlock new capabilities!
        </div>
      `,
      action: null
    },
    {
      title: "⚖️ The Leverage System",
      content: `
        <h3>Advanced Empire Management</h3>
        <p>The Leverage tab shows your empire's efficiency and potential:</p>
        <ul>
          <li><strong>Leverage Multiplier:</strong> How efficiently your empire operates</li>
          <li><strong>Bonus Calculations:</strong> Benefits from territory control and tech</li>
          <li><strong>Efficiency Metrics:</strong> Real-time performance analysis</li>
          <li><strong>Optimization Suggestions:</strong> How to improve your empire</li>
        </ul>
        <div class="highlight-box">
          <h4>🚀 Master Strategy:</h4>
          <p>Use leverage analysis to identify the most profitable expansion opportunities!</p>
        </div>
      `,
      action: null
    },
    {
      title: "🎮 Ready to Conquer the Galaxy!",
      content: `
        <h3>You're Ready, Commander!</h3>
        <p>You now have all the knowledge needed to build a galactic empire:</p>
        <div class="final-checklist">
          <h4>✅ Your Action Plan:</h4>
          <ol>
            <li>Claim nearby territories to expand your base</li>
            <li>Harvest resources to fuel your growth</li>
            <li>Build defenses to protect your empire</li>
            <li>Research technology for competitive advantage</li>
            <li>Complete missions for guided objectives</li>
            <li>Monitor leverage for optimization opportunities</li>
          </ol>
        </div>
        <div class="victory-box">
          <h4>🏆 Victory Conditions:</h4>
          <p>Dominate the galaxy by controlling all territories, maxing out your technology tree, and achieving the highest leverage rating!</p>
        </div>
      `,
      action: () => {
        // Give starter resources
        sendMessage({
          type: 'tutorial_complete',
          starter_bonus: {
            energy: 500,
            minerals: 300,
            crystals: 100,
            experience: 200
          }
        });
      }
    }
  ];

  const currentStepData = tutorialSteps[currentStep];

  const nextStep = () => {
    if (currentStepData.action) {
      currentStepData.action();
    }
    
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const closeTutorial = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const skipTutorial = () => {
    // Give partial starter bonus for skipping
    sendMessage({
      type: 'tutorial_skipped',
      starter_bonus: {
        energy: 250,
        minerals: 150,
        crystals: 50,
        experience: 100
      }
    });
    closeTutorial();
  };

  if (!isVisible) return null;

  return (
    <div className={`tutorial-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="tutorial-modal">
        <div className="tutorial-header">
          <h2>{currentStepData.title}</h2>
          <div className="tutorial-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">
              Step {currentStep + 1} of {tutorialSteps.length}
            </span>
          </div>
        </div>

        <div className="tutorial-content">
          <div>{InputSanitizer.sanitizeHTML(currentStepData.content)}</div>
        </div>

        <div className="tutorial-controls">
          <div className="control-buttons">
            <button 
              onClick={prevStep} 
              disabled={currentStep === 0}
              className="btn-secondary"
            >
              ← Previous
            </button>
            
            <button onClick={skipTutorial} className="btn-skip">
              Skip Tutorial
            </button>
            
            <button onClick={nextStep} className="btn-primary">
              {currentStep === tutorialSteps.length - 1 ? 'Start Playing!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tutorial-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .tutorial-overlay.visible {
          opacity: 1;
        }

        .tutorial-modal {
          background: linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 40, 80, 0.95));
          border: 2px solid #00ffff;
          border-radius: 16px;
          width: 90%;
          max-width: 700px;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 255, 255, 0.3);
          backdrop-filter: blur(20px);
          animation: modalSlideIn 0.5s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .tutorial-header {
          background: linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(0, 150, 255, 0.2));
          padding: 20px;
          border-bottom: 1px solid rgba(0, 255, 255, 0.3);
        }

        .tutorial-header h2 {
          margin: 0 0 15px 0;
          color: #00ffff;
          font-size: 24px;
          text-align: center;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        }

        .tutorial-progress {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(0, 255, 255, 0.3);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff44, #00ffff);
          transition: width 0.5s ease;
        }

        .progress-text {
          color: #ffffff;
          font-size: 14px;
          font-weight: bold;
        }

        .tutorial-content {
          padding: 30px;
          color: #ffffff;
          max-height: 400px;
          overflow-y: auto;
          line-height: 1.6;
        }

        .tutorial-content h3 {
          color: #00ffff;
          margin: 0 0 15px 0;
          font-size: 20px;
        }

        .tutorial-content h4 {
          color: #ffff00;
          margin: 15px 0 10px 0;
          font-size: 16px;
        }

        .tutorial-content p {
          margin: 0 0 15px 0;
          font-size: 16px;
        }

        .tutorial-content ul,
        .tutorial-content ol {
          margin: 0 0 15px 0;
          padding-left: 20px;
        }

        .tutorial-content li {
          margin-bottom: 8px;
          font-size: 15px;
        }

        .highlight-box {
          background: rgba(255, 255, 0, 0.1);
          border: 1px solid #ffff00;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }

        .tip-box {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #44ff44;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }

        .warning-box {
          background: rgba(255, 100, 0, 0.1);
          border: 1px solid #ff6644;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }

        .action-box {
          background: rgba(255, 0, 255, 0.1);
          border: 1px solid #ff44ff;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          text-align: center;
        }

        .victory-box {
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid #ffd700;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }

        .resource-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 15px 0;
        }

        .resource-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          padding: 10px;
        }

        .resource-icon {
          font-size: 24px;
        }

        .colored-text {
          font-weight: bold;
        }

        .colored-text.green {
          color: #44ff44;
        }

        .colored-text.blue {
          color: #4444ff;
        }

        .colored-text.yellow {
          color: #ffff44;
        }

        .final-checklist {
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid #00ffff;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }

        .final-checklist ol {
          margin: 10px 0 0 0;
        }

        .tutorial-controls {
          background: rgba(0, 0, 0, 0.3);
          padding: 20px;
          border-top: 1px solid rgba(0, 255, 255, 0.3);
        }

        .control-buttons {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .btn-primary {
          background: linear-gradient(45deg, #00ff44, #44ff88);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          flex: 1;
          max-width: 200px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 255, 68, 0.4);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          flex: 1;
          max-width: 150px;
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-skip {
          background: transparent;
          color: #aaaaaa;
          border: 1px solid #666666;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-skip:hover {
          color: white;
          border-color: #aaaaaa;
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .tutorial-modal {
            width: 95%;
            max-height: 90vh;
          }

          .tutorial-content {
            padding: 20px;
            max-height: 350px;
          }

          .resource-grid {
            grid-template-columns: 1fr;
          }

          .control-buttons {
            flex-direction: column;
            gap: 10px;
          }

          .btn-primary,
          .btn-secondary {
            max-width: none;
            width: 100%;
          }

          .tutorial-content h3 {
            font-size: 18px;
          }

          .tutorial-content p,
          .tutorial-content li {
            font-size: 14px;
          }
        }

        /* Custom scrollbar for tutorial content */
        .tutorial-content::-webkit-scrollbar {
          width: 8px;
        }

        .tutorial-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        .tutorial-content::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 255, 0.5);
          border-radius: 4px;
        }

        .tutorial-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
};

export default Tutorial;