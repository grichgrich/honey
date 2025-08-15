import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface HarvestBeamProps {
	from?: [number, number, number];
	to?: [number, number, number];
	color?: string;
}

const HarvestBeam: React.FC<HarvestBeamProps> = ({ from, to, color = '#ffee66' }) => {
	const lineRef = useRef<THREE.Line>(null);
	const geo = useRef(new THREE.BufferGeometry());
	
	// Add safety checks for props
	if (!from || !to || from.length !== 3 || to.length !== 3) {
		console.warn('HarvestBeam: Invalid from/to positions', { from, to });
		return null;
	}
	
	const pts = new Float32Array([from[0], from[1], from[2], to[0], to[1], to[2]]);
	geo.current.setAttribute('position', new THREE.BufferAttribute(pts, 3));
	const mat = useRef(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));

	useFrame(() => {
		if (!lineRef.current) return;
		const m = mat.current as any;
		if (m) {
			m.linewidth = 1 + Math.sin(performance.now() * 0.004) * 0.5;
			m.opacity = 0.6 + Math.sin(performance.now() * 0.003) * 0.3;
		}
	});

	return (
		<line ref={lineRef} geometry={geo.current} material={mat.current as THREE.Material} />
	);
};

export default HarvestBeam;