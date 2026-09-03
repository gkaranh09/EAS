const authService = require('./auth.service');

const register = async (req, res) => {
  try {
    const result = await authService.registerStudent(req.body);
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
    const result = await authService.loginStudent(email, password);
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
    const result = await authService.loginEmployee(email, password);
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

const disabledEmployeeRegister = (req, res) => {
  res.status(403).json({ message: 'Employee self-registration is disabled. All employees are registered by the Exam Center Head.' });
};

module.exports = {
  register,
  login,
  employeeLogin,
  disabledEmployeeRegister
};
