import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getChaosPosition, getTreePosition } from '../utils/geometry';
import { TreeState } from '../types';

// Custom Shader for the needles
// It morphs between two positions based on a uniform 'uProgress'
const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uColorHigh: { value: new THREE.Color('#34d399') }, // Lighter Emerald (Emerald 400)
    uColorLow: { value: new THREE.Color('#022c22') },  // Deep Dark Green (Emerald 950)
    uGold: { value: new THREE.Color('#fbbf24') },      // Amber 400
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aChaosPos;
    attribute vec3 aTargetPos;
    attribute float aRandom;
    
    varying vec2 vUv;
    varying float vRandom;
    varying float vMix;

    void main() {
      vUv = uv;
      vRandom = aRandom;

      // Cubic ease in-out for smoother transition
      float t = uProgress;
      float eased = t < .5 ? 4. * t * t * t : (t - 1.) * (2. * t - 2.) * (2. * t - 2.) + 1.;
      
      // Interpolate position
      vec3 pos = mix(aChaosPos, aTargetPos, eased);
      
      // Add subtle wind/breathing animation
      pos.x += sin(uTime * 2.0 + pos.y) * 0.1 * eased;
      pos.z += cos(uTime * 1.5 + pos.y) * 0.1 * eased;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Size attenuation
      gl_PointSize = (50.0 * aRandom + 30.0) * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorHigh;
    uniform vec3 uColorLow;
    uniform vec3 uGold;
    
    varying float vRandom;
    
    void main() {
      // Circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;

      // Gradient color based on random attribute
      // Bias towards the darker green for depth, use high green for tips
      vec3 color = mix(uColorLow, uColorHigh, vRandom * 0.8 + 0.2);
      
      // Sparkle effect (Gold glint)
      float sparkle = sin(uTime * 3.0 + vRandom * 20.0);
      if (sparkle > 0.96) {
        color = mix(color, uGold, 0.9);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

interface FoliageProps {
  state: TreeState;
}

export const Foliage: React.FC<FoliageProps> = ({ state }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = 15000; // Increased count for lusher look
  const currentProgress = useRef(0);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const chaosPos = new Float32Array(count * 3);
    const targetPos = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Chaos
      const [cx, cy, cz] = getChaosPosition(20);
      chaosPos[i * 3] = cx;
      chaosPos[i * 3 + 1] = cy;
      chaosPos[i * 3 + 2] = cz;

      // Tree Target
      const [tx, ty, tz] = getTreePosition(14, 6, i, count, -6);
      targetPos[i * 3] = tx;
      targetPos[i * 3 + 1] = ty;
      targetPos[i * 3 + 2] = tz;

      randoms[i] = Math.random();
      
      // Initial pos
      positions[i * 3] = cx;
      positions[i * 3 + 1] = cy;
      positions[i * 3 + 2] = cz;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aChaosPos', new THREE.BufferAttribute(chaosPos, 3));
    geo.setAttribute('aTargetPos', new THREE.BufferAttribute(targetPos, 3));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    return geo;
  }, []);

  useFrame((threeState, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = threeState.clock.elapsedTime;
      
      const dest = state === TreeState.FORMED ? 1 : 0;
      
      currentProgress.current = THREE.MathUtils.damp(
        currentProgress.current,
        dest,
        1.5,
        delta
      );
      
      materialRef.current.uniforms.uProgress.value = currentProgress.current;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[FoliageShaderMaterial]}
        transparent={true}
        depthWrite={false}
        blending={THREE.NormalBlending} 
      />
    </points>
  );
};