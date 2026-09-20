const jwt = require('jsonwebtoken');
const sessionRepository = require('../../features/auth/session.repository');

const authMiddleware = async (req, res, next) => {
  let authHeader = req.headers['authorization'] || req.query.token;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided', code: 'NO_TOKEN' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate session if session_id is present in token
    if (decoded.session_id) {
      const userType = decoded.user_type || (decoded.is_employee || decoded.is_faculty ? 'employee' : 'student');
      const validation = await sessionRepository.validateSession(userType, decoded.id, decoded.session_id);

      if (!validation.valid) {
        if (validation.reason === 'ACCOUNT_DEACTIVATED') {
          return res.status(403).json({
            message: validation.message || 'Your account has been deactivated.',
            code: 'ACCOUNT_DEACTIVATED'
          });
        }
        if (validation.reason === 'SESSION_SUPERSEDED') {
          return res.status(401).json({
            message: validation.message || 'Session expired: Your account was logged in from another device.',
            code: 'SESSION_SUPERSEDED'
          });
        }
        return res.status(401).json({
          message: 'Session is no longer valid. Please log in again.',
          code: validation.reason || 'SESSION_INVALID'
        });
      }
    }

    req.user = decoded; // { id, email, full_name, session_id, ... }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
};

module.exports = authMiddleware;
