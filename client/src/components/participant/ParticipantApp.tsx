import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import TeamEntry from './TeamEntry';
import WelcomeScreen from './WelcomeScreen';
import RouteSelection from './RouteSelection';
import QRScanner from './QRScanner';
import MapAssemblyAnimation from './MapAssemblyAnimation';

const ParticipantApp: React.FC = () => {
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'LOGIN' | 'WELCOME' | 'ROUTE_SELECTION' | 'CLUE_DISPLAY'>('LOGIN');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [currentClue, setCurrentClue] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<number>(0); // This is max checkpoint
  const [viewingStep, setViewingStep] = useState<number>(0); // This is currently viewed step
  const [popupMapUrl, setPopupMapUrl] = useState<string | null>(null);
  const [previewMap, setPreviewMap] = useState<string | null>(null);
  const [unlockedMaps, setUnlockedMaps] = useState<string[]>([]);
  const [isFinal, setIsFinal] = useState<boolean>(false);
  const [finalMapUrl, setFinalMapUrl] = useState<string>('');
  const [showAssemblyModal, setShowAssemblyModal] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scanError, setScanError] = useState('');
  const [manualQr, setManualQr] = useState('');

  const [isPending, setIsPending] = useState(false);
  const pendingTeamId = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/game';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('joinAccepted', (data: { teamId: string }) => {
      if (pendingTeamId.current === data.teamId) {
        setIsPending(false);
        setActiveTeam(data.teamId);
        setCurrentStep('WELCOME');
      }
    });

    socketRef.current.on('joinRejected', (data: { teamId: string }) => {
      if (pendingTeamId.current === data.teamId) {
        setIsPending(false);
        alert("Admin rejected your join request.");
        pendingTeamId.current = null;
      }
    });

    socketRef.current.on('routesUpdated', () => {
      if (activeTeam) {
        // We need to use functional state to get latest values in this closure, 
        // but activeTeam is from state. We can rely on the fact that if activeTeam is set,
        // we can fetch the clue. To avoid stale closures, we'll fetch the base clue endpoint 
        // which returns the team's current active clue automatically.
        fetch(`${API_URL}/clue/${activeTeam}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setCurrentClue(data.clue);
            }
          })
          .catch(err => console.error(err));
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [SOCKET_URL]);

  const particles = React.useMemo(() => [...Array(20)].map(() => ({
    left: `${Math.random() * 100}vw`,
    width: `${Math.random() * 6 + 2}px`,
    height: `${Math.random() * 6 + 2}px`,
    animationDuration: `${Math.random() * 15 + 10}s`,
    animationDelay: `${Math.random() * 5}s`
  })), []);

  const confetti = React.useMemo(() => [...Array(10)].map((_, i) => ({
    backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 5],
    left: `${10 + i * 8}%`,
    animation: `confettiDrop ${1 + Math.random()}s forwards`,
    animationDelay: `${Math.random() * 0.5}s`
  })), []);

  const handleJoin = async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode: code })
      });
      const data = await res.json();
      
      if (data.pending) {
        setIsPending(true);
        pendingTeamId.current = code;
      } else if (data.success) {
        setActiveTeam(data.team.teamId);
        localStorage.setItem('treasureHuntTeam', data.team.teamId);
        
        if (data.team.selectedRoute) {
          setSelectedRoute(data.team.selectedRoute);
          setCheckpoint(data.team.currentCheckpoint);
          setViewingStep(data.team.currentCheckpoint);
          fetchClue(data.team.teamId, data.team.currentCheckpoint + 1);
          setCurrentStep('CLUE_DISPLAY');
          if (data.team.currentCheckpoint === 6) {
            setShowAssemblyModal(true);
          }
        } else {
          setCurrentStep('WELCOME');
        }
      } else {
        alert("Error logging in: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to the server.");
    }
  };

  useEffect(() => {
    const savedTeam = localStorage.getItem('treasureHuntTeam');
    if (savedTeam) {
      handleJoin(savedTeam);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // We also need to keep the activeTeam ref updated for the socket listener above to work correctly without full re-binds
  useEffect(() => {
    const handleRouteUpdate = () => {
      if (activeTeam) {
        // When admin updates routes, refresh the currently viewed clue
        fetchClue(activeTeam, viewingStep || undefined);
      }
    };
    
    if (socketRef.current) {
      socketRef.current.off('routesUpdated');
      socketRef.current.on('routesUpdated', handleRouteUpdate);
    }
  }, [activeTeam, viewingStep]);

  const fetchClue = async (teamId: string, step?: number) => {
    try {
      const url = step ? `${API_URL}/clue/${teamId}?step=${step}` : `${API_URL}/clue/${teamId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCurrentClue(data.clue);
        setUnlockedMaps(data.unlockedMaps || []);
        setIsFinal(data.isFinal || false);
        setFinalMapUrl(data.finalMapUrl || '');
      }
    } catch (err) {
      console.error("Failed to fetch clue");
    }
  };

  const handleSelectRoute = async (routeId: string) => {
    try {
      const res = await fetch(`${API_URL}/select-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam, routeId })
      });
      const data = await res.json();
      
      if (data.success) {
        setSelectedRoute(routeId);
        setCheckpoint(0);
        setViewingStep(0);
        fetchClue(activeTeam!, 1);
        setCurrentStep('CLUE_DISPLAY');
      }
    } catch (_err) {
      console.error("Failed to select route");
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!decodedText.trim()) return;
    setIsScanning(false);
    setScanError('');
    
    try {
      const res = await fetch(`${API_URL}/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam, qrData: decodedText })
      });
      const data = await res.json();
      
      if (data.success) {
        setCheckpoint(data.newCheckpoint);
        setViewingStep(data.newCheckpoint);
        fetchClue(activeTeam!, data.newCheckpoint + 1);

        // If unlocked checkpoint 6 (final destination), trigger 5-piece assembly animation!
        if (data.newCheckpoint === 6) {
          await fetchClue(activeTeam!, 6);
          setShowAssemblyModal(true);
        } else if (data.newlyUnlockedMap) {
          setPopupMapUrl(data.newlyUnlockedMap);
          setTimeout(() => {
            setPopupMapUrl(null);
          }, 4000);
        }
      } else {
        setScanError(data.message || 'Incorrect QR code!');
      }
    } catch (_err) {
      console.error("Failed to validate QR");
      setScanError("Network error validating QR.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('treasureHuntTeam');
    setActiveTeam(null);
    setSelectedRoute(null);
    setCurrentStep('LOGIN');
    setCheckpoint(0);
    setViewingStep(0);
  };

  const handleTimelineClick = (step: number) => {
    if (step <= checkpoint) {
      setViewingStep(step);
      fetchClue(activeTeam!, step + 1);
      if (step === 6) {
        setShowAssemblyModal(true);
      }
    }
  };

  return (
    <div className="app-wrapper">
      <style>{`
        @keyframes mapPop {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 0; }
          10% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          15% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(30vw, -40vh) scale(0.1); opacity: 0; }
        }
        @keyframes celebrationText {
          0% { transform: scale(0.8); opacity: 0; text-shadow: 0 0 0px #fde68a; }
          50% { transform: scale(1.2); opacity: 1; text-shadow: 0 0 20px #fde68a, 0 0 40px #f59e0b; }
          100% { transform: scale(1); opacity: 1; text-shadow: 0 0 10px #fde68a; }
        }
        @keyframes confettiDrop {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      
      {/* 5-Piece Map Assembly Interactive Modal */}
      {showAssemblyModal && (
        <MapAssemblyAnimation 
          unlockedMaps={unlockedMaps}
          finalMapUrl={finalMapUrl}
          onClose={() => setShowAssemblyModal(false)}
        />
      )}

      <div className={`theme-bg theme-bg-${currentStep === 'CLUE_DISPLAY' ? viewingStep : 'default'}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}></div>
      <div className="particles-layer">
        {particles.map((style, i) => (
          <div 
            key={i} 
            className="particle" 
            style={style}
          />
        ))}
      </div>
      
      {/* Map Gallery Sidebar */}
      {unlockedMaps.length > 0 && currentStep === 'CLUE_DISPLAY' && !isFinal && (
        <div style={{
          position: 'absolute',
          right: '0px',
          top: '15%',
          width: '110px',
          background: 'rgba(15, 23, 42, 0.95)',
          padding: '10px',
          borderRadius: '16px 0 0 16px',
          border: '2px solid var(--color-gold)',
          borderRight: 'none',
          boxShadow: '-5px 0 25px rgba(0,0,0,0.8)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          <div style={{ color: 'var(--color-gold)', textAlign: 'center', fontSize: '0.8rem', fontWeight: 'bold', lineHeight: '1.2', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            MAP<br/>PIECES
          </div>
          {unlockedMaps.map((map, idx) => (
            <img 
              key={idx} 
              src={map} 
              alt={`Map Piece ${idx + 1}`} 
              onClick={() => {
                setPreviewMap(map);
                setTimeout(() => setPreviewMap(null), 3000);
              }}
              style={{ 
                width: '100%', 
                aspectRatio: '1',
                objectFit: 'cover',
                borderRadius: '8px', 
                border: '3px solid #78350f',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s'
              }} 
            />
          ))}
        </div>
      )}

      {/* Map Preview Modal */}
      {previewMap && (
        <div 
          onClick={() => setPreviewMap(null)}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={previewMap} 
            alt="Map Preview" 
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', border: '4px solid var(--color-gold)' }} 
          />
        </div>
      )}

      <div style={{ 
        padding: '2rem 1rem', 
        paddingRight: (unlockedMaps.length > 0 && currentStep === 'CLUE_DISPLAY' && !isFinal) ? '125px' : '1rem',
        width: '100%', 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden', 
        position: 'relative', 
        zIndex: 1 
      }}>
      {activeTeam && (
        <button 
          onClick={handleLogout}
          className="btn-pirate"
          style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.8rem', padding: '0.5rem 1rem', zIndex: 100 }}
        >
          Logout / Home
        </button>
      )}
      {currentStep === 'LOGIN' && !isPending && (
        <TeamEntry onJoin={handleJoin} />
      )}
      {currentStep === 'LOGIN' && isPending && (
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="decor-skull">⏳</div>
          <h2>Waiting for Admin...</h2>
          <p>Your join request has been sent to the admin. Please wait for approval.</p>
        </div>
      )}
      
      {currentStep === 'WELCOME' && activeTeam && (
        <WelcomeScreen 
          teamName={activeTeam} 
          onGetStarted={() => setCurrentStep('ROUTE_SELECTION')} 
        />
      )}

      {currentStep === 'ROUTE_SELECTION' && (
        <RouteSelection onSelectRoute={handleSelectRoute} />
      )}

      {currentStep === 'CLUE_DISPLAY' && (
        <div className="container" style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
          <h2>ROUTE {selectedRoute}</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '0px', borderTop: '2px dashed var(--color-gold)', zIndex: 1, transform: 'translateY(-50%)', opacity: 0.6 }}></div>
            {[0, 1, 2, 3, 4, 5, 6].map(step => (
              <div 
                key={step} 
                onClick={() => handleTimelineClick(step)}
                style={{ 
                  zIndex: 2, 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: step <= checkpoint ? 'pointer' : 'not-allowed',
                  backgroundColor: step === viewingStep ? 'var(--color-gold)' : (step <= checkpoint ? '#10b981' : '#1e293b'),
                  color: step === viewingStep ? '#000' : (step <= checkpoint ? '#fff' : '#64748b'),
                  border: `2px solid ${step <= checkpoint ? '#b45309' : '#334155'}`,
                  boxShadow: step === viewingStep 
                    ? '0 0 15px rgba(255, 215, 0, 0.8), inset 0 -3px 5px rgba(0,0,0,0.3)' 
                    : (step <= checkpoint ? 'inset 0 -3px 5px rgba(0,0,0,0.3)' : 'none'),
                  textShadow: step === viewingStep ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                {step}
              </div>
            ))}
          </div>
          <h3 style={{ color: 'var(--color-gold-light)', fontSize: '1.8rem', textShadow: '0 2px 10px rgba(234,179,8,0.5)' }}>
            CHECKPOINT {viewingStep} {viewingStep === 6 ? '(FINAL DESTINATION)' : ''}
          </h3>

          {popupMapUrl && !isFinal && (
            <div style={{ 
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
              padding: '1.5rem', 
              borderRadius: '15px', 
              border: '4px solid #78350f', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              animation: 'mapPop 4s forwards',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '85%',
              maxWidth: '350px'
            }}>
              {confetti.map((style, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: '8px', height: '16px',
                  top: '-20px',
                  ...style
                }}></div>
              ))}
              
              <h2 style={{ 
                color: '#b45309', 
                marginBottom: '1rem', 
                textAlign: 'center', 
                fontSize: '1.8rem',
                lineHeight: '1.1',
                animation: 'celebrationText 1s forwards'
              }}>
                🎉 CONGRATULATIONS! 🎉<br/>
                <span style={{ fontSize: '1.1rem', color: '#78350f' }}>New Map Piece Unlocked!</span>
              </h2>
              <img src={popupMapUrl} alt="New Map Piece" style={{ width: '100%', borderRadius: '8px', border: '3px solid #451a03' }} />
            </div>
          )}

          {/* Final Checkpoint Master Map Card */}
          {isFinal && (
            <div style={{ 
              margin: '2rem 0', 
              padding: '2.2rem 1.8rem', 
              background: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 40%, #fde68a 100%)', 
              borderRadius: '18px', 
              border: '4px solid #78350f', 
              boxShadow: '0 20px 45px rgba(0,0,0,0.85), inset 0 0 25px rgba(245, 158, 11, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <h2 style={{ 
                color: '#78350f', 
                marginBottom: '0.6rem', 
                fontSize: '2.3rem', 
                fontFamily: 'var(--font-heading)',
                letterSpacing: '1px',
                lineHeight: '1.2'
              }}>
                🏴‍☠️ THE FINAL MAP! 🏴‍☠️
              </h2>
              <p style={{ color: '#451a03', marginBottom: '1.4rem', fontSize: '1.15rem', fontWeight: 'bold' }}>
                ✨ You have collected all 5 pieces & unlocked the Master Map!
              </p>
              
              <button 
                onClick={() => setShowAssemblyModal(true)}
                style={{
                  backgroundColor: '#f59e0b', color: '#0f172a', border: '2px solid #78350f',
                  borderRadius: '10px', padding: '0.95rem 1.8rem', fontWeight: 'bold', fontSize: '1.05rem',
                  cursor: 'pointer', marginBottom: '1.6rem', boxShadow: '0 6px 20px rgba(245, 158, 11, 0.5)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.8)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)';
                }}
              >
                <span>✨ REPLAY 3D MAP ASSEMBLY ANIMATION ✨</span>
              </button>

              {finalMapUrl && (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '4px solid #451a03', boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
                  <img 
                    src={finalMapUrl} 
                    alt="Complete Master Treasure Map" 
                    style={{ width: '100%', display: 'block', borderRadius: '8px' }} 
                  />
                  <div style={{
                    position: 'absolute', bottom: '10px', right: '10px',
                    backgroundColor: 'rgba(120, 53, 15, 0.95)', color: '#fef3c7',
                    padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold',
                    border: '1px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                  }}>
                    FINAL MASTER MAP
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ 
            margin: '2rem 0', 
            padding: '2rem 1.5rem', 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
            borderRadius: '4px', 
            color: '#451a03',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.8rem',
            letterSpacing: '1px',
            border: '2px solid #78350f',
            boxShadow: '0 10px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(120, 53, 15, 0.2)',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '-6px', left: '-6px', width: '20px', height: '20px', background: 'var(--color-navy)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', background: 'var(--color-navy)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-6px', left: '-6px', width: '20px', height: '20px', background: 'var(--color-navy)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '20px', height: '20px', background: 'var(--color-navy)', borderRadius: '50%' }}></div>
            
            "{currentClue || 'Loading clue...'}"
          </div>
          
          {scanError && (
            <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 'bold' }}>
              {scanError}
            </div>
          )}

          {viewingStep === checkpoint ? (
            checkpoint < 6 ? (
              <>
                {!isScanning ? (
                <button className="btn-pirate" onClick={() => { setIsScanning(true); setShowManualEntry(false); }}>
                  Scan Checkpoint QR
                </button>
              ) : (
                <div style={{ background: 'var(--color-dark-navy)', padding: '1rem', borderRadius: '12px' }}>
                  <QRScanner onScanSuccess={handleScanSuccess} onScanFailure={() => {}} />
                  
                  {!showManualEntry ? (
                    <button 
                      onClick={() => setShowManualEntry(true)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', textDecoration: 'underline', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Camera not working? Enter code manually
                    </button>
                  ) : (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Type the secret code written below the physical QR code:</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={manualQr}
                          onChange={e => setManualQr(e.target.value)}
                          placeholder="e.g. RA-CP1"
                          style={{ padding: '0.8rem', flex: 1, borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
                        />
                        <button 
                          style={{ padding: '0.8rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                          onClick={() => handleScanSuccess(manualQr)}
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn-pirate" 
                    onClick={() => setIsScanning(false)}
                    style={{ backgroundColor: '#ef4444', borderColor: '#b91c1c', marginTop: '1.5rem', width: '100%' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
            ) : (
              <h3 style={{ color: 'var(--color-gold)' }}>🎉 You have reached the final destination!</h3>
            )
          ) : (
            <div style={{ marginTop: '2rem', padding: '1.2rem', border: '2px dashed var(--color-gold)', borderRadius: '12px', color: '#e2e8f0', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
              <p style={{ margin: '0 0 0.8rem 0', color: '#94a3b8' }}>You are viewing clue #{viewingStep}.</p>
              <button 
                className="btn-pirate" 
                onClick={() => handleTimelineClick(checkpoint)}
                style={{ fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}
              >
                🎯 Jump to Active Checkpoint {checkpoint} & Scan QR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};

export default ParticipantApp;
