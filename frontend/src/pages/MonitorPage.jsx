import React, { useState, useEffect, useRef } from 'react';
import useCamera from '../hooks/useCamera';
import useGestureDetection from '../hooks/useGestureDetection';
import useFaceRecognition from '../hooks/useFaceRecognition';

const Monitor = () => {
  const [expandedCamera, setExpandedCamera] = useState(null);

  // --- THE AI KILL SWITCHES ---
  const [enableFace, setEnableFace] = useState(false); 
  const [enableGesture, setEnableGesture] = useState(true); 

  // --- Camera Management ---
  const {
    videoRef, 
    cameraActive,
    cameraLoading,
    cameraError,
    startCamera,
    stopCamera
  } = useCamera();

  // --- AI Detection Hooks ---
  const { recognizedUser, faceScore } = useFaceRecognition(videoRef, cameraActive && enableFace);
  const { latestCommand, hudFrame } = useGestureDetection(videoRef, cameraActive && enableGesture);

  // --- Display Screen Refs ---
  const faceVideoRef = useRef(null);
  const gestureVideoRef = useRef(null);
  const expandedVideoRef = useRef(null);

  // BUG FIX 1: The Kill Switch (Prevents Ghost Frames)
  useEffect(() => {
    if (cameraActive && videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      if (faceVideoRef.current) faceVideoRef.current.srcObject = stream;
      if (gestureVideoRef.current) gestureVideoRef.current.srcObject = stream;
      if (expandedVideoRef.current) expandedVideoRef.current.srcObject = stream;
    } else {
      // When camera turns off, force all video screens to go pure black
      if (faceVideoRef.current) faceVideoRef.current.srcObject = null;
      if (gestureVideoRef.current) gestureVideoRef.current.srcObject = null;
      if (expandedVideoRef.current) expandedVideoRef.current.srcObject = null;
    }
  }, [cameraActive, expandedCamera]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff', position: 'relative' }}>
      
      {/* THE MASTER HIDDEN CAMERA FOR AI */}
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h2>Security Monitor</h2>
        
        {/* --- AI TOGGLE CONTROLS --- */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={enableFace} 
              onChange={(e) => setEnableFace(e.target.checked)} 
            />
            Face ID AI
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={enableGesture} 
              onChange={(e) => setEnableGesture(e.target.checked)} 
            />
            Gesture AI
          </label>
        </div>
      </div>

      {/* --- Camera Power Controls ---*/}
      <div style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
        {!cameraActive ? (
          <button
            onClick={startCamera}
            disabled={cameraLoading}
            style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: cameraLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {cameraLoading ? 'Starting Camera...' : 'Start Camera'}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{ padding: '10px 20px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Stop Camera
          </button>
        )}
        {cameraError && <span style={{ color: '#ff6b6b', alignSelf: 'center' }}>{cameraError}</span>}
      </div>

      {/* --- GESTURE COMMAND NOTIFICATION --- */}
      {latestCommand && latestCommand !== "IDLE" && (
        <div style={{
          position: 'fixed', top: '20px', right: '40px', backgroundColor: '#4CAF50', color: '#000', padding: '15px 30px', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', boxShadow: '0px 0px 20px rgba(76, 175, 80, 0.6)', zIndex: 2000, animation: 'slideIn 0.3s ease'
        }}>
          ⚡ GESTURE: {latestCommand}
        </div>
      )}

      {/* --- FACE RECOGNITION NOTIFICATION --- */}
      {recognizedUser && (
        <div style={{
          position: 'fixed', top: '20px', left: '40px', backgroundColor: '#2196F3', color: '#fff', padding: '15px 30px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0px 0px 20px rgba(33, 150, 243, 0.6)', zIndex: 2000, animation: 'slideIn 0.3s ease'
        }}>
          👤 {recognizedUser} <br/>
          <small>Confidence: {(faceScore * 100).toFixed(1)}%</small>
        </div>
      )}

      {/* Expanded View (Modal) */}
      {expandedCamera && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setExpandedCamera(null)}
        >
          <div style={{ width: '80%', maxWidth: '1000px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '10px', backgroundColor: '#333', display: 'flex', justifyContent: 'space-between' }}>
              <span>{expandedCamera.name} - LIVE</span>
              <button style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px' }} onClick={() => setExpandedCamera(null)}>Close</button>
            </div>
            <video ref={expandedVideoRef} autoPlay playsInline muted style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }} />
          </div>
        </div>
      )}

      {/* Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
        
        {/* Camera 1: Face Feed */}
        <div 
          style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '2px solid #333' }}
          onClick={() => setExpandedCamera({ name: "Face Recognition CCTV" })}
        >
          <div style={{ padding: '8px 12px', backgroundColor: '#222', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Face Recognition CCTV {enableFace ? '(AI ON)' : '(AI OFF)'}</span>
            <span style={{ color: cameraActive ? '#4CAF50' : '#999' }}>● {cameraActive ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <video ref={faceVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '300px', objectFit: 'cover', transform: 'scaleX(-1)', backgroundColor: '#111' }} />
        </div>

        {/* Camera 2: Gesture Feed */}
        <div 
          style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '2px solid #333' }}
          onClick={() => setExpandedCamera({ name: "Hand Gesture Feed" })}
        >
          <div style={{ padding: '8px 12px', backgroundColor: '#222', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Hand Gesture Feed {enableGesture ? '(AI ON)' : '(AI OFF)'}</span>
            <span style={{ color: cameraActive ? '#4CAF50' : '#999' }}>● {cameraActive ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          
          {/* BUG FIX 2: Removed scaleX(-1) from the img tag so it stops double-flipping */}
          {enableGesture && hudFrame ? (
            <img 
              src={hudFrame} 
              alt="Iron Man HUD" 
              style={{ width: '100%', height: '300px', objectFit: 'cover' }} 
            />
          ) : (
            <video 
              ref={gestureVideoRef} 
              autoPlay playsInline muted 
              style={{ width: '100%', height: '300px', objectFit: 'cover'/*, transform: 'scaleX(-1)'*/, backgroundColor: '#111' }} 
            />
          )}
        </div>

      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Monitor;