const crypto = require('crypto');
const pool = require('../../core/config/db');

/**
 * Starts a new session for a user (Student or Employee).
 * Automatically deactivates all prior active sessions for this user (Single-Session Concurrency).
 */
const startUserSession = async ({ userType, userId, userAgent = null, ipAddress = null }) => {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const targetTable = userType === 'employee' ? 'employee' : 'student';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Deactivate all prior sessions for this user
    await client.query(
      `UPDATE user_sessions 
       SET is_active = false 
       WHERE user_type = $1 AND user_id = $2 AND is_active = true`,
      [userType, userId]
    );

    // 2. Insert new active session record
    await client.query(
      `INSERT INTO user_sessions (session_id, user_type, user_id, is_active, user_agent, ip_address, created_at, last_seen_at)
       VALUES ($1, $2, $3, true, $4, $5, NOW(), NOW())`,
      [sessionId, userType, userId, userAgent, ipAddress]
    );

    // 3. Update the user row with active_session_id and increment token_version
    const updateRes = await client.query(
      `UPDATE ${targetTable}
       SET active_session_id = $1, 
           token_version = COALESCE(token_version, 0) + 1
       WHERE id = $2
       RETURNING id, active_session_id, token_version`,
      [sessionId, userId]
    );

    await client.query('COMMIT');

    const updatedUser = updateRes.rows[0];
    return {
      sessionId,
      tokenVersion: updatedUser ? updatedUser.token_version : 1
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error starting user session:', err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Validates whether the given sessionId is the currently active session for the user.
 * Also checks if the employee account is active.
 */
const validateSession = async (userType, userId, sessionId) => {
  if (!userId || !sessionId) {
    return { valid: false, reason: 'INVALID_CREDENTIALS' };
  }

  if (userType === 'employee') {
    const res = await pool.query(
      'SELECT id, active, active_session_id, role, department_id FROM employee WHERE id = $1',
      [userId]
    );

    if (res.rows.length === 0) {
      return { valid: false, reason: 'USER_NOT_FOUND' };
    }

    const employee = res.rows[0];
    if (employee.active === false) {
      return { valid: false, reason: 'ACCOUNT_DEACTIVATED', message: 'Your account has been deactivated. Please contact the administrator.' };
    }

    if (employee.active_session_id !== sessionId) {
      return { valid: false, reason: 'SESSION_SUPERSEDED', message: 'Session expired: Your account was logged in from another device or browser.' };
    }

    return { valid: true, user: employee };
  } else {
    // Student
    const res = await pool.query(
      'SELECT id, active_session_id FROM student WHERE id = $1',
      [userId]
    );

    if (res.rows.length === 0) {
      return { valid: false, reason: 'USER_NOT_FOUND' };
    }

    const student = res.rows[0];
    if (student.active_session_id !== sessionId) {
      return { valid: false, reason: 'SESSION_SUPERSEDED', message: 'Session expired: Your account was logged in from another device or browser.' };
    }

    return { valid: true, user: student };
  }
};

/**
 * Terminates an active session (e.g. on explicit logout).
 */
const terminateSession = async (userType, userId, sessionId) => {
  const targetTable = userType === 'employee' ? 'employee' : 'student';
  try {
    if (sessionId) {
      await pool.query('UPDATE user_sessions SET is_active = false WHERE session_id = $1', [sessionId]);
    }
    if (userId) {
      await pool.query(
        `UPDATE ${targetTable} SET active_session_id = NULL WHERE id = $1 AND active_session_id = $2`,
        [userId, sessionId]
      );
    }
    return true;
  } catch (err) {
    console.error('Error terminating session:', err);
    return false;
  }
};

module.exports = {
  startUserSession,
  validateSession,
  terminateSession
};
