-- ============================================================
--  EAS – Exam Application System  |  Seed Data
--  Passwords are bcrypt of "password123"
-- ============================================================

-- Departments
INSERT INTO department (department_id, department_code, department_name) VALUES
  (1, 'COMP', 'Computer Engineering'),
  (2, 'IT',   'Information Technology'),
  (3, 'EXTC', 'Electronics and Telecommunication Engineering'),
  (4, 'ECS',  'Electronics and Computer Science'),
  (5, 'MECH', 'Mechanical Engineering'),
  (6, 'CIVIL','Civil Engineering'),
  (7, 'AIDS', 'Artificial Intelligence and Data Science'),
  (8, 'IOT',  'Computer Science & Engineering (IoT)'),
  (9, 'AIML', 'Artificial Intelligence and Machine Learning'),
  (10, 'CSE', 'Computer Science and Engineering (Cyber Security)'),
  (11, 'MME', 'Mechanical and Mechatronics Engineering'),
  (12, 'CA',  'Computer Application'),
  (13, 'MGMT', 'Management'),
  (14, 'VOC',  'Vocational Department'),
  (15, 'ESH',  'Engineering Sciences & Humanities');

-- Programs
INSERT INTO program (program_id, program_name, department_id) VALUES
  (1, 'Bachelor of Engineering - Computer Engineering', 1),
  (2, 'Bachelor of Engineering - Information Technology', 2),
  (3, 'Bachelor of Engineering - Electronics and Telecommunication Engineering', 3),
  (4, 'Bachelor of Engineering - Electronics and Computer Science', 4),
  (5, 'Bachelor of Engineering - Mechanical Engineering', 5),
  (6, 'Bachelor of Engineering - Civil Engineering', 6),
  (7, 'Bachelor of Technology - Artificial Intelligence and Data Science', 7),
  (8, 'Bachelor of Technology - Computer Science & Engineering (IoT)', 8),
  (9, 'Bachelor of Technology - Artificial Intelligence and Machine Learning', 9),
  (10, 'Bachelor of Engineering - Computer Science and Engineering (Cyber Security)', 10),
  (11, 'Bachelor of Engineering - Mechanical and Mechatronics Engineering (Additive Manufacturing)', 11),
  (12, '(Working Professional) Bachelor of Engineering - Computer Engineering', 1),
  (13, '(Working Professional) Bachelor of Technology - Artificial Intelligence & Data Science', 7),
  (14, 'Bachelor of Computer Applications', 12),
  (15, 'Bachelor of Business Administration', 13),
  (16, 'Bachelor of Business Administration and Master of Business Administration(Integrated)', 13),
  (17, 'Bachelor of Vocation - Artificial Intelligence and Data Science', 14),
  (18, 'Bachelor of Vocation - Software Development', 14),
  (19, 'Bachelor of Vocation - Animation & Graphic Designing', 14),
  (20, 'Bachelor of Vocation - Data Analytics', 14),
  (21, 'Bachelor of Vocation - Data Science', 14),
  (22, 'Bachelor of Vocation - Artificial Intelligence', 14),
  (23, 'Master of Engineering - Computer Engineering', 1),
  (24, 'Master of Engineering - Information Technology', 2),
  (25, 'Master of Engineering - Communication Technology & Management', 3),
  (26, '(Working Professional) Master of Engineering - Computer Engineering', 1),
  (27, '(Working Professional) Master of Engineering - Information Technology', 2),
  (28, 'Master of Computer Applications', 12),
  (29, 'Master of Business Administration', 13),
  (30, 'Doctor of Philosophy - Computer Engineering', 1),
  (31, 'Doctor of Philosophy - Information Technology', 2),
  (32, 'Doctor of Philosophy - Electronics and Telecommunication', 3),
  (33, 'Doctor of Philosophy - Mechanical Engineering', 5),
  (34, 'Doctor of Philosophy - Civil Engineering', 6);

-- Students  (password = "password123") 
INSERT INTO student (student_id, full_name, full_name_devnagari, email, contact_number, password_hash, address, department_id, program_id, course, gender, category, student_type, pwd, abc_id, admission_year, current_year, current_semester, roll_no, division) VALUES
  ('S1234567890', 'Rahul Sharma',  'राहुल शर्मा',  '1234567890@tcetmumbai.in', '9876543210', '$2a$10$IcC05JtqAyjNNbor5ABsTu5Y65aFDXNCsRTSoY0t/iB61zMR6C48q', '12 MG Road, Pune 411001',    1, 1, 'CBCGS-HME 2023', 'Male',   'open', 'student', false, '111111111111', 2023, '2', 3, '1', 'A'),
  ('S1234567891', 'Priya Mehta',   'प्रिया मेहता', '1234567891@tcetmumbai.in', '9876543211', '$2a$10$IcC05JtqAyjNNbor5ABsTu5Y65aFDXNCsRTSoY0t/iB61zMR6C48q', '45 FC Road, Pune 411004',    2, 2, 'CBCGS-HME 2023', 'Female', 'obc',  'student', false, '222222222222', 2022, '3', 5, '2', 'B'),
  ('S1234567892', 'Amit Kulkarni', 'अमित कुलकर्णी', '1234567892@tcetmumbai.in', '9876543212', '$2a$10$IcC05JtqAyjNNbor5ABsTu5Y65aFDXNCsRTSoY0t/iB61zMR6C48q', '7 Baner Road, Pune 411045',  7, 7, 'CBCGS-HME 2023', 'Male',   'open', 'student', false, '333333333333', 2021, '4', 7, '3', 'A');

-- Employees (password = "password123")
INSERT INTO employee (id, name, employee_id, department_id, role, active, email, password_hash) VALUES
  (1, 'Dr. Sandip Kumar', 'E9876543210', 1, 'head',        true, '9876543210@tcetmumbai.in', '$2a$10$IcC05JtqAyjNNbor5ABsTu5Y65aFDXNCsRTSoY0t/iB61zMR6C48q'),
  (2, 'Mrs. Alka Sen',     'E9876543211', 2, 'admin',       true, '9876543211@tcetmumbai.in', '$2a$10$IcC05JtqAyjNNbor5ABsTu5Y65aFDXNCsRTSoY0t/iB61zMR6C48q'),
  (3, 'Dr. Rajesh Patil',  'E9876543212', 7, 'coordinator', true, '9876543212@tcetmumbai.in', '$2a$10$IcC05JtqAyjNNbor5ABsTu5Y65aFDXNCsRTSoY0t/iB61zMR6C48q');

-- Allowed Coordinate Programs for Coordinator (Employee ID 3: Dr. Rajesh Patil)
INSERT INTO allowed_coordinate_programs_exam (employee_id, program_id) VALUES
  (3, 7), -- B.Tech - AI & DS
  (3, 1); -- B.E. - Computer Engineering

-- Subjects
INSERT INTO subject (subject_code, subject_name, department_id, ise, ie, ese, or_pr, tw, theory_credit, orprtw_credit, total_credit, scheme_detail) VALUES
('HSMC-301', 'Universal Human Values-II', 1, 20, 20, 60, 25, 25, 2, 1, 3, 'CBCGS-HME 2023'),
  ('BSC-COMP-301', 'Mathematics-III', 1, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('ESC-COMP-301', 'Digital Logic Design & Computer Architecture', 1, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-COMP-302', 'Database Management System', 1, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-COMP-303', 'Data Structure using JAVA', 1, 20, 20, 60, 25, 25, 4, 1, 5, 'CBCGS-HME 2023'),
  ('HME-COMP-PS301',  'Professional Skills II (Generic Track/Industry Track/Core Track)', 1, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('HME-IP301',       'Industry Practice-I (Generic Track/Industry Track/Core Track)',  1, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('SI-COMP-301', 'Summer Internship', 1, 0, 0, 0, 25, 25, 0, 1, 0, 'CBCGS-HME 2023'),
  ('PCC-IT-301', 'Data Structures & Algorithms', 2, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-AI-301', 'Foundations of Artificial Intelligence', 7, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  -- Electronics & Telecommunication Engineering (B.E. Semester VII - CBCGS-HME 2023)
  ('PCC-ETC701', 'Mobile Communication Systems', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-ETC702', 'Cryptography', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PROJ-ETC701', 'Project – I', 3, 0, 0, 0, 25, 25, 1, 1, 2, 'CBCGS-HME 2023'),
  ('HME-ETCIC701', 'Industry Certification-I', 3, 0, 0, 0, 25, 50, 1, 1, 2, 'CBCGS-HME 2023'),
  ('PEC-ETC7011', 'Mixed Signal Design', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PEC-ETC7012', 'Embedded Application Design using ARDUNIO & Raspberry Pi', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PEC-ETC7013', 'Microwave Engineering and RF MEMs.', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PEC-ETC7014', 'Wireless Sensor Networks', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PEC-ETC7015', 'Big Data Analysis', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PEC-ETC7021', 'Biomedical Electronics', 3, 20, 20, 60, 25, 25, 2, 1, 3, 'CBCGS-HME 2023'),
  ('PEC-ETC7022', 'Machine Learning', 3, 20, 20, 60, 25, 25, 2, 1, 3, 'CBCGS-HME 2023'),
  ('PEC-ETC7023', 'Electromagnetic interference and compatibility', 3, 20, 20, 60, 25, 25, 2, 1, 3, 'CBCGS-HME 2023'),
  ('PEC-ETC7024', 'Error Correcting Codes', 3, 20, 20, 60, 25, 25, 2, 1, 3, 'CBCGS-HME 2023'),
  ('PEC-ETC7025', 'Blockchain Technologies', 3, 20, 20, 60, 25, 25, 2, 1, 3, 'CBCGS-HME 2023'),
  -- Electronics & Telecommunication Engineering & ESH (T.E. Semester V - CBCGS-HME 2023)
  ('HSMC-501', 'Soft Skill & Interpersonal Communication', 15, 20, 20, 60, 0, 0, 3, 0, 3, 'CBCGS-HME 2023'),
  ('ESC-ETC501', 'Data Structures', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-ETC501', 'Discrete Time Signal Processing', 3, 20, 20, 60, 0, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-ETC502', 'Analog & Digital Communication', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('PCC-ETC503', 'Microcontrollers & Applications', 3, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('HME-ETCPS501',    'Professional Skills IV (Generic Track/Industry Track/Core Track)', 3, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('HME-IP501',       'Industry Practice-III (Generic Track/Industry Track/Core Track)', 3, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('HME-PBL501', 'Project Based Learning', 3, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('SI-ETC501', 'Summer Internship', 3, 0, 0, 0, 0, 0, 0, 0, 0, 'CBCGS-HME 2023'),
  ('MC-501', 'Indian Constitution/NCC', 15, 0, 0, 0, 0, 25, 0, 1, 0, 'CBCGS-HME 2023'),
  -- First Year Engineering Sciences & Humanities (Semester I - CBCGS-HME 2023)
  ('BSC1101', 'Physics', 15, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('BSC1102', 'Mathematics-I', 15, 20, 20, 60, 0, 25, 4, 1, 5, 'CBCGS-HME 2023'),
  ('ESC1101', 'Basic Electrical Engineering', 15, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('ESC1102', 'Engineering Graphics & Design', 15, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('ESC1103', 'Workshop & Manufacturing Practices-I', 15, 0, 0, 0, 25, 0, 0, 1, 1, 'CBCGS-HME 2023'),
  ('HSMC1101', 'English for General & Professional Communication', 15, 20, 20, 60, 25, 0, 2, 1, 3, 'CBCGS-HME 2023'),
  ('MC1101', 'Attitude & Aptitude Development 1 / NCC', 15, 0, 0, 0, 0, 25, 0, 1, 0, 'CBCGS-HME 2023'),
  -- First Year Engineering Sciences & Humanities (Semester II - CBCGS-HME 2023)
  ('BSC2101', 'Chemistry', 15, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('BSC2102', 'Mathematics-II', 15, 20, 20, 60, 0, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('ESC2101', 'Programming for Problem-Solving', 15, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('ESC2102', 'Engineering Mechanics', 15, 20, 20, 60, 25, 25, 3, 1, 4, 'CBCGS-HME 2023'),
  ('ESC2103', 'Workshop & Manufacturing Practices-II', 15, 0, 0, 0, 25, 0, 0, 1, 1, 'CBCGS-HME 2023'),
  ('HSMC2101', 'Introduction to Indian Knowledge System', 15, 20, 20, 60, 25, 0, 2, 1, 3, 'CBCGS-HME 2023'),
  ('HME-PS2101',      'Professional Skills I (Object Oriented Programming)',            15, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('SI2101', 'Summer Internship', 15, 0, 0, 0, 25, 25, 0, 1, 1, 'CBCGS-HME 2023'),
  ('MC2101', 'Attitude & Aptitude Development 2 / NCC', 15, 0, 0, 0, 0, 25, 0, 1, 0, 'CBCGS-HME 2023');

-- Exams
INSERT INTO exam (exam_code, exam_name, from_date, deadline_date, late_deadline1, late_deadline2, form_fees, late_fees1, late_fees2, exam_type, created_by) VALUES
  ('COMP-SEM3-REG',  'University Examination (Regular) – Nov/Dec 2026', '2026-08-01', '2026-08-20', '2026-08-25', '2026-08-30', 1500, 100, 500, 'regular', 'admin'),
  ('COMP-SEM3-ATKT', 'AT/KT Examination (ATKT) – September 2026',       '2026-08-01', '2026-08-02', '2026-08-10', '2026-08-15', 1000, 100, 500, 'ATKT',    'admin');

