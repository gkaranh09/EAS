const programRepository = require('./program.repository');

const getDepartments = async () => {
  return await programRepository.findAllDepartments();
};

const getPrograms = async (departmentId) => {
  if (departmentId) {
    return await programRepository.findProgramsByDepartmentId(departmentId);
  }
  return await programRepository.findAllPrograms();
};

const getEmployeeAllowedPrograms = async (employeeId) => {
  return await programRepository.findAllowedProgramsForEmployee(employeeId);
};

const setEmployeeAllowedPrograms = async (employeeId, programIds) => {
  return await programRepository.updateAllowedProgramsForEmployee(employeeId, programIds);
};

module.exports = {
  getDepartments,
  getPrograms,
  getEmployeeAllowedPrograms,
  setEmployeeAllowedPrograms
};
