import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // ⬅️ add useNavigate
import { motion } from 'framer-motion';
import axios from 'axios';
import './Homepage.css';

// Import components
import Header from '../components/Header';
import Footer from '../components/Footer';
import ServiceCard from '../components/ServiceCard';
import DoctorCard from '../components/DoctorCard';
import Testimonial from '../components/Testimonial';
import AppointmentModal from '../components/AppointmentModal';

// Import icons
import { FaClinicMedical, FaAmbulance, FaMicroscope, FaHeartbeat, FaUserMd, FaCalendarAlt } from 'react-icons/fa';
import { IoMdTime } from 'react-icons/io';
import { BsArrowRight } from 'react-icons/bs';

const Homepage = () => {
  const navigate = useNavigate(); // ⬅️ init navigator

  const [doctors, setDoctors] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState({ patients: 0, surgeries: 0, awards: 0 });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorsRes, testimonialsRes, statsRes] = await Promise.all([
          axios.get('/api/doctors/featured'),
          axios.get('/api/testimonials'),
          axios.get('/api/stats')
        ]);
        setDoctors(doctorsRes.data);
        setTestimonials(testimonialsRes.data);
        setStats(statsRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const services = [
    { id: 1, title: "Emergency Care", description: "24/7 emergency services with state-of-the-art facilities.", icon: <FaAmbulance />, color: "#ff6b6b" },
    { id: 2, title: "Cardiology", description: "Comprehensive heart care from prevention to surgery.", icon: <FaHeartbeat />, color: "#f06595" },
    { id: 3, title: "Neurology", description: "Advanced treatment for neurological disorders.", icon: <FaClinicMedical />, color: "#748ffc" },
    { id: 4, title: "Pediatrics", description: "Specialized care for infants, children and adolescents.", icon: <FaUserMd />, color: "#20c997" }
  ];

  const departments = [
    { id: 'cardiology', name: 'Cardiology' },
    { id: 'neurology', name: 'Neurology' },
    { id: 'orthopedics', name: 'Orthopedics' },
    { id: 'pediatrics', name: 'Pediatrics' },
    { id: 'oncology', name: 'Oncology' },
    { id: 'radiology', name: 'Radiology' }
  ];

  const filteredDoctors = activeTab === 'all'
    ? doctors
    : doctors.filter(doctor => doctor.specialization.toLowerCase() === activeTab);

  const animateStats = (target, current, setter, key) => {
    if (current < target) {
      setTimeout(() => {
        setter(prev => ({ ...prev, [key]: current + 1 }));
      }, 1);
    }
  };

  useEffect(() => {
    animateStats(10000, stats.patients, setStats, 'patients');
    animateStats(5000, stats.surgeries, setStats, 'surgeries');
    animateStats(50, stats.awards, setStats, 'awards');
  }, [stats]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading st. Joshep Hospital...</p>
      </div>
    );
  }

  return (
    <div className="homepage">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            Together Towards <span>Wellness!</span>  Caring for Life.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            Providing exceptional medical care with cutting-edge technology and compassionate professionals.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="hero-buttons">
            {/* ⬇️ Navigate to Appointment Search page */}
            <button className="primary-btn" onClick={() => navigate('/appointments')}>
              <FaCalendarAlt /> Book Appointment
            </button>
            <Link to="/services" className="secondary-btn">
              Our Services <BsArrowRight />
            </Link>
          </motion.div>
        </div>
        <div className="hero-image">
          <img src="/images/doctor.png" alt="Doctor" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card"><h3>{stats.patients.toLocaleString()}+</h3><p>Patients Treated</p></div>
          <div className="stat-card"><h3>{stats.surgeries.toLocaleString()}+</h3><p>Successful Surgeries</p></div>
          <div className="stat-card"><h3>{stats.awards}</h3><p>Medical Awards</p></div>
          <div className="stat-card"><h3>24/7</h3><p>Emergency Services</p></div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="section-header">
          <h2>Our <span>Services</span></h2>
          <p>Comprehensive medical services tailored to your needs</p>
        </div>
        <div className="services-grid">
          {services.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </div>
        <div className="view-all">
          <Link to="/services" className="view-all-btn">View All Services <BsArrowRight /></Link>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="doctors-section">
        <div className="section-header">
          <h2>Our <span>Specialists</span></h2>
          <p>Meet our team of highly qualified medical professionals</p>
        </div>
        <div className="department-tabs">
          <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>All Specialists</button>
          {departments.map(dept => (
            <button key={dept.id} className={activeTab === dept.id ? 'active' : ''} onClick={() => setActiveTab(dept.id)}>
              {dept.name}
            </button>
          ))}
        </div>
        <div className="doctors-grid">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor, index) => (
              <DoctorCard key={doctor._id} doctor={doctor} index={index} setShowModal={setShowModal} />
            ))
          ) : (
            <div className="no-doctors"><p>No doctors found in this department.</p></div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-header">
          <h2>Patient <span>Testimonials</span></h2>
          <p>What our patients say about us</p>
        </div>
        <div className="testimonials-slider">
          {testimonials.map((testimonial, index) => (
            <Testimonial key={testimonial._id} testimonial={testimonial} index={index} />
          ))}
        </div>
      </section>

      {/* Emergency Banner */}
      <section className="emergency-banner">
        <div className="banner-content">
          <div className="banner-text">
            <h3>Emergency Medical Care 24/7</h3>
            <p>Immediate assistance for critical health situations</p>
          </div>
          <div className="banner-contact">
            <div className="contact-item"><FaAmbulance /><span>Emergency: +1 (555) 123-4567</span></div>
            <div className="contact-item"><IoMdTime /><span>Open 24 hours, 7 days a week</span></div>
          </div>
        </div>
      </section>

      {/* Keep modal available if used elsewhere */}
      {showModal && (
        <AppointmentModal doctors={doctors} onClose={() => setShowModal(false)} />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Homepage;
