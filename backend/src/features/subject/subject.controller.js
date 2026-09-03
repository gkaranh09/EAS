const subjectService = require('./subject.service');

const getSubjects = async (req, res) => {
  const { branch, semester, program_id, search, scheme } = req.query;
  try {
    const subjects = await subjectService.getSubjects(branch, semester, program_id, search, scheme);
    res.json(subjects);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSubjects
};
