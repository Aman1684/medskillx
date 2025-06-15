// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaSun, FaMoon, FaUserCircle, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

// You'll need to define lightTheme and darkTheme or import them from a shared theme file.
// For now, I'll include basic definitions.
const lightTheme = {
    primary: '#1a73e8', // A nice blue
    text: '#333',
    bg: '#f0f2f5',
    card: '#fff',
    cardShadow: '0 4px 12px rgba(0,0,0,0.08)',
    cardShadowHover: '0 8px 24px rgba(0,0,0,0.12)',
    heroBg: 'linear-gradient(135deg, #e0f2f7, #c1e4f4)',
    cardGradients: [
        'linear-gradient(45deg, #a1c4fd, #c2e9fb)',
        'linear-gradient(45deg, #fbc2eb, #a6c1ee)',
        'linear-gradient(45deg, #84fab0, #8fd3f4)',
    ],
};

const darkTheme = {
    primary: '#42a5f5', // Lighter blue for dark mode
    text: '#f0f0f0',
    bg: '#1a1a1a',
    card: '#2c2c2c',
    cardShadow: '0 4px 12px rgba(0,0,0,0.3)',
    cardShadowHover: '0 8px 24px rgba(0,0,0,0.4)',
    heroBg: 'linear-gradient(135deg, #2c3e50, #34495e)',
    cardGradients: [
        'linear-gradient(45deg, #4b6cb7, #182848)',
        'linear-gradient(45deg, #ee9ca7, #ffdde1)',
        'linear-gradient(45deg, #c2e59c, #64b3f4)',
    ],
};


// Styles (ensure these are consistent with your Home.js)
const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    borderBottom: '1px solid #eee',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    transition: 'background 0.3s, color 0.3s, box-shadow 0.3s',
};

const headerContentStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
};

const navStyle = {
    display: 'flex',
    gap: '30px',
    fontSize: '1.1rem',
    fontWeight: 500,
};

const navLinkStyle = {
    textDecoration: 'none',
    color: 'inherit',
    padding: '5px 0',
    position: 'relative',
};

const userStatusContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
};

const userProfileImageStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid', // Add border to match theme
    borderColor: lightTheme.primary, // Initial border color, will be updated by theme
};

const headerActionBtnStyle = {
    padding: '8px 15px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.3s, transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
};

const darkModeToggleStyleInHeader = {
    padding: '10px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.3s, transform 0.2s',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
};


function Header({ onLoginClick }) { // Removed darkMode, setDarkMode, isLoggedIn, loggedInUser, onLogoutClick from props
  const { isLoggedIn, loggedInUser, logout, authLoading } = useAuth(); // Use useAuth hook
  const [darkMode, setDarkMode] = React.useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  React.useEffect(() => {
    const listener = e => setDarkMode(e.matches);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
    return () => window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener);
  }, []);

  const theme = darkMode ? darkTheme : lightTheme;

  // Apply theme background and text color to body element for global styling
  React.useEffect(() => {
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
    return () => { document.body.style.background = ''; document.body.style.color = ''; };
  }, [theme]);

  if (authLoading) {
      return (
          <header style={{ ...headerStyle, background: theme.card, boxShadow: theme.cardShadow, color: theme.text }}>
              <div style={headerContentStyle}>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>MedSkillX</h2>
                  <div>Loading...</div>
              </div>
          </header>
      );
  }

  return (
    <header style={{
      ...headerStyle,
      background: theme.card,
      boxShadow: theme.cardShadow,
      color: theme.text
    }}>
      <div style={headerContentStyle}>
        {/* MedSkillX Logo/Title */}
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '2rem', color: theme.primary }}>👩‍⚕️</span>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-1px' }}>MedSkillX</h2>
        </Link>

        {/* Navigation Links */}
        <nav style={navStyle}>
          <Link to="/trainx" style={{ ...navLinkStyle, color: theme.text }}>TrainX</Link>
          <Link to="/assessx" style={{ ...navLinkStyle, color: theme.text }}>AssessX</Link>
          <Link to="/hirex" style={{ ...navLinkStyle, color: theme.text }}>HireX</Link>
        </nav>

        {/* User Status & Dark Mode Toggle */}
        <div style={userStatusContainerStyle}>
          {isLoggedIn ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
              {loggedInUser?.profileImage ? (
                <img
                  src={loggedInUser.profileImage}
                  alt={loggedInUser.username || 'User'}
                  style={{ ...userProfileImageStyle, borderColor: theme.primary }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentNode.querySelector('.fallback-icon').style.display = 'block';
                  }}
                />
              ) : (
                <FaUserCircle className="fallback-icon" style={{ ...userProfileImageStyle, display: 'block', fontSize: '2.2rem', color: theme.primary }} />
              )}
              Hi, {loggedInUser?.username}!
              <button
                onClick={logout} // Call logout from context
                style={{ ...headerActionBtnStyle, background: theme.primary, color: '#fff' }}
              >
                <FaSignOutAlt /> Logout
              </button>
            </span>
          ) : (
            <button
              onClick={onLoginClick} // Open login modal passed from App.js
              style={{ ...headerActionBtnStyle, background: theme.primary, color: '#fff' }}
            >
              <FaSignInAlt /> Login
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          <button
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDarkMode(dm => !dm)}
            style={{
              ...darkModeToggleStyleInHeader,
              background: theme.primary,
              color: '#fff',
              border: 'none',
              marginLeft: '15px',
            }}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;