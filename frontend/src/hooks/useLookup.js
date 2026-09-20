import { useState, useEffect } from 'react';
import { getDepartmentsApi, getProgramsApi } from '../api/lookupApi';

/**
 * Reusable React Hook for fetching Departments and Programs from DB tables.
 * 
 * Usage:
 *   const { departments, programs, loading, error } = useLookup(departmentId);
 */
export function useLookup(departmentId = null) {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLookupData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [deptData, progData] = await Promise.all([
          getDepartmentsApi(),
          getProgramsApi(departmentId)
        ]);

        if (isMounted) {
          setDepartments(deptData || []);
          setPrograms(progData || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load lookup data (departments/programs):', err);
          setError(err.message || 'Failed to load lookup options');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLookupData();

    return () => {
      isMounted = false;
    };
  }, [departmentId]);

  return { departments, programs, loading, error };
}

/**
 * Hook specifically for fetching departments
 */
export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDepts = async () => {
      try {
        const data = await getDepartmentsApi();
        if (isMounted) setDepartments(data || []);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDepts();
    return () => { isMounted = false; };
  }, []);

  return { departments, loading, error };
}

/**
 * Hook specifically for fetching programs (optionally by departmentId)
 */
export function usePrograms(departmentId = null) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProgs = async () => {
      try {
        const data = await getProgramsApi(departmentId);
        if (isMounted) setPrograms(data || []);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProgs();
    return () => { isMounted = false; };
  }, [departmentId]);

  return { programs, loading, error };
}
