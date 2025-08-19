import React, { useState } from 'react';
import axios from 'axios';

const LabAdminRegister = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    nicNumber: '',
    gender: '',
    age: '',
    address: '',
    contactNumber: '',
    dateOfBirth: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age' ? Number(value) : value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
        console.log(formData)
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        ...formData,
        role: 'LabAdmin',
      });

      alert('✅ Lab Admin Registered Successfully!');
      console.log(response.data);
    } catch (error) {
      alert(error.response?.data?.message || '❌ Registration failed');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: 'auto' }}>
      <h2>Lab Admin Registration</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} required />
        <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <input type="text" name="nicNumber" placeholder="NIC Number" onChange={handleChange} required />
        <input type="text" name="gender" placeholder="Gender" onChange={handleChange} required />
        <input type="number" name="age" placeholder="Age" onChange={handleChange} required />
        <input type="text" name="address" placeholder="Address" onChange={handleChange} required />
        <input type="text" name="contactNumber" placeholder="Contact Number" onChange={handleChange} required />
        <input type="date" name="dateOfBirth" onChange={handleChange} required />
        <button type="submit" style={{ padding: '10px', fontWeight: 'bold' }}>
          Register Lab Admin
        </button>
      </form>
    </div>
  );
};

export default LabAdminRegister;
