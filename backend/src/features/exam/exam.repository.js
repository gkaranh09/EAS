const pool = require('../../core/config/db');

const getActiveExamsForStudent = async (studentId) => {
  const query = `
    SELECT
      e.exam_id,
      e.exam_code,
      e.exam_type,
      e.exam_name,
      e.from_date,
      e.deadline_date,
      e.late_deadline,
      e.form_fees,
      e.late_fees,
      e.created_by,
      e.is_active,
      fs.apply_completed,
      fs.payment_status,
      ef.form_id,
      ef.is_approved,
      ef.admit_card_released
    FROM exam e
    LEFT JOIN exam_form ef
      ON ef.exam_id = e.exam_id AND ef.student_id = $1
    LEFT JOIN fillform_status fs
      ON fs.form_id = ef.form_id
    WHERE e.is_active = true OR ef.form_id IS NOT NULL
    ORDER BY e.exam_id
  `;
  const result = await pool.query(query, [studentId]);
  return result.rows;
};

module.exports = {
  getActiveExamsForStudent
};
