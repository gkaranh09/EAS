import React from 'react';
import { useDepartments, usePrograms } from '../../hooks/useLookup.js';

/**
 * Reusable Department Select Dropdown Component
 */
export function DepartmentSelect({ 
  value, 
  onChange, 
  name = 'department_id', 
  id = 'department_select',
  placeholder = 'Select Department',
  showCode = true,
  disabled = false,
  style = {},
  className = ''
}) {
  const { departments, loading } = useDepartments();

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      className={className}
      style={{
        width: '100%',
        padding: '0.65rem 0.85rem',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '0.88rem',
        background: (disabled || loading) ? '#f1f5f9' : '#ffffff',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      <option value="">{loading ? 'Loading departments...' : placeholder}</option>
      {departments.map(dept => (
        <option key={dept.department_id} value={dept.department_id}>
          {dept.department_name} {showCode && dept.department_code ? `(${dept.department_code})` : ''}
        </option>
      ))}
    </select>
  );
}

/**
 * Reusable Program Select Dropdown Component
 */
export function ProgramSelect({ 
  value, 
  onChange, 
  departmentId = null,
  name = 'program_id', 
  id = 'program_select',
  placeholder = 'Select Program',
  showCode = true,
  disabled = false,
  style = {},
  className = ''
}) {
  const { programs, loading } = usePrograms(departmentId);

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled || loading}
      className={className}
      style={{
        width: '100%',
        padding: '0.65rem 0.85rem',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '0.88rem',
        background: (disabled || loading) ? '#f1f5f9' : '#ffffff',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      <option value="">{loading ? 'Loading programs...' : placeholder}</option>
      {programs.map(prog => (
        <option key={prog.program_id} value={prog.program_id}>
          {prog.program_name} {showCode && prog.program_code ? `(${prog.program_code})` : ''}
        </option>
      ))}
    </select>
  );
}
