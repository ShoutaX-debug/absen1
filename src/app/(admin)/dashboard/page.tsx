'use client';

import { AnomalyDetection } from '@/components/dashboard/anomaly-detection';
import { AttendanceChart } from '@/components/dashboard/attendance-chart';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { RecentAttendance } from '@/components/dashboard/recent-attendance';
import { LeaveRequests } from '@/components/dashboard/leave-requests';
import { DeleteActivityButton } from '@/components/dashboard/delete-activity-button';
import { ExportButtons } from '@/components/dashboard/export-buttons';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-8 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
            <Skeleton className="h-[400px] w-full" />
        </div>
        <div>
            <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
       <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-full">
            <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Dashboard</AlertTitle>
                <AlertDescription>
                    There was a problem fetching the dashboard data. Please check the console for details and ensure Firestore is set up correctly.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  if (!data) {
    // This can happen briefly between loading and data being available.
    // Or if there's no data at all. A skeleton is a good fallback.
    return <DashboardSkeleton />;
  }
  
  const { summary, employees, allWorkLogs, recentLogs, pendingLeaveRequests, weeklyChartData, employeeMap } = data;

  return (
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Admin Dashboard</h1>
          <div className="flex gap-2">
             <ExportButtons logs={allWorkLogs} employees={employees} />
             <DeleteActivityButton />
          </div>
        </div>

        {pendingLeaveRequests.length > 0 && (
          <LeaveRequests pendingLogs={pendingLeaveRequests} employeeMap={employeeMap} />
        )}

        <OverviewCards summary={summary} />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>HR Reports</CardTitle>
              <CardDescription>
                Generate attendance recaps, lateness reports, and more in PDF format.
              </CardDescription>
            </div>
            <Link href="/reports">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Open Reports
              </Button>
            </Link>
          </CardHeader>
        </Card>


        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AttendanceChart weeklyChartData={weeklyChartData} />
          </div>
          <RecentAttendance recentWorkLogs={recentLogs} employeeMap={employeeMap} />
        </div>

        <AnomalyDetection employees={employees} allWorkLogs={allWorkLogs} />
      </div>
  );
}
