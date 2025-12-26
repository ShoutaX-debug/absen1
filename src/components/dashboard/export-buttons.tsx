'use client';

import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { WorkLog, Employee } from '@/lib/data-client';
import { format } from 'date-fns';

interface ExportButtonsProps {
  logs: WorkLog[];
  employees: Employee[];
}

export function ExportButtons({ logs, employees }: ExportButtonsProps) {
  const employeeMap = new Map(employees.map(e => [e.id, e.name]));

  const formatData = () => {
    return logs.map(log => {
      const empName = employeeMap.get(log.employeeId) || 'Unknown';
      return {
        'Date': log.date,
        'Employee': empName,
        'Status': log.status,
        'Check In': log.checkInTime ? format(new Date(log.checkInTime), 'HH:mm:ss') : '-',
        'Check Out': log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm:ss') : '-',
        'Duration (Hrs)': log.durationHours || 0,
        'Late?': log.status === 'Late' ? 'Yes' : 'No',
        'Leave Note': log.leaveNote || '-'
      };
    });
  };

  const handleExportExcel = () => {
    const data = formatData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleWhatsAppShare = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaysLogs = logs.filter(l => l.date === today);

    let message = `*Laporan Absensi ${today}*\n\n`;

    // Group by status
    const present = todaysLogs.filter(l => l.checkInTime).length;
    const late = todaysLogs.filter(l => l.status === 'Late').length;
    const leave = todaysLogs.filter(l => l.status === 'On-Leave' || l.status === 'Sick').length;

    message += `Total Hadir: ${present}\n`;
    message += `Terlambat: ${late}\n`;
    message += `Izin/Sakit: ${leave}\n\n`;

    message += `*Detail Terlambat:*\n`;
    todaysLogs.filter(l => l.status === 'Late').forEach(l => {
        const name = employeeMap.get(l.employeeId) || 'Unknown';
        const time = l.checkInTime ? format(new Date(l.checkInTime), 'HH:mm') : '?';
        message += `- ${name} (${time})\n`;
    });

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}>
        <Download className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsAppShare}>
        <Share2 className="mr-2 h-4 w-4" />
        Share WA
      </Button>
    </div>
  );
}
