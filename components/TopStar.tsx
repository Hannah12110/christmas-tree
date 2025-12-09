import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { getChaosPosition } from '../utils/geometry';

interface TopStarProps {
  state: TreeState;
}

export const TopStar: React.FC<TopStarProps> = ({ state }) => {
  const meshRef = useRef<THREE.Group>(null);
  const chaosPos = useMemo(() => getChaosPosition(25), []);
  const targetPos = new THREE.Vector3(0, 8.5, 0); // Top of tree (14 height - 6 offset approx 8)
  const currentProgress = useRef(0);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;
    
    // Lerp progress
    const dest = state === TreeState.FORMED ? 1 : 0;
    currentProgress.current = THREE.MathUtils.damp(
        currentProgress.current,
        dest,
        1.0, 
        delta
    );
    
    const t = currentProgress.current;
    const eased = t < .5 ? 4. * t * t * t : (t - 1.) * (2. * t - 2.) * (2. * t - 2.) + 1.;

    // Position
    const x = THREE.MathUtils.lerp(chaosPos[0], targetPos.x, eased);
    const y = THREE.MathUtils.lerp(chaosPos[1], targetPos.y, eased);
    const z = THREE.MathUtils.lerp(chaosPos[2], targetPos.z, eased);
    
    meshRef.current.position.set(x, y, z);

    // Rotation
    meshRef.current.rotation.y += delta;
    meshRef.current.rotation.z = Math.sin(stateThree.clock.elapsedTime * 2) * 0.1;

    // Scale - significantly reduced as requested
    const scale = THREE.MathUtils.lerp(0.3, 0.6, eased);
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={meshRef}>
        <mesh castShadow>
            {/* Reduced radius to 1.0 (from 1.5) and effectively smaller via scale above */}
            <octahedronGeometry args={[1.0, 0]} />
            <meshStandardMaterial 
                color="#FFD700" 
                emissive="#fbbf24"
                emissiveIntensity={3} 
                toneMapped={false}
                roughness={0.0}
                metalness={1.0}
            />
        </mesh>
        <pointLight intensity={10} color="#FFD700" distance={8} decay={2} />
    </group>
  );
};