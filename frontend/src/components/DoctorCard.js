
import React from 'react';
import { motion } from 'framer-motion';
import { FaUserMd, FaStethoscope } from 'react-icons/fa';
import './components.css'; 

const DoctorCard = ({ doctor, index, setShowModal }) => {
  return (
    <motion.div 
      className="doctor-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.03 }}
    >
      <div className="doctor-image">
        <img src={doctor.image || '/images/doctor-placeholder.jpg'} alt={doctor.name} />
      </div>
      <div className="doctor-info">
        <h3>Dr. {doctor.name}</h3>
        <p className="specialization">
          <FaStethoscope /> {doctor.specialization}
        </p>
        <p className="experience">{doctor.experience} years experience</p>
        <div className="doctor-actions">
          <button 
            className="appointment-btn"
            onClick={() => setShowModal(true)}
          >
            Book Appointment
          </button>
          <button className="profile-btn">View Profile</button>
        </div>
      </div>
    </motion.div>
  );
};

export default DoctorCard;