'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/lib/data-client";

export interface EmployeeOption {
  value: string;
  label: string;
}

interface EmployeeSelectProps {
  employees: Employee[];
  onSelect: (employeeId: string) => void;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
}

export function EmployeeSelect({ employees, onSelect, defaultValue, value, disabled }: EmployeeSelectProps) {
  const employeeOptions: EmployeeOption[] = employees.map(emp => ({
    value: emp.id,
    label: emp.name,
  }));

  return (
    <Select onValueChange={onSelect} defaultValue={defaultValue} value={value} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an employee..." />
      </SelectTrigger>
      <SelectContent>
        {employeeOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
