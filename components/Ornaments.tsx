import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, OrnamentData, OrnamentType } from '../types';
import { getChaosPosition, getTreePosition } from '../utils/geometry';

interface OrnamentsProps {
  state: TreeState;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ state }) => {
  const boxRef = useRef<THREE.InstancedMesh>(null);
  const ballRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.InstancedMesh>(null);
  const emeraldRef = useRef<THREE.InstancedMesh>(null);
  
  // Data generation
  const { boxes, balls, lights, emeralds } = useMemo(() => {
    const generateData = (count: number, type: OrnamentType, baseRadius: number): OrnamentData[] => {
      return Array.from({ length: count }).map((_, i) => {
        // Randomly select spot on tree
        // Since getTreePosition now clusters at bottom with linear idx, we just map i to total space linearly
        const treeIdx = Math.floor(Math.random() * 1000) + (i * (15000/count));
        const target = getTreePosition(14, baseRadius, treeIdx, 15000, -6);
        
        // Push target out slightly so they sit ON the leaves, not in them
        const vTarget = new THREE.Vector3(...target);
        
        // Push out logic depends on type
        const pushMult = type === 'EMERALD' ? 0.95 : 1.15; // Emeralds slightly deeper
        vTarget.x *= pushMult; 
        vTarget.z *= pushMult;

        // Color Logic
        let color = '#fff';
        // Boxes: Mostly Gold, some Red
        if (type === 'BOX') color = Math.random() > 0.3 ? '#d97706' : '#b91c1c'; 
        // Balls: Mostly Gold, some Red
        if (type === 'BALL') color = Math.random() > 0.2 ? '#fbbf24' : '#ef4444'; 
        if (type === 'LIGHT') color = '#fffbeb';
        if (type === 'EMERALD') color = '#047857'; // Deep Emerald

        // Mass/Speed Logic
        let mass = 1.0;
        if (type === 'BOX') mass = 0.8;
        if (type === 'BALL') mass = 1.5;
        if (type === 'LIGHT') mass = 3.0;
        if (type === 'EMERALD') mass = 1.2;

        return {
          type,
          chaos: getChaosPosition(25),
          target: [vTarget.x, vTarget.y, vTarget.z],
          scale: type === 'BOX' ? 0.4 + Math.random() * 0.3 : 
                 type === 'BALL' ? 0.3 + Math.random() * 0.2 : 
                 type === 'EMERALD' ? 0.3 + Math.random() * 0.2 : 0.1,
          rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
          color,
          mass,
        };
      });
    };

    return {
      // Adjusted counts: Emerald (Most) > Gold/Ball (Mid) > Red/Box (Least)
      // Note: Balls/Boxes contain mix of Gold/Red, so we adjust totals to satisfy visual balance
      boxes: generateData(100, 'BOX', 6),
      balls: generateData(300, 'BALL', 6), 
      lights: generateData(600, 'LIGHT', 6),
      emeralds: generateData(700, 'EMERALD', 5.8), // Significantly increased Emeralds
    };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Initialize colors once
  useLayoutEffect(() => {
    const initMesh = (ref: React.RefObject<THREE.InstancedMesh>, data: OrnamentData[]) => {
      if (!ref.current) return;
      data.forEach((d, i) => {
        tempColor.set(d.color);
        if (d.type === 'LIGHT') tempColor.multiplyScalar(2.0); 
        // Enhance emerald color for glass effect
        if (d.type === 'EMERALD') tempColor.multiplyScalar(1.5);
        ref.current!.setColorAt(i, tempColor);
      });
      ref.current.instanceColor!.needsUpdate = true;
    };

    initMesh(boxRef, boxes);
    initMesh(ballRef, balls);
    initMesh(lightRef, lights);
    initMesh(emeraldRef, emeralds);
  }, [boxes, balls, lights, emeralds, tempColor]);

  // Animation Loop
  useFrame((_, delta) => {
    const targetProgress = state === TreeState.FORMED ? 1 : 0;
    
    // Helper to update specific mesh type
    const updateInstances = (ref: React.RefObject<THREE.InstancedMesh>, data: OrnamentData[], speed: number) => {
      if (!ref.current) return;
      
      const mesh = ref.current as any;
      if (typeof mesh.userData.progress === 'undefined') mesh.userData.progress = 0;
      
      mesh.userData.progress = THREE.MathUtils.damp(
        mesh.userData.progress, 
        targetProgress, 
        speed, 
        delta
      );
      
      const t = mesh.userData.progress;
      const eased = t < .5 ? 4. * t * t * t : (t - 1.) * (2. * t - 2.) * (2. * t - 2.) + 1.;

      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        
        const x = THREE.MathUtils.lerp(d.chaos[0], d.target[0], eased);
        const y = THREE.MathUtils.lerp(d.chaos[1], d.target[1], eased);
        const z = THREE.MathUtils.lerp(d.chaos[2], d.target[2], eased);
        
        dummy.position.set(x, y, z);
        
        dummy.lookAt(0, y, 0); 
        dummy.rotation.y += Math.PI; 
        
        dummy.rotation.x = THREE.MathUtils.lerp(d.rotation[0], 0, eased);
        dummy.rotation.z = THREE.MathUtils.lerp(d.rotation[1], 0, eased);
        
        // Spin Y
        dummy.rotation.y += delta * 0.5;

        dummy.scale.setScalar(d.scale * (0.8 + 0.2 * eased)); 
        dummy.updateMatrix();
        
        ref.current.setMatrixAt(i, dummy.matrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
    }

    updateInstances(boxRef, boxes, 1.0); 
    updateInstances(ballRef, balls, 2.0); 
    updateInstances(lightRef, lights, 4.0);
    updateInstances(emeraldRef, emeralds, 1.5); // Emeralds move at medium speed
  });

  return (
    <group>
      {/* Gift Boxes */}
      <instancedMesh ref={boxRef} args={[undefined, undefined, boxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.2} metalness={0.6} />
      </instancedMesh>

      {/* Ornaments */}
      <instancedMesh ref={ballRef} args={[undefined, undefined, balls.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial roughness={0.1} metalness={0.9} />
      </instancedMesh>

      {/* Emerald Gems */}
      <instancedMesh ref={emeraldRef} args={[undefined, undefined, emeralds.length]} castShadow receiveShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
            roughness={0.0} 
            metalness={1.0} 
            color="#047857"
            envMapIntensity={2}
        />
      </instancedMesh>

      {/* Lights */}
      <instancedMesh ref={lightRef} args={[undefined, undefined, lights.length]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
};