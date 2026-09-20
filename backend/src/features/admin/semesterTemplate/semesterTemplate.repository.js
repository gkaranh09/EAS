const pool = require('../../../core/config/db');

/**
 * Fetch all templates for a given program + semester,
 * including their groups and subjects (fully expanded).
 */
const getTemplatesByProgramSemester = async (program_id, semester) => {
  const result = await pool.query(`
    SELECT
      st.template_id, st.program_id, st.semester,
      st.template_name, st.self_choice, st.is_default,
      st.created_by, st.created_at,
      p.program_name,
      tsg.group_id, tsg.group_label, tsg.sort_order,
      s.subject_id, s.subject_code, s.subject_name,
      s.ese AS theory, s.or_pr, s.tw AS term_work, s.total_credit AS credit, s.scheme_detail,
      COALESCE(d.department_name, 'Common') AS branch
    FROM semester_template st
    JOIN program p ON p.program_id = st.program_id
    LEFT JOIN template_subject_group tsg ON tsg.template_id = st.template_id
    LEFT JOIN template_group_subject tgs ON tgs.group_id = tsg.group_id
    LEFT JOIN subject s ON s.subject_id = tgs.subject_id
    LEFT JOIN department d ON d.department_id = s.department_id
    WHERE st.program_id = $1 AND st.semester = $2
    ORDER BY st.template_id, tsg.sort_order, s.subject_code
  `, [program_id, semester]);

  return aggregateTemplateRows(result.rows);
};

/**
 * Fetch a single template by ID with full group/subject detail.
 */
const getTemplateById = async (template_id) => {
  const result = await pool.query(`
    SELECT
      st.template_id, st.program_id, st.semester,
      st.template_name, st.self_choice, st.is_default,
      st.created_by, st.created_at,
      p.program_name,
      tsg.group_id, tsg.group_label, tsg.sort_order,
      s.subject_id, s.subject_code, s.subject_name,
      s.ese AS theory, s.or_pr, s.tw AS term_work, s.total_credit AS credit, s.scheme_detail,
      COALESCE(d.department_name, 'Common') AS branch
    FROM semester_template st
    JOIN program p ON p.program_id = st.program_id
    LEFT JOIN template_subject_group tsg ON tsg.template_id = st.template_id
    LEFT JOIN template_group_subject tgs ON tgs.group_id = tsg.group_id
    LEFT JOIN subject s ON s.subject_id = tgs.subject_id
    LEFT JOIN department d ON d.department_id = s.department_id
    WHERE st.template_id = $1
    ORDER BY tsg.sort_order, s.subject_code
  `, [template_id]);

  if (result.rows.length === 0) return null;

  const templates = aggregateTemplateRows(result.rows);
  return templates[0] || null;
};

/**
 * Create a new template with groups and subjects (transactional).
 */
const createTemplate = async (program_id, semester, template_name, self_choice, is_default, created_by, groups) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If this template is marked as default, unset any existing default for same program+semester
    if (is_default) {
      await client.query(
        `UPDATE semester_template SET is_default = false WHERE program_id = $1 AND semester = $2`,
        [program_id, semester]
      );
    }

    const templateResult = await client.query(
      `INSERT INTO semester_template (program_id, semester, template_name, self_choice, is_default, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING template_id`,
      [program_id, semester, template_name, self_choice, is_default, created_by]
    );
    const template_id = templateResult.rows[0].template_id;

    await insertGroups(client, template_id, groups);

    await client.query('COMMIT');
    return template_id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update an existing template: metadata + replace all groups/subjects.
 */
const updateTemplate = async (template_id, template_name, self_choice, is_default, groups) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch existing template to get program_id and semester for default logic
    const existing = await client.query(
      `SELECT program_id, semester FROM semester_template WHERE template_id = $1`,
      [template_id]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const { program_id, semester } = existing.rows[0];

    // If marking as default, unset others
    if (is_default) {
      await client.query(
        `UPDATE semester_template SET is_default = false WHERE program_id = $1 AND semester = $2 AND template_id != $3`,
        [program_id, semester, template_id]
      );
    }

    await client.query(
      `UPDATE semester_template SET template_name = $1, self_choice = $2, is_default = $3 WHERE template_id = $4`,
      [template_name, self_choice, is_default, template_id]
    );

    // Delete old groups (cascades to template_group_subject)
    await client.query(`DELETE FROM template_subject_group WHERE template_id = $1`, [template_id]);

    // Insert new groups
    await insertGroups(client, template_id, groups);

    await client.query('COMMIT');
    return template_id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Delete a template (cascades to groups and group subjects).
 */
const deleteTemplate = async (template_id) => {
  const result = await pool.query(
    `DELETE FROM semester_template WHERE template_id = $1 RETURNING template_id`,
    [template_id]
  );
  return result.rows[0] || null;
};

/**
 * Check if all given subject_ids exist in the subject table.
 */
const validateSubjectIds = async (subject_ids) => {
  if (subject_ids.length === 0) return true;
  const result = await pool.query(
    `SELECT subject_id FROM subject WHERE subject_id = ANY($1::int[])`,
    [subject_ids]
  );
  return result.rows.length === subject_ids.length;
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Insert groups and their subjects for a template (within an existing transaction client).
 */
const insertGroups = async (client, template_id, groups) => {
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupResult = await client.query(
      `INSERT INTO template_subject_group (template_id, group_label, sort_order) VALUES ($1, $2, $3) RETURNING group_id`,
      [template_id, group.group_label || null, i]
    );
    const group_id = groupResult.rows[0].group_id;

    for (const subject_id of group.subject_ids) {
      await client.query(
        `INSERT INTO template_group_subject (group_id, subject_id) VALUES ($1, $2)`,
        [group_id, subject_id]
      );
    }
  }
};

/**
 * Aggregate flat JOIN rows into nested template -> groups -> subjects structure.
 */
const aggregateTemplateRows = (rows) => {
  const templatesMap = new Map();

  for (const row of rows) {
    if (!templatesMap.has(row.template_id)) {
      templatesMap.set(row.template_id, {
        template_id: row.template_id,
        program_id: row.program_id,
        program_name: row.program_name,
        semester: row.semester,
        template_name: row.template_name,
        self_choice: row.self_choice,
        is_default: row.is_default,
        created_by: row.created_by,
        created_at: row.created_at,
        groups: []
      });
    }

    const template = templatesMap.get(row.template_id);

    if (row.group_id) {
      let group = template.groups.find(g => g.group_id === row.group_id);
      if (!group) {
        group = {
          group_id: row.group_id,
          group_label: row.group_label,
          sort_order: row.sort_order,
          subjects: []
        };
        template.groups.push(group);
      }

      if (row.subject_id) {
        if (!group.subjects.find(s => s.subject_id === row.subject_id)) {
          group.subjects.push({
            subject_id: row.subject_id,
            subject_code: row.subject_code,
            subject_name: row.subject_name,
            theory: row.theory,
            or_pr: row.or_pr,
            term_work: row.term_work,
            credit: row.credit,
            scheme_detail: row.scheme_detail,
            branch: row.branch
          });
        }
      }
    }
  }

  return Array.from(templatesMap.values());
};

module.exports = {
  getTemplatesByProgramSemester,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  validateSubjectIds
};
