// frontend/src/pages/UploadReportForm.js
import React, { useState } from 'react';
import axios from 'axios';

const UploadReportForm = () => {
  const [patientUserId, setPatientUserId] = useState('');
  const [reportType, setReportType] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const reportTypes = ['Cholesterol', 'Diabetes', 'X-ray']; // Add more later

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!patientUserId || !reportType || !file) {
      setMessage('All fields are required');
      return;
    }

    try {
      // Step 1: Find patient by userId to get ObjectId
      const userRes = await axios.get(`/api/users/${encodeURIComponent(patientUserId)}`);
      const patientId = userRes.data._id;

      // Step 2: Upload report
      const formData = new FormData();
      formData.append('patientId', patientId);
      formData.append('reportType', reportType);
      formData.append('report', file);

      const token = localStorage.getItem('token');

      const res = await axios.post('/api/lab-reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setMessage('Report uploaded successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Upload failed. Check patient ID or file.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2>Upload Lab Report</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div>
          <label>Patient User ID:</label>
          <input
            type="text"
            value={patientUserId}
            onChange={(e) => setPatientUserId(e.target.value)}
            placeholder="E.g. P2025/001/123"
            required
          />
        </div>

        <div>
          <label>Report Type:</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} required>
            <option value="">-- Select Type --</option>
            {reportTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Upload File (PDF or Image):</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>

        <button type="submit">Upload Report</button>
      </form>

      {message && <p style={{ marginTop: '10px' }}>{message}</p>}
    </div>
  );
};

export default UploadReportForm;
