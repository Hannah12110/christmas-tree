import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { GoldDust } from './GoldDust';
import { TopStar } from './TopStar';
import { TreeState, InteractionState } from '../types';

interface ExperienceProps {
  treeState: TreeState;
  interactionRef: React.MutableRefObject<InteractionState>;
}

export const Experience: React.FC<ExperienceProps> = ({ treeState, interactionRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { size, camera } = useThree();
  
  // --- Responsive Camera Logic ---
  useEffect(() => {
    const aspect = size.width / size.height;
    const vFov = 35 * (Math.PI / 180);
    const visibleHeightAtDist1 = 2 * Math.tan(vFov / 2);
    const requiredHeight = 20; 
    const requiredWidth = 16;
    const distForHeight = requiredHeight / visibleHeightAtDist1;
    const visibleWidthAtDist1 = visibleHeightAtDist1 * aspect;
    const distForWidth = requiredWidth / visibleWidthAtDist1;
    const finalDist = Math.max(distForHeight, distForWidth);
    
    camera.position.set(0, 1, finalDist);
    camera.lookAt(0, 1, 0);
    camera.updateProjectionMatrix();
  }, [size, camera]);

  // --- Unified Spin Logic ---
  const previousX = useRef(0);
  const velocity = useRef(0);
  const isInteracting = useRef(false);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Check Input Source
    let currentX = 0;
    let isDown = false;

    if (interactionRef.current.isHandDetected) {
        // Use Hand Data
        currentX = interactionRef.current.x * 5; // Scale up for sensitivity
        isDown = interactionRef.current.isDown;
    } else {
        // Use Mouse Data
        currentX = state.mouse.x * 5;
        isDown = interactionRef.current.isDown; // This ref is updated by mouse events below too
    }

    if (isDown) {
        if (!isInteracting.current) {
            // First frame of interaction
            isInteracting.current = true;
            previousX.current = currentX;
        } else {
            // Dragging
            const delta = currentX - previousX.current;
            groupRef.current.rotation.y += delta * 1.5;
            velocity.current = delta * 1.5;
            previousX.current = currentX;
        }
    } else {
        isInteracting.current = false;
        // Inertia
        groupRef.current.rotation.y += velocity.current;
        velocity.current *= 0.95;
        
        // Idle rotation
        if (Math.abs(velocity.current) < 0.001) {
            groupRef.current.rotation.y += 0.002; 
        }
    }
  });

  // Keep mouse listeners to update the ref state for fallback
  const handlePointerDown = () => { interactionRef.current.isDown = true; };
  const handlePointerUp = () => { interactionRef.current.isDown = false; };
  // We don't need pointer move for coordinates here because useFrame reads state.mouse directly

  return (
    <>
      <ambientLight intensity={0.4} color="#064e3b" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.25} 
        penumbra={1} 
        intensity={300} 
        color="#fbbf24" 
        castShadow 
        shadow-bias={-0.0001}
      />
      <pointLight position={[-10, 5, -10]} intensity={80} color="#10b981" />
      <Environment preset="lobby" background={false} />

      {/* Interaction Zone to capture mouse downs */}
      <mesh 
        position={[0, 1, 0]} 
        visible={false}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[100, 100]} />
      </mesh>

      <group ref={groupRef}>
        <Foliage state={treeState} />
        <Ornaments state={treeState} />
        <TopStar state={treeState} />
      </group>

      <GoldDust interactionRef={interactionRef} />

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.7} mipmapBlur intensity={1.5} radius={0.5} />
        <ToneMapping />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};