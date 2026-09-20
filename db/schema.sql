-- ============================================================
--  EAS – Exam Application System  |  Database Schema
-- ============================================================

-- Drop tables if they already exist (for clean re-runs)
DROP TABLE IF EXISTS student_hold_list CASCADE;
DROP TABLE IF EXISTS student_failed_records CASCADE;
DROP TABLE IF EXISTS exam_references CASCADE;
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
  abc_id              VARCHAR(12) UNIQUE NOT NULL,
  admission_year      INT,
  current_year        VARCHAR(50) DEFAULT '2',
  current_semester    INT DEFAULT 3,
  roll_no             VARCHAR(50),
  division            VARCHAR(10) DEFAULT 'A',
  profile_image       TEXT DEFAULT 'v1789934033/download.jpg'
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
  ise           INT DEFAULT 0,
  ie            INT DEFAULT 0,
  ese           INT DEFAULT 0,
  or_pr         INT DEFAULT 0,
  tw            INT DEFAULT 0,
  theory_credit INT DEFAULT 0,
  orprtw_credit INT DEFAULT 0,
  total_credit  INT DEFAULT 0,
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
  deadline_date  DATE NOT NULL,
  late_deadline1 DATE NOT NULL,
  late_deadline2 DATE NOT NULL,
  form_fees      INT DEFAULT 0,
  late_fees1     INT DEFAULT 100,
  late_fees2     INT DEFAULT 500,
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
  id              SERIAL PRIMARY KEY,
  form_id         INT REFERENCES exam_form(form_id) ON DELETE CASCADE,
  subject_id      INT REFERENCES subject(subject_id) ON DELETE CASCADE,
  attempt_ise     BOOLEAN DEFAULT false,
  attempt_theory  BOOLEAN DEFAULT false,
  attempt_or_pr   BOOLEAN DEFAULT false,
  attempt_tw      BOOLEAN DEFAULT false,
  attempt_ie      BOOLEAN DEFAULT false
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

-- ---------------------------------------------------------------
-- 11. EXAM REFERENCES (Supp/ATKT → source exams for eligibility)
-- ---------------------------------------------------------------
CREATE TABLE exam_references (
  id                 SERIAL PRIMARY KEY,
  exam_id            INT REFERENCES exam(exam_id) ON DELETE CASCADE,
  referenced_exam_id INT REFERENCES exam(exam_id) ON DELETE CASCADE,
  UNIQUE(exam_id, referenced_exam_id)
);

-- ---------------------------------------------------------------
-- 12. STUDENT FAILED RECORDS (eligibility list per source exam)
-- ---------------------------------------------------------------
CREATE TABLE student_failed_records (
  id         SERIAL PRIMARY KEY,
  exam_id    INT REFERENCES exam(exam_id) ON DELETE CASCADE,
  student_id INT REFERENCES student(id)   ON DELETE CASCADE,
  abc_id     VARCHAR(12),
  added_by   INT REFERENCES employee(id)  ON DELETE SET NULL,
  added_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- ---------------------------------------------------------------
-- 13. STUDENT HOLD LIST (Restricted students blocked from all exams)
-- ---------------------------------------------------------------
CREATE TABLE student_hold_list (
  id            SERIAL PRIMARY KEY,
  student_id    INT REFERENCES student(id) ON DELETE CASCADE,
  abc_id        VARCHAR(12),
  restricted    BOOLEAN DEFAULT true,
  remark        TEXT DEFAULT 'Others',
  added_by      INT REFERENCES employee(id) ON DELETE SET NULL,
  added_at      TIMESTAMP DEFAULT NOW(),
  last_updated  TIMESTAMP DEFAULT NOW(),
  updated_by    INT REFERENCES employee(id) ON DELETE SET NULL,
  UNIQUE(student_id)
);



