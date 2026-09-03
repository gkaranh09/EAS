const express = require('express');
const router = express.Router();
const programController = require('./program.controller');
const jwt = require('jsonwebtoken');

// Auth middleware for admin endpoints
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No authorization header' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.is_faculty && !payload.is_employee) {
      return res.status(403).json({ message: 'Access denied: Employee/Faculty only' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const isHeadOrAdmin = (user) => {
  if (!user || !user.role) return false;
  const r = user.role.toLowerCase();
  return r === 'admin' || r === 'head' || r === 'administrator';
};

const requireHeadOrAdmin = (req, res, next) => {
  if (!isHeadOrAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only Admins/Heads can modify coordinator program assignments.' });
  }
  next();
};

router.get('/departments', programController.getDepartments);
router.get('/', programController.getPrograms);
router.get('/employee/:employeeId', adminAuth, programController.getEmployeeAllowedPrograms);
router.put('/employee/:employeeId', adminAuth, requireHeadOrAdmin, programController.updateEmployeeAllowedPrograms);

module.exports = router;
