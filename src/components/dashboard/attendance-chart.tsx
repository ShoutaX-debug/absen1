'use client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { ChartDataPoint } from '@/lib/data';

const chartConfig = {
  'On-Time': {
    label: 'On-Time',
    color: 'hsl(var(--chart-2))',
  },
  Late: {
    label: 'Late',
    color: 'hsl(var(--accent))',
  },
  Absent: {
    label: 'Absent',
    color: 'hsl(var(--destructive))',
  },
  'On-Leave': {
    label: 'On-Leave',
    color: 'hsl(var(--secondary-foreground))'
  }
} satisfies ChartConfig;

export function AttendanceChart({ weeklyChartData }: { weeklyChartData: ChartDataPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Attendance</CardTitle>
        <CardDescription>
          Overview of employee attendance for the last 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyChartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--card))' }}
                content={<ChartTooltipContent />}
              />
              <Legend content={<ChartLegendContent />} />
              <Bar
                dataKey="On-Time"
                stackId="a"
                fill="var(--color-On-Time)"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey="Late" stackId="a" fill="var(--color-Late)" />
              <Bar dataKey="Absent" stackId="a" fill="var(--color-Absent)" />
              <Bar dataKey="On-Leave" stackId="a" fill="var(--color-On-Leave)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
