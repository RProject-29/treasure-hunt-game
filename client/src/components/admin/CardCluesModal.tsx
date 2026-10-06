import React, { useState, useEffect } from 'react';

interface CheckpointConfig {
  step: number;
  text: string;
}

interface RouteData {
  routeId: string;
  name: string;
  routeDescription: string;
  clues: CheckpointConfig[];
}

interface CardCluesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CardCluesModal: React.FC<CardCluesModalProps> = ({ isOpen, onClose }) => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/game';

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setErrorMsg('');
      fetch(`${API_URL}/routes`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const sortedRoutes = data.routes.sort((a: RouteData, b: RouteData) => a.routeId.localeCompare(b.routeId));
            setRoutes(sortedRoutes);
          } else {
            setErrorMsg('Failed to fetch routes from API');
          }
        })
        .catch(err => {
          console.error(err);
          setErrorMsg('Network error fetching routes');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleChange = (routeId: string, value: string) => {
    setRoutes(prev => prev.map(r => {
      if (r.routeId === routeId) {
        const newClues = [...(r.clues || [])];
        const step1Index = newClues.findIndex(c => c.step === 1);
        if (step1Index !== -1) {
          newClues[step1Index] = { ...newClues[step1Index], text: value };
        } else {
          newClues.push({ step: 1, text: value });
        }
        return { ...r, clues: newClues };
      }
      return r;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    let hasError = false;
    let errorMessage = '';

    try {
      for (const route of routes) {
        const res = await fetch(`${API_URL}/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(route)
        });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          hasError = true;
          errorMessage = data.error || 'Unknown error';
          break;
        }
      }
      
      if (hasError) {
        alert('Server rejected the save: ' + errorMessage);
      } else {
        alert('Card clues saved successfully!');
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving card clues');
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#0f172a', width: '90%', maxWidth: '600px',
        borderRadius: '12px', border: '1px solid #38bdf8', padding: '2rem', color: 'white', position: 'relative'
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          ✕
        </button>
        
        <h2 style={{ color: '#38bdf8', marginTop: 0, borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
          Configuring Card Clues
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          {isLoading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading routes...</p>
          ) : errorMsg ? (
            <p style={{ color: '#ef4444', textAlign: 'center' }}>{errorMsg}</p>
          ) : routes.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No routes found in database.</p>
          ) : (
            routes.map((route) => {
              const step1Clue = (route.clues || []).find(c => c.step === 1);
              return (
                <div key={route.routeId}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem', color: '#10b981', fontWeight: 'bold' }}>
                    Route {route.routeId} ({route.name}) Card Clue:
                  </label>
                  <textarea 
                    value={step1Clue ? step1Clue.text : ''} 
                    onChange={e => handleChange(route.routeId, e.target.value)}
                    placeholder={`Type the main clue that will appear on the Route ${route.routeId} selection card...`}
                    rows={3}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white' }}
                  />
                </div>
              );
            })
          )}
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

export default CardCluesModal;
