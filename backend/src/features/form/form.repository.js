const pool = require('../../core/config/db');

const checkStudentExists = async (studentId) => {
  const result = await pool.query('SELECT id FROM student WHERE id = $1', [studentId]);
  return result.rows.length > 0;
};

const getExamFormDuplicate = async (exam_id, student_id) => {
  const result = await pool.query(
    `SELECT ef.form_id FROM exam_form ef
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     WHERE ef.exam_id = $1 AND ef.student_id = $2 AND fs.apply_completed = TRUE`,
    [exam_id, student_id]
  );
  return result.rows[0] || null;
};

const getExamDetails = async (exam_id) => {
  const result = await pool.query(
    `SELECT form_fees, deadline_date, late_fees, exam_type FROM exam WHERE exam_id = $1`,
    [exam_id]
  );
  return result.rows[0] || null;
};

const submitForm = async (exam_id, student_id, subject_ids, initialPaymentStatus, finalFee, repeters = false) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const formResult = await client.query(
      `INSERT INTO exam_form (exam_id, student_id, repeters) VALUES ($1, $2, $3) RETURNING form_id`,
      [exam_id, student_id, Boolean(repeters)]
    );
    const form_id = formResult.rows[0].form_id;

    for (const sid of subject_ids) {
      await client.query(
        `INSERT INTO exam_subject (form_id, subject_id) VALUES ($1, $2)`,
        [form_id, sid]
      );
    }

    await client.query(
      `INSERT INTO fillform_status (student_id, form_id, payment_status, apply_completed, amount_paid)
       VALUES ($1, $2, $3, TRUE, $4)`,
      [student_id, form_id, initialPaymentStatus, finalFee]
    );

    await client.query('COMMIT');
    return form_id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getFormStatus = async (studentId) => {
  const result = await pool.query(
    `SELECT
       ef.form_id,
       ef.exam_id,
       ef.is_approved,
       ef.admit_card_released,
       e.exam_name,
       e.exam_type,
       e.form_fees,
       e.late_fees,
       e.deadline_date,
       (SELECT COUNT(*) FROM exam_subject es WHERE es.form_id = ef.form_id)::int AS subject_count,
       fs.payment_status,
       fs.apply_completed,
       fs.applied_at,
       fs.razorpay_payment_id,
       fs.amount_paid
     FROM exam_form ef
     JOIN exam e ON e.exam_id = ef.exam_id
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     WHERE ef.student_id = $1
     ORDER BY fs.applied_at DESC`,
    [studentId]
  );
  return result.rows;
};

const verifyOwnership = async (formId, studentId) => {
  const result = await pool.query(
    `SELECT ef.form_id, ef.admit_card_released FROM exam_form ef
     WHERE ef.form_id = $1 AND ef.student_id = $2`,
    [formId, studentId]
  );
  return result.rows[0] || null;
};

const getFormDataForPdf = async (formId) => {
  const result = await pool.query(
    `SELECT
       s.full_name, s.full_name_devnagari, s.email, s.contact_number, s.student_id,
       COALESCE(s.roll_no, s.student_id) AS roll_no, COALESCE(s.division, 'A') AS division,
       s.address, s.category, s.gender, s.student_type, s.abc_id, s.admission_year,
       s.current_year, s.current_semester, COALESCE(s.course, 'CBCGS-HME 2023') AS course,
       e.exam_id, e.exam_name, e.exam_code, e.exam_type, e.form_fees, e.late_fees,
       ef.form_id, ef.created_at, ef.is_approved, ef.admit_card_released, ef.repeters,
       fs.payment_status, fs.apply_completed, fs.applied_at,
       fs.razorpay_payment_id, fs.amount_paid,
       COALESCE(p.program_name, d.department_name, 'Computer Engineering') AS branch,
       d.department_name
     FROM exam_form ef
     JOIN student s ON s.id = ef.student_id
     LEFT JOIN program p ON p.program_id = s.program_id
     LEFT JOIN department d ON d.department_id = s.department_id
     JOIN exam e    ON e.exam_id = ef.exam_id
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     WHERE ef.form_id = $1`,
    [formId]
  );
  return result.rows[0] || null;
};

const getFormSubjects = async (formId) => {
  const result = await pool.query(
    `SELECT sub.subject_name, sub.theory AS max_marks_endsem, sub.or_pr AS max_marks_pr,
            sub.term_work AS max_marks_tw, sub.credit, sub.subject_code
     FROM exam_subject es
     JOIN subject sub ON sub.subject_id = es.subject_id
     WHERE es.form_id = $1
     ORDER BY sub.subject_id`,
    [formId]
  );
  return result.rows;
};

const getFormSchedules = async (examId, formId) => {
  const result = await pool.query(
    `SELECT 
       sub.subject_code,
       sub.subject_name,
       COALESCE(d.department_name, 'Common') AS branch,
       sub.semester,
       sub.theory,
       sch.exam_date,
       sch.start_time,
       sch.end_time
     FROM exam_subject es
     JOIN subject sub ON sub.subject_id = es.subject_id
     LEFT JOIN department d ON d.department_id = sub.department_id
     LEFT JOIN exam_schedule sch ON sch.subject_id = sub.subject_id AND sch.exam_id = $1
     WHERE es.form_id = $2 AND sub.theory > 0
     ORDER BY sch.exam_date ASC NULLS LAST, sch.start_time ASC NULLS LAST, sub.subject_code ASC`,
    [examId, formId]
  );
  return result.rows;
};

const getExamFormForPayment = async (formId, studentId) => {
  const result = await pool.query(
    `SELECT ef.form_id, e.deadline_date, e.late_fees, e.form_fees, e.exam_type,
            (SELECT COUNT(*) FROM exam_subject es WHERE es.form_id = ef.form_id)::int AS subject_count
     FROM exam_form ef
     JOIN exam e ON e.exam_id = ef.exam_id
     WHERE ef.form_id = $1 AND ef.student_id = $2`,
    [formId, studentId]
  );
  return result.rows[0] || null;
};

const updatePaymentStatus = async (formId, paymentId, amount) => {
  await pool.query(
    `UPDATE fillform_status
     SET payment_status = 'paid', razorpay_payment_id = $1, amount_paid = $2, applied_at = NOW()
     WHERE form_id = $3`,
    [paymentId, amount, formId]
  );
};

module.exports = {
  checkStudentExists,
  getExamFormDuplicate,
  getExamDetails,
  submitForm,
  getFormStatus,
  verifyOwnership,
  getFormDataForPdf,
  getFormSubjects,
  getFormSchedules,
  getExamFormForPayment,
  updatePaymentStatus
};
