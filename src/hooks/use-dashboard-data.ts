'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase'; // Corrected import
import { format, subDays } from 'date-fns';
import { processDashboardData } from '@/lib/data';
import type { Employee, WorkLog, DashboardSummary, ChartDataPoint } from '@/lib/data-client';

interface ProcessedData {
  summary: DashboardSummary;
  recentLogs: WorkLog[];
  pendingLeaveRequests: WorkLog[];
  weeklyChartData: ChartDataPoint[];
  employeeMap: Map<string, Employee>;
}

// The full data object returned by the hook
interface DashboardData extends ProcessedData {
  employees: Employee[];
  allWorkLogs: WorkLog[];
}

export function useDashboardData() {
  const db = useFirestore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(true);
      return;
    }

    let active = true; // Flag to prevent state updates on unmounted component
    
    const employeesQuery = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsubEmployees = onSnapshot(employeesQuery, (snapshot) => {
      if (!active) return;
      const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Employee);
      setEmployees(emps);
    }, (err) => {
      if (!active) return;
      console.error("Error fetching employees:", err);
      setError(err);
      setLoading(false);
    });

    // Fetches all logs. Filtering should happen in processing or where needed.
    const workLogsQuery = query(collection(db, 'worklogs'), orderBy('date', 'desc'));
    const unsubWorkLogs = onSnapshot(workLogsQuery, (snapshot) => {
      if (!active) return;
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          checkInTime: data.checkInTime?.toDate().toISOString() ?? null,
          checkOutTime: data.checkOutTime?.toDate().toISOString() ?? null,
        } as WorkLog;
      });
      setWorkLogs(logs);
      setLoading(false); // Consider loading done once logs are in
    }, (err) => {
      if (!active) return;
      console.error("Error fetching work logs:", err);
      setError(err);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubEmployees();
      unsubWorkLogs();
    };
  }, [db]);

  const processedData = useMemo<ProcessedData | null>(() => {
    // Prevent processing until both employees and logs are loaded.
    if (loading || employees.length === 0) return null;
    
    // We get ALL worklogs now, so we need to filter them for the last 7 days for processing
    const sevenDaysAgo = subDays(new Date(), 6);
    const recentWorkLogs = workLogs.filter(log => new Date(log.date) >= sevenDaysAgo);

    return processDashboardData(employees, recentWorkLogs);
  }, [employees, workLogs, loading]);

  const dashboardData: DashboardData | null = processedData ? {
      ...processedData,
      employees,
      allWorkLogs: workLogs // Provide all logs for other components like reports
  } : null;

  return { data: dashboardData, loading, error };
}
