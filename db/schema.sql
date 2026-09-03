-- ============================================================
--  EAS – Exam Application System  |  Database Schema
-- ============================================================

-- Drop tables if they already exist (for clean re-runs)
DROP TABLE IF EXISTS template_group_subject CASCADE;
DROP TABLE IF EXISTS template_subject_group CASCADE;
DROP TABLE IF EXISTS semester_template CASCADE;
DROP TABLE IF EXISTS exam_schedule CASCADE;
DROP TABLE IF EXISTS fillform_status CASCADE;
DROP TABLE IF EXISTS exam_subject CASCADE;
DROP TABLE IF EXISTS exam_form CASCADE;
DROP TABLE IF EXISTS exam CASCADE;
DROP TABLE IF EXISTS subject CASCADE;
DROP TABLE IF EXISTS allowed_coordinate_programs_exam CASCADE;
DROP TABLE IF EXISTS student CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS program CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS department CASCADE;

-- ---------------------------------------------------------------
-- 0. DEPARTMENT
-- ---------------------------------------------------------------
CREATE TABLE department (
  department_id   SERIAL PRIMARY KEY,
  department_code VARCHAR(50) UNIQUE NOT NULL,
  department_name VARCHAR(150) UNIQUE NOT NULL
);

-- ---------------------------------------------------------------
-- 0.5. PROGRAM
-- ---------------------------------------------------------------
CREATE TABLE program (
  program_id    SERIAL PRIMARY KEY,
  program_name  VARCHAR(150) UNIQUE NOT NULL,
  department_id INT REFERENCES department(department_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 1. STUDENT
-- ---------------------------------------------------------------
CREATE TABLE student (
  id                  SERIAL PRIMARY KEY,
  student_id          VARCHAR(50) UNIQUE NOT NULL,
  full_name           VARCHAR(200) NOT NULL,
  full_name_devnagari VARCHAR(200) DEFAULT 'नाम',
  email               VARCHAR(150) UNIQUE NOT NULL,
  contact_number      VARCHAR(20),
  password_hash       VARCHAR(255) NOT NULL,
  address             TEXT,
  department_id       INT REFERENCES department(department_id) ON DELETE SET NULL,
  program_id          INT REFERENCES program(program_id) ON DELETE SET NULL,
  course              VARCHAR(100) DEFAULT 'CBCGS-HME 2023',
  gender              VARCHAR(20),
  category            VARCHAR(50) DEFAULT 'open',
  student_type        VARCHAR(50) DEFAULT 'student',
  pwd                 BOOLEAN DEFAULT false,
  abc_id              VARCHAR(12) DEFAULT '000000000000',
  admission_year      INT,
  current_year        VARCHAR(50) DEFAULT 'SE',
  current_semester    INT DEFAULT 3,
  roll_no             VARCHAR(50),
  division            VARCHAR(10) DEFAULT 'A'
);

-- ---------------------------------------------------------------
-- 1.5. EMPLOYEE
-- ---------------------------------------------------------------
CREATE TABLE employee (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  employee_id   VARCHAR(50) UNIQUE NOT NULL,
  department_id INT REFERENCES department(department_id) ON DELETE SET NULL,
  role          VARCHAR(50) DEFAULT 'coordinator', -- 'head' | 'admin' | 'coordinator'
  active        BOOLEAN DEFAULT false,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 1.6. ALLOWED COORDINATE PROGRAMS EXAM
-- ---------------------------------------------------------------
CREATE TABLE allowed_coordinate_programs_exam (
  employee_id INT REFERENCES employee(id) ON DELETE CASCADE,
  program_id  INT REFERENCES program(program_id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, program_id)
);

-- ---------------------------------------------------------------
-- 2. SUBJECT
-- ---------------------------------------------------------------
CREATE TABLE subject (
  subject_id    SERIAL PRIMARY KEY,
  subject_code  VARCHAR(50) NOT NULL UNIQUE,
  subject_name  VARCHAR(200) NOT NULL,
  department_id INT REFERENCES department(department_id) ON DELETE CASCADE,
  theory        INT DEFAULT 0,
  or_pr         INT DEFAULT 0,
  term_work     INT DEFAULT 0,
  credit        INT DEFAULT 0,
  scheme_detail VARCHAR(150) DEFAULT 'CBCGS-HME 2023'
);

-- ---------------------------------------------------------------
-- 3. EXAM
-- ---------------------------------------------------------------
CREATE TABLE exam (
  exam_id       SERIAL PRIMARY KEY,
  exam_code     VARCHAR(50) NOT NULL UNIQUE,
  exam_name     VARCHAR(200) NOT NULL,
  from_date     DATE NOT NULL,
  deadline_date DATE NOT NULL,
  late_deadline DATE NOT NULL,
  form_fees     INT DEFAULT 0,
  late_fees     INT DEFAULT 500,
  exam_type     VARCHAR(50) NOT NULL,  -- 'regular' | 'ATKT'
  created_by    VARCHAR(100) DEFAULT 'admin',
  is_active     BOOLEAN DEFAULT true
);

-- ---------------------------------------------------------------
-- 4. EXAM FORM  (one per student per exam)
-- ---------------------------------------------------------------
CREATE TABLE exam_form (
  form_id             SERIAL PRIMARY KEY,
  exam_id             INT REFERENCES exam(exam_id)    ON DELETE CASCADE,
  student_id          INT REFERENCES student(id)      ON DELETE CASCADE,
  created_at          TIMESTAMP DEFAULT NOW(),
  is_approved         BOOLEAN DEFAULT false,
  admit_card_released BOOLEAN DEFAULT false,
  repeters            BOOLEAN DEFAULT false
);

-- ---------------------------------------------------------------
-- 5. EXAM SUBJECT  (which subjects the student selected)
-- ---------------------------------------------------------------
CREATE TABLE exam_subject (
  id          SERIAL PRIMARY KEY,
  form_id     INT REFERENCES exam_form(form_id)  ON DELETE CASCADE,
  subject_id  INT REFERENCES subject(subject_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 6. FILLFORM STATUS
-- ---------------------------------------------------------------
CREATE TABLE fillform_status (
  id                  SERIAL PRIMARY KEY,
  student_id          INT REFERENCES student(id)      ON DELETE CASCADE,
  form_id             INT REFERENCES exam_form(form_id) ON DELETE CASCADE,
  payment_status      VARCHAR(50)  DEFAULT 'pending',  -- 'pending' | 'paid'
  apply_completed     BOOLEAN      DEFAULT TRUE,
  applied_at          TIMESTAMP    DEFAULT NOW(),
  razorpay_payment_id VARCHAR(100),
  amount_paid         INT DEFAULT 1500
);

-- ---------------------------------------------------------------
-- 7. EXAM SCHEDULE
-- ---------------------------------------------------------------
CREATE TABLE exam_schedule (
  schedule_id   SERIAL PRIMARY KEY,
  exam_id       INT REFERENCES exam(exam_id)       ON DELETE CASCADE,
  subject_id    INT REFERENCES subject(subject_id) ON DELETE CASCADE,
  exam_date     DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  CONSTRAINT uq_exam_subject UNIQUE(exam_id, subject_id)
);

-- ---------------------------------------------------------------
-- 8. SEMESTER TEMPLATE  (one per "track" per semester per program)
-- ---------------------------------------------------------------
CREATE TABLE semester_template (
  template_id    SERIAL PRIMARY KEY,
  program_id     INT REFERENCES program(program_id) ON DELETE CASCADE,
  semester       INT NOT NULL,
  template_name  VARCHAR(200) NOT NULL,
  self_choice    BOOLEAN DEFAULT false,
  is_default     BOOLEAN DEFAULT false,
  created_by     INT REFERENCES employee(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(program_id, semester, template_name)
);

-- ---------------------------------------------------------------
-- 9. TEMPLATE SUBJECT GROUP  (each "slot" in a template)
-- ---------------------------------------------------------------
CREATE TABLE template_subject_group (
  group_id       SERIAL PRIMARY KEY,
  template_id    INT REFERENCES semester_template(template_id) ON DELETE CASCADE,
  group_label    VARCHAR(100),
  sort_order     INT DEFAULT 0
);

-- ---------------------------------------------------------------
-- 10. TEMPLATE GROUP SUBJECT  (subjects within each group)
-- ---------------------------------------------------------------
CREATE TABLE template_group_subject (
  id             SERIAL PRIMARY KEY,
  group_id       INT REFERENCES template_subject_group(group_id) ON DELETE CASCADE,
  subject_id     INT REFERENCES subject(subject_id) ON DELETE CASCADE,
  UNIQUE(group_id, subject_id)
);

