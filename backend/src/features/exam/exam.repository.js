const pool = require('../../core/config/db');

/**
 * Get active exams visible to a student, with eligibility filtering:
 * - regular exams: always visible to all students
 * - supplementary / atkt exams: only visible if the student is in the
 *   student_failed_records table for ALL referenced exams
 */
const getActiveExamsForStudent = async (studentId) => {
  // First get the student's abc_id for matching
  const studentRes = await pool.query('SELECT id, abc_id FROM student WHERE id = $1', [studentId]);
  const student = studentRes.rows[0];
  if (!student) return [];

  const abcId = student.abc_id;

  const query = `
    SELECT
      e.exam_id,
      e.exam_code,
      e.exam_type,
      e.exam_name,
      e.from_date,
      e.deadline_date,
      e.late_deadline1,
      e.late_deadline2,
      e.form_fees,
      e.late_fees1,
      e.late_fees2,
      e.created_by,
      e.is_active,
      fs.apply_completed,
      fs.payment_status,
      ef.form_id,
      ef.form_code,
      ef.is_approved,
      CASE 
        WHEN ef.admit_card_released = TRUE AND ac.admit_card_number IS NOT NULL THEN TRUE 
        ELSE FALSE 
      END AS admit_card_released,
      ac.admit_card_number
    FROM exam e
    LEFT JOIN exam_form ef
      ON ef.exam_id = e.exam_id AND ef.student_id = $1
    LEFT JOIN fillform_status fs
      ON fs.form_id = ef.form_id
    LEFT JOIN admit_card ac
      ON ac.form_id = ef.form_id AND ac.is_active = TRUE
    WHERE (e.is_active = true OR ef.form_id IS NOT NULL)
    ORDER BY e.exam_id
  `;
  const result = await pool.query(query, [studentId]);
  const allExams = result.rows;

  // Filter based on eligibility
  const eligibleExams = [];
  for (const exam of allExams) {
    if (exam.exam_type === 'regular') {
      // Regular exams: all students eligible
      eligibleExams.push(exam);
    } else {
      // supplementary / atkt: check eligibility
      // 1. Get all referenced exams for this exam
      const refsRes = await pool.query(
        `SELECT referenced_exam_id FROM exam_references WHERE exam_id = $1`,
        [exam.exam_id]
      );
      const refs = refsRes.rows.map(r => r.referenced_exam_id);

      if (refs.length === 0) {
        // No references configured — hide from students (misconfigured exam)
        continue;
      }

      // 2. Check: student must be in failed records for ALL referenced exams
      const failedCheckRes = await pool.query(
        `SELECT DISTINCT exam_id FROM student_failed_records
         WHERE (student_id = $1 OR abc_id = $2) AND exam_id = ANY($3::int[])`,
        [studentId, abcId, refs]
      );
      const failedExamIds = failedCheckRes.rows.map(r => r.exam_id);

      // Student is eligible only if they appear in failed records for ALL referenced exams
      const eligibleForAll = refs.every(refId => failedExamIds.includes(refId));
      if (eligibleForAll) {
        eligibleExams.push(exam);
      }
    }
  }

  return eligibleExams;
};

module.exports = {
  getActiveExamsForStudent
};
