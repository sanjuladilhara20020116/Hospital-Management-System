// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './components.css';

const Header = () => {
  return (
    <header className="header">
      {/* Top contact bar stays exactly as-is */}
      <div className="top-bar">
        <div className="container">
          <div className="contact-info">
            <span><FaPhoneAlt /> +94 (555) 123-4567</span>
            <span><FaMapMarkerAlt /> 2 Alfred Pl, Colombo 00300</span>
          </div>
          <div className="auth-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </div>

      {/* ⬇️ Removed the old navigation bar entirely */}
    </header>
  );
};

export default Header;
