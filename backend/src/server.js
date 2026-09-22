require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import Rate Limiters
const { apiGlobalLimiter } = require('./core/middleware/rateLimiter');

// Import Feature Routes
const authRoutes = require('./features/auth/auth.routes');
const studentRoutes = require('./features/student/student.routes');
const examRoutes = require('./features/exam/exam.routes');
const subjectRoutes = require('./features/subject/subject.routes');
const formRoutes = require('./features/form/form.routes');
const employeeMgmtRoutes = require('./features/admin/employeeManagement/employeeManagement.routes');
const semesterTemplateRoutes = require('./features/admin/semesterTemplate/semesterTemplate.routes');
const programRoutes = require('./features/program/program.routes');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ── CORS & Parsing ───────────────────────────────────────────
// 1. Local PC origins (Vite default ports 5173 and 5174)
const localOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
];

// 2. Production Cloud Frontend origin(s) from environment variable
const cloudOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/+$/, ''))
  : [];

// Combined strict whitelist: only your local PC ports and your specific Vercel URL
const allowedOrigins = [...localOrigins, ...cloudOrigins].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / healthcheck requests with no origin header
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS Blocked: Origin '${origin}' is not allowed.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Global API Rate Limiter ──────────────────────────────────
app.use('/api', apiGlobalLimiter);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/form', formRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/admin/employees', employeeMgmtRoutes);
app.use('/api/admin/semester-templates', semesterTemplateRoutes);
// Mount the remaining admin routes
app.use('/api/admin', adminRoutes);

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
