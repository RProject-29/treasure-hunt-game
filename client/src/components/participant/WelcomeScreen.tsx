import React from 'react';

interface WelcomeScreenProps {
  teamName: string;
  onGetStarted: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ teamName, onGetStarted }) => {
  return (
    <div className="container" style={{ textAlign: 'center', maxWidth: '600px' }}>
      <h2>WELCOME TEAM {teamName.toUpperCase()}</h2>
      
      <div style={{ margin: '3rem 0', fontSize: '1.2rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.9)' }}>
        <p>THE HUNT BEGINS NOW...</p>
        <p>You are about to embark on a journey. Choose your path wisely, as once you select a route, there is no turning back.</p>
      </div>

      <button className="btn-pirate" onClick={onGetStarted}>
        GET STARTED
      </button>
    </div>
  );
};

export default WelcomeScreen;
