import * as THREE from 'three';

// Helper to get a random point inside a sphere
export const getChaosPosition = (radius: number = 15): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; // Cubic root for uniform distribution
  const sinPhi = Math.sin(phi);
  const x = r * sinPhi * Math.cos(theta);
  const y = r * sinPhi * Math.sin(theta);
  const z = r * Math.cos(phi);
  return [x, y, z];
};

// Helper to get a point on a cone surface (The Tree)
// Spiral distribution for better aesthetics
export const getTreePosition = (
  height: number, 
  baseRadius: number, 
  idx: number, 
  total: number,
  yOffset: number = -4
): [number, number, number] => {
  // Use sqrt for surface area distribution: density uniform on cone
  // This puts more points at the bottom where the radius is larger, solving the 'empty bottom' issue
  const ratio = Math.sqrt(idx / total); 
  
  // h goes from 0 (tip) to height (base)
  const h = height * ratio;
  const y = height - h + yOffset; 
  
  // Radius decreases as we go up (h=0 -> r=0)
  const r = baseRadius * (h / height);

  // Spiral angle
  const angle = idx * 0.5; // Golden angle approx or arbitrary tight spiral

  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;

  // Add slight noise to make it look organic
  return [
    x + (Math.random() - 0.5) * 0.5, 
    y, 
    z + (Math.random() - 0.5) * 0.5
  ];
};