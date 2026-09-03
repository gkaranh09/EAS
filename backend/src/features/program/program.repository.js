const pool = require('../../core/config/db');

const findAllDepartments = async () => {
  const result = await pool.query('SELECT department_id, department_code, department_name FROM department ORDER BY department_id ASC');
  return result.rows;
};

const findAllPrograms = async () => {
  const result = await pool.query(`
    SELECT p.program_id, p.program_name, p.department_id, d.department_name, d.department_code
    FROM program p
    JOIN department d ON d.department_id = p.department_id
    ORDER BY p.program_id ASC
  `);
  return result.rows;
};

const findProgramsByDepartmentId = async (departmentId) => {
  const result = await pool.query(`
    SELECT p.program_id, p.program_name, p.department_id, d.department_name, d.department_code
    FROM program p
    JOIN department d ON d.department_id = p.department_id
    WHERE p.department_id = $1
    ORDER BY p.program_id ASC
  `, [departmentId]);
  return result.rows;
};

const findAllowedProgramsForEmployee = async (employeeId) => {
  const result = await pool.query(`
    SELECT p.program_id, p.program_name, p.department_id, d.department_name
    FROM allowed_coordinate_programs_exam acp
    JOIN program p ON p.program_id = acp.program_id
    JOIN department d ON d.department_id = p.department_id
    WHERE acp.employee_id = $1
    ORDER BY p.program_id ASC
  `, [employeeId]);
  return result.rows;
};

const updateAllowedProgramsForEmployee = async (employeeId, programIds) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM allowed_coordinate_programs_exam WHERE employee_id = $1', [employeeId]);
    
    if (Array.isArray(programIds) && programIds.length > 0) {
      for (const pid of programIds) {
        await client.query(
          'INSERT INTO allowed_coordinate_programs_exam (employee_id, program_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [employeeId, pid]
        );
      }
    }
    
    await client.query('COMMIT');
    return await findAllowedProgramsForEmployee(employeeId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  findAllDepartments,
  findAllPrograms,
  findProgramsByDepartmentId,
  findAllowedProgramsForEmployee,
  updateAllowedProgramsForEmployee
};
