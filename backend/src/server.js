require('dotenv').config();
const express  = require('express');
const cors     = require('cors');

// Import Feature Routes
const authRoutes         = require('./features/auth/auth.routes');
const studentRoutes      = require('./features/student/student.routes');
const examRoutes         = require('./features/exam/exam.routes');
const subjectRoutes      = require('./features/subject/subject.routes');
const formRoutes         = require('./features/form/form.routes');
const employeeMgmtRoutes = require('./features/admin/employeeManagement/employeeManagement.routes');
const semesterTemplateRoutes = require('./features/admin/semesterTemplate/semesterTemplate.routes');
const programRoutes      = require('./features/program/program.routes');
const adminRoutes        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:5174', 'http://127.0.0.1:5174'
  ],
  credentials: true,
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/student',  studentRoutes);
app.use('/api/exams',    examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/form',     formRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/admin/employees', employeeMgmtRoutes);
app.use('/api/admin/semester-templates', semesterTemplateRoutes);
// Mount the remaining admin routes (which still contains employees internally, but we can phase it out)
app.use('/api/admin',    adminRoutes);

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 EAS Backend running on http://localhost:${PORT}`);
});

module.exports = app;
