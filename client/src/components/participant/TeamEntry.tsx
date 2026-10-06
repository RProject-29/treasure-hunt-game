import { useState } from 'react';

export default function TeamEntry({ onJoin }: { onJoin: (code: string) => void }) {
  const [teamCode, setTeamCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamCode.trim().length > 0) {
      onJoin(teamCode.trim());
    }
  };

  return (
    <div className="container">
      <div className="decor-skull">☠️</div>
      <h1 style={{ fontSize: '3.5rem', marginBottom: '0.5rem', color: 'var(--color-dark-wood)' }}>
        The Cursed Hunt
      </h1>
      <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.2rem', fontStyle: 'italic' }}>
        "Dead men tell no tales, but they leave maps behind..."
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Enter yer Team Code, matey..." 
          className="input-pirate"
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value)}
          required
        />
        <button type="submit" className="btn-pirate" style={{ marginTop: '1rem', width: '100%' }}>
          Set Sail
        </button>
      </form>
    </div>
  );
}
