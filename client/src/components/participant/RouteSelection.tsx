import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

interface RouteSelectionProps {
  onSelectRoute: (routeId: string) => void;
}

interface RouteData {
  routeId: string;
  name: string;
  clues: { step: number; text: string }[];
}

const RouteSelection: React.FC<RouteSelectionProps> = ({ onSelectRoute }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/game';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const fetchRoutes = () => {
      fetch(`${apiUrl}/routes`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRoutes(data.routes);
          }
        })
        .catch(err => console.error(err));
    };

    fetchRoutes();

    const socket = io(socketUrl);
    socket.on('routesUpdated', () => {
      // Whenever admin saves ANY route configuration, refetch to get latest clues
      fetchRoutes();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const baseCards = [
    { 
      id: 'A', 
      name: 'MYSTERY', 
      bg: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
      border: '#ef4444',
      shadow: 'rgba(239, 68, 68, 0.6)',
      icon: '🗝️',
      tagline: 'Uncover the ancient secrets.'
    },
    { 
      id: 'B', 
      name: 'SHADOW', 
      bg: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
      border: '#8b5cf6',
      shadow: 'rgba(139, 92, 246, 0.6)',
      icon: '🌑',
      tagline: 'Embrace the darkness.'
    },
    { 
      id: 'C', 
      name: 'LEGACY', 
      bg: 'linear-gradient(135deg, #422006, #78350f)',
      border: '#f59e0b',
      shadow: 'rgba(245, 158, 11, 0.6)',
      icon: '📜',
      tagline: 'Claim your rightful glory.'
    }
  ];

  const cards = baseCards.map(base => {
    const route = routes.find(r => r.routeId === base.id);
    const firstClue = route?.clues?.find(c => c.step === 1)?.text || 'Select to begin your journey...';
    return { ...base, name: route?.name || base.name, description: firstClue };
  });

  return (
    <div style={{ textAlign: 'center', width: '100%', padding: '1rem 0' }}>
      <style>{`
        .route-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .route-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <h2>CHOOSE YOUR PATH</h2>
      <p style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
        Select one of the three routes. Once selected, your path is locked forever.
      </p>

      <div className="route-scroll-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1rem 0'
      }}>
        {cards.filter(card => !flippedCard || flippedCard === card.id).map(card => (
          <div
            key={card.id}
            onMouseEnter={() => setHoveredCard(card.id)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              perspective: '1000px',
              width: flippedCard === card.id ? '320px' : '260px',
              height: flippedCard === card.id ? '380px' : '200px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredCard === card.id && flippedCard !== card.id ? 'translateY(-5px)' : 'translateY(0)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
                transformStyle: 'preserve-3d',
                transform: flippedCard === card.id ? 'rotateY(180deg) scale(1)' : 'rotateY(0deg)',
                cursor: 'pointer',
                boxShadow: flippedCard === card.id ? '0 15px 30px rgba(0,0,0,0.6)' : '0 5px 15px rgba(0,0,0,0.3)',
                borderRadius: '16px'
              }}
              onClick={() => setFlippedCard(flippedCard === card.id ? null : card.id)}
            >
              {/* Card Front */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                background: card.bg,
                border: `3px solid ${card.border}`,
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1rem',
                boxSizing: 'border-box',
                boxShadow: `inset 0 0 20px ${card.shadow}`
              }}>
                <div style={{ fontSize: flippedCard === card.id ? '3.5rem' : '2.5rem', marginBottom: '0.5rem', transition: 'all 0.4s', filter: `drop-shadow(0 0 10px ${card.border})` }}>{card.icon}</div>
                <h3 style={{ fontSize: flippedCard === card.id ? '1.8rem' : '1.2rem', margin: 0, color: card.border, textShadow: '2px 2px 4px rgba(0,0,0,0.8)', transition: 'all 0.4s', fontFamily: 'var(--font-heading)' }}>
                  ROUTE {card.id}
                </h3>
                <p style={{ fontWeight: 'bold', letterSpacing: '1px', marginTop: '0.5rem', fontSize: flippedCard === card.id ? '1rem' : '0.8rem', color: '#fff' }}>
                  {card.name}
                </p>
                <div style={{ 
                  marginTop: '0.8rem', 
                  fontSize: '0.8rem', 
                  fontStyle: 'italic', 
                  color: 'rgba(255,255,255,0.7)',
                  opacity: flippedCard === card.id ? 1 : 0,
                  maxHeight: flippedCard === card.id ? '50px' : '0px',
                  transition: 'all 0.4s',
                  overflow: 'hidden'
                }}>
                  "{card.tagline}"
                </div>
                <p style={{ marginTop: 'auto', fontSize: '0.75rem', color: card.border, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Click to reveal</p>
              </div>

              {/* Card Back */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                background: `linear-gradient(135deg, #0f172a, #000)`,
                border: `3px solid ${card.border}`,
                boxShadow: `inset 0 0 20px ${card.shadow}`,
                borderRadius: '12px',
                transform: 'rotateY(180deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1.5rem',
                boxSizing: 'border-box',
                textAlign: 'center'
              }}>
                <h4 style={{ color: 'var(--color-gold)', margin: '0 0 1rem 0' }}>{card.name} CLUE:</h4>
                <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#e2e8f0', flexGrow: 1, overflowY: 'auto' }}>
                  "{card.description}"
                </p>
                <button
                  className="btn-pirate"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRoute(card.id);
                  }}
                  style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: '100%', marginTop: '1rem' }}
                >
                  Lock In Route
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteSelection;
