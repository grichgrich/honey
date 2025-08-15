import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SatellitesProps {
	center: [number, number, number];
	count?: number;
	innerRadius?: number;
	outerRadius?: number;
	color?: string;
	speed?: number;
}

const Satellites: React.FC<SatellitesProps> = ({
	center,
	count = 6,
	innerRadius = 0.8,
	outerRadius = 1.2,
	color = '#88ccff',
	speed = 0.6
}) => {
	const instRef = useRef<THREE.InstancedMesh>(null);
	const dummy = useMemo(() => new THREE.Object3D(), []);
	const seeds = useMemo(() => new Array(count).fill(0).map(() => Math.random()), [count]);

	useFrame((_, delta) => {
		if (!instRef.current) return;
		const t = performance.now() * 0.001 * speed;
		let idx = 0;
		for (let i = 0; i < count; i++) {
			const angle = (seeds[i] * Math.PI * 2) + t * (0.7 + seeds[i] * 0.6);
			const radius = innerRadius + (outerRadius - innerRadius) * (0.3 + 0.7 * seeds[i]);
			dummy.position.set(
				center[0] + Math.cos(angle) * radius,
				center[1] + Math.sin(seeds[i] * Math.PI) * 0.1,
				center[2] + Math.sin(angle) * radius
			);
			dummy.rotation.set(0, angle, 0);
			const s = 0.05 + 0.03 * Math.sin((t + seeds[i]) * 4.0);
			dummy.scale.setScalar(Math.max(0.04, s));
			dummy.updateMatrix();
			instRef.current.setMatrixAt(idx++, dummy.matrix);
		}
		instRef.current.count = idx;
		instRef.current.instanceMatrix.needsUpdate = true;
	});

	return (
		<instancedMesh ref={instRef} args={[undefined as any, undefined as any, count]}>
			<sphereGeometry args={[1, 8, 8]} />
			<meshBasicMaterial color={color} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
		</instancedMesh>
	);
};

export default Satellites;
