import React, { useState, useEffect } from 'react';

interface CheckpointConfig {
  step: number;
  text: string;
  qrToken: string;
  qrImageBase64: string;
  mapImageUrl: string;
  mapImageBase64: string;
}

interface RouteConfig {
  routeId: string;
  name: string;
  routeDescription: string;
  clues: CheckpointConfig[];
}

interface RouteManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRouteId: string;
}

const RouteManagerModal: React.FC<RouteManagerModalProps> = ({ isOpen, onClose, selectedRouteId }) => {
  const [routeConfig, setRouteConfig] = useState<RouteConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<number | null>(null);
  const [isAssembling, setIsAssembling] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/game';

  useEffect(() => {
    if (isOpen) {
      setRouteConfig(null);
      fetch(`${API_URL}/routes`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const found = data.routes.find((r: any) => r.routeId === selectedRouteId);
            if (found) setRouteConfig(found);
          }
        });
    } else {
      setRouteConfig(null);
    }
  }, [isOpen, selectedRouteId]);

  const handleChange = (stepIndex: number, field: keyof CheckpointConfig, value: string) => {
    if (!routeConfig) return;
    const newClues = [...routeConfig.clues];
    newClues[stepIndex] = { ...newClues[stepIndex], [field]: value };
    setRouteConfig({ ...routeConfig, clues: newClues });
  };

  const handleGenerateCenterQR = async (stepIndex: number) => {
    if (!routeConfig) return;
    const clue = routeConfig.clues[stepIndex];
    const token = (clue.qrToken || (clue.step === 6 ? `R${selectedRouteId}-FINAL` : `R${selectedRouteId}-CP${clue.step}`)).trim();
    const label = token; // Center badge text is 100% identical to token string

    setGeneratingStep(clue.step);
    try {
      const res = await fetch(`${API_URL}/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, label })
      });
      const data = await res.json();
      if (data.success && data.qrImageBase64) {
        const newClues = [...routeConfig.clues];
        newClues[stepIndex] = {
          ...newClues[stepIndex],
          qrToken: token,
          qrImageBase64: data.qrImageBase64
        };
        setRouteConfig({ ...routeConfig, clues: newClues });
      } else {
        alert("Failed to generate QR code: " + (data.message || 'Error'));
      }
    } catch (err) {
      alert("Network error generating QR code.");
    }
    setGeneratingStep(null);
  };

  const handleAssembleFinalMap = async (stepIndex: number) => {
    if (!routeConfig) return;
    setIsAssembling(true);
    try {
      const res = await fetch(`${API_URL}/assemble-final-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: selectedRouteId })
      });
      const data = await res.json();
      if (data.success && data.finalMapUrl) {
        const newClues = [...routeConfig.clues];
        newClues[stepIndex] = { ...newClues[stepIndex], mapImageBase64: data.finalMapUrl };
        setRouteConfig({ ...routeConfig, clues: newClues });
        alert("🎉 Successfully assembled Maps 1 to 5 into the Final Combined Map!");
      } else {
        alert(data.message || "Failed to assemble final map");
      }
    } catch (err) {
      alert("Error assembling final map");
    }
    setIsAssembling(false);
  };

  const handleFileUpload = (stepIndex: number, field: 'qrImageBase64' | 'mapImageBase64', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !routeConfig) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const newClues = [...routeConfig.clues];
      newClues[stepIndex] = { ...newClues[stepIndex], [field]: base64 };

      if (field === 'qrImageBase64') {
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const html5QrCode = new Html5Qrcode("hidden-qr-reader");
          const decoded = await html5QrCode.scanFile(file, false);
          newClues[stepIndex].qrToken = decoded;
          alert("QR Code decoded successfully! Token ID: " + decoded);
        } catch (err) {
          console.warn("Failed to decode QR code.", err);
          alert("⚠️ Could not read the QR code from that image! Please manually type the expected text.");
        }
      }

      setRouteConfig({ ...routeConfig, clues: newClues });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!routeConfig) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeConfig)
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert('Route configuration saved successfully!');
        onClose();
      } else {
        alert('Server rejected the save: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving route configuration');
    }
    setIsSaving(false);
  };

  if (!isOpen || !routeConfig) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#0f172a', width: '92%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto',
        borderRadius: '12px', border: '1px solid #38bdf8', padding: '2rem', color: 'white', position: 'relative'
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          ✕
        </button>
        
        <h2 style={{ color: '#38bdf8', marginTop: 0, borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
          Configuring Route {selectedRouteId}
        </h2>
        
        <div id="hidden-qr-reader" style={{ display: 'none' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
          {routeConfig.clues.map((clue, index) => (
            <div key={clue.step} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: clue.step === 6 ? '2px solid #f59e0b' : '1px solid #475569' }}>
              <h3 style={{ color: clue.step === 6 ? '#f59e0b' : '#10b981', margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Checkpoint {clue.step} {clue.step === 6 ? '(Final Treasure Destination)' : ''}</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* QR Token & Generation Section */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold' }}>
                    Expected QR Token / ID (Matches Scanned QR):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={clue.qrToken || ''} 
                      onChange={e => handleChange(index, 'qrToken', e.target.value)}
                      placeholder={`e.g. R${selectedRouteId}-CP${clue.step}`}
                      style={{ flex: 1, padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
                    />
                    <button 
                      onClick={() => handleGenerateCenterQR(index)}
                      disabled={generatingStep === clue.step}
                      style={{
                        backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
                        padding: '0.8rem 1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}
                    >
                      {generatingStep === clue.step ? 'Generating...' : '⚡ Generate Center-ID QR'}
                    </button>
                  </div>
                  <small style={{ color: '#64748b' }}>*This ID is encoded inside the QR code and printed right in the middle.</small>
                </div>

                {/* QR Code Image Preview & Actions */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    QR Code Image with Center ID:
                  </label>
                  
                  {clue.qrImageBase64 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                      <img 
                        src={clue.qrImageBase64} 
                        alt="QR Code Preview" 
                        style={{ width: '130px', height: '130px', borderRadius: '6px', border: '2px solid #38bdf8', backgroundColor: 'white' }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <a 
                          href={clue.qrImageBase64} 
                          download={`Route_${selectedRouteId}_CP${clue.step}_QR.png`}
                          style={{
                            display: 'inline-block', backgroundColor: '#10b981', color: 'white', textDecoration: 'none',
                            padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center'
                          }}
                        >
                          📥 Download QR Code
                        </a>
                        <button 
                          onClick={() => handleChange(index, 'qrImageBase64', '')} 
                          style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          🗑️ Remove QR Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => handleFileUpload(index, 'qrImageBase64', e)}
                        style={{ color: 'white' }}
                      />
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        Or click "⚡ Generate Center-ID QR" above to auto-create a custom QR with text in middle.
                      </p>
                    </div>
                  )}
                </div>

                {/* Clue Text */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Clue Text to Show Here:
                  </label>
                  <textarea 
                    value={clue.text} 
                    onChange={e => handleChange(index, 'text', e.target.value)}
                    placeholder="Type the riddle or location clue here..."
                    rows={3}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
                  />
                </div>

                {/* Map Image Upload & Auto-Stitch for Checkpoint 6 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold' }}>
                      {clue.step === 6 ? 'Final Master Map (Combined from Checkpoints 1-5):' : 'Upload Checkpoint Map Piece Image:'}
                    </label>
                    {clue.step === 6 && (
                      <button 
                        onClick={() => handleAssembleFinalMap(index)}
                        disabled={isAssembling}
                        style={{
                          backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: '6px',
                          padding: '0.5rem 0.9rem', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer'
                        }}
                      >
                        {isAssembling ? 'Stitching...' : '🧩 Auto-Combine Maps 1-5'}
                      </button>
                    )}
                  </div>

                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => handleFileUpload(index, 'mapImageBase64', e)}
                    style={{ marginBottom: '0.5rem', color: 'white' }}
                  />
                  {clue.mapImageBase64 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={clue.mapImageBase64} alt="Map Preview" style={{ maxHeight: '140px', borderRadius: '6px', border: '2px solid #38bdf8' }} />
                      <button onClick={() => handleChange(index, 'mapImageBase64', '')} style={{ display: 'block', marginTop: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>Remove Map Image</button>
                    </div>
                  )}
                  {!clue.mapImageBase64 && clue.mapImageUrl && (
                    <img src={clue.mapImageUrl} alt="Preview" style={{ marginTop: '0.5rem', maxHeight: '140px', borderRadius: '6px' }} />
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          style={{ width: '100%', padding: '1rem', marginTop: '2rem', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default RouteManagerModal;
