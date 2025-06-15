import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NameInput = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleStart = () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    localStorage.setItem('playerName', name.trim());
    navigate('/quiz');
  };

  return (
    <div>
      <h2>Enter Your Name</h2>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
      <button onClick={handleStart}>Start Quiz</button>
    </div>
  );
};

export default NameInput;
