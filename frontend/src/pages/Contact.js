// Contact.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaAmbulance, FaUser, FaPaperPlane } from 'react-icons/fa';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    alert('Thank you for your message. We will get back to you soon!');
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const contactInfo = [
    {
      icon: <FaPhone />,
      title: "Emergency & General",
      details: ["+94 (555) 123-4567", "+94 (555) 123-4568"],
      description: "24/7 emergency hotline"
    },
    {
      icon: <FaEnvelope />,
      title: "Email Us",
      details: ["info@medicore.com", "appointments@medicore.com"],
      description: "We'll respond within 24 hours"
    },
    {
      icon: <FaMapMarkerAlt />,
      title: "Visit Us",
      details: ["2 Alfred Pl", "Colombo 00300", "Sri Lanka"],
      description: "Main hospital location"
    },
    {
      icon: <FaClock />,
      title: "Opening Hours",
      details: ["Emergency: 24/7", "OPD: 8:00 AM - 8:00 PM", "Weekends: 9:00 AM - 5:00 PM"],
      description: "Always here for you"
    }
  ];

  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Oncology",
    "Emergency Care",
    "General Medicine"
  ];

  return (
    <div className="contact-page">
      {/* Header */}
      <header className="contact-header">
        <div className="header-content">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Contact Medicore Hospital
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            We're here to help you with all your healthcare needs
          </motion.p>
        </div>
      </header>

      {/* Emergency Banner */}
      <motion.section 
        className="emergency-banner"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="banner-content">
            <div className="banner-icon">
              <FaAmbulance />
            </div>
            <div className="banner-text">
              <h3>Medical Emergency?</h3>
              <p>Call our 24/7 emergency hotline immediately</p>
            </div>
            <div className="banner-contact">
              <a href="tel:+945551234567" className="emergency-btn">
                <FaPhone /> +94 (555) 123-4567
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contact Grid */}
      <section className="contact-grid-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Form */}
            <motion.div 
              className="contact-form-container"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2>Send Us a Message</h2>
              <p>Fill out the form below and we'll get back to you as soon as possible</p>
              
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="name">
                    <FaUser /> Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+94 XXX XXX XXX"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="appointment">Book Appointment</option>
                    <option value="general">General Inquiry</option>
                    <option value="emergency">Emergency</option>
                    <option value="billing">Billing Question</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="6"
                    placeholder="Please describe your inquiry in detail..."
                  ></textarea>
                </div>

                <motion.button 
                  type="submit" 
                  className="submit-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaPaperPlane /> Send Message
                </motion.button>
              </form>
            </motion.div>

            {/* Contact Info */}
            <motion.div 
              className="contact-info-container"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2>Get In Touch</h2>
              <p>Multiple ways to reach us for all your healthcare needs</p>

              <div className="contact-info-grid">
                {contactInfo.map((item, index) => (
                  <motion.div 
                    key={index}
                    className="contact-info-card"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="contact-icon">{item.icon}</div>
                    <div className="contact-details">
                      <h3>{item.title}</h3>
                      {item.details.map((detail, idx) => (
                        <p key={idx} className="contact-detail">{detail}</p>
                      ))}
                      <p className="contact-description">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Departments */}
              <div className="departments-section">
                <h3>Medical Departments</h3>
                <div className="departments-grid">
                  {departments.map((dept, index) => (
                    <motion.span 
                      key={index}
                      className="department-tag"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {dept}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <div className="container">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2>Find Our Location</h2>
            <p>Visit us at our state-of-the-art medical facility</p>
          </motion.div>
          
          <motion.div 
            className="map-container"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="map-placeholder">
              <FaMapMarkerAlt className="map-icon" />
              <h3>Medicore Hospital</h3>
              <p>2 Alfred Pl, Colombo 00300, Sri Lanka</p>
              <div className="map-actions">
                <button className="map-btn primary">
                  Get Directions
                </button>
                <button className="map-btn secondary">
                  View Larger Map
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact;