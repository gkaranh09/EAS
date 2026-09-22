const crypto = require('crypto');
const pool = require('../../core/config/db');

/**
 * Generates a unique form_code: "ef" + 8 random digits (e.g. ef83920145)
 */
const generateUniqueFormCode = async (client) => {
  const db = client || pool;
  let unique = false;
  let code = '';
  while (!unique) {
    const num = crypto.randomInt(10000000, 99999999);
    code = `ef${num}`;
    const check = await db.query('SELECT form_id FROM exam_form WHERE form_code = $1', [code]);
    if (check.rows.length === 0) {
      unique = true;
    }
  }
  return code;
};

const checkStudentExists = async (studentId) => {
  const result = await pool.query('SELECT id, abc_id, program_id, division, roll_no, current_semester FROM student WHERE id = $1', [studentId]);
  return result.rows[0] || null;
};

const checkStudentHold = async (studentId) => {
  const result = await pool.query(
    `SELECT id, restricted, remark, last_updated 
     FROM student_hold_list 
     WHERE student_id = $1 AND restricted = true`,
    [studentId]
  );
  return result.rows[0] || null;
};

const getExamFormDuplicate = async (exam_id, student_id) => {
  const result = await pool.query(
    `SELECT ef.form_id, ef.form_code FROM exam_form ef
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     WHERE ef.exam_id = $1 AND ef.student_id = $2 AND fs.apply_completed = TRUE`,
    [exam_id, student_id]
  );
  return result.rows[0] || null;
};

const getExamDetails = async (exam_id) => {
  const result = await pool.query(
    `SELECT exam_id, form_fees, deadline_date, late_deadline1, late_deadline2, late_fees1, late_fees2, exam_type, is_active 
     FROM exam WHERE exam_id = $1`,
    [exam_id]
  );
  return result.rows[0] || null;
};

const checkStudentExamEligibility = async (studentId, abcId, examId, examType) => {
  if (!examType || examType.toLowerCase() === 'regular') {
    return { eligible: true };
  }

  // Supplementary / ATKT exams require reference checks against student_failed_records
  const refsRes = await pool.query(
    `SELECT referenced_exam_id FROM exam_references WHERE exam_id = $1`,
    [examId]
  );
  const refs = refsRes.rows.map(r => r.referenced_exam_id);

  if (refs.length === 0) {
    return { eligible: false, reason: 'This examination does not have configured prerequisite source exams.' };
  }

  const failedCheckRes = await pool.query(
    `SELECT DISTINCT exam_id FROM student_failed_records
     WHERE (student_id = $1 OR abc_id = $2) AND exam_id = ANY($3::int[])`,
    [studentId, abcId, refs]
  );
  const failedExamIds = failedCheckRes.rows.map(r => r.exam_id);
  const eligible = refs.every(refId => failedExamIds.includes(refId));

  if (!eligible) {
    return {
      eligible: false,
      reason: 'You are not eligible to apply for this ATKT / Supplementary exam. No matching prerequisite failure records found.'
    };
  }

  return { eligible: true };
};

const submitForm = async (exam_id, student_id, subject_ids, initialPaymentStatus, finalFee, repeters = false) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const form_code = await generateUniqueFormCode(client);

    const formResult = await client.query(
      `INSERT INTO exam_form (exam_id, student_id, form_code, repeters) 
       VALUES ($1, $2, $3, $4) RETURNING form_id, form_code`,
      [exam_id, student_id, form_code, Boolean(repeters)]
    );
    const { form_id } = formResult.rows[0];

    for (const sub of subject_ids) {
      const sid = typeof sub === 'object' ? sub.subject_id : sub;
      const ise = typeof sub === 'object' ? Boolean(sub.attempt_ise) : false;
      const theory = typeof sub === 'object' ? Boolean(sub.attempt_theory) : false;
      const or_pr = typeof sub === 'object' ? Boolean(sub.attempt_or_pr) : false;
      const tw = typeof sub === 'object' ? Boolean(sub.attempt_tw) : false;
      const ie = typeof sub === 'object' ? Boolean(sub.attempt_ie) : false;
      
      await client.query(
        `INSERT INTO exam_subject (form_id, subject_id, attempt_ise, attempt_theory, attempt_or_pr, attempt_tw, attempt_ie)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [form_id, sid, ise, theory, or_pr, tw, ie]
      );
    }

    await client.query(
      `INSERT INTO fillform_status (student_id, form_id, payment_status, apply_completed, amount_paid)
       VALUES ($1, $2, $3, TRUE, $4)`,
      [student_id, form_id, initialPaymentStatus, finalFee]
    );

    await client.query('COMMIT');
    return { form_id, form_code };
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
       COALESCE(ef.form_code, 'ef' || LPAD(ef.form_id::text, 6, '0')) AS form_code,
       ef.exam_id,
       ef.is_approved,
       CASE 
         WHEN ef.admit_card_released = TRUE AND ac.admit_card_number IS NOT NULL THEN TRUE 
         ELSE FALSE 
       END AS admit_card_released,
       ac.admit_card_number,
       e.exam_name,
       e.exam_type,
       e.form_fees,
       e.late_fees1,
       e.late_fees2,
       e.deadline_date,
       e.late_deadline1,
       e.late_deadline2,
       (SELECT COUNT(*) FROM exam_subject es WHERE es.form_id = ef.form_id)::int AS subject_count,
       fs.payment_status,
       fs.apply_completed,
       fs.applied_at,
       fs.razorpay_payment_id,
       fs.amount_paid
     FROM exam_form ef
     JOIN exam e ON e.exam_id = ef.exam_id
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     LEFT JOIN admit_card ac ON ac.form_id = ef.form_id AND ac.is_active = TRUE
     WHERE ef.student_id = $1
     ORDER BY fs.applied_at DESC`,
    [studentId]
  );
  return result.rows;
};

const verifyOwnership = async (formIdentifier, studentId) => {
  const result = await pool.query(
    `SELECT ef.form_id, ef.form_code, ef.is_approved, 
            CASE 
              WHEN ef.admit_card_released = TRUE AND ac.admit_card_number IS NOT NULL THEN TRUE 
              ELSE FALSE 
            END AS admit_card_released, 
            ac.admit_card_number,
            s.program_id 
     FROM exam_form ef
     JOIN student s ON s.id = ef.student_id
     LEFT JOIN admit_card ac ON ac.form_id = ef.form_id AND ac.is_active = TRUE
     WHERE (ef.form_id::text = $1 OR ef.form_code = $1) AND ef.student_id = $2`,
    [String(formIdentifier), studentId]
  );
  return result.rows[0] || null;
};

const getFormDataForPdf = async (formIdentifier) => {
  const result = await pool.query(
    `SELECT
       s.id AS internal_student_id,
       s.full_name, s.full_name_devnagari, s.email, s.contact_number, s.student_id,
       COALESCE(s.roll_no, s.student_id) AS roll_no, COALESCE(s.division, 'A') AS division,
       s.address, s.category, s.gender, s.student_type, s.abc_id, s.admission_year,
       s.current_year, s.current_semester, COALESCE(s.course, 'CBCGS-HME 2023') AS course,
       s.program_id,
       e.exam_id, e.exam_name, e.exam_code, e.exam_type, e.form_fees, e.late_fees1, e.late_fees2,
       ef.form_id, ef.form_code, ef.created_at, ef.is_approved,
       CASE 
         WHEN ef.admit_card_released = TRUE AND ac.admit_card_number IS NOT NULL THEN TRUE 
         ELSE FALSE 
       END AS admit_card_released,
       ef.repeters,
       fs.payment_status, fs.apply_completed, fs.applied_at,
       fs.razorpay_payment_id, fs.amount_paid,
       COALESCE(p.program_name, d.department_name, 'Computer Engineering') AS branch,
       d.department_name,
       ac.admit_card_number,
       ac.version AS admit_card_version
     FROM exam_form ef
     JOIN student s ON s.id = ef.student_id
     LEFT JOIN program p ON p.program_id = s.program_id
     LEFT JOIN department d ON d.department_id = s.department_id
     JOIN exam e    ON e.exam_id = ef.exam_id
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     LEFT JOIN admit_card ac ON ac.form_id = ef.form_id AND ac.is_active = TRUE
     WHERE ef.form_id::text = $1 OR ef.form_code = $1
     ORDER BY ac.version DESC NULLS LAST
     LIMIT 1`,
    [String(formIdentifier)]
  );
  return result.rows[0] || null;
};

const getFormSubjects = async (formIdentifier) => {
  const result = await pool.query(
    `SELECT sub.subject_name, sub.ese AS max_marks_endsem, sub.or_pr AS max_marks_pr,
            sub.tw AS max_marks_tw, sub.total_credit AS credit, sub.subject_code
     FROM exam_subject es
     JOIN exam_form ef ON ef.form_id = es.form_id
     JOIN subject sub ON sub.subject_id = es.subject_id
     WHERE ef.form_id::text = $1 OR ef.form_code = $1
     ORDER BY sub.subject_id`,
    [String(formIdentifier)]
  );
  return result.rows;
};

const getFormSchedules = async (examId, formIdentifier) => {
  const result = await pool.query(
    `SELECT 
       sub.subject_code,
       sub.subject_name,
       COALESCE(d.department_name, 'Common') AS branch,
       COALESCE(s.current_semester, 3) AS semester,
       sub.ese AS theory,
       sch.exam_date,
       sch.start_time,
       sch.end_time
     FROM exam_subject es
     JOIN exam_form ef ON ef.form_id = es.form_id
     JOIN student s ON s.id = ef.student_id
     JOIN subject sub ON sub.subject_id = es.subject_id
     LEFT JOIN department d ON d.department_id = sub.department_id
     LEFT JOIN exam_schedule sch ON sch.subject_id = sub.subject_id AND sch.exam_id = $1
     WHERE (ef.form_id::text = $2 OR ef.form_code = $2) AND sub.ese > 0
     ORDER BY sch.exam_date ASC NULLS LAST, sch.start_time ASC NULLS LAST, sub.subject_code ASC`,
    [examId, String(formIdentifier)]
  );
  return result.rows;
};

const getExamFormForPayment = async (formIdentifier, studentId) => {
  const result = await pool.query(
    `SELECT ef.form_id, ef.form_code, fs.payment_status, e.deadline_date, e.late_deadline1, e.late_deadline2, 
            e.late_fees1, e.late_fees2, e.form_fees, e.exam_type,
            (SELECT COUNT(*) FROM exam_subject es WHERE es.form_id = ef.form_id)::int AS subject_count
     FROM exam_form ef
     JOIN exam e ON e.exam_id = ef.exam_id
     JOIN fillform_status fs ON fs.form_id = ef.form_id
     WHERE (ef.form_id::text = $1 OR ef.form_code = $1) AND ef.student_id = $2`,
    [String(formIdentifier), studentId]
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

const getLatestAdmitCard = async (formIdentifier) => {
  const result = await pool.query(
    `SELECT ac.* 
     FROM admit_card ac
     JOIN exam_form ef ON ef.form_id = ac.form_id
     WHERE (ef.form_id::text = $1 OR ef.form_code = $1) AND ac.is_active = TRUE
     ORDER BY ac.version DESC
     LIMIT 1`,
    [String(formIdentifier)]
  );
  return result.rows[0] || null;
};

/**
 * Computes 9-digit Admit Card number according to institutional formula:
 * 3-digit Exam ID + 2-digit Program ID + 1-digit Division + 1-digit Semester + 2-digit Roll No
 */
const formatAdmitCardNumber = ({ examId, programId, division, semester, rollNo, studentId }) => {
  const examDigits = String(examId || 1).padStart(3, '0').slice(-3);
  const progDigits = String(programId || 1).padStart(2, '0').slice(-2);

  // Map division: A->1, B->2, C->3, D->4, E->5 (default 1)
  const divStr = String(division || 'A').toUpperCase().trim();
  const divMap = { 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', '1': '1', '2': '2', '3': '3', '4': '4' };
  const divDigit = divMap[divStr] || '1';

  // 1-digit semester
  const semDigit = String(semester || 1).slice(-1);

  // 2-digit roll number (extract digits from roll_no or student_id)
  let cleanRoll = String(rollNo || '').replace(/\D/g, '');
  if (!cleanRoll) {
    cleanRoll = String(studentId || '').replace(/\D/g, '');
  }
  const rollDigits = (cleanRoll ? cleanRoll.padStart(2, '0') : '01').slice(-2);

  return `${examDigits}${progDigits}${divDigit}${semDigit}${rollDigits}`;
};

/**
 * Generates/updates an admit card record with versioning and 9-digit ID
 */
const generateAdmitCardRecord = async ({ formId, studentId, abcId, examId, programId, division, semester, rollNo, approvedBy, client: passedClient }) => {
  const client = passedClient || (await pool.connect());
  const shouldRelease = !passedClient;

  try {
    if (shouldRelease) await client.query('BEGIN');

    const admitCardNumber = formatAdmitCardNumber({
      examId,
      programId,
      division,
      semester,
      rollNo,
      studentId
    });

    // Determine current max version
    const versionRes = await client.query(
      `SELECT COALESCE(MAX(version), 0) AS max_v FROM admit_card WHERE form_id = $1`,
      [formId]
    );
    const nextVersion = parseInt(versionRes.rows[0].max_v, 10) + 1;

    // Deactivate previous versions
    await client.query(
      `UPDATE admit_card SET is_active = FALSE WHERE form_id = $1`,
      [formId]
    );

    // Insert new active version
    const insertRes = await client.query(
      `INSERT INTO admit_card (admit_card_number, student_id, abc_id, exam_id, form_id, approved_by, version, generated_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE)
       RETURNING *`,
      [admitCardNumber, studentId, abcId, examId, formId, approvedBy, nextVersion]
    );

    // Mark exam_form as released
    await client.query(
      `UPDATE exam_form SET admit_card_released = TRUE WHERE form_id = $1`,
      [formId]
    );

    if (shouldRelease) await client.query('COMMIT');
    return insertRes.rows[0];
  } catch (err) {
    if (shouldRelease) await client.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldRelease) client.release();
  }
};

module.exports = {
  generateUniqueFormCode,
  checkStudentExists,
  checkStudentHold,
  getExamFormDuplicate,
  getExamDetails,
  checkStudentExamEligibility,
  submitForm,
  getFormStatus,
  verifyOwnership,
  getFormDataForPdf,
  getFormSubjects,
  getFormSchedules,
  getExamFormForPayment,
  updatePaymentStatus,
  getLatestAdmitCard,
  formatAdmitCardNumber,
  generateAdmitCardRecord
};
