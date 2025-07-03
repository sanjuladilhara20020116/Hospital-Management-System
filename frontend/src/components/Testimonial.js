
import React from 'react';
import { motion } from 'framer-motion';
import { FaQuoteLeft } from 'react-icons/fa';
import './components.css'; 

const Testimonial = ({ testimonial, index }) => {
  return (
    <motion.div 
      className="testimonial-card"
      initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
    >
      <FaQuoteLeft className="quote-icon" />
      <p className="testimonial-text">{testimonial.content}</p>
      <div className="testimonial-author">
        <img src={testimonial.avatar || '/images/user-placeholder.jpg'} alt={testimonial.name} />
        <div>
          <h4>{testimonial.name}</h4>
          <p>{testimonial.relation}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Testimonial;