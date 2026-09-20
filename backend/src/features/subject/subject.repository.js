const pool = require('../../core/config/db');

const findSubjects = async (branch, semester, program_id, search, scheme) => {
  let query = `
    SELECT
       sub.subject_id,
       sub.subject_code,
       sub.subject_name,
       sub.department_id,
       COALESCE(d.department_name, 'Common') AS branch,
       sub.scheme_detail,
       sub.ese AS max_marks_endsem,
       sub.or_pr AS max_marks_pr,
       sub.tw AS max_marks_tw,
       sub.ise AS max_marks_ise,
       sub.ie AS max_marks_ie,
       sub.theory_credit,
       sub.orprtw_credit,
       sub.total_credit,
       (
         SELECT st.semester 
         FROM semester_template st
         JOIN template_subject_group tsg ON tsg.template_id = st.template_id
         JOIN template_group_subject tgs ON tgs.group_id = tsg.group_id
         WHERE tgs.subject_id = sub.subject_id
         LIMIT 1
       ) AS semester
     FROM subject sub
     LEFT JOIN department d ON d.department_id = sub.department_id
     WHERE 1=1
  `;
  const params = [];
  if (program_id) {
    params.push(parseInt(program_id, 10));
    query += ` AND sub.department_id = (SELECT department_id FROM program WHERE program_id = $${params.length})`;
  } else if (branch && branch !== 'ALL' && branch !== 'undefined') {
    params.push(`%${branch}%`);
    query += ` AND (d.department_name ILIKE $${params.length} OR sub.department_id IN (SELECT department_id FROM program WHERE program_name ILIKE $${params.length}))`;
  }
  if (semester && semester !== 'ALL' && semester !== 'undefined') {
    params.push(parseInt(semester, 10));
    query += ` AND EXISTS (
      SELECT 1 FROM semester_template st
      JOIN template_subject_group tsg ON tsg.template_id = st.template_id
      JOIN template_group_subject tgs ON tgs.group_id = tsg.group_id
      WHERE tgs.subject_id = sub.subject_id AND st.semester = $${params.length}
    )`;
  }
  if (scheme && scheme !== 'ALL' && scheme !== 'undefined') {
    params.push(scheme);
    query += ` AND sub.scheme_detail = $${params.length}`;
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    query += ` AND (sub.subject_code ILIKE $${params.length} OR sub.subject_name ILIKE $${params.length} OR sub.scheme_detail ILIKE $${params.length})`;
  }
  query += ` ORDER BY sub.subject_code ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  findSubjects
};
