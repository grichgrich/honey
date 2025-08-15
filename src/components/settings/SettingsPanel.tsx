import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { soundSystem } from '../../systems/SoundSystem';
import { saveSystem } from '../../systems/SaveSystem';

interface Settings {
  graphics: {
    quality: 'low' | 'medium' | 'high';
    effects: boolean;
    particles: boolean;
  };
  sound: {
    master: number;
    music: number;
    sfx: number;
    ambient: number;
    ui: number;
  };
  gameplay: {
    tutorialCompleted: boolean;
    autoSave: boolean;
    confirmations: boolean;
  };
}

const Panel = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  background: rgba(20, 30, 50, 0.95);
  border: 2px solid #44f;
  border-radius: 12px;
  padding: 20px;
  color: white;
  z-index: 1000;
  box-shadow: 0 0 30px rgba(68, 68, 255, 0.3);
`;

const Tabs = styled.div`
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

const Section = styled.div`
  margin-bottom: 20px;

  h3 {
    color: #44f;
    margin: 0 0 10px 0;
    font-size: 1.2em;
  }
`;

const Option = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;

  &:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`;

const Label = styled.label`
  color: #ccc;
  font-size: 0.9em;
`;

const Select = styled.select`
  background: rgba(68, 68, 255, 0.2);
  border: 1px solid #44f;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;

  option {
    background: #1a1a2e;
    color: white;
  }
`;

const Slider = styled.input`
  -webkit-appearance: none;
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #44f;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.2);
      background: #66f;
    }
  }
`;

const Toggle = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.1);
    transition: 0.4s;
    border-radius: 12px;

    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
  }

  input:checked + span {
    background-color: #44f;
  }

  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' }>`
  background: ${props => {
    switch (props.variant) {
      case 'primary': return 'rgba(68, 68, 255, 0.2)';
      case 'danger': return 'rgba(255, 68, 68, 0.2)';
      default: return 'transparent';
    }
  }};
  border: 2px solid ${props => {
    switch (props.variant) {
      case 'primary': return '#44f';
      case 'danger': return '#f44';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }};
  color: ${props => props.variant ? '#fff' : '#aaa'};
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => {
      switch (props.variant) {
        case 'primary': return 'rgba(68, 68, 255, 0.3)';
        case 'danger': return 'rgba(255, 68, 68, 0.3)';
        default: return 'rgba(255, 255, 255, 0.1)';
      }
    }};
  }
`;

interface SettingsPanelProps {
  onClose: () => void;
  onSettingsChanged: (settings: Settings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSettingsChanged }) => {
  const [activeTab, setActiveTab] = useState('graphics');
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = saveSystem.loadSettings();
    return savedSettings || {
      graphics: {
        quality: 'medium',
        effects: true,
        particles: true
      },
      sound: {
        master: 1,
        music: 0.7,
        sfx: 1,
        ambient: 0.5,
        ui: 0.8
      },
      gameplay: {
        tutorialCompleted: false,
        autoSave: true,
        confirmations: true
      }
    };
  });

  useEffect(() => {
    // Apply sound settings
    soundSystem.setMasterVolume(settings.sound.master);
    soundSystem.setCategoryVolume('music', settings.sound.music);
    soundSystem.setCategoryVolume('sfx', settings.sound.sfx);
    soundSystem.setCategoryVolume('ambient', settings.sound.ambient);
    soundSystem.setCategoryVolume('ui', settings.sound.ui);
  }, [settings.sound]);

  const handleSave = () => {
    saveSystem.saveSettings(settings);
    onSettingsChanged(settings);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings: Settings = {
        graphics: {
          quality: 'medium',
          effects: true,
          particles: true
        },
        sound: {
          master: 1,
          music: 0.7,
          sfx: 1,
          ambient: 0.5,
          ui: 0.8
        },
        gameplay: {
          tutorialCompleted: false,
          autoSave: true,
          confirmations: true
        }
      };
      setSettings(defaultSettings);
    }
  };

  return (
    <Panel
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Tabs>
        <Tab
          active={activeTab === 'graphics'}
          onClick={() => setActiveTab('graphics')}
        >
          Graphics
        </Tab>
        <Tab
          active={activeTab === 'sound'}
          onClick={() => setActiveTab('sound')}
        >
          Sound
        </Tab>
        <Tab
          active={activeTab === 'gameplay'}
          onClick={() => setActiveTab('gameplay')}
        >
          Gameplay
        </Tab>
      </Tabs>

      <AnimatePresence mode="wait">
        {activeTab === 'graphics' && (
          <motion.div
            key="graphics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Section>
              <h3>Quality Settings</h3>
              <Option>
                <Label>Graphics Quality</Label>
                <Select
                  value={settings.graphics.quality}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    graphics: { ...prev.graphics, quality: e.target.value as 'low' | 'medium' | 'high' }
                  }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </Option>
              <Option>
                <Label>Visual Effects</Label>
                <Toggle>
                  <input
                    type="checkbox"
                    checked={settings.graphics.effects}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      graphics: { ...prev.graphics, effects: e.target.checked }
                    }))}
                  />
                  <span />
                </Toggle>
              </Option>
              <Option>
                <Label>Particle Systems</Label>
                <Toggle>
                  <input
                    type="checkbox"
                    checked={settings.graphics.particles}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      graphics: { ...prev.graphics, particles: e.target.checked }
                    }))}
                  />
                  <span />
                </Toggle>
              </Option>
            </Section>
          </motion.div>
        )}

        {activeTab === 'sound' && (
          <motion.div
            key="sound"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Section>
              <h3>Volume Controls</h3>
              <Option>
                <Label>Master Volume</Label>
                <Slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.sound.master}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sound: { ...prev.sound, master: parseFloat(e.target.value) }
                  }))}
                />
              </Option>
              <Option>
                <Label>Music Volume</Label>
                <Slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.sound.music}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sound: { ...prev.sound, music: parseFloat(e.target.value) }
                  }))}
                />
              </Option>
              <Option>
                <Label>Sound Effects</Label>
                <Slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.sound.sfx}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sound: { ...prev.sound, sfx: parseFloat(e.target.value) }
                  }))}
                />
              </Option>
              <Option>
                <Label>Ambient Sound</Label>
                <Slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.sound.ambient}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sound: { ...prev.sound, ambient: parseFloat(e.target.value) }
                  }))}
                />
              </Option>
              <Option>
                <Label>UI Sounds</Label>
                <Slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.sound.ui}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sound: { ...prev.sound, ui: parseFloat(e.target.value) }
                  }))}
                />
              </Option>
            </Section>
          </motion.div>
        )}

        {activeTab === 'gameplay' && (
          <motion.div
            key="gameplay"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Section>
              <h3>Game Settings</h3>
              <Option>
                <Label>Auto-Save</Label>
                <Toggle>
                  <input
                    type="checkbox"
                    checked={settings.gameplay.autoSave}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      gameplay: { ...prev.gameplay, autoSave: e.target.checked }
                    }))}
                  />
                  <span />
                </Toggle>
              </Option>
              <Option>
                <Label>Action Confirmations</Label>
                <Toggle>
                  <input
                    type="checkbox"
                    checked={settings.gameplay.confirmations}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      gameplay: { ...prev.gameplay, confirmations: e.target.checked }
                    }))}
                  />
                  <span />
                </Toggle>
              </Option>
              <Option>
                <Label>Reset Tutorial</Label>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset the tutorial?')) {
                      setSettings(prev => ({
                        ...prev,
                        gameplay: { ...prev.gameplay, tutorialCompleted: false }
                      }));
                    }
                  }}
                >
                  Reset
                </Button>
              </Option>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <ButtonGroup>
        <Button onClick={handleReset}>Reset to Default</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </ButtonGroup>
    </Panel>
  );
};

export default SettingsPanel;