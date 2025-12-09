// 文件: components/GestureController.tsx

import React from 'react';
import { InteractionState } from '../types';

interface GestureControllerProps {
  interactionRef: React.MutableRefObject<InteractionState>;
}

export const GestureController: React.FC<GestureControllerProps> = ({ interactionRef }) => {
  // 这是唯一的逻辑，确保立即退出
  return null; 
};