const repo = require('./semesterTemplate.repository');

const getTemplates = async (program_id, semester) => {
  if (!program_id || !semester) {
    throw new Error('program_id and semester are required');
  }
  return await repo.getTemplatesByProgramSemester(
    parseInt(program_id, 10),
    parseInt(semester, 10)
  );
};

const getTemplateDetail = async (template_id) => {
  if (!template_id) throw new Error('template_id is required');
  const template = await repo.getTemplateById(parseInt(template_id, 10));
  if (!template) throw new Error('Template not found');
  return template;
};

const createTemplate = async (data, created_by) => {
  const { program_id, semester, template_name, self_choice, is_default, groups } = data;

  if (!program_id || !semester || !template_name) {
    throw new Error('program_id, semester, and template_name are required');
  }
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error('At least one subject group is required');
  }

  // Validate each group has at least one subject_id
  for (let i = 0; i < groups.length; i++) {
    if (!Array.isArray(groups[i].subject_ids) || groups[i].subject_ids.length === 0) {
      throw new Error(`Group ${i + 1} must have at least one subject`);
    }
  }

  // Collect all unique subject_ids and validate they exist
  const allSubjectIds = [...new Set(groups.flatMap(g => g.subject_ids))];
  const allValid = await repo.validateSubjectIds(allSubjectIds);
  if (!allValid) {
    throw new Error('One or more subject IDs do not exist in the database');
  }

  const template_id = await repo.createTemplate(
    parseInt(program_id, 10),
    parseInt(semester, 10),
    template_name.trim(),
    !!self_choice,
    !!is_default,
    created_by,
    groups
  );

  return await repo.getTemplateById(template_id);
};

const updateTemplate = async (template_id, data) => {
  const { template_name, self_choice, is_default, groups } = data;

  if (!template_name) {
    throw new Error('template_name is required');
  }
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error('At least one subject group is required');
  }

  for (let i = 0; i < groups.length; i++) {
    if (!Array.isArray(groups[i].subject_ids) || groups[i].subject_ids.length === 0) {
      throw new Error(`Group ${i + 1} must have at least one subject`);
    }
  }

  const allSubjectIds = [...new Set(groups.flatMap(g => g.subject_ids))];
  const allValid = await repo.validateSubjectIds(allSubjectIds);
  if (!allValid) {
    throw new Error('One or more subject IDs do not exist in the database');
  }

  const result = await repo.updateTemplate(
    parseInt(template_id, 10),
    template_name.trim(),
    !!self_choice,
    !!is_default,
    groups
  );

  if (!result) throw new Error('Template not found');

  return await repo.getTemplateById(parseInt(template_id, 10));
};

const deleteTemplate = async (template_id) => {
  const result = await repo.deleteTemplate(parseInt(template_id, 10));
  if (!result) throw new Error('Template not found');
  return result;
};

module.exports = {
  getTemplates,
  getTemplateDetail,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
