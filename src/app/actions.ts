
'use server';

import { revalidatePath } from 'next/cache';
import { detectAttendanceAnomaly } from '@/ai/flows/attendance-anomaly-detection';
import type { WorkLog } from '@/lib/data-client';

// --- AI ANOMALY DETECTION ---

export async function runAnomalyDetection(employeeId: string, workLogHistory: WorkLog[]) {
  if (!employeeId) return { error: 'Please select an employee.' };
  try {
    if (workLogHistory.length < 5) {
      return {
        anomalyDetected: false,
        anomalyDescription: 'Not enough data for analysis (requires at least 5 work logs).',
      };
    }
    
    const attendanceRecords = workLogHistory.map(log => ({
        timestamp: log.date,
        status: log.status
    }));

    const result = await detectAttendanceAnomaly({ employeeId, attendanceRecords });
    return result;
  } catch (e: any) {
    console.error('Anomaly detection failed:', e);
    return { error: `An unexpected error occurred: ${e.message}` };
  }
}

// --- REVALIDATION ACTIONS ---

// This function can be called from the client after a data mutation to revalidate server-rendered pages if needed.
export async function revalidateDashboard(revalidateMainPage: boolean = false) {
    revalidatePath('/dashboard');
    revalidatePath('/employees');
    revalidatePath('/reports');
    revalidatePath('/settings');
    if (revalidateMainPage) {
        revalidatePath('/');
    }
}
