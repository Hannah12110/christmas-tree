export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface DualPosition {
  chaos: [number, number, number];
  target: [number, number, number];
  scale: number;
  rotation: [number, number, number];
  color: string;
}

export type OrnamentType = 'BOX' | 'BALL' | 'LIGHT' | 'EMERALD';

export interface OrnamentData extends DualPosition {
  type: OrnamentType;
  mass: number; // For movement lag calculation
}

export interface InteractionState {
  x: number; // Normalized -1 to 1
  y: number; // Normalized -1 to 1 (inverted Y standard for Three.js usually, but we keep screen space -1 top to 1 bottom or matched to mouse)
  isDown: boolean; // Pinching or Mouse Down
  isHandDetected: boolean;
}