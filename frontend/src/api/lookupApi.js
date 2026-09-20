import axios from 'axios';

/**
 * Central Lookup Service for Departments and Programs.
 * Fetches department and program lists directly from DB tables (single source of truth).
 */

export const getDepartmentsApi = async () => {
  const { data } = await axios.get('/api/programs/departments');
  return data;
};

export const getProgramsApi = async (departmentId = null) => {
  const params = {};
  if (departmentId) {
    params.department_id = departmentId;
  }
  const { data } = await axios.get('/api/programs', { params });
  return data;
};
