const express = require('express');
const auth = require('../../core/middleware/auth');
const { requireRole } = require('../../core/middleware/rbac');
const examController = require('./exam.controller');
const pool = require('../../core/config/db');

const router = express.Router();

router.get('/', auth, examController.getExams);

// GET /api/exams/hold-check
// Student-facing: check if the logged-in student is currently on the hold list
router.get('/hold-check', auth, requireRole('STUDENT'), async (req, res) => {
  try {
    const studentInternalId = req.user.id;
    
    const result = await pool.query(
      `SELECT h.id, h.restricted, h.remark, h.last_updated
       FROM student_hold_list h
       WHERE h.student_id = $1 AND h.restricted = true`,
      [studentInternalId]
    );

    if (result.rows.length > 0) {
      const hold = result.rows[0];
      return res.json({
        restricted: true,
        remark: hold.remark || 'Others',
        contact: 'Counter No. 8',
        last_updated: hold.last_updated
      });
    }

    res.json({ restricted: false });
  } catch (err) {
    console.error('Hold check error:', err);
    res.status(500).json({ message: 'Server error checking hold status' });
  }
});

module.exports = router;
