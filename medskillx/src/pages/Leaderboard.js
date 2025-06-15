import React from 'react';
import { useNavigate } from 'react-router-dom';

const Leaderboard = () => {
  const navigate = useNavigate();
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

  return (
    <div className="leaderboard">
      <h2>🏆 Leaderboard</h2>
      <ul>
        {leaderboard.sort((a, b) => b.score - a.score).map((entry, idx) => (
          <li key={idx}>{entry.name} - {entry.score}</li>
        ))}
      </ul>
      <button onClick={() => navigate('/')}>🔙 Back to Home</button>
    </div>
  );
};

export default Leaderboard;