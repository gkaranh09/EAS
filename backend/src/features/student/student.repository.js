const pool = require('../../core/config/db');

const findById = async (id) => {
  const query = `
    SELECT s.id, s.student_id, s.roll_no, s.division,
           s.full_name, s.full_name_devnagari, s.email, s.contact_number,
           s.address, s.department_id, s.program_id, s.course, s.gender,
           s.category, s.student_type, s.pwd, s.abc_id, s.admission_year, s.current_year, s.current_semester,
           d.department_name, d.department_code,
           p.program_name
    FROM student s
    LEFT JOIN department d ON d.department_id = s.department_id
    LEFT JOIN program p ON p.program_id = s.program_id
    WHERE s.id = $1
  `;
  const result = await pool.query(query, [id]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];

  // Parse name components dynamically from full_name
  const nameParts = (row.full_name || '').trim().split(/\s+/);
  const surname = nameParts[0] || '';
  const first_name = nameParts[1] || '';
  const father_name = nameParts[2] || '';
  const mother_name = nameParts.slice(3).join(' ') || '';

  return {
    ...row,
    surname,
    first_name,
    father_name,
    mother_name,
    roll_no: row.roll_no || row.student_id,
    division: row.division || 'A',
    department: row.department_name || row.program_name || 'Engineering',
    program: row.program_name || row.department_name || 'Engineering'
  };
};

const updateProfile = async (id, data) => {
  const {
    surname,
    first_name,
    father_name,
    mother_name,
    full_name,
    full_name_devnagari,
    contact_number,
    address,
    course,
    gender,
    category,
    student_type,
    pwd,
    abc_id,
    roll_no,
    division
  } = data;

  const combinedFullName = (full_name || [surname, first_name, father_name, mother_name].filter(Boolean).join(' ')).trim();

  const query = `
    UPDATE student
    SET full_name = COALESCE($1, full_name),
        full_name_devnagari = COALESCE($2, full_name_devnagari),
        contact_number = $3,
        address = $4,
        course = COALESCE($5, course),
        gender = $6,
        category = COALESCE($7, category),
        student_type = COALESCE($8, student_type),
        pwd = COALESCE($9, pwd),
        abc_id = COALESCE($10, abc_id),
        roll_no = COALESCE($11, roll_no),
        division = COALESCE($12, division)
    WHERE id = $13
    RETURNING id
  `;

  const values = [
    combinedFullName || null,
    full_name_devnagari,
    contact_number,
    address,
    course,
    gender,
    category,
    student_type,
    pwd,
    abc_id,
    roll_no,
    division,
    id
  ];

  await pool.query(query, values);
  return await findById(id);
};

module.exports = {
  findById,
  updateProfile
};
