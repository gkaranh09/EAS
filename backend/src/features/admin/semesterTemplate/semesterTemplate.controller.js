const service = require('./semesterTemplate.service');

const isEmployee = (user) => !!(user?.is_faculty || user?.is_employee);

const getTemplates = async (req, res) => {
  try {
    const { program_id, semester } = req.query;
    const templates = await service.getTemplates(program_id, semester);
    res.json(templates);
  } catch (err) {
    if (err.message.includes('required')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Get templates error:', err);
    res.status(500).json({ message: 'Server error retrieving templates' });
  }
};

const getTemplateDetail = async (req, res) => {
  try {
    const template = await service.getTemplateDetail(req.params.id);
    res.json(template);
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('Get template detail error:', err);
    res.status(500).json({ message: 'Server error retrieving template' });
  }
};

const createTemplate = async (req, res) => {
  if (!isEmployee(req.user)) {
    return res.status(403).json({ message: 'Access denied: Employees only.' });
  }
  try {
    const template = await service.createTemplate(req.body, req.user.id);
    res.status(201).json({ message: 'Template created successfully', template });
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('must have') || err.message.includes('do not exist')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A template with this name already exists for the given program and semester.' });
    }
    console.error('Create template error:', err);
    res.status(500).json({ message: 'Server error creating template' });
  }
};

const updateTemplate = async (req, res) => {
  if (!isEmployee(req.user)) {
    return res.status(403).json({ message: 'Access denied: Employees only.' });
  }
  try {
    const template = await service.updateTemplate(req.params.id, req.body);
    res.json({ message: 'Template updated successfully', template });
  } catch (err) {
    if (err.message.includes('required') || err.message.includes('must have') || err.message.includes('do not exist')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === 'Template not found') {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A template with this name already exists for the given program and semester.' });
    }
    console.error('Update template error:', err);
    res.status(500).json({ message: 'Server error updating template' });
  }
};

const deleteTemplate = async (req, res) => {
  if (!isEmployee(req.user)) {
    return res.status(403).json({ message: 'Access denied: Employees only.' });
  }
  try {
    await service.deleteTemplate(req.params.id);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    if (err.message === 'Template not found') {
      return res.status(404).json({ message: err.message });
    }
    console.error('Delete template error:', err);
    res.status(500).json({ message: 'Server error deleting template' });
  }
};

module.exports = {
  getTemplates,
  getTemplateDetail,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
