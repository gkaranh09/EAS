const programService = require('./program.service');

const getDepartments = async (req, res) => {
  try {
    const depts = await programService.getDepartments();
    res.json(depts);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ message: 'Server error fetching departments' });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { department_id } = req.query;
    const programs = await programService.getPrograms(department_id);
    res.json(programs);
  } catch (err) {
    console.error('Get programs error:', err);
    res.status(500).json({ message: 'Server error fetching programs' });
  }
};

const getEmployeeAllowedPrograms = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const allowed = await programService.getEmployeeAllowedPrograms(employeeId);
    res.json(allowed);
  } catch (err) {
    console.error('Get employee allowed programs error:', err);
    res.status(500).json({ message: 'Server error fetching allowed programs' });
  }
};

const updateEmployeeAllowedPrograms = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { program_ids } = req.body;
    const updated = await programService.setEmployeeAllowedPrograms(employeeId, program_ids);
    res.json({ message: 'Allowed coordinate programs updated successfully', programs: updated });
  } catch (err) {
    console.error('Update employee allowed programs error:', err);
    res.status(500).json({ message: 'Server error updating allowed programs' });
  }
};

module.exports = {
  getDepartments,
  getPrograms,
  getEmployeeAllowedPrograms,
  updateEmployeeAllowedPrograms
};
