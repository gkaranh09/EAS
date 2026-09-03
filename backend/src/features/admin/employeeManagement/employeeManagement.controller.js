const service = require('./employeeManagement.service');

const isHead = (user) => user?.role?.toLowerCase() === 'head';

const getEmployees = async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can access Employee Management.' });
  }
  try {
    const employees = await service.getEmployees();
    res.json(employees);
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ message: 'Server error retrieving employees' });
  }
};

const addEmployee = async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can add employees.' });
  }
  try {
    const employee = await service.addEmployee(req.body);
    res.status(201).json({
      message: 'Employee created successfully in inactive state. Default initial password set to pasword123.',
      employee
    });
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('10-digit')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('exists')) {
      return res.status(409).json({ message: err.message });
    }
    console.error('Create employee error:', err);
    res.status(500).json({ message: 'Server error creating employee' });
  }
};

const updateRole = async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can change employee roles.' });
  }
  try {
    const employee = await service.updateRole(req.params.id, req.body.role);
    res.json({ message: `Role updated successfully`, employee });
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('Invalid role')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === 'Employee not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('Update role error:', err);
    res.status(500).json({ message: 'Server error updating role' });
  }
};

const toggleActive = async (req, res) => {
  if (!isHead(req.user)) {
    return res.status(403).json({ message: 'Access denied: Only the Exam Center Head can activate or deactivate employees.' });
  }
  try {
    const employee = await service.toggleActive(req.params.id, req.body.active);
    res.json({ message: 'Employee status updated', employee });
  } catch (err) {
    if (err.message === 'Employee not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('Toggle active error:', err);
    res.status(500).json({ message: 'Server error updating status' });
  }
};

module.exports = {
  getEmployees,
  addEmployee,
  updateRole,
  toggleActive
};
