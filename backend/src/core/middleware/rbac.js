const pool = require('../config/db');

const ROLES = {
  HEAD: 'head',
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
  STUDENT: 'student'
};

/**
 * Returns null for unrestricted roles (HEAD, ADMIN),
 * or an array of allowed program IDs for COORDINATOR.
 */
const getAllowedProgramIds = async (user) => {
  if (!user) return [];
  const r = (user.role || '').toLowerCase();
  if (r === 'head' || r === 'admin' || r === 'administrator') {
    return null; // Unrestricted access
  }
  if (user.allowed_program_ids && Array.isArray(user.allowed_program_ids)) {
    return user.allowed_program_ids;
  }
  const res = await pool.query(
    'SELECT program_id FROM allowed_coordinate_programs_exam WHERE employee_id = $1',
    [user.id]
  );
  return res.rows.map(r => r.program_id);
};

/**
 * Declarative Role-Based Access Control Middleware Factory.
 * Usage: requireRole('HEAD', 'ADMIN') or requireRole(ROLES.HEAD, ROLES.ADMIN)
 */
const requireRole = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(r => (r || '').toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required', code: 'UNAUTHORIZED' });
    }

    const isStudentUser = req.user.user_type === 'student' || (!req.user.is_employee && !req.user.is_faculty);
    const userRole = isStudentUser ? 'student' : (req.user.role || '').toLowerCase();

    // Map 'administrator' alias to 'admin'
    const effectiveRole = userRole === 'administrator' ? 'admin' : userRole;

    if (!normalizedAllowed.includes(effectiveRole)) {
      return res.status(403).json({
        message: 'Access denied: You do not have the required role permissions to perform this action.',
        code: 'FORBIDDEN_ROLE',
        requiredRoles: allowedRoles,
        currentRole: effectiveRole
      });
    }

    next();
  };
};

/**
 * Program Boundary Enforcement Middleware for Coordinators.
 * Checks if target program_id is within the coordinator's allowed programs.
 */
const requireProgramScope = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const allowedPids = await getAllowedProgramIds(req.user);
  if (allowedPids === null) {
    // Unrestricted for Head & Admin
    req.allowedProgramIds = null;
    return next();
  }

  req.allowedProgramIds = allowedPids;

  // Extract program_id from params, query, or body if present
  const targetPid = req.params.programId || req.params.program_id || req.body?.program_id || req.query?.program_id;
  if (targetPid && targetPid !== 'ALL') {
    const numPid = parseInt(targetPid, 10);
    if (!isNaN(numPid) && !allowedPids.includes(numPid)) {
      return res.status(403).json({
        message: 'Access denied: As an Exam Coordinator, you can only manage data for your assigned coordinate programs.',
        code: 'PROGRAM_UNAUTHORIZED'
      });
    }
  }

  next();
};

module.exports = {
  ROLES,
  requireRole,
  getAllowedProgramIds,
  requireProgramScope
};
