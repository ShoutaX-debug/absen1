'use server';

/**
 * @fileOverview An attendance anomaly detection AI agent.
 *
 * - detectAttendanceAnomaly - A function that detects anomalies in employee attendance.
 * - DetectAttendanceAnomalyInput - The input type for the detectAttendanceAnomaly function.
 * - DetectAttendanceAnomalyOutput - The return type for the detectAttendanceAnomaly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectAttendanceAnomalyInputSchema = z.object({
  employeeId: z.string().describe('The ID of the employee to analyze.'),
  attendanceRecords: z
    .array(
      z.object({
        timestamp: z.string().describe('The timestamp of the attendance record (ISO format).'),
        status: z.enum(['On-Time', 'Late', 'Absent', 'On-Leave', 'Sick']).describe('The attendance status.'),
      })
    )
    .describe('An array of attendance records for the employee.'),
});
export type DetectAttendanceAnomalyInput = z.infer<typeof DetectAttendanceAnomalyInputSchema>;

const DetectAttendanceAnomalyOutputSchema = z.object({
  anomalyDetected: z.boolean().describe('Whether an anomaly was detected in the attendance records.'),
  anomalyDescription: z
    .string()
    .describe('A description of the detected anomaly, if any. Otherwise, null.'),
});
export type DetectAttendanceAnomalyOutput = z.infer<typeof DetectAttendanceAnomalyOutputSchema>;

export async function detectAttendanceAnomaly(
  input: DetectAttendanceAnomalyInput
): Promise<DetectAttendanceAnomalyOutput> {
  return detectAttendanceAnomalyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectAttendanceAnomalyPrompt',
  input: {schema: DetectAttendanceAnomalyInputSchema},
  output: {schema: DetectAttendanceAnomalyOutputSchema},
  prompt: `You are an AI assistant that analyzes employee attendance records to detect anomalies.

  You are given the attendance records for an employee. Your task is to identify any unusual patterns or anomalies in their attendance.

  Anomalies can include, but are not limited to:
  - Sudden changes in attendance frequency (e.g., a previously consistent employee suddenly becoming frequently absent).
  - Unusual late arrivals (e.g., an employee who is usually on time suddenly starting to arrive late frequently).
  - Any other patterns that deviate significantly from the employee's historical attendance behavior.

  Based on your analysis, determine if an anomaly is detected and provide a description of the anomaly if one is found.

  Employee ID: {{{employeeId}}}
  Attendance Records:
  {{#each attendanceRecords}}
  - Timestamp: {{{timestamp}}}, Status: {{{status}}}
  {{/each}}`,
});

const detectAttendanceAnomalyFlow = ai.defineFlow(
  {
    name: 'detectAttendanceAnomalyFlow',
    inputSchema: DetectAttendanceAnomalyInputSchema,
    outputSchema: DetectAttendanceAnomalyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
