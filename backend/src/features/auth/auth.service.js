const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const sessionRepository = require('./session.repository');

const EMAIL_REGEX = /^\d{10}@tcetmumbai\.in$/i;

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

const registerStudent = async (data, meta = {}) => {
  const {
    surname,
    first_name,
    father_name,
    mother_name,
    full_name,
    email,
    password,
    department_id,
    program_id,
    department,
    program,
    admission_year,
    current_year,
    current_semester,
    abc_id
  } = data;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanEmail = email.trim();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error('Email must be a 10-digit number followed by @tcetmumbai.in');
  }

  const exists = await authRepository.checkStudentEmailExists(cleanEmail);
  if (exists) {
    throw new Error('Email already registered');
  }

  if (!abc_id || abc_id.trim().length !== 12) {
    throw new Error('ABC ID is required and must be exactly 12 digits');
  }

  const digits = cleanEmail.split('@')[0];
  const student_id = `S${digits}`;
  const password_hash = await bcrypt.hash(password, 10);
  const combinedFullName = (full_name && full_name.trim())
    ? full_name.trim()
    : [surname, first_name, father_name, mother_name].filter(Boolean).join(' ').trim() || `Student ${digits}`;

  let targetDeptId = department_id ? parseInt(department_id, 10) : null;
  let targetProgId = program_id ? parseInt(program_id, 10) : null;

  if (!targetProgId && program) {
    const progRes = await authRepository.findProgramByName(program);
    if (progRes) {
      targetProgId = progRes.program_id;
      if (!targetDeptId) targetDeptId = progRes.department_id;
    }
  }

  if (!targetDeptId && department) {
    const deptRes = await authRepository.findDepartmentByName(department);
    if (deptRes) {
      targetDeptId = deptRes.department_id;
    }
  }

  if (!targetDeptId) targetDeptId = 1;
  if (!targetProgId) targetProgId = 1;

  const parsedAdmissionYear = admission_year ? parseInt(admission_year, 10) : new Date().getFullYear();
  const parsedSemester = current_semester ? parseInt(current_semester, 10) : 1;
  const parsedCurrentYear = current_year || (parsedSemester <= 2 ? '1' : parsedSemester <= 4 ? '2' : parsedSemester <= 6 ? '3' : '4');

  const student = await authRepository.createStudent({
    student_id,
    surname: surname?.trim() || null,
    first_name: first_name?.trim() || null,
    father_name: father_name?.trim() || null,
    mother_name: mother_name?.trim() || null,
    full_name: combinedFullName,
    email: cleanEmail,
    password_hash,
    department_id: targetDeptId,
    program_id: targetProgId,
    admission_year: parsedAdmissionYear,
    current_year: parsedCurrentYear,
    current_semester: parsedSemester,
    abc_id: abc_id.trim()
  });

  // Start single active session for student
  const { sessionId } = await sessionRepository.startUserSession({
    userType: 'student',
    userId: student.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress
  });

  const token = generateToken({
    id: student.id,
    student_id: student.student_id,
    email: student.email,
    full_name: student.full_name,
    department: student.department,
    program: student.program,
    department_id: student.department_id,
    program_id: student.program_id,
    user_type: 'student',
    session_id: sessionId
  });

  const { password_hash: _, ...studentData } = student;
  return { token, student: studentData };
};

const loginStudent = async (email, password, meta = {}) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanEmail = email.trim();
  const student = await authRepository.findStudentByEmail(cleanEmail);

  if (!student) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  // Start single active session for student (displaces any prior session)
  const { sessionId } = await sessionRepository.startUserSession({
    userType: 'student',
    userId: student.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress
  });

  const token = generateToken({
    id: student.id,
    student_id: student.student_id,
    email: student.email,
    full_name: student.full_name,
    department: student.department,
    program: student.program,
    department_id: student.department_id,
    program_id: student.program_id,
    user_type: 'student',
    session_id: sessionId
  });

  const { password_hash, ...studentData } = student;
  return { token, student: studentData };
};

const loginEmployee = async (email, password, meta = {}) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanEmail = email.trim();
  const empUser = await authRepository.findEmployeeByEmail(cleanEmail);

  if (!empUser) {
    throw new Error('Invalid email or password');
  }

  if (!empUser.active) {
    throw new Error('Your account is currently inactive. Please contact the Head/Administrator.');
  }

  const valid = await bcrypt.compare(password, empUser.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  // Start single active session for employee (displaces any prior session)
  const { sessionId } = await sessionRepository.startUserSession({
    userType: 'employee',
    userId: empUser.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress
  });

  const token = generateToken({
    id: empUser.id,
    email: empUser.email,
    name: empUser.name,
    role: empUser.role,
    department: empUser.department,
    department_id: empUser.department_id,
    allowed_program_ids: empUser.allowed_program_ids || [],
    employee_id: empUser.employee_id,
    faculty_id: empUser.employee_id,
    active: empUser.active,
    is_faculty: true,
    is_employee: true,
    user_type: 'employee',
    session_id: sessionId
  });

  const { password_hash, ...empData } = empUser;
  const userObj = {
    ...empData,
    faculty_id: empUser.employee_id,
    is_faculty: true,
    is_employee: true,
    full_name: empUser.name
  };

  return { token, student: userObj };
};

const logoutUser = async (userType, userId, sessionId) => {
  return await sessionRepository.terminateSession(userType, userId, sessionId);
};

module.exports = {
  registerStudent,
  loginStudent,
  loginEmployee,
  logoutUser
};
