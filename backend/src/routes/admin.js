const express = require('express');
const pool    = require('../config/db');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const auth    = require('../core/middleware/auth');
const { requireRole, getAllowedProgramIds } = require('../core/middleware/rbac');
const formRepository = require('../features/form/form.repository');

const router = express.Router();

// ─── GET /api/admin/forms ──────────────────────────────────────────
// Returns all exam applications with filters (scoped for Coordinators by allowed_coordinate_programs_exam)
router.get('/forms', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  const { search, payment_status, exam_id, branch, program_id, is_approved, admit_card_released } = req.query;

  let query = `
    SELECT 
      ef.form_id,
      COALESCE(ef.form_code, 'ef' || LPAD(ef.form_id::text, 6, '0')) AS form_code,
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
    query += ` AND (s.full_name ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.student_id ILIKE $${params.length} OR s.roll_no ILIKE $${params.length} OR s.division ILIKE $${params.length} OR ef.form_code ILIKE $${params.length} OR p.program_name ILIKE $${params.length} OR d.department_name ILIKE $${params.length})`;
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
// Approves form(s) with program boundary checks for Exam Coordinators (Revocation is disallowed)
router.post('/forms/approve', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  const { form_ids, exam_id, branch, program_id, approve_all, set_approved = true } = req.body;
  const allowedPids = await getAllowedProgramIds(req.user);

  if (set_approved === false || set_approved === 'false') {
    return res.status(400).json({
      message: 'Approval revocation is strictly disallowed. Once an exam application is approved, it is permanently locked.'
    });
  }

  try {
    if (approve_all) {
      let updateQuery = `
        UPDATE exam_form
        SET is_approved = TRUE
        WHERE is_approved = FALSE AND form_id IN (
          SELECT ef.form_id
          FROM exam_form ef
          JOIN student s ON s.id = ef.student_id
          JOIN exam e ON e.exam_id = ef.exam_id
          LEFT JOIN program p ON p.program_id = s.program_id
          WHERE ef.is_approved = FALSE
      `;
      const params = [];

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
      return res.json({ message: `Successfully approved ${result.rowCount} form(s).`, count: result.rowCount });
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
        `UPDATE exam_form SET is_approved = TRUE WHERE form_id = ANY($1::int[]) AND is_approved = FALSE`,
        [form_ids]
      );
      return res.json({ message: `Successfully approved ${result.rowCount} form(s).`, count: result.rowCount });
    }

    return res.status(400).json({ message: 'Please provide form_ids array or set approve_all to true.' });
  } catch (err) {
    console.error('Approve forms error:', err);
    res.status(500).json({ message: 'Server error updating form approval status' });
  }
});

// ─── POST /api/admin/forms/admit-card ────────────────────────────────
// Releases Admit Cards with versioned record creation and coordinator boundary checks
router.post('/forms/admit-card', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  const { form_ids, exam_id, branch, program_id, release_all, set_released = true } = req.body;
  const allowedPids = await getAllowedProgramIds(req.user);

  try {
    let formsToProcess = [];

    if (release_all) {
      let selectQuery = `
        SELECT ef.form_id, ef.exam_id, ef.student_id, s.abc_id, s.program_id, s.division, s.current_semester, s.roll_no
        FROM exam_form ef
        JOIN student s ON s.id = ef.student_id
        JOIN exam e ON e.exam_id = ef.exam_id
        LEFT JOIN program p ON p.program_id = s.program_id
        WHERE ef.is_approved = TRUE
      `;
      const params = [];

      if (allowedPids !== null) {
        if (allowedPids.length === 0) {
          return res.json({ message: 'No coordinate programs assigned.', count: 0 });
        }
        params.push(allowedPids);
        selectQuery += ` AND s.program_id = ANY($${params.length}::int[])`;
      }

      if (exam_id) {
        params.push(exam_id);
        selectQuery += ` AND e.exam_id = $${params.length}`;
      }

      if (program_id && program_id !== 'ALL') {
        params.push(parseInt(program_id));
        selectQuery += ` AND s.program_id = $${params.length}`;
      }

      const selRes = await pool.query(selectQuery, params);
      formsToProcess = selRes.rows;
    } else if (Array.isArray(form_ids) && form_ids.length > 0) {
      const selectQuery = `
        SELECT ef.form_id, ef.exam_id, ef.student_id, s.abc_id, s.program_id, s.division, s.current_semester, s.roll_no
        FROM exam_form ef
        JOIN student s ON s.id = ef.student_id
        WHERE ef.form_id = ANY($1::int[]) AND ef.is_approved = TRUE
      `;
      const selRes = await pool.query(selectQuery, [form_ids]);
      formsToProcess = selRes.rows;

      if (allowedPids !== null) {
        const forbiddenForm = formsToProcess.find(row => !allowedPids.includes(row.program_id));
        if (forbiddenForm) {
          return res.status(403).json({
            message: 'Access denied: As an Exam Coordinator, you can only release admit cards for students in your assigned coordinate programs.'
          });
        }
      }
    } else {
      return res.status(400).json({ message: 'Please provide form_ids array or set release_all to true.' });
    }

    if (formsToProcess.length === 0) {
      return res.json({ message: 'No approved forms found matching criteria to release admit cards.', count: 0 });
    }

    const formIds = formsToProcess.map(f => f.form_id);

    // If revoking admit cards
    if (!set_released) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`UPDATE exam_form SET admit_card_released = FALSE WHERE form_id = ANY($1::int[])`, [formIds]);
        await client.query(`UPDATE admit_card SET is_active = FALSE WHERE form_id = ANY($1::int[])`, [formIds]);
        await client.query('COMMIT');
        return res.json({
          message: `Successfully revoked admit cards for ${formIds.length} form(s).`,
          count: formIds.length
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // MANDATORY SCHEDULE HEALTH GATE:
    // Block release if any theory subject in the target forms lacks a complete timetable schedule
    const unscheduledRes = await pool.query(
      `SELECT DISTINCT 
         sub.subject_code, 
         sub.subject_name
       FROM exam_subject es
       JOIN exam_form ef ON ef.form_id = es.form_id
       JOIN subject sub ON sub.subject_id = es.subject_id
       LEFT JOIN exam_schedule sch ON sch.subject_id = sub.subject_id AND sch.exam_id = ef.exam_id
       WHERE ef.form_id = ANY($1::int[]) 
         AND sub.ese > 0
         AND (sch.exam_date IS NULL OR sch.start_time IS NULL OR sch.end_time IS NULL)
       ORDER BY sub.subject_code ASC`,
      [formIds]
    );

    if (unscheduledRes.rows.length > 0) {
      const missingCodes = unscheduledRes.rows.map(r => r.subject_code);
      return res.status(400).json({
        message: `Cannot release admit cards: Timetable schedules are missing/incomplete for ${missingCodes.length} subject(s): ${missingCodes.join(', ')}. Please configure exam dates and times in Schedule Exam before releasing admit cards.`,
        missing_subject_codes: missingCodes,
        missing_codes_text: missingCodes.join(', ')
      });
    }

    // Process versioned admit card records in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of formsToProcess) {
        await formRepository.generateAdmitCardRecord({
          formId: item.form_id,
          studentId: item.student_id,
          abcId: item.abc_id,
          examId: item.exam_id,
          programId: item.program_id,
          division: item.division,
          semester: item.current_semester,
          rollNo: item.roll_no,
          approvedBy: req.user.id,
          client
        });
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.json({
      message: `Successfully released versioned admit cards for ${formsToProcess.length} form(s).`,
      count: formsToProcess.length
    });
  } catch (err) {
    console.error('Admit card release error:', err);
    res.status(500).json({ message: 'Server error updating admit card status' });
  }
});

// ─── POST /api/admin/forms/:formId/toggle-approval ─────────────────
// Toggles approval status for a single form (Revocation is strictly blocked)
router.post('/forms/:formId/toggle-approval', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  const { formId } = req.params;
  const allowedPids = await getAllowedProgramIds(req.user);
  try {
    const currentRes = await pool.query(
      `SELECT ef.form_id, ef.is_approved, s.program_id 
       FROM exam_form ef 
       JOIN student s ON s.id = ef.student_id 
       WHERE ef.form_id::text = $1 OR ef.form_code = $1`,
      [String(formId)]
    );

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Exam form not found' });
    }

    const currentForm = currentRes.rows[0];

    if (allowedPids !== null && !allowedPids.includes(currentForm.program_id)) {
      return res.status(403).json({
        message: 'Access denied: As an Exam Coordinator, you cannot modify exam forms belonging to an unauthorized program.'
      });
    }

    if (currentForm.is_approved) {
      return res.status(400).json({
        message: 'Once an exam form is approved, approval revocation is strictly disallowed.'
      });
    }

    const result = await pool.query(
      `UPDATE exam_form SET is_approved = TRUE WHERE form_id = $1 RETURNING form_id, form_code, is_approved`,
      [currentForm.form_id]
    );

    res.json({ message: 'Form approved successfully', form: result.rows[0] });
  } catch (err) {
    console.error('Toggle form approval error:', err);
    res.status(500).json({ message: 'Server error toggling form approval' });
  }
});

// ─── GET /api/admin/exams/:examId/schedule-health ──────────────────
// Scans all subjects applied by students for an exam and checks if schedules exist
router.get('/exams/:examId/schedule-health', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  const { examId } = req.params;
  const allowedPids = await getAllowedProgramIds(req.user);

  try {
    let progFilter = '';
    const params = [examId];
    if (allowedPids !== null) {
      if (allowedPids.length === 0) {
        return res.json({ healthy: true, missing_subjects: [], total_applied_subjects: 0, scheduled_subjects: 0 });
      }
      params.push(allowedPids);
      progFilter = ` AND s.program_id = ANY($${params.length}::int[])`;
    }

    // 1. All distinct theory subjects selected in student applications for this exam
    const appliedSubsRes = await pool.query(
      `SELECT DISTINCT 
         sub.subject_id, 
         sub.subject_code, 
         sub.subject_name, 
         COALESCE(s.current_semester, 3) AS semester, 
         sub.department_id,
         COALESCE(p.program_name, d.department_name, 'General') AS branch,
         COUNT(DISTINCT ef.form_id)::int AS student_count
       FROM exam_subject es
       JOIN exam_form ef ON ef.form_id = es.form_id
       JOIN student s ON s.id = ef.student_id
       JOIN subject sub ON sub.subject_id = es.subject_id
       LEFT JOIN program p ON p.program_id = s.program_id
       LEFT JOIN department d ON d.department_id = sub.department_id
       WHERE ef.exam_id = $1 AND sub.ese > 0 ${progFilter}
       GROUP BY sub.subject_id, sub.subject_code, sub.subject_name, s.current_semester, sub.department_id, p.program_name, d.department_name
       ORDER BY sub.subject_code ASC`,
      params
    );

    // 2. All scheduled subjects for this exam
    const schedRes = await pool.query(
      `SELECT subject_id, exam_date, start_time, end_time 
       FROM exam_schedule 
       WHERE exam_id = $1 AND exam_date IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL`,
      [examId]
    );
    const scheduledSubjectIds = new Set(schedRes.rows.map(r => r.subject_id));

    // 3. Compare and determine missing subjects
    const missingSubjects = appliedSubsRes.rows.filter(sub => !scheduledSubjectIds.has(sub.subject_id));
    const missingCodes = missingSubjects.map(s => s.subject_code);

    res.json({
      healthy: missingSubjects.length === 0,
      total_applied_subjects: appliedSubsRes.rows.length,
      scheduled_subjects: appliedSubsRes.rows.length - missingSubjects.length,
      missing_count: missingSubjects.length,
      missing_subjects: missingSubjects,
      missing_subject_codes: missingCodes,
      missing_codes_text: missingCodes.join(', ')
    });
  } catch (err) {
    console.error('Schedule health check error:', err);
    res.status(500).json({ message: 'Server error checking schedule health' });
  }
});

// ─── GET /api/admin/forms/:formId/subjects ──────────────────────────
// Returns selected subjects for a form with Coordinator scope check
router.get('/forms/:formId/subjects', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  const { formId } = req.params;
  const allowedPids = await getAllowedProgramIds(req.user);

  try {
    if (allowedPids !== null) {
      const checkProg = await pool.query(
        `SELECT s.program_id FROM exam_form ef JOIN student s ON s.id = ef.student_id WHERE ef.form_id::text = $1 OR ef.form_code = $1`,
        [String(formId)]
      );
      if (checkProg.rows.length === 0) {
        return res.status(404).json({ message: 'Exam form not found' });
      }
      if (!allowedPids.includes(checkProg.rows[0].program_id)) {
        return res.status(403).json({
          message: 'Access denied: As an Exam Coordinator, you cannot view exam subjects outside your assigned coordinate programs.'
        });
      }
    }

    const result = await pool.query(
      `SELECT 
        sub.subject_code,
        sub.subject_name,
        ef.semester,
        p.program_name AS branch,
        sub.ese AS max_marks_endsem,
        sub.or_pr AS max_marks_pr,
        sub.tw AS max_marks_tw,
        sub.total_credit AS credit
       FROM exam_subject es
       JOIN subject sub ON sub.subject_id = es.subject_id
       JOIN exam_form ef ON ef.form_id = es.form_id
       JOIN student st ON st.id = ef.student_id
       LEFT JOIN program p ON p.program_id = st.program_id
       WHERE ef.form_id::text = $1 OR ef.form_code = $1`,
      [String(formId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch admin form subjects error:', err);
    res.status(500).json({ message: 'Server error fetching subjects' });
  }
});

// ─── GET /api/admin/stats ──────────────────────────────────────────
// Returns summary counts for the dashboard (scoped for Coordinators by allowed programs)
router.get('/stats', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
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
// Returns all exams with their referenced exam info
router.get('/exams', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.exam_id, e.exam_code, e.exam_name, e.exam_type, e.is_active, e.from_date, e.deadline_date,
             COALESCE(
               json_agg(
                 json_build_object('exam_id', re.exam_id, 'exam_name', re.exam_name, 'exam_code', re.exam_code)
               ) FILTER (WHERE re.exam_id IS NOT NULL),
               '[]'
             ) AS referenced_exams
      FROM exam e
      LEFT JOIN exam_references er ON er.exam_id = e.exam_id
      LEFT JOIN exam re ON re.exam_id = er.referenced_exam_id
      GROUP BY e.exam_id
      ORDER BY e.from_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch exams error:', err);
    res.status(500).json({ message: 'Server error fetching exams' });
  }
});

// ─── POST /api/admin/exams ─────────────────────────────────────────
// Creates a new exam (Admin/Head only); for supp/atkt, accepts referenced_exam_ids[]
router.post('/exams', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
  const {
    exam_code, exam_name, from_date, deadline_date, late_deadline1, late_deadline2,
    form_fees, late_fees1, late_fees2, exam_type, is_active, referenced_exam_ids
  } = req.body;

  if (!exam_code || !exam_name || !from_date || !deadline_date || !late_deadline1 || !late_deadline2 || !exam_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const validTypes = ['regular', 'supplementary', 'atkt'];
  if (!validTypes.includes(exam_type)) {
    return res.status(400).json({ message: `Invalid exam_type. Must be one of: ${validTypes.join(', ')}` });
  }

  // Supplementary and ATKT exams must reference at least one exam
  if (['supplementary', 'atkt'].includes(exam_type)) {
    if (!Array.isArray(referenced_exam_ids) || referenced_exam_ids.length === 0) {
      return res.status(400).json({ message: `${exam_type} exams must reference at least one source exam for eligibility.` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activeVal = is_active !== undefined ? is_active : true;
    const result = await client.query(
      `INSERT INTO exam (exam_code, exam_name, from_date, deadline_date, late_deadline1, late_deadline2, form_fees, late_fees1, late_fees2, exam_type, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [exam_code, exam_name, from_date, deadline_date, late_deadline1, late_deadline2, form_fees || 0, late_fees1 || 100, late_fees2 || 500, exam_type, req.user.name || 'admin', activeVal]
    );
    const newExam = result.rows[0];

    // Insert exam references for supp/atkt
    if (Array.isArray(referenced_exam_ids) && referenced_exam_ids.length > 0) {
      for (const refId of referenced_exam_ids) {
        await client.query(
          `INSERT INTO exam_references (exam_id, referenced_exam_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newExam.exam_id, refId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newExam);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create exam error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Exam code already exists' });
    }
    res.status(500).json({ message: 'Server error creating exam' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/admin/exams/:examId/toggle-status ──────────────────
router.patch('/exams/:examId/toggle-status', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
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
router.post('/subjects', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
  const { subject_code, subject_name, department_id, ise, ie, ese, or_pr, tw, theory_credit, orprtw_credit, total_credit, scheme_detail } = req.body;
  if (!subject_code || !subject_name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let targetDeptId = department_id ? parseInt(department_id) : 1;

  try {
    const result = await pool.query(
      `INSERT INTO subject (subject_code, subject_name, department_id, ise, ie, ese, or_pr, tw, theory_credit, orprtw_credit, total_credit, scheme_detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        subject_code, subject_name, targetDeptId, 
        ise || 0, ie || 0, ese || 0, or_pr || 0, tw || 0, 
        theory_credit || 0, orprtw_credit || 0, total_credit || 0, 
        scheme_detail || 'CBCGS-HME 2023'
      ]
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
router.put('/subjects/:id', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { subject_code, subject_name, department_id, ise, ie, ese, or_pr, tw, theory_credit, orprtw_credit, total_credit, scheme_detail } = req.body;

  try {
    const subCheck = await pool.query('SELECT department_id FROM subject WHERE subject_id = $1', [id]);
    if (subCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const targetDeptId = department_id ? parseInt(department_id) : subCheck.rows[0].department_id;

    const result = await pool.query(
      `UPDATE subject 
       SET subject_code = $1, subject_name = $2, department_id = $3, 
           ise = $4, ie = $5, ese = $6, or_pr = $7, tw = $8, 
           theory_credit = $9, orprtw_credit = $10, total_credit = $11, scheme_detail = $12
       WHERE subject_id = $13 RETURNING *`,
      [
        subject_code, subject_name, targetDeptId, 
        ise || 0, ie || 0, ese || 0, or_pr || 0, tw || 0, 
        theory_credit || 0, orprtw_credit || 0, total_credit || 0, 
        scheme_detail || 'CBCGS-HME 2023', id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ message: 'Server error updating subject' });
  }
});

// ─── DELETE /api/admin/subjects/:id ─────────────────────────────────
router.delete('/subjects/:id', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
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
router.get('/count-analysis/:examId', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
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
        st.current_semester AS semester,
        COALESCE(p.program_name, d.department_name, 'General') AS branch,
        COUNT(es.id) AS applied_count
      FROM exam_subject es
      JOIN exam_form ef ON es.form_id = ef.form_id
      JOIN student st ON st.id = ef.student_id
      JOIN subject s ON es.subject_id = s.subject_id
      LEFT JOIN program p ON st.program_id = p.program_id
      LEFT JOIN department d ON s.department_id = d.department_id
      WHERE ef.exam_id = $1 ${progFilter}
      GROUP BY s.subject_id, s.subject_code, s.subject_name, st.current_semester, p.program_name, d.department_name
      ORDER BY applied_count DESC, st.current_semester ASC, s.subject_name ASC
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
router.get('/schedules', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
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
router.post('/schedules', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
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

router.get('/employees', auth, requireRole('HEAD'), async (req, res) => {

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
router.post('/employees', auth, requireRole('HEAD'), async (req, res) => {

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
router.patch('/employees/:id/role', auth, requireRole('HEAD'), async (req, res) => {

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
router.patch('/employees/:id/toggle-active', auth, requireRole('HEAD'), async (req, res) => {

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



// ─────────────────────────────────────────────────────────────────────
// FAILED RECORDS (Head/Admin only)
// ─────────────────────────────────────────────────────────────────────

// GET /api/admin/failed-records?exam_id=X
// List all failed student records for a given exam
router.get('/failed-records', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
  const { exam_id } = req.query;
  if (!exam_id) {
    return res.status(400).json({ message: 'exam_id query parameter is required' });
  }
  try {
    const result = await pool.query(`
      SELECT
        sfr.id,
        sfr.exam_id,
        sfr.student_id,
        sfr.abc_id,
        sfr.added_at,
        s.student_id    AS student_code,
        s.full_name,
        s.email,
        COALESCE(p.program_name, d.department_name) AS program,
        e_added.name    AS added_by_name
      FROM student_failed_records sfr
      LEFT JOIN student s ON s.id = sfr.student_id
      LEFT JOIN program p ON p.program_id = s.program_id
      LEFT JOIN department d ON d.department_id = s.department_id
      LEFT JOIN employee e_added ON e_added.id = sfr.added_by
      WHERE sfr.exam_id = $1
      ORDER BY sfr.added_at DESC
    `, [exam_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get failed records error:', err);
    res.status(500).json({ message: 'Server error fetching failed records' });
  }
});

// POST /api/admin/failed-records
// Add failed students by student_ids (comma/space separated) or abc_ids
router.post('/failed-records', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {

  const { exam_id, input_type, raw_input } = req.body;
  if (!exam_id || !input_type || !raw_input) {
    return res.status(400).json({ message: 'exam_id, input_type, and raw_input are required' });
  }
  if (!['student_id', 'abc_id'].includes(input_type)) {
    return res.status(400).json({ message: 'input_type must be "student_id" or "abc_id"' });
  }

  // Parse the raw_input: split by comma or space, trim, filter blanks
  const tokens = raw_input
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (tokens.length === 0) {
    return res.status(400).json({ message: 'No valid IDs found in input' });
  }

  try {
    let studentsQuery;
    if (input_type === 'student_id') {
      studentsQuery = await pool.query(
        `SELECT id, student_id, abc_id, full_name FROM student WHERE student_id = ANY($1::text[])`,
        [tokens]
      );
    } else {
      studentsQuery = await pool.query(
        `SELECT id, student_id, abc_id, full_name FROM student WHERE abc_id = ANY($1::text[])`,
        [tokens]
      );
    }

    const students = studentsQuery.rows;
    if (students.length === 0) {
      return res.status(404).json({ message: 'No matching students found for the provided IDs' });
    }

    const client = await pool.connect();
    let insertedCount = 0;
    let skippedCount = 0;
    const notFound = tokens.filter(t => {
      const field = input_type === 'student_id' ? 'student_id' : 'abc_id';
      return !students.find(s => s[field] === t);
    });

    try {
      await client.query('BEGIN');
      for (const student of students) {
        try {
          await client.query(
            `INSERT INTO student_failed_records (exam_id, student_id, abc_id, added_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (exam_id, student_id) DO NOTHING`,
            [exam_id, student.id, student.abc_id, req.user.id]
          );
          insertedCount++;
        } catch (e) {
          skippedCount++;
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      message: `Added ${insertedCount} student(s) to failed records. ${skippedCount} skipped (already exist).`,
      inserted: insertedCount,
      skipped: skippedCount,
      not_found: notFound,
      students_added: students.map(s => ({ student_id: s.student_id, full_name: s.full_name, abc_id: s.abc_id }))
    });
  } catch (err) {
    console.error('Add failed records error:', err);
    res.status(500).json({ message: 'Server error adding failed records' });
  }
});

// DELETE /api/admin/failed-records/:id
// Remove a single failed record by its record ID
router.delete('/failed-records/:id', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM student_failed_records WHERE id = $1 RETURNING id, student_id, exam_id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Failed record not found' });
    }
    res.json({ message: 'Failed record removed successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Delete failed record error:', err);
    res.status(500).json({ message: 'Server error deleting failed record' });
  }
});
// ═══════════════════════════════════════════════════════════════════
// ─── STUDENT HOLD LIST ROUTES ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// GET /api/admin/hold-list
// List all hold records with student info. Filter: ?restricted=true|false|all, ?search=...
// Accessible by Admin/Head (full) and Coordinators (read-only view)
router.get('/hold-list', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const { restricted, search } = req.query;

    let query = `
      SELECT 
        h.id, h.student_id, h.abc_id, h.restricted, h.remark,
        h.added_at, h.last_updated, h.updated_by,
        s.student_id AS student_code, s.full_name, s.email, s.current_semester,
        COALESCE(p.program_name, d.department_name, '') AS branch,
        adder.name AS added_by_name,
        updater.name AS updated_by_name
      FROM student_hold_list h
      JOIN student s ON s.id = h.student_id
      LEFT JOIN program p ON p.program_id = s.program_id
      LEFT JOIN department d ON d.department_id = s.department_id
      LEFT JOIN employee adder ON adder.id = h.added_by
      LEFT JOIN employee updater ON updater.id = h.updated_by
      WHERE 1=1
    `;
    const params = [];

    if (restricted && restricted !== 'all') {
      params.push(restricted === 'true');
      query += ` AND h.restricted = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        s.student_id ILIKE $${params.length} OR
        s.full_name ILIKE $${params.length} OR
        s.email ILIKE $${params.length} OR
        h.abc_id ILIKE $${params.length} OR
        h.remark ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY h.restricted DESC, h.last_updated DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get hold list error:', err);
    res.status(500).json({ message: 'Server error fetching hold list' });
  }
});

// POST /api/admin/hold-list/add
// Add students to hold list by student_id or abc_id (bulk). Admin/Head only.
// Body: { input_type: 'student_id' | 'abc_id', raw_input: "id1, id2 id3", remark: "..." }
router.post('/hold-list/add', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {

  try {
    const { input_type, raw_input, remark } = req.body;
    if (!raw_input || !raw_input.trim()) {
      return res.status(400).json({ message: 'No student identifiers provided.' });
    }

    const finalRemark = (remark && remark.trim()) || 'Others';
    // Split by comma or space
    const identifiers = raw_input.trim().split(/[\s,]+/).filter(Boolean);

    if (identifiers.length === 0) {
      return res.status(400).json({ message: 'No valid identifiers found.' });
    }

    const addedByEmployeeId = req.user.id;
    let insertedCount = 0;
    let skippedCount = 0;
    const notFound = [];
    const addedStudents = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const identifier of identifiers) {
        let studentRow;
        if (input_type === 'abc_id') {
          const res = await client.query(
            `SELECT id, student_id, full_name, abc_id FROM student WHERE abc_id = $1`,
            [identifier]
          );
          studentRow = res.rows[0];
        } else {
          // Default: student_id
          const res = await client.query(
            `SELECT id, student_id, full_name, abc_id FROM student WHERE student_id = $1`,
            [identifier]
          );
          studentRow = res.rows[0];
        }

        if (!studentRow) {
          notFound.push(identifier);
          continue;
        }

        // Upsert: if already exists, update to restricted=true and update remark
        const upsertResult = await client.query(
          `INSERT INTO student_hold_list (student_id, abc_id, restricted, remark, added_by, added_at, last_updated, updated_by)
           VALUES ($1, $2, true, $3, $4, NOW(), NOW(), $4)
           ON CONFLICT (student_id) DO UPDATE SET
             restricted = true,
             remark = $3,
             last_updated = NOW(),
             updated_by = $4
           RETURNING id`,
          [studentRow.id, studentRow.abc_id, finalRemark, addedByEmployeeId]
        );

        if (upsertResult.rows.length > 0) {
          insertedCount++;
          addedStudents.push({ student_id: studentRow.student_id, full_name: studentRow.full_name, abc_id: studentRow.abc_id });
        } else {
          skippedCount++;
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      message: `Added/updated ${insertedCount} student(s) to hold list. ${notFound.length} not found.`,
      inserted: insertedCount,
      skipped: skippedCount,
      not_found: notFound,
      students_added: addedStudents
    });
  } catch (err) {
    console.error('Add to hold list error:', err);
    res.status(500).json({ message: 'Server error adding to hold list' });
  }
});

// PATCH /api/admin/hold-list/:id/status
// Update a single hold record: toggle restricted, update remark. Admin/Head only.
// Body: { restricted: boolean, remark: "..." }
router.patch('/hold-list/:id/status', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {

  try {
    const { id } = req.params;
    const { restricted, remark } = req.body;

    const result = await pool.query(
      `UPDATE student_hold_list 
       SET restricted = $1, remark = COALESCE($2, remark), last_updated = NOW(), updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [restricted, remark || null, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Hold record not found' });
    }

    res.json({ message: 'Hold record updated', record: result.rows[0] });
  } catch (err) {
    console.error('Update hold status error:', err);
    res.status(500).json({ message: 'Server error updating hold record' });
  }
});

// PATCH /api/admin/hold-list/bulk-unrestrict
// Bulk unrestrict multiple students. Admin/Head only.
// Body: { ids: [1,2,3], remark: "Cleared by admin" }
router.patch('/hold-list/bulk-unrestrict', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {

  try {
    const { ids, remark } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No hold record IDs provided.' });
    }

    const finalRemark = (remark && remark.trim()) || 'Unrestricted by admin';

    const result = await pool.query(
      `UPDATE student_hold_list 
       SET restricted = false, remark = $1, last_updated = NOW(), updated_by = $2
       WHERE id = ANY($3::int[]) AND restricted = true
       RETURNING id`,
      [finalRemark, req.user.id, ids]
    );

    res.json({
      message: `Unrestricted ${result.rows.length} student(s).`,
      updated_count: result.rows.length
    });
  } catch (err) {
    console.error('Bulk unrestrict error:', err);
    res.status(500).json({ message: 'Server error bulk unrestricting' });
  }
});

// DELETE /api/admin/hold-list/:id
// Permanently remove a hold record. Admin/Head only.
router.delete('/hold-list/:id', auth, requireRole('HEAD', 'ADMIN'), async (req, res) => {

  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM student_hold_list WHERE id = $1 RETURNING id, student_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Hold record not found' });
    }

    res.json({ message: 'Hold record permanently deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('Delete hold record error:', err);
    res.status(500).json({ message: 'Server error deleting hold record' });
  }
});

// ─── GET /api/admin/students ─────────────────────────────────────────
// Paginated student directory with department, program, division, max count, and multi-term search
router.get('/students', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const { 
      department_id, 
      program_id, 
      division, 
      semester, 
      search, 
      page = 1, 
      limit = 50 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      FROM student s
      LEFT JOIN department d ON d.department_id = s.department_id
      LEFT JOIN program p ON p.program_id = s.program_id
      WHERE 1=1
    `;
    const params = [];

    // RBAC program scoping for coordinators
    const allowedPids = await getAllowedProgramIds(req.user);
    if (allowedPids !== null) {
      if (allowedPids.length === 0) {
        return res.json({
          students: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
        });
      }
      params.push(allowedPids);
      baseQuery += ` AND s.program_id = ANY($${params.length}::int[])`;
    }

    if (department_id && department_id !== 'ALL' && department_id !== 'undefined') {
      params.push(parseInt(department_id, 10));
      baseQuery += ` AND s.department_id = $${params.length}`;
    }

    if (program_id && program_id !== 'ALL' && program_id !== 'undefined') {
      params.push(parseInt(program_id, 10));
      baseQuery += ` AND s.program_id = $${params.length}`;
    }

    if (division && division !== 'ALL' && division !== 'undefined') {
      params.push(division.trim());
      baseQuery += ` AND s.division ILIKE $${params.length}`;
    }

    if (semester && semester !== 'ALL' && semester !== 'undefined') {
      params.push(parseInt(semester, 10));
      baseQuery += ` AND s.current_semester = $${params.length}`;
    }

    if (search && search.trim()) {
      const searchTerms = search.split(',').map(t => t.trim()).filter(Boolean);
      if (searchTerms.length > 0) {
        const searchConditions = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`);
          const idx = params.length;
          searchConditions.push(`(
            s.student_id ILIKE $${idx} OR 
            s.abc_id ILIKE $${idx} OR 
            s.full_name ILIKE $${idx} OR 
            s.email ILIKE $${idx} OR 
            s.roll_no ILIKE $${idx} OR 
            s.contact_number ILIKE $${idx}
          )`);
        }
        baseQuery += ` AND (${searchConditions.join(' OR ')})`;
      }
    }

    // Total matching records count
    const countSql = `SELECT COUNT(*) AS total ${baseQuery}`;
    const countResult = await pool.query(countSql, params);
    const totalCount = parseInt(countResult.rows[0].total, 10) || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Paginated student data
    const dataSql = `
      SELECT 
        s.id,
        s.student_id,
        s.full_name,
        s.full_name_devnagari,
        s.email,
        s.contact_number,
        s.address,
        s.department_id,
        s.program_id,
        s.course,
        s.gender,
        s.category,
        s.student_type,
        s.pwd,
        s.abc_id,
        s.admission_year,
        s.current_year,
        s.current_semester,
        s.roll_no,
        s.division,
        s.profile_image,
        d.department_name,
        d.department_code,
        p.program_name
      ${baseQuery}
      ORDER BY s.student_id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limitNum, offset];
    const dataResult = await pool.query(dataSql, dataParams);

    res.json({
      students: dataResult.rows,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: totalPages
      }
    });
  } catch (err) {
    console.error('Get students directory error:', err);
    res.status(500).json({ message: 'Server error loading student directory' });
  }
});

// GET /api/admin/students/divisions
router.get('/students/divisions', auth, requireRole('HEAD', 'ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT division FROM student WHERE division IS NOT NULL AND division != '' ORDER BY division ASC`
    );
    const list = result.rows.map(r => r.division);
    res.json(list.length > 0 ? list : ['A', 'B', 'C', 'D']);
  } catch (err) {
    res.json(['A', 'B', 'C', 'D']);
  }
});

module.exports = router;
