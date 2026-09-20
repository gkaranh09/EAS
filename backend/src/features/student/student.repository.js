const pool = require('../../core/config/db');

const findById = async (id) => {
  const query = `
    SELECT s.id, s.student_id, s.roll_no, s.division,
           s.full_name, s.full_name_devnagari, s.email, s.contact_number,
           s.address, s.department_id, s.program_id, s.course, s.gender,
           s.category, s.student_type, s.pwd, s.abc_id, s.admission_year, s.current_year, s.current_semester,
           s.profile_image,
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
    profile_image: row.profile_image || 'v1789934033/download.jpg',
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
    roll_no,
    division,
    profile_image,
    abc_id
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
        roll_no = COALESCE($10, roll_no),
        division = COALESCE($11, division),
        profile_image = COALESCE($12, profile_image),
        abc_id = COALESCE($13, abc_id)
    WHERE id = $14
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
    roll_no,
    division,
    profile_image,
    abc_id,
    id
  ];

  await pool.query(query, values);
  return await findById(id);
};

module.exports = {
  findById,
  updateProfile
};
