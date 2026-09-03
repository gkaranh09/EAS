const bcrypt = require('bcryptjs');
const repo = require('./employeeManagement.repository');

const getEmployees = async () => {
  return await repo.findAllEmployees();
};

const addEmployee = async (data) => {
  const { name, email, department, role } = data;
  if (!name || !email) throw new Error('Name and email are required');

  const cleanEmail = email.trim();
  const EMAIL_REGEX = /^\d{10}@tcetmumbai\.in$/i;
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Email must be a 10-digit number followed by @tcetmumbai.in');
  }

  const exists = await repo.checkEmployeeEmailExists(cleanEmail);
  if (exists) throw new Error('An employee with this email already exists');

  const digits = cleanEmail.split('@')[0];
  const employee_id = `E${digits}`;
  const password_hash = await bcrypt.hash('pasword123', 10);
  
  const rawRole = (role || 'coordinator').toLowerCase().trim();
  const userRole = ['head', 'admin'].includes(rawRole) ? rawRole : 'coordinator';
  const deptStr = department || 'Computer Engineering';
  const department_id = await repo.getDepartmentId(deptStr);

  return await repo.createEmployee(name, employee_id, department_id, deptStr, userRole, cleanEmail, password_hash);
};

const updateRole = async (id, role) => {
  if (!role) throw new Error('Role is required');
  const rawRole = role.toLowerCase().trim();
  if (!['head', 'admin', 'coordinator'].includes(rawRole)) {
    throw new Error('Invalid role');
  }
  
  const emp = await repo.updateRole(id, rawRole);
  if (!emp) throw new Error('Employee not found');
  return emp;
};

const toggleActive = async (id, activeStatus) => {
  const emp = await repo.toggleActive(id, activeStatus);
  if (!emp) throw new Error('Employee not found');
  return emp;
};

module.exports = {
  getEmployees,
  addEmployee,
  updateRole,
  toggleActive
};
