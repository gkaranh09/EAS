const pool = require('../../core/config/db');

const findSubjects = async (branch, semester, program_id, search, scheme) => {
  let query = `
    SELECT
       sub.subject_id,
       sub.subject_code,
       sub.subject_name,
       sub.department_id,
       COALESCE(d.department_name, 'Common') AS branch,
       sub.theory,
       sub.or_pr,
       sub.term_work,
       sub.credit,
       sub.scheme_detail,
       sub.theory AS max_marks_endsem,
       sub.or_pr AS max_marks_pr,
       sub.term_work AS max_marks_tw,
       0 AS max_marks_ise,
       0 AS max_marks_ie
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
