-- Phase 4: Admit Card & Form Code Schema Migration

-- 1. Add form_code column to exam_form if not exists
ALTER TABLE exam_form ADD COLUMN IF NOT EXISTS form_code VARCHAR(20) UNIQUE;

-- 2. Create admit_card table
CREATE TABLE IF NOT EXISTS admit_card (
  id SERIAL PRIMARY KEY,
  admit_card_number VARCHAR(20) NOT NULL,
  student_id INT REFERENCES student(id) ON DELETE CASCADE,
  abc_id VARCHAR(12),
  exam_id INT REFERENCES exam(exam_id) ON DELETE CASCADE,
  form_id INT REFERENCES exam_form(form_id) ON DELETE CASCADE,
  approved_by INT REFERENCES employee(id) ON DELETE SET NULL,
  version INT DEFAULT 1,
  generated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(form_id, version)
);

CREATE INDEX IF NOT EXISTS idx_admit_card_form_version ON admit_card(form_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_admit_card_student ON admit_card(student_id);
CREATE INDEX IF NOT EXISTS idx_admit_card_exam ON admit_card(exam_id);
