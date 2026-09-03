# EAS – Exam Application System

A full-stack **Online Exam Form Filling System** built with **PostgreSQL + Express.js + React (Vite)**.

--- 

## 🗂 Project Structure

```
EAS/
├── db/
│   ├── schema.sql        ← Create all tables here
│   └── seed.sql          ← Sample data (students, subjects, exams)
├── backend/              ← Express.js REST API (Port 5000)
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── routes/       ← auth, student, exam, subject, form
│   │   ├── services/pdfService.js
│   │   └── server.js
│   └── .env              ← DB credentials & JWT secret
└── frontend/             ← React + Vite app (Port 5173)
    └── src/
        ├── context/AuthContext.jsx
        ├── pages/        ← LoginPage, Dashboard, ExamFormPage, FormSuccess
        └── index.css     ← Glassmorphism dark theme
```

---

## 🚀 Setup

### 1. PostgreSQL Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE eas_db;"

# Run schema + seed
psql -U postgres -d eas_db -f db/schema.sql
psql -U postgres -d eas_db -f db/seed.sql
```

### 2. Backend

```bash
cd backend
# Edit .env to match your DB credentials
npm run dev       # Starts on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm run dev       # Starts on http://localhost:5173
```

---

## 🔐 Demo Credentials

| Email                 | Password      | Category |
|-----------------------|---------------|----------|
| rahul@student.edu     | password123   | SE       |
| priya@student.edu     | password123   | TE       |
| amit@student.edu      | password123   | BE       |

---

## 📡 API Endpoints

| Method | Endpoint              | Auth | Description                        |
|--------|-----------------------|------|------------------------------------|
| POST   | /api/auth/login       | —    | Login → returns JWT                |
| POST   | /api/auth/register    | —    | Register new student               |
| GET    | /api/student/me       | ✅   | Get current student profile        |
| GET    | /api/exams            | ✅   | List all exams + application status|
| GET    | /api/subjects         | ✅   | List all subjects                  |
| POST   | /api/form/submit      | ✅   | Submit exam form                   |
| GET    | /api/form/status      | ✅   | Get student's submitted forms      |
| GET    | /api/form/pdf/:formId | ✅   | Download PDF of submitted form     |

---

## 🗄 Database Tables

| Table            | Purpose                                       |
|------------------|-----------------------------------------------|
| `student`        | Student info + hashed password                |
| `subject`        | Subject names + max marks per evaluation type |
| `exam`           | Exam info (type + name)                       |
| `exam_form`      | Ties a student to an exam (one per student)   |
| `exam_subject`   | Which subjects the student selected           |
| `fillform_status`| Tracks apply status + payment status          |

---

## 🎨 Features

- 🔐 JWT Authentication (email + bcrypt password)
- 📋 Pre-populated exam form from student profile
- ✅ Subject multi-select with marks info
- 📄 Server-side PDF generation (pdfkit)
- 🚫 Duplicate submission prevention (transactional)
- 💅 Glassmorphism dark UI with animations
- 📱 Fully responsive
