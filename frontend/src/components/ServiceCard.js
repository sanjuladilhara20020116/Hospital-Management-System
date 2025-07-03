
import React from 'react';
import { motion } from 'framer-motion';
import './components.css'; 

const ServiceCard = ({ service, index }) => {
  return (
    <motion.div 
      className="service-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -10 }}
    >
      <div className="service-icon" style={{ backgroundColor: service.color }}>
        {service.icon}
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <button className="read-more">Read More</button>
    </motion.div>
  );
};

export default ServiceCard;