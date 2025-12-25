'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReportsClientPage } from './reports-client-page';
import { Employee, WorkLog } from '@/lib/data-client';
import { Skeleton } from '@/components/ui/skeleton';


export default function ReportsPage() {
  const db = useFirestore();
  const [allLogs, setAllLogs] = useState<WorkLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return; // Wait for db to be available

    // We can set loading true here, but it will only show if data fetching takes time
    // setLoading(true); 

    const logsQuery = query(collection(db, 'worklogs'), orderBy('date', 'desc'));
    const employeesQuery = query(collection(db, 'employees'), orderBy('name', 'asc'));

    let unsubLogs: () => void;
    let unsubEmployees: () => void;

    let employeesLoaded = false;
    let logsLoaded = false;

    const checkLoadingDone = () => {
        if (employeesLoaded && logsLoaded) {
            setLoading(false);
        }
    }

    unsubLogs = onSnapshot(logsQuery, (snapshot) => {
        const logsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                checkInTime: data.checkInTime?.toDate().toISOString() ?? null,
                checkOutTime: data.checkOutTime?.toDate().toISOString() ?? null,
            } as WorkLog;
        });
        setAllLogs(logsData);
        logsLoaded = true;
        checkLoadingDone();
    }, (error) => {
        console.error("Error fetching logs:", error);
        logsLoaded = true;
        checkLoadingDone();
    });

    unsubEmployees = onSnapshot(employeesQuery, (snapshot) => {
        const employeesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(employeesData);
        employeesLoaded = true;
        checkLoadingDone();
    }, (error) => {
        console.error("Error fetching employees:", error);
        employeesLoaded = true;
        checkLoadingDone();
    });


    return () => {
        if (unsubLogs) unsubLogs();
        if (unsubEmployees) unsubEmployees();
    };
}, [db]);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">HR Reports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>
            Select a date range and report type, then print the generated report to PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full sm:w-[300px]" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : (
                <ReportsClientPage allLogs={allLogs} employees={employees} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
