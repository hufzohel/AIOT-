import React, { useState, useEffect, useRef } from 'react';

const Monitor = () => {
  // State to track which camera is currently expanded (null means grid view)
  const [expandedCamera, setExpandedCamera] = useState(null);

  // References to attach the webcam streams to the video HTML elements
  const faceCamRef = useRef(null);
  const gestureCamRef = useRef(null);

  // Mock data for your cameras
  const cameras = [
    { id: 1, name: "Face Recognition CCTV", ref: faceCamRef },
    { id: 2, name: "Hand Gesture Feed", ref: gestureCamRef }
  ];

  // This effect requests webcam access when the component loads
  useEffect(() => {
    let localStream = null;

    const startWebcam = async () => {
      try {
        // Ask browser for webcam permission
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Attach the same stream to both video elements just to test the UI
        if (faceCamRef.current) faceCamRef.current.srcObject = localStream;
        if (gestureCamRef.current) gestureCamRef.current.srcObject = localStream;
      } catch (err) {
        console.error("Webcam access denied or unavailable:", err);
      }
    };

    startWebcam();

    // Cleanup: turn off the camera when you navigate away from the Monitor tab
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff' }}>
      <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Security Monitor</h2>

      {/* --- EXPANDED VIEW (MODAL) --- */}
      {expandedCamera && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setExpandedCamera(null)} // Click anywhere to close
        >
          <div style={{ width: '80%', maxWidth: '1000px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '10px', backgroundColor: '#333', display: 'flex', justifyContent: 'space-between' }}>
              <span>{expandedCamera.name} - LIVE</span>
              <button 
                onClick={() => setExpandedCamera(null)}
                style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            {/* The expanded video player */}
            <video 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: 'auto', display: 'block' }}
              ref={(videoElement) => {
                // Re-attach the stream when the modal opens
                if (videoElement && expandedCamera.ref.current) {
                  videoElement.srcObject = expandedCamera.ref.current.srcObject;
                }
              }}
            />
          </div>
        </div>
      )}

      {/* --- GRID VIEW (SECURITY WALL) --- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px', 
        marginTop: '20px' 
      }}>
        {cameras.map((cam) => (
          <div 
            key={cam.id} 
            style={{ 
              backgroundColor: '#000', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              cursor: 'pointer',
              border: '2px solid #333',
              transition: 'border-color 0.2s'
            }}
            onClick={() => setExpandedCamera(cam)}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4CAF50'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}
          >
            <div style={{ padding: '8px 12px', backgroundColor: '#222', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{cam.name}</span>
              <span style={{ color: 'red' }}>● REC</span>
            </div>
            <video 
              ref={cam.ref} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '300px', objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default Monitor;