import React, { useState } from 'react';
import useCamera from '../hooks/useCamera';
import useGestureDetection from '../hooks/useGestureDetection';
import useFaceRecognition from '../hooks/useFaceRecognition';

const Monitor = () => {
  const [expandedCamera, setExpandedCamera] = useState(null);

  // --- Camera Management ---
  const {
    videoRef, // This is now our HIDDEN master ref
    cameraActive,
    cameraLoading,
    cameraError,
    startCamera,
    stopCamera
  } = useCamera();

  // --- AI Detection Hooks ---
  // Both hooks safely read from the hidden master video feed at the same time
  const { latestCommand } = useGestureDetection(videoRef, cameraActive);
  const { recognizedUser, faceScore } = useFaceRecognition(videoRef, cameraActive);

  const cameras = [
    { id: 1, name: "Face Recognition CCTV" },
    { id: 2, name: "Hand Gesture Feed" }
  ];

  // This simple function copies the video stream from the hidden master camera 
  // to whatever visual screens you want to show on the dashboard.
  const attachStream = (element) => {
    if (element && videoRef.current && videoRef.current.srcObject) {
      element.srcObject = videoRef.current.srcObject;
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff', position: 'relative' }}>
      
      {/* THE MASTER HIDDEN CAMERA FOR AI */}
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Security Monitor</h2>

      {/* --- Camera Control ---*/}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
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
      {latestCommand && (
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
              <button style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '5px 10px' }}>Close</button>
            </div>
            <video ref={attachStream} autoPlay playsInline muted style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }} />
          </div>
        </div>
      )}

      {/* Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {cameras.map((cam) => (
          <div 
            key={cam.id} 
            style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '2px solid #333', transition: 'border-color 0.2s' }}
            onClick={() => setExpandedCamera(cam)}
          >
            <div style={{ padding: '8px 12px', backgroundColor: '#222', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{cam.name}</span>
              <span style={{ color: cameraActive ? '#4CAF50' : '#999' }}>● {cameraActive ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            <video ref={attachStream} autoPlay playsInline muted style={{ width: '100%', height: '300px', objectFit: 'cover', transform: 'scaleX(-1)', backgroundColor: '#111' }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Monitor;