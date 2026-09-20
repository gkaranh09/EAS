const pool = require('../../core/config/db');

const checkStudentEmailExists = async (email) => {
  const result = await pool.query('SELECT id FROM student WHERE email = $1', [email]);
  return result.rows.length > 0;
};

const createStudent = async (data) => {
  const {
    student_id,
    full_name,
    full_name_devnagari = 'नाम',
    email,
    contact_number = null,
    password_hash,
    address = null,
    department_id,
    program_id,
    course = 'CBCGS-HME 2023',
    gender = null,
    category = 'open',
    student_type = 'student',
    pwd = false,
    abc_id = '000000000000',
    admission_year,
    current_year = '1',
    current_semester = 1,
    roll_no = null,
    division = 'A',
    profile_image = 'v1789934033/download.jpg'
  } = data;

  const insertRes = await pool.query(
    `INSERT INTO student (
      student_id, full_name, full_name_devnagari, email, contact_number, password_hash, address,
      department_id, program_id, course, gender, category, student_type, pwd, abc_id,
      admission_year, current_year, current_semester, roll_no, division, profile_image
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21
    ) RETURNING id`,
    [
      student_id, full_name, full_name_devnagari, email, contact_number, password_hash, address,
      department_id, program_id, course, gender, category, student_type, pwd, abc_id,
      admission_year, current_year, current_semester, roll_no || student_id, division || 'A',
      profile_image || 'v1789934033/download.jpg'
    ]
  );
  return await findStudentByEmail(email);
};

const findStudentByEmail = async (email) => {
  const result = await pool.query(`
    SELECT s.id, s.student_id, s.roll_no, s.division, s.full_name, s.full_name_devnagari, s.email, s.contact_number,
           s.password_hash, s.address, s.department_id, s.program_id, s.course, s.gender,
           s.category, s.student_type, s.pwd, s.abc_id, s.admission_year, s.current_year, s.current_semester,
           s.profile_image,
           d.department_name, d.department_code,
           p.program_name
    FROM student s
    LEFT JOIN department d ON d.department_id = s.department_id
    LEFT JOIN program p ON p.program_id = s.program_id
    WHERE s.email = $1
  `, [email]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    profile_image: row.profile_image || 'v1789934033/download.jpg',
    roll_no: row.roll_no || row.student_id,
    division: row.division || 'A',
    department: row.department_name || row.program_name || 'Engineering',
    program: row.program_name || row.department_name || 'Engineering'
  };
};

const checkEmployeeEmailExists = async (email) => {
  const result = await pool.query('SELECT id FROM employee WHERE email = $1', [email]);
  return result.rows.length > 0;
};

const createEmployee = async (name, employee_id, department_id, role, active, email, password_hash) => {
  const result = await pool.query(
    `INSERT INTO employee (name, employee_id, department_id, role, active, email, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, employee_id, department_id, role, active, email`,
    [name, employee_id, department_id, role, active, email, password_hash]
  );
  return result.rows[0];
};

const findEmployeeByEmail = async (email) => {
  const result = await pool.query(`
    SELECT e.id, e.name, e.employee_id, e.department_id, e.role, e.active, e.email, e.password_hash,
           d.department_name, d.department_code
    FROM employee e
    LEFT JOIN department d ON d.department_id = e.department_id
    WHERE e.email = $1
  `, [email]);

  if (!result.rows[0]) return null;
  const emp = result.rows[0];

  // Fetch allowed coordinate programs for this employee
  const allowedRes = await pool.query(`
    SELECT p.program_id, p.program_name, p.department_id
    FROM allowed_coordinate_programs_exam acp
    JOIN program p ON p.program_id = acp.program_id
    WHERE acp.employee_id = $1
  `, [emp.id]);

  const allowedPrograms = allowedRes.rows;
  const allowedProgramIds = allowedPrograms.map(p => p.program_id);

  return {
    ...emp,
    department: emp.department_name || 'Computer Engineering',
    allowed_programs: allowedPrograms,
    allowed_program_ids: allowedProgramIds
  };
};

const findDepartmentByName = async (departmentStr) => {
  const result = await pool.query(
    'SELECT department_id FROM department WHERE department_name ILIKE $1 OR department_code ILIKE $1',
    [departmentStr]
  );
  return result.rows[0] || null;
};

const findProgramByName = async (programStr) => {
  const result = await pool.query(
    'SELECT program_id, department_id FROM program WHERE program_name ILIKE $1',
    [programStr]
  );
  return result.rows[0] || null;
};

module.exports = {
  checkStudentEmailExists,
  createStudent,
  findStudentByEmail,
  checkEmployeeEmailExists,
  createEmployee,
  findEmployeeByEmail,
  findDepartmentByName,
  findProgramByName
};

