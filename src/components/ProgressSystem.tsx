import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface ProgressData {
  level: number;
  experience: number;
  nextLevelExp: number;
  resources: {
    type: string;
    amount: number;
    capacity: number;
  }[];
  achievements: {
    id: string;
    name: string;
    progress: number;
    total: number;
  }[];
}

const ParticleField = () => {
  const particles = useRef<THREE.Points>(null);
  const count = 1000;

  useEffect(() => {
    if (!particles.current) return;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }

    particles.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.current.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }, []);

  useFrame(() => {
    if (!particles.current) return;
    particles.current.rotation.x += 0.001;
    particles.current.rotation.y += 0.002;
  });

  return (
    <points ref={particles}>
      <bufferGeometry />
      <pointsMaterial size={0.05} vertexColors />
    </points>
  );
};

const ProgressRing: React.FC<{ progress: number; color: string }> = ({ progress, color }) => {
  const ring = useRef<THREE.Mesh>(null);
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ pathLength: progress, transition: { duration: 1 } });
  }, [progress]);

  useFrame(() => {
    if (!ring.current) return;
    ring.current.rotation.z += 0.005;
  });

  return (
    <mesh ref={ring}>
      <ringGeometry args={[0.8, 1, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
};

const ProgressSystem: React.FC<{ data: ProgressData }> = ({ data }) => {
  const getResourceColor = (type: string) => {
    switch (type) {
      case 'energy': return '#ffff00';
      case 'minerals': return '#4444ff';
      case 'crystals': return '#ff44ff';
      case 'gas': return '#44ffff';
      default: return '#ffffff';
    }
  };

  return (
    <div className="progress-system">
      <div className="level-display">
        <motion.div 
          className="level-number"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3 }}
        >
          {data.level}
        </motion.div>
        <div className="experience-bar">
          <div 
            className="experience-fill"
            style={{ width: `${(data.experience / data.nextLevelExp) * 100}%` }}
          />
        </div>
      </div>

      <div className="resources-grid">
        {data.resources.map((resource) => (
          <motion.div 
            key={resource.type}
            className="resource-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="resource-info">
              <span className="resource-type">{resource.type}</span>
              <span className="resource-amount">
                {resource.amount}/{resource.capacity}
              </span>
            </div>
            <div className="resource-bar">
              <div 
                className="resource-fill"
                style={{ 
                  width: `${(resource.amount / resource.capacity) * 100}%`,
                  backgroundColor: getResourceColor(resource.type)
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="canvas-container">
        <Canvas>
          <ParticleField />
          <ProgressRing progress={data.experience / data.nextLevelExp} color="#44ff44" />
          <EffectComposer>
            <Bloom 
              intensity={1.5}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.002, 0.002)}
              radialModulation={false}
              modulationOffset={0}
            />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="achievements-list">
        {data.achievements.map((achievement) => (
          <motion.div 
            key={achievement.id}
            className="achievement-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="achievement-info">
              <span className="achievement-name">{achievement.name}</span>
              <span className="achievement-progress">
                {achievement.progress}/{achievement.total}
              </span>
            </div>
            <div className="achievement-bar">
              <div 
                className="achievement-fill"
                style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <style>{`
        .progress-system {
          position: relative;
          padding: 20px;
          color: white;
        }

        .level-display {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .level-number {
          font-size: 3em;
          font-weight: bold;
          color: #44ff44;
          text-shadow: 0 0 10px #44ff44;
        }

        .experience-bar {
          flex-grow: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .experience-fill {
          height: 100%;
          background: linear-gradient(90deg, #44ff44, #44ffff);
          transition: width 0.3s ease;
        }

        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .resource-container {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 15px;
        }

        .resource-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .resource-type {
          text-transform: capitalize;
          color: #aaa;
        }

        .resource-amount {
          font-weight: bold;
        }

        .resource-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .resource-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .canvas-container {
          height: 300px;
          margin: 30px 0;
        }

        .achievements-list {
          display: grid;
          gap: 15px;
        }

        .achievement-item {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 15px;
        }

        .achievement-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .achievement-name {
          color: #aaa;
        }

        .achievement-progress {
          font-weight: bold;
        }

        .achievement-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .achievement-fill {
          height: 100%;
          background: linear-gradient(90deg, #4444ff, #ff44ff);
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default ProgressSystem;