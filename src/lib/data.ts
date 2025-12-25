import { format, subDays, eachDayOfInterval } from 'date-fns';
import type { Employee, WorkLog, DashboardSummary, ChartDataPoint } from './data-client';
export type { Employee, WorkLog, DashboardSummary, ChartDataPoint };

// This file centralizes data processing logic to be used across the app,
// making components and hooks lighter.

export function processDashboardData(employees: Employee[], workLogs: WorkLog[]) {
  if (employees.length === 0) {
    // Return a default or empty state if there are no employees
    return {
      summary: {
        totalEmployees: 0, onTime: 0, late: 0, onLeave: 0, absent: 0,
        onTimePercentage: 0, latePercentage: 0, absentPercentage: 0,
        totalWorkHoursToday: 0, totalOvertimeHoursToday: 0,
      },
      recentLogs: [],
      pendingLeaveRequests: [],
      weeklyChartData: [],
      employeeMap: new Map<string, Employee>(),
    };
  }

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const totalEmployees = employees.length;
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  const todaysLogs = workLogs.filter(log => log.date === todayStr);

  let onTime = 0, late = 0, onLeave = 0, totalWorkHoursToday = 0, totalOvertimeHoursToday = 0;

  const presentEmployeeIds = new Set<string>();

  todaysLogs.forEach(log => {
    if (log.status === 'On-Time') {
      onTime++;
      presentEmployeeIds.add(log.employeeId);
    }
    if (log.status === 'Late') {
      late++;
      presentEmployeeIds.add(log.employeeId);
    }
    if ((log.status === 'On-Leave' || log.status === 'Sick') && log.leaveApprovalStatus === 'approved') {
      onLeave++;
      presentEmployeeIds.add(log.employeeId);
    }
    if (log.durationHours > 0) {
      totalWorkHoursToday += log.durationHours;
      if (log.durationHours > 8) totalOvertimeHoursToday += (log.durationHours - 8);
    }
  });

  const absent = totalEmployees - presentEmployeeIds.size;
  const presentToday = onTime + late;

  const calculatePercentage = (value: number, total: number) => total === 0 ? 0 : Math.round((value / total) * 100);

  const summary: DashboardSummary = {
    totalEmployees, onTime, late, onLeave, absent: Math.max(0, absent),
    onTimePercentage: calculatePercentage(onTime, presentToday),
    latePercentage: calculatePercentage(late, presentToday),
    absentPercentage: calculatePercentage(Math.max(0, absent), totalEmployees),
    totalWorkHoursToday: parseFloat(totalWorkHoursToday.toFixed(2)),
    totalOvertimeHoursToday: parseFloat(totalOvertimeHoursToday.toFixed(2)),
  };

  const dateInterval = eachDayOfInterval({ start: subDays(today, 6), end: today });
  const weeklyChartData = dateInterval.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const logsForDay = workLogs.filter(log => log.date === dayStr);
    const dayStats: ChartDataPoint = { day: format(day, 'E'), 'On-Time': 0, Late: 0, 'On-Leave': 0, Absent: 0 };

    const presentEmployeesOnDay = new Set<string>();

    logsForDay.forEach(log => {
      if (log.status === 'On-Time') {
        dayStats['On-Time']++;
        presentEmployeesOnDay.add(log.employeeId);
      }
      else if (log.status === 'Late') {
        dayStats.Late++;
        presentEmployeesOnDay.add(log.employeeId);
      }
      else if ((log.status === 'On-Leave' || log.status === 'Sick') && log.leaveApprovalStatus === 'approved') {
        dayStats['On-Leave']++;
        presentEmployeesOnDay.add(log.employeeId);
      }
    });

    dayStats.Absent = totalEmployees - presentEmployeesOnDay.size;

    return dayStats;
  });

  const recentLogs = workLogs
    .sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime())
    .slice(0, 5);

  const pendingLeaveRequests = workLogs.filter(log => log.leaveApprovalStatus === 'pending');

  return { summary, recentLogs, pendingLeaveRequests, weeklyChartData, employeeMap };
}
