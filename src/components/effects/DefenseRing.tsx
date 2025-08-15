import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface DefenseRingProps {
	center: [number, number, number];
	defense: number; // 0..10+
	color?: string;
}

const DefenseRing: React.FC<DefenseRingProps> = ({ center, defense, color = '#44ffaa' }) => {
	const meshRef = useRef<THREE.Mesh>(null);
	const safeDef = Math.max(0, Number(defense) || 0);
	const thickness = 0.02 + Math.min(0.35, safeDef * 0.03);
	const outer = 0.56 + Math.min(1.0, safeDef * 0.1);
	const inner = Math.max(0.4, outer - thickness);
	const baseOpacity = 0.35 + Math.min(0.4, safeDef * 0.05);

	useFrame(() => {
		if (!meshRef.current) return;
		meshRef.current.rotation.z += 0.0015;
		const mat = meshRef.current.material as THREE.MeshBasicMaterial;
		if (mat) {
			mat.opacity = baseOpacity + Math.sin(performance.now() * 0.0012) * 0.05;
		}
	});

	return (
		<mesh ref={meshRef} position={center} rotation={[-Math.PI / 2, 0, 0]}>
			<ringGeometry args={[inner, outer, 64]} />
			<meshBasicMaterial color={color} transparent opacity={baseOpacity} />
		</mesh>
	);
};

export default DefenseRing;
