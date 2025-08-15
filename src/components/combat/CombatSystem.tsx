import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface CombatUnit {
  id: string;
  type: 'defender' | 'attacker';
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  damage: number;
  attackRange: number;
  attackSpeed: number;
  lastAttackTime: number;
  target?: string;
  level: number;
  effects: {
    type: string;
    duration: number;
    startTime: number;
    power: number;
  }[];
}

interface Projectile {
  id: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  damage: number;
  speed: number;
  type: string;
  startTime: number;
}

interface CombatSystemProps {
  defenders: CombatUnit[];
  attackers: CombatUnit[];
  onUnitDestroyed: (unitId: string, type: 'defender' | 'attacker') => void;
  onDamageDealt: (amount: number, position: THREE.Vector3) => void;
}

const CombatSystem: React.FC<CombatSystemProps> = ({
  defenders,
  attackers,
  onUnitDestroyed,
  onDamageDealt
}) => {
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [combatEffects, setCombatEffects] = useState<{
    position: THREE.Vector3;
    type: string;
    startTime: number;
  }[]>([]);

  const getUnitColor = (unit: CombatUnit) => {
    const healthPercent = unit.health / unit.maxHealth;
    if (unit.type === 'defender') {
      return new THREE.Color(0.2, 0.4 + healthPercent * 0.6, 1.0);
    } else {
      return new THREE.Color(1.0, 0.2 + healthPercent * 0.3, 0.2);
    }
  };

  const spawnProjectile = (from: CombatUnit, to: CombatUnit) => {
    const projectile: Projectile = {
      id: Math.random().toString(),
      position: from.position.clone(),
      target: to.position.clone(),
      damage: from.damage * (1 + from.level * 0.1),
      speed: 2.0,
      type: from.type === 'defender' ? 'energy' : 'plasma',
      startTime: Date.now()
    };
    setProjectiles(prev => [...prev, projectile]);
  };

  const addCombatEffect = (position: THREE.Vector3, type: string) => {
    setCombatEffects(prev => [...prev, {
      position: position.clone(),
      type,
      startTime: Date.now()
    }]);
  };

  useFrame((state, delta) => {
    // Update projectiles
    setProjectiles(prev => {
      return prev.filter(projectile => {
        const direction = projectile.target.clone().sub(projectile.position);
        if (direction.length() < 0.1) {
          onDamageDealt(projectile.damage, projectile.position);
          addCombatEffect(projectile.position, 'impact');
          return false;
        }
        direction.normalize();
        projectile.position.add(direction.multiplyScalar(projectile.speed * delta));
        return true;
      });
    });

    // Clean up expired effects
    setCombatEffects(prev => prev.filter(effect => Date.now() - effect.startTime < 1000));
  });

  return (
    <group>
      {/* Render defenders */}
      {defenders.map(defender => (
        <group key={defender.id} position={defender.position.toArray()}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial
              color={getUnitColor(defender)}
              emissive={getUnitColor(defender)}
              emissiveIntensity={0.5}
            />
          </Sphere>
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.2}
            color="#4f4"
          >
            {`${Math.round(defender.health)}/${defender.maxHealth}`}
          </Text>
        </group>
      ))}

      {/* Render attackers */}
      {attackers.map(attacker => (
        <group key={attacker.id} position={attacker.position.toArray()}>
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial
              color={getUnitColor(attacker)}
              emissive={getUnitColor(attacker)}
              emissiveIntensity={0.5}
            />
          </Sphere>
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.2}
            color="#f44"
          >
            {`${Math.round(attacker.health)}/${attacker.maxHealth}`}
          </Text>
        </group>
      ))}

      {/* Render projectiles */}
      {projectiles.map(projectile => (
        <motion.group
          key={projectile.id}
          position={projectile.position.toArray()}
          animate={{
            scale: [1, 1.2, 1],
            transition: { duration: 0.3, repeat: Infinity }
          }}
        >
          <Sphere args={[0.1, 8, 8]}>
            <meshStandardMaterial
              color={projectile.type === 'energy' ? '#44f' : '#f44'}
              emissive={projectile.type === 'energy' ? '#44f' : '#f44'}
              emissiveIntensity={1}
            />
          </Sphere>
        </motion.group>
      ))}

      {/* Render combat effects */}
      {combatEffects.map((effect, index) => (
        <motion.group
          key={`${effect.type}-${index}`}
          position={effect.position.toArray()}
          initial={{ scale: 0 }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [1, 0],
            transition: { duration: 0.5 }
          }}
        >
          <Sphere args={[0.2, 16, 16]}>
            <meshStandardMaterial
              color={effect.type === 'impact' ? '#fff' : '#ff4'}
              emissive={effect.type === 'impact' ? '#fff' : '#ff4'}
              emissiveIntensity={2}
              transparent
              opacity={0.8}
            />
          </Sphere>
        </motion.group>
      ))}
    </group>
  );
};

export default CombatSystem;