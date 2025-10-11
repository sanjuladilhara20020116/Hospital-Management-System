// Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './components.css'; 
import logo from './medicore.png';

const Header = () => {
  return (
    <header className="header">
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
      <nav className="main-nav">
        <div className="container">
          <Link to="/" className="logo">
            <img src={logo} alt="Medicore Hospital Logo" className="logo-image" />
            <span className="logo-text"></span>
          </Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
            <Link to="/services">Services</Link>
            
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;