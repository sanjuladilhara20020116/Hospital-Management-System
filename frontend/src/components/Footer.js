
import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import './components.css'; 

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>ST.Joshep Hospital</h3>
          <p>Providing world-class healthcare services with compassion and excellence.</p>
          <div className="social-icons">
            <a href="#"><FaFacebook /></a>
            <a href="#"><FaTwitter /></a>
            <a href="#"><FaInstagram /></a>
            <a href="#"><FaLinkedin /></a>
          </div>
        </div>
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/doctors">Doctors</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Departments</h3>
          <ul>
            <li><Link to="/departments/cardiology">Cardiology</Link></li>
            <li><Link to="/departments/neurology">Neurology</Link></li>
            <li><Link to="/departments/orthopedics">Orthopedics</Link></li>
            <li><Link to="/departments/pediatrics">Pediatrics</Link></li>
            <li><Link to="/departments/pediatrics">more...</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p>2 Alfred Pl</p>
          <p> Colombo 00300</p>
          <p>Phone: +1 (555) 123-4567</p>
          <p>Email: info@st.joshephospital.com</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} ST.Joshep Hospital. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;