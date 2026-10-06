import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import RouteManagerModal from './RouteManagerModal';
import CardCluesModal from './CardCluesModal';

interface Team {
  teamId: string;
  selectedRoute: string | null;
  currentCheckpoint: number;
  isCompleted: boolean;
}

interface JoinRequest {
  teamId: string;
}

const AdminDashboard: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamId, setNewTeamId] = useState('');
  const [managingRoute, setManagingRoute] = useState<string | null>(null);
  const [managingCardClues, setManagingCardClues] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [groupByRoute, setGroupByRoute] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/game';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  const [scanNotifications, setScanNotifications] = useState<{ id: string; message: string }[]>([]);

  useEffect(() => {
    // 1. Fetch initial teams
    fetch(`${API_URL}/teams`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTeams(data.teams);
        }
      })
      .catch(err => console.error("Error fetching teams:", err));

    // 2. Setup Socket.io
    const socket = io(SOCKET_URL);
    
    socket.on('teamUpdated', (updatedTeam: Team) => {
      setTeams(prevTeams => {
        const exists = prevTeams.find(t => t.teamId === updatedTeam.teamId);
        if (exists) {
          return prevTeams.map(t => t.teamId === updatedTeam.teamId ? updatedTeam : t);
        } else {
          return [...prevTeams, updatedTeam];
        }
      });
    });

    socket.on('qrScanned', (data: { teamId: string; checkpoint: number; route: string }) => {
      const notifId = `${data.teamId}-${data.checkpoint}-${Date.now()}`;
      const message = `🎉 Team "${data.teamId}" scanned Checkpoint ${data.checkpoint} on Route ${data.route}! Map Unlocked!`;
      setScanNotifications(prev => [...prev, { id: notifId, message }]);
      setTimeout(() => {
        setScanNotifications(prev => prev.filter(n => n.id !== notifId));
      }, 5000);
    });

    socket.on('joinRequest', (data: JoinRequest) => {
      setJoinRequests(prev => {
        if (!prev.find(req => req.teamId === data.teamId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    socket.on('teamDeleted', (deletedTeamId: string) => {
      setTeams(prevTeams => prevTeams.filter(t => t.teamId !== deletedTeamId));
    });

    socket.on('teamsRefreshed', (refreshedTeams: Team[]) => {
      setTeams(refreshedTeams);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleInitTeams = async () => {
    if (window.confirm("Generate 10 default teams?")) {
      await fetch(`${API_URL}/init-teams`, { method: 'POST' });
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamId.trim()) return;
    await fetch(`${API_URL}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: newTeamId })
    });
    setNewTeamId('');
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (window.confirm(`Delete ${teamId}?`)) {
      await fetch(`${API_URL}/team/${teamId}`, { method: 'DELETE' });
    }
  };

  const handleAcceptJoin = async (teamId: string) => {
    await fetch(`${API_URL}/accept-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId })
    });
    setJoinRequests(prev => prev.filter(req => req.teamId !== teamId));
  };

  const handleRejectJoin = async (teamId: string) => {
    await fetch(`${API_URL}/reject-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId })
    });
    setJoinRequests(prev => prev.filter(req => req.teamId !== teamId));
  };

  const displayedTeams = [...teams];
  if (groupByRoute) {
    displayedTeams.sort((a, b) => {
      const routeA = a.selectedRoute || 'Z';
      const routeB = b.selectedRoute || 'Z';
      return routeA.localeCompare(routeB);
    });
  }

  return (
    <div className="admin-container">
      
      {/* Notifications */}
      <div style={{ position: 'fixed', top: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 1000 }}>
        {scanNotifications.map(notif => (
          <div key={notif.id} style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', color: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.5)', width: '320px', border: '2px solid #10b981', animation: 'fadeIn 0.3s ease' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '6px' }}>🎯 Live QR Scan Event</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{notif.message}</p>
          </div>
        ))}
        {joinRequests.map(req => (
          <div key={req.teamId} style={{ background: '#1e293b', color: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.5)', width: '300px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>New Team Request</h4>
            <p style={{ margin: '0 0 1rem 0' }}>Team <strong>{req.teamId}</strong> wants to join.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleAcceptJoin(req.teamId)} style={{ flex: 1, padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Accept</button>
              <button onClick={() => handleRejectJoin(req.teamId)} style={{ flex: 1, padding: '0.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div className="admin-header">
          <h1 style={{ fontSize: '2rem', color: '#38bdf8', margin: 0 }}>Admin Control Portal</h1>
          <div className="admin-header-actions">
            <button 
              onClick={() => setManagingCardClues(true)}
              style={{ backgroundColor: '#f59e0b', color: 'white', border: '1px solid #d97706', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Config Card Clues
            </button>
            {['A', 'B', 'C'].map(routeId => (
              <button 
                key={routeId}
                onClick={() => setManagingRoute(routeId)}
                style={{ backgroundColor: '#475569', color: 'white', border: '1px solid #64748b', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Config Route {routeId}
              </button>
            ))}
            <span style={{ backgroundColor: '#10b981', color: '#fff', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 'bold' }}>
              ● LIVE TRACKING ACTIVE
            </span>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="admin-stats">
          <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '1rem' }}>Total Teams</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#e2e8f0' }}>{teams.length}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '1rem' }}>Completed</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
              {teams.filter(t => t.isCompleted).length}
            </p>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={handleInitTeams} style={{ padding: '0.8rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Initialize 10 Teams
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newTeamId} 
                onChange={(e) => setNewTeamId(e.target.value)} 
                placeholder="New Team ID" 
                style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
              />
              <button onClick={handleAddTeam} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Tracking Rows */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#e2e8f0' }}>Live Team Progress</h2>
          <button 
            onClick={() => setGroupByRoute(!groupByRoute)}
            style={{ 
              backgroundColor: groupByRoute ? '#38bdf8' : '#475569', 
              color: groupByRoute ? '#0f172a' : 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            {groupByRoute ? 'Ungroup' : 'Group by Route'}
          </button>
        </div>
        
        {displayedTeams.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No teams generated yet...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayedTeams.map(team => (
              <div key={team.teamId} className="admin-team-row">
                
                {/* Team Info */}
                <div className="admin-team-info">
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{team.teamId}</h3>
                  <span style={{ 
                    backgroundColor: team.selectedRoute ? '#0369a1' : '#475569', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem',
                    alignSelf: 'flex-start'
                  }}>
                    {team.selectedRoute ? `Route ${team.selectedRoute}` : 'No Route'}
                  </span>
                  <button 
                    onClick={() => handleDeleteTeam(team.teamId)} 
                    style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer', fontSize: '0.8rem', alignSelf: 'flex-start' }}
                  >
                    Delete Team
                  </button>
                </div>

                {/* Progress Flow (Extended to 6 steps) */}
                <div className="admin-progress-flow">
                  {/* Background Line connecting nodes */}
                  <div style={{ position: 'absolute', top: '50%', left: '3rem', right: '1rem', height: '2px', backgroundColor: '#334155', zIndex: 0 }}></div>

                  {[0, 1, 2, 3, 4, 5, 6].map(step => {
                    const isCompleted = team.currentCheckpoint >= step;
                    const isCurrent = team.currentCheckpoint === step;
                    
                    return (
                      <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          backgroundColor: isCompleted ? '#10b981' : '#0f172a',
                          border: `2px solid ${isCompleted ? '#10b981' : '#475569'}`,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                        }}>
                          {isCompleted ? '✓' : step}
                        </div>
                        <span style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: isCompleted ? '#94a3b8' : '#475569', fontWeight: isCurrent ? 'bold' : 'normal' }}>
                          {step === 0 ? 'Start' : step === 6 ? 'Finish' : `QR ${step}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      <RouteManagerModal 
        isOpen={!!managingRoute}
        selectedRouteId={managingRoute || 'A'}
        onClose={() => setManagingRoute(null)}
      />
      <CardCluesModal 
        isOpen={managingCardClues}
        onClose={() => setManagingCardClues(false)}
      />
    </div>
  );
};

export default AdminDashboard;
