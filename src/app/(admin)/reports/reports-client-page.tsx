'use client';

import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, Printer, Building } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Employee, WorkLog } from '@/lib/data-client';
import { Badge } from '@/components/ui/badge';

interface ReportsClientPageProps {
  allLogs: WorkLog[];
  employees: Employee[];
}


export function ReportsClientPage({ allLogs, employees }: ReportsClientPageProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState('attendance_recap');
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const filteredLogs = useMemo(() => {
    if (!date?.from) return [];
    const toDate = date.to || date.from; 
    const endOfDayToDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
    
    return allLogs.filter(log => {
      const logDate = new Date(log.date);
      return isWithinInterval(logDate, { start: date.from!, end: endOfDayToDate });
    });
  }, [allLogs, date]);

  const attendanceRecap = useMemo(() => {
    const recap: { [key: string]: { present: number; late: number; leave: number; absent: number } } = {};
    employees.forEach(emp => {
      recap[emp.id] = { present: 0, late: 0, leave: 0, absent: 0 };
    });
    filteredLogs.forEach(log => {
      if (!recap[log.employeeId]) return;
      if (log.status === 'On-Time') recap[log.employeeId].present++;
      else if (log.status === 'Late') recap[log.employeeId].late++;
      else if ((log.status === 'On-Leave' || log.status === 'Sick') && log.leaveApprovalStatus === 'approved') recap[log.employeeId].leave++;
      else if (log.status === 'Absent' || ((log.status === 'On-Leave' || log.status === 'Sick') && log.leaveApprovalStatus === 'rejected')) recap[log.employeeId].absent++;
    });
    return Object.entries(recap).map(([employeeId, data]) => ({ employeeId, ...data }));
  }, [filteredLogs, employees]);

  const latenessReport = useMemo(() => {
    return filteredLogs.filter(log => log.status === 'Late');
  }, [filteredLogs]);

  const workHoursReport = useMemo(() => {
    const report: { [key: string]: { totalHours: number; overtime: number } } = {};
     employees.forEach(emp => {
      report[emp.id] = { totalHours: 0, overtime: 0 };
    });
    filteredLogs.forEach(log => {
       if (!report[log.employeeId] || !log.durationHours) return;
      report[log.employeeId].totalHours += log.durationHours;
      if (log.durationHours > 8) {
        report[log.employeeId].overtime += (log.durationHours - 8);
      }
    });
    return Object.entries(report).map(([employeeId, data]) => ({ 
        employeeId, 
        totalHours: parseFloat(data.totalHours.toFixed(2)),
        overtime: parseFloat(data.overtime.toFixed(2)) 
    }));
  }, [filteredLogs, employees]);

  const leaveReport = useMemo(() => {
    return filteredLogs.filter(log => (log.status === 'On-Leave' || log.status === 'Sick') && log.leaveApprovalStatus === 'approved');
  }, [filteredLogs]);

  const handlePrint = () => {
    window.print();
  };

  const ReportHeader = () => (
    <div className="hidden print:block mb-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <Building className="h-10 w-10 text-gray-800" />
                 <div>
                    <h2 className="text-2xl font-bold">GeoAttend</h2>
                    <p className="text-gray-500">Official Company Report</p>
                 </div>
            </div>
             <div>
                <p className="text-sm text-gray-600 font-semibold">{activeTab.replace(/_/g, ' ').toUpperCase()} REPORT</p>
                <p className="text-sm text-gray-500">
                   Period: {date?.from ? format(date.from, 'LLL dd, y') : ''} - {date?.to ? format(date.to, 'LLL dd, y') : ''}
                </p>
            </div>
        </div>
         <hr className="my-4"/>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className={cn('grid gap-2')}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal sm:w-[300px]',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y')} -{' '}
                      {format(date.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handlePrint} className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" />
          Print to PDF
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 print:hidden">
          <TabsTrigger value="attendance_recap">Attendance Recap</TabsTrigger>
          <TabsTrigger value="lateness">Lateness</TabsTrigger>
          <TabsTrigger value="work_hours">Work Hours</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
        </TabsList>
        <div>
            <TabsContent value="attendance_recap">
              <ReportTable title="Attendance Recap" description="Summary of employee attendance within the selected date range.">
                <ReportHeader />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-center">On-Time</TableHead>
                            <TableHead className="text-center">Late</TableHead>
                            <TableHead className="text-center">Leave</TableHead>
                            <TableHead className="text-center">Absent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendanceRecap.map(({ employeeId, present, late, leave, absent }) => {
                            const employee = employeeMap.get(employeeId);
                            return (
                                <TableRow key={employeeId}>
                                    <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                                    <TableCell className="text-center">{present}</TableCell>
                                    <TableCell className="text-center">{late}</TableCell>
                                    <TableCell className="text-center">{leave}</TableCell>
                                    <TableCell className="text-center">{absent}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
              </ReportTable>
            </TabsContent>

            <TabsContent value="lateness">
              <ReportTable title="Lateness Report" description="Detailed report of employees who were late.">
                 <ReportHeader />
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Date & Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {latenessReport.length > 0 ? latenessReport.map(log => {
                           const employee = employeeMap.get(log.employeeId);
                           return (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                                    <TableCell>
                                        <Badge variant="warning">
                                            {log.checkInTime ? format(new Date(log.checkInTime), 'EEE, LLL dd, y HH:mm') : 'N/A'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                           )
                       }) : <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-12">No lateness records found for this period.</TableCell></TableRow>}
                    </TableBody>
                </Table>
              </ReportTable>
            </TabsContent>

            <TabsContent value="work_hours">
              <ReportTable title="Work Hours Report" description="Summary of total work hours and overtime for each employee.">
                 <ReportHeader />
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>                            <TableHead className="text-right">Total Work Hours</TableHead>
                            <TableHead className="text-right">Total Overtime Hours</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workHoursReport.map(({ employeeId, totalHours, overtime }) => {
                            const employee = employeeMap.get(employeeId);
                            if (totalHours === 0 && overtime === 0) return null;
                            return (
                                <TableRow key={employeeId}>
                                    <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                                    <TableCell className="text-right font-mono">{totalHours.toFixed(2)}h</TableCell>
                                    <TableCell className="text-right font-mono">{overtime.toFixed(2)}h</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
              </ReportTable>
            </TabsContent>

            <TabsContent value="leave">
              <ReportTable title="Leave Report" description="Summary of approved leave (Sick or On-Leave) for all employees.">
                 <ReportHeader />
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Note</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaveReport.length > 0 ? leaveReport.map(log => {
                            const employee = employeeMap.get(log.employeeId);
                            return (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{employee?.name || 'Unknown'}</TableCell>
                                    <TableCell>{format(new Date(log.date), 'EEE, LLL dd, y')}</TableCell>
                                    <TableCell><Badge variant="info">{log.status}</Badge></TableCell>
                                    <TableCell className="italic">"{log.leaveNote}"</TableCell>
                                </TableRow>
                            )
                        }) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">No approved leave records found for this period.</TableCell></TableRow>}
                    </TableBody>
                </Table>
              </ReportTable>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

const ReportTable = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <Card className="print:border-none print:shadow-none">
        <CardHeader className="print:hidden">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);
