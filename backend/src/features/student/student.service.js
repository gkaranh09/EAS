const studentRepository = require('./student.repository');

const getStudentProfile = async (id) => {
  if (!id) {
    throw new Error('Student ID is required');
  }
  
  const student = await studentRepository.findById(id);
  return student;
};

const updateStudentProfile = async (id, data) => {
  if (!id) {
    throw new Error('Student ID is required');
  }

  // Basic validation
  if (data.abc_id && data.abc_id.length !== 12) {
    throw new Error('ABC ID must be exactly 12 digits');
  }

  const validCategories = ['open', 'obc', 'st', 'sc', 'nt', 'dt', 'sbc'];
  if (data.category && !validCategories.includes(data.category.toLowerCase())) {
    throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
  }

  const updated = await studentRepository.updateProfile(id, {
    full_name: data.full_name?.trim(),
    full_name_devnagari: data.full_name_devnagari?.trim(),
    contact_number: data.contact_number?.trim() || null,
    address: data.address?.trim() || null,
    course: data.course?.trim() || 'CBCGS-HME 2023',
    gender: data.gender || null,
    category: data.category?.toLowerCase() || 'open',
    student_type: data.student_type?.toLowerCase() || 'student',
    pwd: !!data.pwd,
    abc_id: data.abc_id?.trim() || '000000000000',
    roll_no: data.roll_no?.trim() || undefined,
    division: data.division?.trim() || undefined
  });

  return updated;
};

module.exports = {
  getStudentProfile,
  updateStudentProfile
};
