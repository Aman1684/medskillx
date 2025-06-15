// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <h2>MedSkillX</h2>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/trainx">TrainX</Link></li>
        <li><Link to="/assessx">AssessX</Link></li>
        <li><Link to="/hirex">HireX</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
