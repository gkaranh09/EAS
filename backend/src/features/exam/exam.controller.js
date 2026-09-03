const examService = require('./exam.service');

const getExams = async (req, res) => {
  try {
    const studentId = req.user.id;
    const exams = await examService.getExamsForStudent(studentId);
    res.json(exams);
  } catch (err) {
    console.error('Get exams error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getExams
};
