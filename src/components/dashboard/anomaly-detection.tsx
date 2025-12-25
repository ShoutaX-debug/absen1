'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal, BotMessageSquare } from 'lucide-react';
import { runAnomalyDetection } from '@/app/actions';
import type { Employee, WorkLog } from '@/lib/data-client';

type AnomalyResult = {
  anomalyDetected: boolean;
  anomalyDescription: string;
} | { error: string };

export function AnomalyDetection({ employees, allWorkLogs }: { employees: Employee[], allWorkLogs: WorkLog[] }) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnomalyResult | null>(null);

  const employeeWorkLogs = useMemo(() => {
    if (!selectedEmployee) return [];
    return allWorkLogs
      .filter(log => log.employeeId === selectedEmployee)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30); // Get last 30 logs for analysis
  }, [allWorkLogs, selectedEmployee]);

  const handleDetection = async () => {
    if (!selectedEmployee) return;
    setIsLoading(true);
    setResult(null);
    const res = await runAnomalyDetection(selectedEmployee, employeeWorkLogs);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BotMessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>AI Attendance Anomaly Detection</CardTitle>
            <CardDescription>
              Use AI to flag unusual attendance patterns for an employee.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="flex-1" id="employee-select">
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleDetection}
            disabled={!selectedEmployee || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Analyze
          </Button>
        </div>
        {result && (
          <Alert
            variant={
              'error' in result || result.anomalyDetected ? 'destructive' : 'default'
            }
          >
            <Terminal className="h-4 w-4" />
            <AlertTitle>
              {'error' in result
                ? 'Error'
                : result.anomalyDetected
                ? 'Anomaly Detected!'
                : 'No Anomaly Detected'}
            </AlertTitle>
            <AlertDescription>
              {'error' in result ? result.error : result.anomalyDescription}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
