// This file defines the data structures used on the client-side.
// It ensures type consistency for data fetched from Firestore.

export type AttendanceStatus = 'On-Time' | 'Late' | 'On-Leave' | 'Sick' | 'Absent';
export type LeaveApprovalStatus = 'pending' | 'approved' | 'rejected' | 'n/a';

export interface Avatar {
  imageUrl: string;
  filePath: string; 
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  position?: string;
  avatar?: Avatar;
}

export interface WorkLog {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime: string | null; 
  checkInPhotoUrl: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutTime: string | null; 
  checkOutPhotoUrl: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  durationHours: number;
  leaveNote: string | null;
  leaveApprovalStatus: LeaveApprovalStatus;
  correctionNote?: string | null;
}

export interface OfficeSettings {
    id: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
    work_start?: string; // HH:mm format
    work_end?: string; // HH:mm format
    late_tolerance?: number; // in minutes
}

export interface ChartDataPoint {
  day: string;
  'On-Time': number;
  Late: number;
  Absent: number;
  'On-Leave': number;
}


export interface DashboardSummary {
  totalEmployees: number;
  onTime: number;
  late: number;
  onLeave: number;
  absent: number;
  onTimePercentage: number;
  latePercentage: number;
  absentPercentage: number;
  totalWorkHoursToday: number;
  totalOvertimeHoursToday: number;
}

// Ensure Employee entity is defined for use in other parts of the app.
export type { Employee as EmployeeEntity } from './data-client';
