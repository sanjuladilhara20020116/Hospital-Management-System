// AboutUs.js
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaAward, FaUsers, FaHeartbeat, FaStethoscope, FaShieldAlt, FaHandHoldingHeart } from 'react-icons/fa';
import { BsArrowRight } from 'react-icons/bs';
import './AboutUs.css';

const AboutUs = () => {
  const values = [
    {
      icon: <FaHeartbeat />,
      title: "Patient-Centered Care",
      description: "Putting patients at the heart of everything we do with compassionate, personalized treatment."
    },
    {
      icon: <FaAward />,
      title: "Clinical Excellence",
      description: "Maintaining the highest standards of medical care through continuous learning and innovation."
    },
    {
      icon: <FaUsers />,
      title: "Collaborative Teamwork",
      description: "Working together across specialties to provide comprehensive, integrated healthcare solutions."
    },
    {
      icon: <FaShieldAlt />,
      title: "Safety First",
      description: "Ensuring the highest levels of safety and quality in all our procedures and treatments."
    },
    {
      icon: <FaStethoscope />,
      title: "Medical Innovation",
      description: "Embracing cutting-edge technology and research to deliver advanced medical solutions."
    },
    {
      icon: <FaHandHoldingHeart />,
      title: "Community Focus",
      description: "Serving our community with dedication and making quality healthcare accessible to all."
    }
  ];

  const milestones = [
    { year: "2005", event: "Medicore Hospital Founded" },
    { year: "2010", event: "Expanded to 200+ Beds" },
    { year: "2015", event: "JCI Accreditation Achieved" },
    { year: "2018", event: "Robotic Surgery Center Opened" },
    { year: "2020", event: "Telemedicine Services Launched" },
    { year: "2023", event: "Advanced Cancer Center Established" }
  ];

  return (
    <div className="about-us">
      {/* Header */}
      <header className="about-header">
        <div className="header-content">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            About Medicore Hospital
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Excellence in Healthcare, Compassion in Service
          </motion.p>
        </div>
      </header>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-grid">
            <motion.div 
              className="mission-content"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2>Our Mission & Vision</h2>
              <p>
                At Medicore Hospital, we are committed to providing exceptional healthcare services 
                that improve the lives of our patients and communities. Our mission is to deliver 
                compassionate, high-quality medical care through innovation, education, and research.
              </p>
              <p>
                We envision a world where everyone has access to advanced medical treatment 
                and preventive care, delivered by a team of dedicated professionals who 
                prioritize patient well-being above all else.
              </p>
              <div className="mission-stats">
                <div className="stat">
                  <h3>50,000+</h3>
                  <p>Patients Treated Annually</p>
                </div>
                <div className="stat">
                  <h3>200+</h3>
                  <p>Medical Experts</p>
                </div>
                <div className="stat">
                  <h3>99%</h3>
                  <p>Patient Satisfaction</p>
                </div>
              </div>
            </motion.div>
            <motion.div 
              className="mission-image"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="image-placeholder">
                <div className="hospital-icon">🏥</div>
                <h4>Medicore Hospital</h4>
                <p>State-of-the-Art Medical Facility</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2>Our Core Values</h2>
            <p>The principles that guide everything we do at Medicore Hospital</p>
          </motion.div>
          <div className="values-grid">
            {values.map((value, index) => (
              <motion.div 
                key={index}
                className="value-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="value-icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="timeline-section">
        <div className="container">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2>Our Journey</h2>
            <p>Milestones in our commitment to healthcare excellence</p>
          </motion.div>
          <div className="timeline">
            {milestones.map((milestone, index) => (
              <motion.div 
                key={index}
                className={`timeline-item ${index % 2 === 0 ? 'left' : 'right'}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                <div className="timeline-content">
                  <div className="timeline-year">{milestone.year}</div>
                  <div className="timeline-event">
                    <h3>{milestone.event}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="container">
          <motion.div 
            className="cta-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2>Ready to Experience World-Class Healthcare?</h2>
            <p>Join thousands of patients who trust Medicore Hospital for their medical needs</p>
            <div className="cta-buttons">
              <Link to="/contact" className="primary-btn">
                Get In Touch <BsArrowRight />
              </Link>
              <Link to="/services" className="secondary-btn">
                Our Services
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;