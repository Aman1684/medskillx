// src/components/RegisterModal.js
import React, { useState } from 'react';
import { FaTimes, FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

// You'll need to define lightTheme and darkTheme or import them from a shared theme file.
const lightTheme = {
    primary: '#1a73e8', // A nice blue
    text: '#333',
    bg: '#f0f2f5',
    card: '#fff',
    cardShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const darkTheme = {
    primary: '#42a5f5', // Lighter blue for dark mode
    text: '#f0f0f0',
    bg: '#1a1a1a',
    card: '#2c2c2c',
    cardShadow: '0 4px 12px rgba(0,0,0,0.3)',
};


// Styles (ensure these are consistent with your Home.js)
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    animation: 'overlayFadeIn 0.3s ease-out forwards',
};

const modalContentStyle = {
    position: 'relative',
    padding: '30px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    animation: 'modalFadeIn 0.3s ease-out forwards',
};

const modalCloseBtnStyle = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#888',
    transition: 'color 0.2s',
};

const registerFormStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginTop: '25px',
};

const registerInputStyle = {
    padding: '12px 15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

const registerBtnStyle = {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: 600,
    transition: 'background 0.3s, transform 0.2s',
};

const registerErrorStyle = {
    color: '#e74c3c',
    fontSize: '0.9rem',
    marginTop: '10px',
};

const linkButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    margin: 0,
    fontSize: 'inherit',
    textDecoration: 'underline',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
};


function RegisterModal({ onClose, onShowLogin }) {
  const { register } = useAuth(); // Get the centralized register function
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get current theme from body styles (or pass down from App if you prefer)
  const darkMode = document.body.style.background === darkTheme.bg;
  const theme = darkMode ? darkTheme : lightTheme;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setIsLoading(true);

    const response = await register(username, email, password); // Call centralized register

    setIsLoading(false);
    if (response.success) {
      onClose(); // Close modal on success (and user is auto-logged in)
    } else {
      setRegisterError(response.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContentStyle, background: theme.card, boxShadow: theme.cardShadow, color: theme.text }}>
        <button onClick={onClose} style={modalCloseBtnStyle}>
          <FaTimes />
        </button>
        <h3 style={{ color: theme.primary, marginBottom: '20px' }}>Register for MedSkillX</h3>
        <form onSubmit={handleSubmit} style={registerFormStyle}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              ...registerInputStyle,
              background: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.primary}55`,
            }}
            disabled={isLoading}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              ...registerInputStyle,
              background: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.primary}55`,
            }}
            disabled={isLoading}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...registerInputStyle,
              background: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.primary}55`,
            }}
            disabled={isLoading}
            required
          />
          {registerError && <p style={registerErrorStyle}>{registerError}</p>}
          <button
            type="submit"
            style={{
              ...registerBtnStyle,
              background: theme.primary,
              color: '#fff',
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ fontSize: '0.9rem', color: theme.text, marginTop: '20px' }}>
          Already have an account? {' '}
          <button onClick={onShowLogin} style={{ ...linkButtonStyle, color: theme.primary }}>
            <FaSignInAlt style={{ marginRight: '5px' }} /> Login Here
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterModal;