import React, { useState, useEffect } from 'react';

interface MapAssemblyAnimationProps {
  unlockedMaps: string[];
  finalMapUrl?: string;
  onClose?: () => void;
}

const MapAssemblyAnimation: React.FC<MapAssemblyAnimationProps> = ({ unlockedMaps, finalMapUrl, onClose }) => {
  const [stage, setStage] = useState<'FLYING' | 'MERGING' | 'FLASH' | 'COMPLETE'>('FLYING');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tiltStyle, setTiltStyle] = useState<{ [key: number]: { rx: number; ry: number } }>({});

  useEffect(() => {
    // Stage Timeline:
    // 0s - 2.8s: 5 Pieces Fly in from staggered 3D coordinates
    // 2.8s - 4.5s: Magnetic Grid Snap & Golden Energy Seam Glow
    // 4.5s - 5.2s: Blinding Golden Shockwave & Particle Blast
    // 5.2s+: Unveiling the Final Master Map uploaded in Admin
    const t1 = setTimeout(() => setStage('MERGING'), 2800);
    const t2 = setTimeout(() => setStage('FLASH'), 4500);
    const t3 = setTimeout(() => setStage('COMPLETE'), 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const pieceImages = [0, 1, 2, 3, 4].map((i) => unlockedMaps[i] || '');
  const pieceTitles = ['Checkpoint 1', 'Checkpoint 2', 'Checkpoint 3', 'Checkpoint 4', 'Checkpoint 5'];

  const handleMouseMove = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rx = -(y / (rect.height / 2)) * 18;
    const ry = (x / (rect.width / 2)) * 18;
    setHoveredIdx(idx);
    setTiltStyle(prev => ({ ...prev, [idx]: { rx, ry } }));
  };

  const handleMouseLeave = (idx: number) => {
    setHoveredIdx(null);
    setTiltStyle(prev => ({ ...prev, [idx]: { rx: 0, ry: 0 } }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(4, 7, 15, 0.97)',
      backdropFilter: 'blur(16px)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflow: 'hidden',
      fontFamily: 'var(--font-heading, "Cinzel", serif)'
    }}>
      <style>{`
        @keyframes compassSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.08); }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
        }
        @keyframes emberFloat {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
        }
        @keyframes 3dFlyPiece0 {
          0% { transform: perspective(1200px) translate3d(-600px, -500px, 700px) rotateX(65deg) rotateY(-70deg) scale(0.1); opacity: 0; filter: blur(10px); }
          70% { transform: perspective(1200px) translate3d(25px, 25px, 40px) rotateX(-10deg) rotateY(10deg) scale(1.08); opacity: 1; filter: blur(0); }
          100% { transform: perspective(1200px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes 3dFlyPiece1 {
          0% { transform: perspective(1200px) translate3d(0px, -650px, 500px) rotateX(-75deg) rotateY(45deg) scale(0.1); opacity: 0; filter: blur(10px); }
          70% { transform: perspective(1200px) translate3d(0px, 25px, -20px) rotateX(10deg) rotateY(-10deg) scale(1.08); opacity: 1; filter: blur(0); }
          100% { transform: perspective(1200px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes 3dFlyPiece2 {
          0% { transform: perspective(1200px) translate3d(600px, -500px, 700px) rotateX(70deg) rotateY(75deg) scale(0.1); opacity: 0; filter: blur(10px); }
          70% { transform: perspective(1200px) translate3d(-25px, 25px, 40px) rotateX(-10deg) rotateY(-10deg) scale(1.08); opacity: 1; filter: blur(0); }
          100% { transform: perspective(1200px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes 3dFlyPiece3 {
          0% { transform: perspective(1200px) translate3d(-600px, 500px, 700px) rotateX(-65deg) rotateY(-60deg) scale(0.1); opacity: 0; filter: blur(10px); }
          70% { transform: perspective(1200px) translate3d(25px, -25px, -20px) rotateX(10deg) rotateY(10deg) scale(1.08); opacity: 1; filter: blur(0); }
          100% { transform: perspective(1200px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes 3dFlyPiece4 {
          0% { transform: perspective(1200px) translate3d(600px, 500px, 700px) rotateX(-70deg) rotateY(70deg) scale(0.1); opacity: 0; filter: blur(10px); }
          70% { transform: perspective(1200px) translate3d(-25px, -25px, -20px) rotateX(10deg) rotateY(-10deg) scale(1.08); opacity: 1; filter: blur(0); }
          100% { transform: perspective(1200px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes shockwaveFlash {
          0% { opacity: 0; transform: scale(0.3); background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(245,158,11,0.9) 50%, rgba(0,0,0,0) 100%); }
          50% { opacity: 1; transform: scale(2); background: #ffffff; }
          100% { opacity: 0; transform: scale(2.8); background: transparent; }
        }
        @keyframes energySeamPulse {
          0% { box-shadow: 0 0 15px #f59e0b, inset 0 0 10px #f59e0b; border-color: #f59e0b; }
          50% { box-shadow: 0 0 110px #f59e0b, 0 0 180px #fbbf24, inset 0 0 50px #fef3c7; border-color: #fef3c7; }
          100% { box-shadow: 0 0 30px #f59e0b, inset 0 0 15px #f59e0b; border-color: #f59e0b; }
        }
        @keyframes grandMasterReveal {
          0% { opacity: 0; transform: scale(0.75) rotate(-4deg); filter: brightness(2.8) contrast(1.6); }
          60% { transform: scale(1.04) rotate(0deg); filter: brightness(1.2); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); filter: brightness(1); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(85vh) rotate(720deg); opacity: 0; }
        }
        @keyframes titleGlow {
          0% { text-shadow: 0 0 12px rgba(245, 158, 11, 0.5); }
          50% { text-shadow: 0 0 35px rgba(245, 158, 11, 1), 0 0 60px rgba(251, 191, 36, 0.9); }
          100% { text-shadow: 0 0 12px rgba(245, 158, 11, 0.5); }
        }
        @keyframes borderGlowPulse {
          0% { border-color: #f59e0b; }
          50% { border-color: #fef3c7; }
          100% { border-color: #f59e0b; }
        }
      `}</style>

      {/* Background Spinning Ancient Compass */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: '780px', height: '780px', borderRadius: '50%',
        border: '2px dashed rgba(245, 158, 11, 0.25)',
        boxShadow: 'inset 0 0 60px rgba(245, 158, 11, 0.12)',
        animation: 'compassSpin 35s linear infinite', pointerEvents: 'none', zIndex: 1
      }}></div>

      {/* Floating Gold Embers Particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
        {[...Array(30)].map((_, i) => (
          <div 
            key={i} 
            style={{
              position: 'absolute',
              bottom: '-20px',
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 7 + 3}px`,
              height: `${Math.random() * 7 + 3}px`,
              backgroundColor: i % 2 === 0 ? '#f59e0b' : '#fef3c7',
              borderRadius: '50%',
              boxShadow: '0 0 12px #f59e0b',
              animation: `emberFloat ${Math.random() * 6 + 5}s infinite ease-in`,
              animationDelay: `${Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Close button */}
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.2rem', right: '1.8rem',
            background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', color: '#fef3c7',
            width: '48px', height: '48px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)', transition: 'transform 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ✕
        </button>
      )}

      {/* Animated Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.2rem', zIndex: 10 }}>
        <h2 style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #f59e0b 70%, #d97706 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          fontSize: '2.4rem', fontWeight: 'bold', margin: 0,
          animation: 'titleGlow 3s infinite ease-in-out', letterSpacing: '2px'
        }}>
          {stage === 'COMPLETE' ? '🏴‍☠️ MASTER TREASURE MAP UNIFIED! 🏴‍☠️' : '✨ 5 ANCIENT MAP FRAGMENTS COMBINING... ✨'}
        </h2>
        
        {/* Fragment Collection Status Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '0.6rem' }}>
          {[1, 2, 3, 4, 5].map(num => (
            <span key={num} style={{
              padding: '4px 11px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
              background: stage === 'COMPLETE' || stage === 'FLASH' ? '#f59e0b' : 'rgba(245, 158, 11, 0.25)',
              color: stage === 'COMPLETE' || stage === 'FLASH' ? '#0f172a' : '#fde68a',
              border: '1px solid #f59e0b',
              transition: 'all 0.3s ease'
            }}>
              Piece #{num} {unlockedMaps[num - 1] ? '✓' : ''}
            </span>
          ))}
        </div>

        <p style={{ color: '#cbd5e1', margin: '0.5rem 0 0 0', fontSize: '1.05rem', fontWeight: '600' }}>
          {stage === 'FLYING' && 'Scattering 5 map pieces with interactive 3D hover effects...'}
          {stage === 'MERGING' && '⚡ Magnetic seam glow locking fragments together! Hover to inspect.'}
          {stage === 'FLASH' && '💥 Energy shockwave fusing map pieces...'}
          {stage === 'COMPLETE' && 'All 5 fragments have united into the Final Master Treasure Map!'}
        </p>
      </div>

      {/* Stage Container */}
      <div style={{
        position: 'relative',
        width: '94%',
        maxWidth: '840px',
        aspectRatio: '1.45',
        backgroundColor: '#060912',
        borderRadius: '20px',
        border: '3px solid #f59e0b',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: stage === 'MERGING' ? '0 0 110px rgba(245, 158, 11, 0.95)' : '0 30px 75px rgba(0,0,0,0.95)',
        animation: stage === 'MERGING' ? 'energySeamPulse 1.2s infinite ease-in-out' : 'none',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 5
      }}>

        {/* Shockwave Flash Layer */}
        {stage === 'FLASH' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: '20px', zIndex: 99,
            animation: 'shockwaveFlash 0.7s forwards'
          }}></div>
        )}

        {/* Confetti Particle Layer on Complete */}
        {stage === 'COMPLETE' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 90, overflow: 'hidden', borderRadius: '20px' }}>
            {[...Array(35)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${Math.random() * -20}px`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 14 + 6}px`,
                backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#fef3c7'][i % 6],
                borderRadius: '2px',
                animation: `confettiFall ${Math.random() * 3 + 2}s forwards`,
                animationDelay: `${Math.random() * 0.8}s`
              }}></div>
            ))}
          </div>
        )}

        {/* STAGE 1 & 2: 5 Grid Pieces Flying & Merging with 3D Hover */}
        {stage !== 'COMPLETE' && stage !== 'FLASH' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            width: '100%',
            height: '100%',
            position: 'relative'
          }}>
            {pieceImages.map((src, idx) => {
              const isBottomRow = idx >= 3;
              const colSpanStyle = isBottomRow 
                ? (idx === 3 ? { gridColumn: '1 / 2' } : { gridColumn: '3 / 4' }) 
                : {};

              const isHovered = hoveredIdx === idx;
              const { rx = 0, ry = 0 } = tiltStyle[idx] || {};

              return (
                <div 
                  key={idx}
                  onMouseMove={e => handleMouseMove(idx, e)}
                  onMouseLeave={() => handleMouseLeave(idx)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: isHovered 
                      ? '3px solid #fef3c7' 
                      : (stage === 'MERGING' ? '3px solid #f59e0b' : '2px solid #b45309'),
                    boxShadow: isHovered 
                      ? '0 20px 40px rgba(245, 158, 11, 0.95), 0 0 30px #fbbf24' 
                      : (stage === 'MERGING' ? '0 0 35px rgba(245, 158, 11, 0.8)' : '0 10px 25px rgba(0,0,0,0.7)'),
                    transform: isHovered 
                      ? `perspective(600px) scale(1.12) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(30px)` 
                      : 'perspective(600px) scale(1) rotateX(0deg) rotateY(0deg)',
                    animation: `3dFlyPiece${idx} 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                    animationDelay: `${idx * 0.22}s`,
                    transition: isHovered ? 'transform 0.1s ease-out, box-shadow 0.2s ease' : 'all 0.4s ease',
                    zIndex: isHovered ? 50 : 5,
                    cursor: 'pointer',
                    ...colSpanStyle
                  }}
                >
                  {/* Dynamic Glare Reflection Overlay on Hover */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%)',
                      pointerEvents: 'none', zIndex: 10
                    }} />
                  )}

                  {src ? (
                    <img 
                      src={src} 
                      alt={`Piece ${idx + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      height: '100%', color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem', background: '#1e293b',
                      padding: '1rem', textAlign: 'center'
                    }}>
                      <span>🧩 Map Piece #{idx + 1}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{pieceTitles[idx]}</span>
                    </div>
                  )}

                  {/* Corner Badge */}
                  <span style={{
                    position: 'absolute', top: '8px', left: '8px',
                    backgroundColor: isHovered ? '#b45309' : 'rgba(120, 53, 15, 0.95)',
                    color: '#fef3c7',
                    padding: '3px 9px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.6)', border: '1px solid #f59e0b', zIndex: 11
                  }}>
                    Piece #{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* STAGE 3: Final Master Map Uploaded in Admin with 3D Hover */}
        {stage === 'COMPLETE' && (
          <div 
            onMouseMove={e => handleMouseMove(99, e)}
            onMouseLeave={() => handleMouseLeave(99)}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'grandMasterReveal 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              position: 'relative',
              transform: hoveredIdx === 99 
                ? `perspective(800px) scale(1.04) rotateX(${tiltStyle[99]?.rx || 0}deg) rotateY(${tiltStyle[99]?.ry || 0}deg)` 
                : 'perspective(800px) scale(1) rotateX(0deg) rotateY(0deg)',
              transition: hoveredIdx === 99 ? 'transform 0.1s ease-out' : 'transform 0.5s ease',
              cursor: 'zoom-in'
            }}
          >
            {hoveredIdx === 99 && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%)',
                pointerEvents: 'none', zIndex: 10
              }} />
            )}

            <img 
              src={finalMapUrl || (unlockedMaps.length > 0 ? unlockedMaps[0] : '')} 
              alt="Final Master Map" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '4px solid #f59e0b',
                boxShadow: hoveredIdx === 99 
                  ? '0 0 90px rgba(245, 158, 11, 1), 0 0 30px #fef3c7' 
                  : '0 0 70px rgba(245, 158, 11, 0.9)'
              }} 
            />
          </div>
        )}

      </div>

      {/* Action Footer Buttons */}
      {stage === 'COMPLETE' && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', gap: '1.2rem', zIndex: 10 }}>
          <button 
            onClick={() => setStage('FLYING')}
            style={{
              padding: '0.9rem 1.8rem', backgroundColor: '#3b82f6', color: 'white',
              border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)', transition: 'transform 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ✨ Replay 3D Assembly Animation
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              style={{
                padding: '0.9rem 1.8rem', backgroundColor: '#10b981', color: 'white',
                border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)', transition: 'transform 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Continue to Final Treasure Spot 🏴‍☠️
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default MapAssemblyAnimation;
