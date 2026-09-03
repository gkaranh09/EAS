const subjectRepository = require('./subject.repository');

const getSubjects = async (branch, semester, program_id, search, scheme) => {
  return await subjectRepository.findSubjects(branch, semester, program_id, search, scheme);
};

module.exports = {
  getSubjects
};
