<!-- =========================
     MediCore HMS README
     ========================= -->

<p align="center">
  <img src="backend/assets/Hospital.png" alt="MediCore HMS Logo" width="200" />
</p>

<h1 align="center">MediCore — Hospital Management System (HMS)</h1>

<p align="center">
  A modular, full-stack healthcare operations platform designed to optimize clinical and administrative workflows with role-based experiences.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-REST_API-black?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white" />
</p>

---

## 📌 Project Overview
**MediCore HMS** is a university group project engineered as a **feature-driven hospital operations suite**.  
The system digitizes end-to-end hospital processes including appointment scheduling, clinical record management, vaccination services, lab reporting with AI insights, healthcare packages, and patient utilities.  

Our delivery approach follows a **modular architecture**: each healthcare domain is implemented as a dedicated module, enabling clean scalability, parallel development, and straightforward maintainability.

---

## 🚀 Core Features
- **User / Customer Management**
  - Secure onboarding and authentication
  - Role-based access control (patient / doctor / admin)
  - Profile lifecycle and account management

- **Appointment Scheduling**
  - Patient appointment booking
  - Doctor availability and schedule visibility
  - Booking validation and coordination workflows

- **Medical Record Management**
  - Diagnosis cards, prescriptions, admission notes, allergies, history
  - Longitudinal record tracking for continuity of care

- **Vaccination Portal**
  - Doctor-side creation, updating, voiding, and validation of records
  - Patient vaccination history and timeline visibility
  - **PDF certificate generation + email dispatch**

- **Lab Report Management + AI Analysis**
  - Report upload, storage, retrieval, and review
  - AI-assisted extraction and decision support for indicators (e.g., cholesterol, diabetes)

- **Healthcare Packages & Utility Tools**
  - Package listing, CRUD, enrollment flows
  - BMI calculator and supportive patient utilities

---

## 🧩 High-Level Architecture
**Frontend (React)**  
Role-segmented UI delivered through dedicated domain pages. A shared API layer standardizes authorization headers, error handling, and client-side state transitions.

**Backend (Node.js / Express)**  
RESTful service layer with independent routers/controllers per module. Middleware enforces access boundaries and supports both JWT guards and lightweight header-based actor resolution for integration agility.

**Database (MongoDB / Mongoose)**  
Domain-specific schemas with timestamps, clinical status flags, void tracking, and certificate metadata for auditability.

> Architecture Diagram 
![System Architecture]
<p align="center">
  <img src="backend/assets/system diagram.jpg" alt="MediCore HMS Logo" width="450" height="550"/>
</p>
---

## 👥 Group Contributors (Equal Ownership)
This project was built as a collaborative university group solution. All team members contributed equally across planning, development, integration, testing, and final delivery.

### Contribution Breakdown

| Team Member | Ownership Areas |
|------------|------------------|
| **Sanjula Dilhara** | User Management, Healthcare Packages, Utility Tools |
| **Chenath Perera** | Lab Report Management, AI-based Report Analysis |
| **Rakindu Rajapaksha** | Vaccination Portal, BMI Calculator |
| **Thushan Shamendra** | Medical Record Management |
| **Dewduni Weerasundara** | Appointment Scheduling |

---

## 🙏 Acknowledgements
- **SLIIT Faculty of Computing** for academic guidance and supervision  
- Module lecturers and lab instructors for continuous support  
- Open-source libraries and community resources that accelerated development  
