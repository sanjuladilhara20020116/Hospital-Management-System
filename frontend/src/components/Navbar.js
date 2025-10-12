import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
  FaShoppingCart,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaUserCircle,       // ⬅️ added for the profile icon (optional)
} from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import logo from "./medicore.png";
import "./Navbar.css";

export default function Navbar({ showUtility = false }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (to) => pathname === to;

  return (
    <div className="site-nav">
      {/* ====== TOP UTILITY STRIP (optional) ====== */}
      {showUtility && (
        <div className="utility-bar" role="region" aria-label="Top contact bar">
          <div className="container utility-inner">
            <div className="u-left">
              <span className="u-item">
                <FaPhoneAlt /> +94 115 577 111
              </span>
              <span className="u-item">
                <FaWhatsapp /> +94 115 777 777
              </span>
              <span className="u-item">
                <FaEnvelope /> medicore@slt.lk
              </span>
            </div>
            <div className="u-right">
              <a className="u-icon" href="#" aria-label="Cart">
                <FaShoppingCart />
              </a>
              <a className="u-icon" href="#" aria-label="Facebook">
                <FaFacebookF />
              </a>
              <a className="u-icon" href="#" aria-label="Twitter">
                <FaTwitter />
              </a>
              <a className="u-icon" href="#" aria-label="Instagram">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ====== BRAND ROW (CENTERED + LARGE LOGO) ====== */}
      <div className="brand-row">
        <div className="container brand-inner">
          <Link to="/" className="brand">
            <img src={logo} alt="Medicore logo" />
            <span className="brand-text"></span>
          </Link>

          {/* Mobile toggle */}
          <button
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="primary-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Toggle navigation</span>
            <span className="hamburger" />
          </button>
        </div>
      </div>

      {/* ====== NAV ROW ====== */}
      <div className="nav-row">
        <div className="container nav-inner">
          <ul id="primary-menu" className={`menu ${open ? "open" : ""}`}>
            <li>
              <Link className={isActive("/about") ? "active" : ""} to="/about">
                About Us 
              </Link>
            </li>

            {/* BMI Calculator (kept from your ask) */}
            <li>
              <Link className={isActive("/bmi") ? "active" : ""} to="/bmi">
                BMI Calculator
              </Link>
            </li>

            <li>
              <Link className={isActive("/contact") ? "active" : ""} to="/contact">
                Contact us
              </Link>
            </li>

            {/* ✅ New: My Profile → routes to /login */}
            <li>
              <Link
                className={isActive("/login") ? "active" : ""}
                to="/login"
                title="Go to login to access your profile"
              >
                <FaUserCircle style={{ marginRight: 6 }} />
                My Profile
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
