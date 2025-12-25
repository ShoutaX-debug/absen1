'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firebase';
import type { Employee } from '@/lib/data-client';
import EmployeeClientPage from './employee-client-page';
import { Skeleton } from '@/components/ui/skeleton';

function EmployeePageSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-36" />
            </div>
            <div className="border rounded-lg p-6">
                <div className="space-y-4">
                     <Skeleton className="h-6 w-48" />
                     <Skeleton className="h-4 w-72" />
                </div>
                <div className="mt-6 space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-8" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function EmployeesPage() {
  const db = useFirestore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
        // Firestore is not ready yet, wait for it.
        return;
    }

    setLoading(true);
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const emps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(emps);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching employees:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  if (loading) {
    return <EmployeePageSkeleton />;
  }

  return <EmployeeClientPage initialEmployees={employees} />;
}
