import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { InteractionState } from '../types';

interface GestureControllerProps {
  interactionRef: React.MutableRefObject<InteractionState>;
}

export const GestureController: React.FC<GestureControllerProps> = ({ interactionRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false); // Default closed as requested
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);

  // 1. Initialize Model (Load once)
  useEffect(() => {
    const setupModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Model Load Error:", err);
      }
    };
    setupModel();
    
    return () => {
        handLandmarkerRef.current?.close();
    };
  }, []);

  // 2. Manage Camera and Detection Loop
  useEffect(() => {
    if (!isEnabled || !isModelLoaded) {
        // Cleanup when disabled
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
        
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }

        // Force reset interaction state so mouse can take over
        interactionRef.current.isHandDetected = false;
        return;
    }

    const predictWebcam = () => {
        if (!handLandmarkerRef.current || !videoRef.current) return;
        
        // Ensure video is playing and has data
        if (videoRef.current.videoWidth > 0) {
            const startTimeMs = performance.now();
            const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                const indexTip = landmarks[8];
                const thumbTip = landmarks[4];
                
                const dx = indexTip.x - thumbTip.x;
                const dy = indexTip.y - thumbTip.y;
                const dz = indexTip.z - thumbTip.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                // Map 0..1 to -1..1 (Mirror X)
                const x = (1 - indexTip.x) * 2 - 1; 
                const y = -(indexTip.y * 2 - 1); 

                interactionRef.current = {
                    x,
                    y,
                    isDown: distance < 0.1,
                    isHandDetected: true
                };
            } else {
                interactionRef.current.isHandDetected = false;
            }
        }
        
        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for data before starting loop
                videoRef.current.onloadeddata = () => {
                    predictWebcam();
                };
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setIsEnabled(false);
        }
    };

    startCamera();

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isEnabled, isModelLoaded, interactionRef]);

  return (
    <>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute bottom-4 right-4 w-32 h-24 object-cover opacity-0 pointer-events-none" 
      />
      
      {/* Toggle Button / Status Indicator */}
      <button 
         onClick={() => isModelLoaded && setIsEnabled(!isEnabled)}
         disabled={!isModelLoaded}
         className={`absolute bottom-8 left-8 z-50 flex items-center space-x-3 
                    transition-all duration-300 pr-4 py-2 -ml-2 pl-2 rounded-full
                    ${!isModelLoaded ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-white/5'}
                   `}
      >
         <div className={`w-3 h-3 rounded-full transition-all duration-500 
                        ${isEnabled 
                            ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' 
                            : 'bg-slate-600'}`} 
         />
         <span className="text-[10px] tracking-widest text-emerald-100/50 uppercase font-serif group-hover:text-emerald-100 transition-colors select-none">
            {isModelLoaded 
                ? (isEnabled ? 'Gesture Control Active' : 'Enable Gesture Control') 
                : 'Initializing AI...'}
         </span>
      </button>
    </>
  );
};