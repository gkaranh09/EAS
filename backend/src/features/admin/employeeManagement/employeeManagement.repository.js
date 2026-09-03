const pool = require('../../../core/config/db');

const findAllEmployees = async () => {
  const result = await pool.query(`
    SELECT e.id, e.name, e.employee_id, e.department_id, d.department_name, e.role, e.active, e.email, e.created_at
    FROM employee e
    LEFT JOIN department d ON d.department_id = e.department_id
    ORDER BY e.id ASC
  `);
  
  const employees = result.rows;
  for (const emp of employees) {
    const allowedRes = await pool.query(`
      SELECT p.program_id, p.program_name
      FROM allowed_coordinate_programs_exam acp
      JOIN program p ON p.program_id = acp.program_id
      WHERE acp.employee_id = $1
    `, [emp.id]);
    emp.department = emp.department_name || 'Computer Engineering';
    emp.allowed_programs = allowedRes.rows;
  }
  return employees;
};

const checkEmployeeEmailExists = async (email) => {
  const result = await pool.query('SELECT id FROM employee WHERE email = $1', [email]);
  return result.rows.length > 0;
};

const getDepartmentId = async (departmentStr) => {
  const result = await pool.query(
    'SELECT department_id FROM department WHERE department_name ILIKE $1 OR department_code ILIKE $1',
    [departmentStr]
  );
  return result.rows[0] ? result.rows[0].department_id : 1;
};

const createEmployee = async (name, employee_id, department_id, departmentStr, userRole, cleanEmail, password_hash) => {
  const result = await pool.query(
    `INSERT INTO employee (name, employee_id, department_id, role, active, email, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, employee_id, department_id, role, active, email, created_at`,
    [name, employee_id, department_id, userRole, false, cleanEmail, password_hash]
  );
  const newEmp = result.rows[0];
  newEmp.department = departmentStr || 'Computer Engineering';
  newEmp.allowed_programs = [];
  return newEmp;
};

const updateRole = async (id, role) => {
  const result = await pool.query(
    `UPDATE employee SET role = $1 WHERE id = $2 RETURNING id, name, employee_id, department_id, role, active, email`,
    [role, id]
  );
  return result.rows[0] || null;
};

const toggleActive = async (id, activeStatus) => {
  let updateQuery;
  let queryParams;

  if (typeof activeStatus === 'boolean') {
    updateQuery = `UPDATE employee SET active = $1 WHERE id = $2 RETURNING id, name, employee_id, department_id, role, active, email`;
    queryParams = [activeStatus, id];
  } else {
    updateQuery = `UPDATE employee SET active = NOT active WHERE id = $1 RETURNING id, name, employee_id, department_id, role, active, email`;
    queryParams = [id];
  }

  const result = await pool.query(updateQuery, queryParams);
  return result.rows[0] || null;
};

module.exports = {
  findAllEmployees,
  checkEmployeeEmailExists,
  getDepartmentId,
  createEmployee,
  updateRole,
  toggleActive
};

