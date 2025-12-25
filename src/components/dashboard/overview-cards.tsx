import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Users, Clock, AlertTriangle, UserX, Briefcase, Hourglass } from 'lucide-react';
import type { DashboardSummary } from '@/lib/data';

interface OverviewCardsProps {
  summary: DashboardSummary;
}

// This component is now much simpler. It just receives and displays the pre-calculated summary.
export function OverviewCards({ summary }: OverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {/* Card 1: Total Employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalEmployees ?? 0}</div>
          <p className="text-xs text-muted-foreground">Total registered</p>
        </CardContent>
      </Card>

      {/* Card 2: On Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">On Time Today</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.onTime ?? 0}</div>
          <p className="text-xs text-muted-foreground">({summary.onTimePercentage ?? 0}%)</p>
        </CardContent>
      </Card>

      {/* Card 3: Late */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Late Today</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.late ?? 0}</div>
          <p className="text-xs text-muted-foreground">({summary.latePercentage ?? 0}%)</p>
        </CardContent>
      </Card>

      {/* Card 4: Absent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.absent ?? 0}</div>
          <p className="text-xs text-muted-foreground">({summary.absentPercentage ?? 0}%)</p>
        </CardContent>
      </Card>
      
      {/* Card 5: Total Work Hours */}
      <Card className="bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalWorkHoursToday.toFixed(2)}h</div>
          <p className="text-xs text-muted-foreground">Total hours worked</p>
        </CardContent>
      </Card>

      {/* Card 6: Total Overtime Hours */}
      <Card className="bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overtime Today</CardTitle>
          <Hourglass className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalOvertimeHoursToday.toFixed(2)}h</div>
          <p className="text-xs text-muted-foreground">Total overtime hours</p>
        </CardContent>
      </Card>

    </div>
  );
}
