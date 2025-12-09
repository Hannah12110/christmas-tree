import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionState } from '../types';

interface GoldDustProps {
    interactionRef?: React.MutableRefObject<InteractionState>;
}

export const GoldDust: React.FC<GoldDustProps> = ({ interactionRef }) => {
  const count = 500;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { mouse, camera } = useThree();
  
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 25
      ),
      vel: new THREE.Vector3(0, 0, 0),
      baseVel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ),
      scale: Math.random() * 0.1 + 0.02
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetVec = new THREE.Vector3(); 

  useFrame(() => {
    if (!meshRef.current) return;

    // Determine target (cursor) position in 3D space
    let x = mouse.x;
    let y = mouse.y;

    if (interactionRef && interactionRef.current.isHandDetected) {
        x = interactionRef.current.x;
        y = interactionRef.current.y;
    }

    // Convert 2D coord to 3D position on a plane
    targetVec.set(x, y, 0.5);
    targetVec.unproject(camera);
    const dir = targetVec.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z; 
    const cursorPos3D = camera.position.clone().add(dir.multiplyScalar(distance));

    particles.forEach((p, i) => {
      // Attraction force
      const dist = p.pos.distanceTo(cursorPos3D);
      
      if (dist < 12) {
        const attractionDir = cursorPos3D.clone().sub(p.pos).normalize();
        const force = (12 - dist) * 0.008; 
        p.vel.add(attractionDir.multiplyScalar(force));
      }

      // Base movement
      p.pos.add(p.baseVel);
      p.pos.add(p.vel);
      p.vel.multiplyScalar(0.95);

      // Boundary wrap
      const range = 18;
      if (p.pos.y > range) p.pos.y = -range;
      if (p.pos.y < -range) p.pos.y = range;
      if (p.pos.x > range) p.pos.x = -range;
      if (p.pos.x < -range) p.pos.x = range;

      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.scale);
      dummy.rotation.x += 0.01;
      dummy.rotation.y += 0.01;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial 
        color="#fbbf24" 
        emissive="#d97706"
        emissiveIntensity={2}
        toneMapped={false}
        roughness={0}
        metalness={1} 
      />
    </instancedMesh>
  );
};