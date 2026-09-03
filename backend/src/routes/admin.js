const express = require('express');
const pool    = require('../config/db');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const router = express.Router();

// Middleware to protect admin routes
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header' });
  }

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

const isGlobalAdmin = (user) => {
  if (!user || !user.role) return false;
  const r = user.role.toLowerCase();
  return r === 'admin' || r === 'head' || r === 'administrator';
};

const getAllowedProgramIds = async (user) => {
  if (isGlobalAdmin(user)) return null; // Unrestricted access for Head & Admin
  if (user.allowed_program_ids && Array.isArray(user.allowed_program_ids)) {
    return user.allowed_program_ids;
  }
  const res = await pool.query('SELECT program_id FROM allowed_coordinate_programs_exam WHERE employee_id = $1', [user.id]);
  return res.rows.map(r => r.program_id);
};

// ─── GET /api/admin/forms ──────────────────────────────────────────
// Returns all exam applications with filters (scoped for Coordinators by allowed_coordinate_programs_exam)
router.get('/forms', adminAuth, async (req, res) => {
  const { search, payment_status, exam_id, branch, program_id, is_approved, admit_card_released } = req.query;

  let query = `
    SELECT 
      ef.form_id,
      ef.is_approved,
      ef.admit_card_released,
      s.full_name AS student_name,
      s.email AS student_email,
      s.student_id,
      COALESCE(s.roll_no, s.student_id) AS roll_no,
      COALESCE(s.division, 'A') AS division,
      COALESCE(p.program_name, d.department_name, 'Engineering') AS student_department,
      p.program_name,
      d.department_name,
      s.program_id,
      s.department_id,
      e.exam_name,
      e.exam_code,
      fs.payment_status,
      fs.razorpay_payment_id AS payment_id,
      fs.amount_paid,
      fs.applied_at,
      COALESCE(p.program_name, d.department_name, 'General') AS branch
    FROM exam_form ef
    JOIN student s ON s.id = ef.student_id
    LEFT JOIN program p ON p.program_id = s.program_id
    LEFT JOIN department d ON d.department_id = s.department_id
    JOIN exam e ON e.exam_id = ef.exam_id
    JOIN fillform_status fs ON fs.form_id = ef.form_id
    WHERE 1=1
  `;
  const params = [];

  const allowedPids = await getAllowedProgramIds(req.user);
  if (allowedPids !== null) {
    if (allowedPids.length === 0) {
      return res.json([]);
    }
    params.push(allowedPids);
    query += ` AND s.program_id = ANY($${params.length}::int[])`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (s.full_name ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.student_id ILIKE $${params.length} OR s.roll_no ILIKE $${params.length} OR s.division ILIKE $${params.length} OR p.program_name ILIKE $${params.length} OR d.department_name ILIKE $${params.length})`;
  }

  if (payment_status) {
    params.push(payment_status);
    query += ` AND fs.payment_status = $${params.length}`;
  }

  if (exam_id) {
    params.push(exam_id);
    query += ` AND e.exam_id = $${params.length}`;
  }

  if (program_id && program_id !== 'ALL') {
    params.push(parseInt(program_id));
    query += ` AND s.program_id = $${params.length}`;
  } else if (branch && branch !== 'ALL') {
    params.push(`%${branch}%`);
    query += ` AND (p.program_name ILIKE $${params.length} OR d.department_name ILIKE $${params.length})`;
  }

  if (is_approved !== undefined && is_approved !== '') {
    params.push(is_approved === 'true' || is_approved === true);
    query += ` AND ef.is_approved = $${params.length}`;
  }

  if (admit_card_released !== undefined && admit_card_released !== '') {
    params.push(admit_card_released === 'true' || admit_card_released === true);
    query += ` AND ef.admit_card_released = $${params.length}`;
  }

  query += ` ORDER BY ef.form_id DESC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch admin forms error:', err);
    res.status(500).json({ message: 'Server error fetching forms list' });
  }
});

// ─── POST /api/admin/forms/approve ──────────────────────────────────
// Approves form(s) with program boundary checks for Exam Coordinators
router.post('/forms/approve', adminAuth, async (req, res) => {
  const { form_ids, exam_id, branch, program_id, approve_all, set_approved = true } = req.body;
  const allowedPids = await getAllowedProgramIds(req.user);

  try {
    if (approve_all) {
      let updateQuery = `
        UPDATE exam_form
        SET is_approved = $1
        WHERE form_id IN (
          SELECT ef.form_id
          FROM exam_form ef
          JOIN student s ON s.id = ef.student_id
          JOIN exam e ON e.exam_id = ef.exam_id
          LEFT JOIN program p ON p.program_id = s.program_id
          WHERE 1=1
      `;
      const params = [set_approved];

      if (allowedPids !== null) {
        if (allowedPids.length === 0) {
          return res.json({ message: 'No coordinate programs assigned.', count: 0 });
        }
        params.push(allowedPids);
        updateQuery += ` AND s.program_id = ANY($${params.length}::int[])`;
      }

      if (exam_id) {
        params.push(exam_id);
        updateQuery += ` AND e.exam_id = $${params.length}`;
      }

      if (program_id && program_id !== 'ALL') {
        params.push(parseInt(program_id));
        updateQuery += ` AND s.program_id = $${params.length}`;
      }

      updateQuery += `)`;

      const result = await pool.query(updateQuery, params);
      return res.json({ message: `Successfully updated approval status for ${result.rowCount} form(s).`, count: result.rowCount });
    }

    if (Array.isArray(form_ids) && form_ids.length > 0) {
      if (allowedPids !== null) {
        const checkProg = await pool.query(
          `SELECT ef.form_id, s.program_id 
           FROM exam_form ef 
           JOIN student s ON s.id = ef.student_id 
           WHERE ef.form_id = ANY($1::int[])`,
          [form_ids]
        );
        const forbiddenForm = checkProg.rows.find(row => !allowedPids.includes(row.program_id));
        if (forbiddenForm) {
          return res.status(403).json({
            message: 'Access denied: As an Exam Coordinator, you can only approve exam forms for students in your assigned coordinate programs.'
          });
        }
      }

      const result = await pool.query(
        `UPDATE exam_form SET is_approved = $1 WHERE form_id = ANY($2::int[])`,
        [set_approved, form_ids]
      );
      return res.json({ message: `Successfully updated approval status for ${result.rowCount} form(s).`, count: result.rowCount });
    }

    return res.status(400).json({ message: 'Please provide form_ids array or set approve_all to true.' });
  } catch (err) {
    console.error('Approve forms error:', err);
    res.status(500).json({ message: 'Server error updating form approval status' });
  }
});

// ─── POST /api/admin/forms/admit-card ────────────────────────────────
// Releases or revokes Admit Cards with program boundary checks
router.post('/forms/admit-card', adminAuth, async (req, res) => {
  const { form_ids, exam_id, branch, program_id, release_all, set_released = true } = req.body;
  const allowedPids = await getAllowedProgramIds(req.user);

  try {
    if (release_all) {
      let updateQuery = `
        UPDATE exam_form
        SET admit_card_released = $1
        WHERE is_approved = true AND form_id IN (
          SELECT ef.form_id
          FROM exam_form ef
          JOIN student s ON s.id = ef.student_id
          JOIN exam e ON e.exam_id = ef.exam_id
          LEFT JOIN program p ON p.program_id = s.program_id
          WHERE ef.is_approved = true
      `;
      const params = [set_released];

      if (allowedPids !== null) {
        if (allowedPids.length === 0) {
          return res.json({ message: 'No coordinate programs assigned.', count: 0 });
        }
        params.push(allowedPids);
        updateQuery += ` AND s.program_id = ANY($${params.length}::int[])`;
      }

      if (exam_id) {
        params.push(exam_id);
        updateQuery += ` AND e.exam_id = $${params.length}`;
      }

      if (program_id && program_id !== 'ALL') {
        params.push(parseInt(program_id));
        updateQuery += ` AND s.program_id = $${params.length}`;
      }

      updateQuery += `)`;

      const result = await pool.query(updateQuery, params);
      return res.json({ message: `Successfully updated admit card status for ${result.rowCount} form(s).`, count: result.rowCount });
    }

    if (Array.isArray(form_ids) && form_ids.length > 0) {
      if (allowedPids !== null) {
        const checkProg = await pool.query(
          `SELECT ef.form_id, s.program_id 
           FROM exam_form ef 
           JOIN student s ON s.id = ef.student_id 
           WHERE ef.form_id = ANY($1::int[])`,
          [form_ids]
        );
        const forbiddenForm = checkProg.rows.find(row => !allowedPids.includes(row.program_id));
        if (forbiddenForm) {
          return res.status(403).json({
            message: 'Access denied: As an Exam Coordinator, you can only release admit cards for students in your assigned coordinate programs.'
          });
        }
      }

      const result = await pool.query(
        `UPDATE exam_form SET admit_card_released = $1 WHERE is_approved = true AND form_id = ANY($2::int[])`,
        [set_released, form_ids]
      );
      return res.json({ message: `Successfully updated admit card status for ${result.rowCount} form(s).`, count: result.rowCount });
    }

    return res.status(400).json({ message: 'Please provide form_ids array or set release_all to true.' });
  } catch (err) {
    console.error('Admit card release error:', err);
    res.status(500).json({ message: 'Server error updating admit card status' });
  }
});

// ─── POST /api/admin/forms/:formId/toggle-approval ─────────────────
// Toggles approval status for a single form
router.post('/forms/:formId/toggle-approval', adminAuth, async (req, res) => {
  const { formId } = req.params;
  const allowedPids = await getAllowedProgramIds(req.user);
  try {
    if (allowedPids !== null) {
      const checkProg = await pool.query(
        `SELECT s.program_id FROM exam_form ef JOIN student s ON s.id = ef.student_id WHERE ef.form_id = $1`,
        [formId]
      );
      if (checkProg.rows.length === 0) {
        return res.status(404).json({ message: 'Exam form not found' });
      }
      if (!allowedPids.includes(checkProg.rows[0].program_id)) {
        return res.status(403).json({
          message: 'Access denied: As an Exam Coordinator, you cannot modify exam forms belonging to an unauthorized program.'
        });
      }
    }

    const result = await pool.query(
      `UPDATE exam_form SET is_approved = NOT is_approved WHERE form_id = $1 RETURNING form_id, is_approved`,
      [formId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    res.json({ message: 'Form approval status toggled', form: result.rows[0] });
  } catch (err) {
    console.error('Toggle form approval error:', err);
    res.status(500).json({ message: 'Server error toggling form approval' });
  }
});

// ─── GET /api/admin/forms/:formId/subjects ──────────────────────────
// Returns selected subjects for a form
router.get('/forms/:formId/subjects', adminAuth, async (req, res) => {
  const { formId } = req.params;
  try {
    const result = await pool.query(
      `SELECT 
        sub.subject_code,
        sub.subject_name,
        ef.semester,
        p.program_name AS branch,
        sub.theory AS max_marks_endsem,
        sub.or_pr AS max_marks_pr,
        sub.term_work AS max_marks_tw,
        sub.credit
       FROM exam_subject es
       JOIN subject sub ON sub.subject_id = es.subject_id
       JOIN exam_form ef ON ef.form_id = es.form_id
       JOIN student st ON st.id = ef.student_id
       LEFT JOIN program p ON p.program_id = st.program_id
       WHERE es.form_id = $1`,
      [formId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch admin form subjects error:', err);
    res.status(500).json({ message: 'Server error fetching subjects' });
  }
});

// ─── GET /api/admin/stats ──────────────────────────────────────────
// Returns summary counts for the dashboard (scoped for Coordinators by allowed programs)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    let filter = '';
    const params = [];
    const allowedPids = await getAllowedProgramIds(req.user);
    if (allowedPids !== null) {
      if (allowedPids.length === 0) {
        return res.json({ totalForms: 0, pendingPayment: 0, completedPayment: 0, totalRevenue: 0 });
      }
      params.push(allowedPids);
      filter = ` JOIN student s ON s.id = ef.student_id WHERE s.program_id = ANY($1::int[])`;
    }

    const totalFormsRes = await pool.query(`SELECT COUNT(*) FROM exam_form ef ${filter}`, params);
    const pendingPayRes = await pool.query(`SELECT COUNT(*) FROM fillform_status fs JOIN exam_form ef ON ef.form_id = fs.form_id ${filter ? filter + " AND fs.payment_status = 'pending'" : "WHERE fs.payment_status = 'pending'"}`, params);
    const totalPaidRes  = await pool.query(`SELECT COUNT(*) FROM fillform_status fs JOIN exam_form ef ON ef.form_id = fs.form_id ${filter ? filter + " AND fs.payment_status = 'paid'" : "WHERE fs.payment_status = 'paid'"}`, params);
    const totalRevRes   = await pool.query(`SELECT SUM(fs.amount_paid) FROM fillform_status fs JOIN exam_form ef ON ef.form_id = fs.form_id ${filter ? filter + " AND fs.payment_status = 'paid'" : "WHERE fs.payment_status = 'paid'"}`, params);

    res.json({
      totalForms: parseInt(totalFormsRes.rows[0].count) || 0,
      pendingPayment: parseInt(pendingPayRes.rows[0].count) || 0,
      completedPayment: parseInt(totalPaidRes.rows[0].count) || 0,
      totalRevenue: parseInt(totalRevRes.rows[0].sum) || 0,
    });
  } catch (err) {
    console.error('Fetch admin stats error:', err);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// ─── GET /api/admin/exams ──────────────────────────────────────────
router.get('/exams', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT exam_id, exam_code, exam_name, is_active FROM exam ORDER BY from_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch exams error:', err);
    res.status(500).json({ message: 'Server error fetching exams' });
  }
});

// ─── POST /api/admin/exams ─────────────────────────────────────────
// Creates a new exam (Admin only)
router.post('/exams', adminAuth, async (req, res) => {
  if (!isGlobalAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied: Exam creation is restricted to global administrators.' });
  }
  const { exam_code, exam_name, from_date, deadline_date, late_deadline, form_fees, late_fees, exam_type, is_active } = req.body;
  if (!exam_code || !exam_name || !from_date || !deadline_date || !late_deadline || !exam_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const activeVal = is_active !== undefined ? is_active : true;
    const result = await pool.query(
      `INSERT INTO exam (exam_code, exam_name, from_date, deadline_date, late_deadline, form_fees, late_fees, exam_type, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [exam_code, exam_name, from_date, deadline_date, late_deadline, form_fees || 0, late_fees || 500, exam_type, req.user.name || 'admin', activeVal]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create exam error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Exam code already exists' });
    }
    res.status(500).json({ message: 'Server error creating exam' });
  }
});

// ─── PATCH /api/admin/exams/:examId/toggle-status ──────────────────
router.patch('/exams/:examId/toggle-status', adminAuth, async (req, res) => {
  if (!isGlobalAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied: Exam management is restricted to global administrators.' });
  }
  const { examId } = req.params;
  try {
    const result = await pool.query(
      'UPDATE exam SET is_active = NOT is_active WHERE exam_id = $1 RETURNING *',
      [examId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle exam status error:', err);
    res.status(500).json({ message: 'Server error toggling exam status' });
  }
});

// ─── POST /api/admin/subjects ──────────────────────────────────────
// Creates a new subject
router.post('/subjects', adminAuth, async (req, res) => {
  const { subject_code, subject_name, department_id, theory, or_pr, term_work, credit, scheme_detail } = req.body;
  if (!subject_code || !subject_name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let targetDeptId = department_id ? parseInt(department_id) : 1;

  try {
    const result = await pool.query(
      `INSERT INTO subject (subject_code, subject_name, department_id, theory, or_pr, term_work, credit, scheme_detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [subject_code, subject_name, targetDeptId, theory || 0, or_pr || 0, term_work || 0, credit || 0, scheme_detail || 'CBCGS-HME 2023']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create subject error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Subject code already exists' });
    }
    res.status(500).json({ message: 'Server error creating subject' });
  }
});

// ─── PUT /api/admin/subjects/:id ────────────────────────────────────
// Updates a subject
router.put('/subjects/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { subject_code, subject_name, department_id, theory, or_pr, term_work, credit, scheme_detail } = req.body;

  try {
    const subCheck = await pool.query('SELECT department_id FROM subject WHERE subject_id = $1', [id]);
    if (subCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const targetDeptId = department_id ? parseInt(department_id) : subCheck.rows[0].department_id;

    const result = await pool.query(
      `UPDATE subject 
       SET subject_code = $1, subject_name = $2, department_id = $3, theory = $4, or_pr = $5, term_work = $6, credit = $7, scheme_detail = $8
       WHERE subject_id = $9 RETURNING *`,
      [subject_code, subject_name, targetDeptId, theory || 0, or_pr || 0, term_work || 0, credit || 0, scheme_detail || 'CBCGS-HME 2023', id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ message: 'Server error updating subject' });
  }
});

// ─── DELETE /api/admin/subjects/:id ─────────────────────────────────
router.delete('/subjects/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const subCheck = await pool.query('SELECT subject_id FROM subject WHERE subject_id = $1', [id]);
    if (subCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await pool.query('DELETE FROM subject WHERE subject_id = $1', [id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ message: 'Server error deleting subject' });
  }
});

// ─── GET /api/admin/count-analysis/:examId ─────────────────────────
router.get('/count-analysis/:examId', adminAuth, async (req, res) => {
  const { examId } = req.params;
  const allowedPids = await getAllowedProgramIds(req.user);
  try {
    let progFilter = '';
    const params = [examId];
    if (allowedPids !== null) {
      if (allowedPids.length === 0) return res.json([]);
      params.push(allowedPids);
      progFilter = ` AND st.program_id = ANY($${params.length}::int[])`;
    }

    const query = `
      SELECT 
        s.subject_code, 
        s.subject_name, 
        ef.semester,
        p.program_name AS branch,
        COUNT(es.id) AS applied_count
      FROM exam_subject es
      JOIN exam_form ef ON es.form_id = ef.form_id
      JOIN student st ON st.id = ef.student_id
      JOIN subject s ON es.subject_id = s.subject_id
      LEFT JOIN program p ON st.program_id = p.program_id
      WHERE ef.exam_id = $1 ${progFilter}
      GROUP BY s.subject_id, s.subject_code, s.subject_name, ef.semester, p.program_name
      ORDER BY applied_count DESC, ef.semester ASC, s.subject_name ASC
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Count analysis error:', err);
    res.status(500).json({ message: 'Server error computing count analysis' });
  }
});

// ─── GET /api/admin/schedules ──────────────────────────────────────
// Fetch schedules
router.get('/schedules', adminAuth, async (req, res) => {
  const { exam_id, branch, program_id, semester } = req.query;
  if (!exam_id) {
    return res.status(400).json({ message: 'exam_id is required' });
  }
  try {
    let query = `
      SELECT 
        es.schedule_id,
        es.exam_id,
        es.subject_id,
        es.exam_date,
        es.start_time,
        es.end_time,
        s.subject_code,
        s.subject_name,
        d.department_name AS branch
      FROM exam_schedule es
      JOIN subject s ON s.subject_id = es.subject_id
      LEFT JOIN department d ON s.department_id = d.department_id
      WHERE es.exam_id = $1
    `;
    const examIdNum = parseInt(exam_id, 10);
    if (isNaN(examIdNum)) {
      return res.status(400).json({ message: 'Invalid exam_id' });
    }
    const params = [examIdNum];
    if (branch && branch !== 'ALL' && branch !== 'undefined' && branch !== 'null') {
      params.push(`%${branch}%`);
      query += ` AND (d.department_name ILIKE $${params.length} OR s.department_id IN (SELECT department_id FROM program WHERE program_name ILIKE $${params.length}))`;
    }
    if (semester && semester !== 'undefined' && semester !== 'null' && !isNaN(parseInt(semester, 10))) {
      params.push(parseInt(semester, 10));
      query += ` AND s.semester = $${params.length}`;
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch schedules error:', err);
    res.status(500).json({ message: 'Server error fetching schedules' });
  }
});

// ─── POST /api/admin/schedules ─────────────────────────────────────
router.post('/schedules', adminAuth, async (req, res) => {
  const { exam_id, schedules } = req.body;
  if (!exam_id || !Array.isArray(schedules)) {
    return res.status(400).json({ message: 'exam_id and schedules array are required' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of schedules) {
      const { subject_id, exam_date, start_time, end_time } = item;
      if (!subject_id || !exam_date || !start_time || !end_time) {
        throw new Error('Missing fields in one or more schedule items');
      }
      
      const upsertQuery = `
        INSERT INTO exam_schedule (exam_id, subject_id, exam_date, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (exam_id, subject_id) 
        DO UPDATE SET 
          exam_date = EXCLUDED.exam_date,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time
      `;
      await client.query(upsertQuery, [exam_id, subject_id, exam_date, start_time, end_time]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Exam schedules saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save schedules error:', err);
    res.status(500).json({ message: err.message || 'Server error saving schedules' });
  } finally {
    client.release();
  }
});

// ─── HEAD ONLY: EMPLOYEE MANAGEMENT ─────────────────────────────────

const isHead = (user) => {
  if (!user || !user.role) return false;
  return user.role.toLowerCase() === 'head';
};

// GET /api/admin/employees - List all employees (Head only)
router.get('/employees', adminAuth, async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can access Employee Management.' });
  }

  try {
    const result = await pool.query(`
      SELECT e.id, e.name, e.employee_id, e.department_id, d.department_name, e.role, e.active, e.email, e.created_at
      FROM employee e
      LEFT JOIN department d ON d.department_id = e.department_id
      ORDER BY e.id ASC
    `);
    
    const employees = result.rows;
    for (const emp of employees) {
      const allowedRes = await pool.query(`
        SELECT p.program_id, p.program_name
        FROM allowed_coordinate_programs_exam acp
        JOIN program p ON p.program_id = acp.program_id
        WHERE acp.employee_id = $1
      `, [emp.id]);
      emp.department = emp.department_name || 'Computer Engineering';
      emp.allowed_programs = allowedRes.rows;
    }

    res.json(employees);
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ message: 'Server error retrieving employees' });
  }
});

// POST /api/admin/employees - Add new employee (Head only)
router.post('/employees', adminAuth, async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can add employees.' });
  }

  const { name, email, department, department_id, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  const EMAIL_REGEX = /^\d{10}@tcetmumbai\.in$/i;
  const cleanEmail = email.trim();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ message: 'Email must be a 10-digit number followed by @tcetmumbai.in (e.g. 1234567890@tcetmumbai.in)' });
  }

  try {
    const exists = await pool.query('SELECT id FROM employee WHERE email = $1', [cleanEmail]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'An employee with this email already exists' });
    }

    const digits = cleanEmail.split('@')[0];
    const employee_id = `E${digits}`;
    const defaultPassword = 'pasword123';
    const password_hash = await bcrypt.hash(defaultPassword, 10);
    const rawRole = (role || 'coordinator').toLowerCase().trim();
    const userRole = ['head', 'admin'].includes(rawRole) ? rawRole : 'coordinator';

    let targetDeptId = department_id ? parseInt(department_id) : 1;
    if (!department_id && department) {
      const deptRes = await pool.query(
        'SELECT department_id FROM department WHERE department_name ILIKE $1 OR department_code ILIKE $1',
        [department]
      );
      if (deptRes.rows.length > 0) targetDeptId = deptRes.rows[0].department_id;
    }

    const result = await pool.query(
      `INSERT INTO employee (name, employee_id, department_id, role, active, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, employee_id, department_id, role, active, email, created_at`,
      [name, employee_id, targetDeptId, userRole, false, cleanEmail, password_hash]
    );

    const empObj = result.rows[0];
    empObj.allowed_programs = [];

    res.status(201).json({
      message: 'Employee created successfully in inactive state. Default initial password set to pasword123.',
      employee: empObj
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ message: 'Server error creating employee' });
  }
});

// PATCH /api/admin/employees/:id/role - Change employee role (Head only)
router.patch('/employees/:id/role', adminAuth, async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can change employee roles.' });
  }

  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }

  const rawRole = role.toLowerCase().trim();
  if (!['head', 'admin', 'coordinator'].includes(rawRole)) {
    return res.status(400).json({ message: 'Invalid role. Must be head, admin, or coordinator.' });
  }

  try {
    const result = await pool.query(
      `UPDATE employee SET role = $1 WHERE id = $2 RETURNING id, name, employee_id, department_id, role, active, email`,
      [rawRole, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: `Role updated to ${rawRole} successfully`, employee: result.rows[0] });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ message: 'Server error updating role' });
  }
});

// PATCH /api/admin/employees/:id/toggle-active - Activate or Deactivate employee (Head only)
router.patch('/employees/:id/toggle-active', adminAuth, async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can activate or deactivate employees.' });
  }

  const { id } = req.params;
  const { active } = req.body;

  try {
    let updateQuery;
    let queryParams;

    if (typeof active === 'boolean') {
      updateQuery = `UPDATE employee SET active = $1 WHERE id = $2 RETURNING id, name, employee_id, department_id, role, active, email`;
      queryParams = [active, id];
    } else {
      updateQuery = `UPDATE employee SET active = NOT active WHERE id = $1 RETURNING id, name, employee_id, department_id, role, active, email`;
      queryParams = [id];
    }

    const result = await pool.query(updateQuery, queryParams);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const updatedEmp = result.rows[0];
    const statusText = updatedEmp.active ? 'activated' : 'deactivated';
    res.json({
      message: `Employee ${updatedEmp.name} has been ${statusText} successfully.`,
      employee: updatedEmp
    });
  } catch (err) {
    console.error('Toggle active error:', err);
    res.status(500).json({ message: 'Server error updating employee status' });
  }
});

module.exports = router;
