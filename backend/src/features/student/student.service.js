const studentRepository = require('./student.repository');
const { uploadImageToCloudinary } = require('../../core/config/cloudinary');

const getStudentProfile = async (id) => {
  if (!id) {
    throw new Error('Student ID is required');
  }
  
  const student = await studentRepository.findById(id);
  return student;
};

const checkProfileCompleteness = async (id) => {
  const student = await studentRepository.findById(id);
  if (!student) {
    return {
      complete: false,
      missingFields: ['student_record'],
      missingLabels: ['Student Record Not Found']
    };
  }

  const missingFields = [];
  const missingLabels = [];

  // 1. Full Name & Mother Name
  if (!student.full_name || student.full_name.trim().length < 3) {
    missingFields.push('full_name');
    missingLabels.push('Full Name');
  }
  if (!student.mother_name || student.mother_name.trim().length < 2) {
    missingFields.push('mother_name');
    missingLabels.push('Mother Name');
  }

  // 2. Contact Number (10 digits)
  const cleanContact = (student.contact_number || '').replace(/\D/g, '');
  if (!cleanContact || cleanContact.length < 10) {
    missingFields.push('contact_number');
    missingLabels.push('Contact Number (10 digits)');
  }

  // 3. Residential Address
  if (!student.address || student.address.trim().length < 5) {
    missingFields.push('address');
    missingLabels.push('Residential Address');
  }

  // 4. ABC ID (12-digit Academic Bank of Credits)
  const cleanAbc = (student.abc_id || '').replace(/\D/g, '');
  if (!cleanAbc || cleanAbc.length !== 12 || cleanAbc === '000000000000') {
    missingFields.push('abc_id');
    missingLabels.push('Valid 12-digit ABC ID');
  }

  // 5. Gender
  if (!student.gender || student.gender.trim().length === 0) {
    missingFields.push('gender');
    missingLabels.push('Gender');
  }

  // 6. Category
  if (!student.category || student.category.trim().length === 0) {
    missingFields.push('category');
    missingLabels.push('Caste Category');
  }

  // 7. Academic Program / Department
  if (!student.program_id && !student.department_id) {
    missingFields.push('program');
    missingLabels.push('Academic Program');
  }

  // 8. Profile Photo
  if (!student.profile_image || student.profile_image.trim().length === 0) {
    missingFields.push('profile_image');
    missingLabels.push('Profile Photo');
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
    missingLabels,
    student
  };
};

const uploadStudentPhoto = async (id, imageSource) => {
  if (!id) throw new Error('Student ID is required');
  if (!imageSource) throw new Error('Image data is required');

  const { relativePath, secureUrl } = await uploadImageToCloudinary(imageSource, id);
  const updated = await studentRepository.updateProfile(id, { profile_image: relativePath });

  return {
    message: 'Profile photo uploaded to Cloudinary successfully',
    profile_image: relativePath,
    secure_url: secureUrl,
    student: updated
  };
};

const updateStudentProfile = async (id, data) => {
  if (!id) {
    throw new Error('Student ID is required');
  }

  const validCategories = ['open', 'obc', 'st', 'sc', 'nt', 'dt', 'sbc'];
  if (data.category && !validCategories.includes(data.category.toLowerCase())) {
    throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
  }

  let full_name = data.full_name?.trim();
  if (!full_name && (data.surname || data.first_name || data.father_name || data.mother_name)) {
    full_name = [data.surname, data.first_name, data.father_name, data.mother_name].filter(Boolean).join(' ').trim();
  }

  // If a new base64/data image is provided, upload to Cloudinary and extract relative path
  let resolvedProfileImage = data.profile_image?.trim() || undefined;
  if (resolvedProfileImage && (resolvedProfileImage.startsWith('data:') || resolvedProfileImage.startsWith('http'))) {
    try {
      const uploadRes = await uploadImageToCloudinary(resolvedProfileImage, id);
      resolvedProfileImage = uploadRes.relativePath;
    } catch (err) {
      console.warn('Cloudinary upload warning in updateStudentProfile:', err.message);
    }
  }

  const updated = await studentRepository.updateProfile(id, {
    full_name: full_name || undefined,
    surname: data.surname?.trim() || undefined,
    first_name: data.first_name?.trim() || undefined,
    father_name: data.father_name?.trim() || undefined,
    mother_name: data.mother_name?.trim() || undefined,
    full_name_devnagari: data.full_name_devnagari?.trim(),
    contact_number: data.contact_number !== undefined ? data.contact_number?.trim() : undefined,
    address: data.address !== undefined ? data.address?.trim() : undefined,
    course: data.course?.trim() || undefined,
    gender: data.gender !== undefined ? data.gender : undefined,
    category: data.category ? data.category.toLowerCase() : undefined,
    student_type: data.student_type ? data.student_type.toLowerCase() : undefined,
    pwd: data.pwd !== undefined ? !!data.pwd : undefined,
    roll_no: data.roll_no?.trim() || undefined,
    division: data.division?.trim() || undefined,
    profile_image: resolvedProfileImage,
    abc_id: data.abc_id?.trim() || undefined
  });

  return updated;
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  checkProfileCompleteness,
  uploadStudentPhoto
};
