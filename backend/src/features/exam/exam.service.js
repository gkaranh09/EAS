const examRepository = require('./exam.repository');

const getExamsForStudent = async (studentId) => {
  return await examRepository.getActiveExamsForStudent(studentId);
};

module.exports = {
  getExamsForStudent
};
