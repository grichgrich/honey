import React from 'react';
import { Box, Text } from '@react-three/drei';

interface ResourceProps {
  type: string;
  amount: number;
  position: [number, number, number];
}

const Resource: React.FC<ResourceProps> = ({ type, amount, position }) => {
  const getResourceColor = () => {
    switch (type.toLowerCase()) {
      case 'energy':
        return '#ffff00';
      case 'minerals':
        return '#ff4400';
      case 'crystals':
        return '#00ffff';
      case 'gas':
        return '#88ff88';
      default:
        return '#888888';
    }
  };

  return (
    <group position={position}>
      <Box args={[0.3, 0.3, 0.3]}>
        <meshStandardMaterial
          color={getResourceColor()}
          emissive={getResourceColor()}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </Box>
      <Text
        position={[0, 0.3, 0]}
        fontSize={0.2}
        color={getResourceColor()}
        anchorX="center"
        anchorY="middle"
      >
        {`${type}: ${amount}`}
      </Text>
    </group>
  );
};

export default Resource;