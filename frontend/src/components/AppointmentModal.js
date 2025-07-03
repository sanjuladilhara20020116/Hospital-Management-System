import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaCalendarAlt, FaUser, FaPhone } from 'react-icons/fa';

const AppointmentModal = ({ doctors, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    doctor: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Appointment booked:', formData);
    onClose();
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="appointment-modal"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
      >
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        <h2>Book an Appointment</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><FaUser /> Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label><FaPhone /> Phone Number</label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label><FaCalendarAlt /> Appointment Date</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Select Doctor</label>
            <select 
              name="doctor" 
              value={formData.doctor}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map(doctor => (
                <option key={doctor._id} value={doctor._id}>
                  Dr. {doctor.name} ({doctor.specialization})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Additional Message</label>
            <textarea 
              name="message" 
              value={formData.message}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="submit-btn">
            Book Appointment
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AppointmentModal;