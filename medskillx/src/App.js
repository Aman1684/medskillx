// src/App.js
import React, { useState } from 'react'; // Import useState
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import AuthProvider from the central context file
import { AuthProvider } from './contexts/AuthContext';
import ApplyToJobForm from './components/ApplyToJobForm';
// Import the Header, LoginModal, and RegisterModal components
// Assuming these are in the same folder as Home, or you might need to adjust paths
// For simplicity, let's keep them in Home.js for now and import Home as is.
// If you want to put them in separate files, create:
// src/components/Header.js
// src/components/LoginModal.js
// src/components/RegisterModal.js
// and import them accordingly.
// For this example, I'll move them from Home.js to be in App.js scope, or better, new components.
// For clarity and reusability, let's assume they are separate components.
import Header from './components/Header'; // You'll create this file
import LoginModal from './components/LoginModal'; // You'll create this file
import RegisterModal from './components/RegisterModal'; // You'll create this file

import Home from './pages/Home';
import TrainX from './pages/TrainX';
import AssessX from './pages/AssessX';
import HireX from './pages/HireX';
import CourseDetail from './pages/CourseDetail';

function AppContent() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  return (
    <Router>
      {/* Header (including nav and login/logout buttons) */}
      <Header
        onLoginClick={() => setShowLoginModal(true)}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trainx" element={<TrainX />} />
        <Route path="/trainx/:id" element={<CourseDetail />} />
        <Route path="/assessx" element={<AssessX />} />
        <Route path="/hirex" element={<HireX />} />
        <Route path="/apply/:jobId" element={<ApplyToJobForm />} />
      </Routes>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onShowRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
        />
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onShowLogin={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
        />
      )}
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;