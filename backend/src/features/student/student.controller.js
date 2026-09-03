const studentService = require('./student.service');

const getMe = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await studentService.getStudentProfile(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (err) {
    console.error('Get student controller error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const updated = await studentService.updateStudentProfile(studentId, req.body);
    res.json({ message: 'Profile updated successfully', student: updated });
  } catch (err) {
    if (err.message.includes('must be') || err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Update student profile error:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
  getMe,
  updateProfile
};
