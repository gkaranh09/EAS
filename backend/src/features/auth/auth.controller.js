const authService = require('./auth.service');

const getRequestMeta = (req) => ({
  userAgent: req.headers['user-agent'] || null,
  ipAddress: req.ip || req.connection?.remoteAddress || null
});

const register = async (req, res) => {
  try {
    const meta = getRequestMeta(req);
    const result = await authService.registerStudent(req.body, meta);
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Email already registered') {
      return res.status(409).json({ message: err.message });
    }
    if (err.message.includes('required') || err.message.includes('10-digit number')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const meta = getRequestMeta(req);
    const result = await authService.loginStudent(email, password, meta);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid email or password') {
      return res.status(401).json({ message: err.message });
    }
    if (err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const meta = getRequestMeta(req);
    const result = await authService.loginEmployee(email, password, meta);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid email or password') {
      return res.status(401).json({ message: err.message });
    }
    if (err.message.includes('inactive')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Employee Login error:', err);
    res.status(500).json({ message: 'Server error during employee login' });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user) {
      const userType = req.user.user_type || (req.user.is_employee || req.user.is_faculty ? 'employee' : 'student');
      await authService.logoutUser(userType, req.user.id, req.user.session_id);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

const verifySession = (req, res) => {
  res.json({ valid: true, user: req.user });
};

const disabledEmployeeRegister = (req, res) => {
  res.status(403).json({ message: 'Employee self-registration is disabled. All employees are registered by the Exam Center Head.' });
};

module.exports = {
  register,
  login,
  employeeLogin,
  logout,
  verifySession,
  disabledEmployeeRegister
};
