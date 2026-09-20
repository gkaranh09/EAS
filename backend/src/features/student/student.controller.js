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
    if (err.code === '23505' || (err.message && err.message.includes('unique constraint'))) {
      if (err.detail && err.detail.includes('abc_id')) {
        return res.status(400).json({ message: 'The ABC ID you entered is already registered with another student.' });
      }
      return res.status(400).json({ message: 'Duplicate record error: one of the unique fields is already in use.' });
    }
    if (err.message && (err.message.includes('must be') || err.message.includes('required') || err.message.includes('Category'))) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Update student profile error:', err);
    res.status(500).json({ message: err.message || 'Server error updating profile' });
  }
};

const getProfileStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    const status = await studentService.checkProfileCompleteness(studentId);
    res.json(status);
  } catch (err) {
    console.error('Get profile status error:', err);
    res.status(500).json({ message: 'Server error checking profile status' });
  }
};

const uploadPhoto = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    const result = await studentService.uploadStudentPhoto(studentId, image);
    res.json(result);
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ message: err.message || 'Server error uploading profile photo' });
  }
};

module.exports = {
  getMe,
  updateProfile,
  getProfileStatus,
  uploadPhoto
};
