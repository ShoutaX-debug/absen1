
'use client';

import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import type { Employee, OfficeSettings } from '@/lib/data-client';
import { CheckInClientPage } from '@/app/check-in/check-in-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


function CheckInPageSkeleton() {
    return (
        <div className="flex justify-center items-start pt-4 sm:pt-10">
            <Card className="w-full max-w-md animate-pulse">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="text-center py-8">
                        <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
                        <Skeleton className="h-4 w-40 mx-auto" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// This default is only used if Firestore fetch fails catastrophically.
const defaultOfficeSettings: OfficeSettings = {
  id: 'main_office',
  latitude: -6.9309,
  longitude: 107.5342,
  radius: 50,
  work_start: '08:00',
  work_end: '17:00',
  late_tolerance: 15,
};


export default function Home() {
  const db = useFirestore();
  
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'employees'), orderBy('name', 'asc'));
  }, [db]);

  const officeSettingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, 'settings', 'main_office');
  }, [db]);

  const { data: employees, isLoading: employeesLoading, error: employeesError } = useCollection<Employee>(employeesQuery);
  const { data: officeSettingsData, isLoading: settingsLoading, error: settingsError } = useDoc<OfficeSettings>(officeSettingsRef);
  
  // Use the fetched data from Firestore if it exists, otherwise fall back to the correct default.
  const officeSettings = officeSettingsData ?? defaultOfficeSettings;

  const isLoading = employeesLoading || settingsLoading;

  if (isLoading) {
    return <CheckInPageSkeleton />;
  }
  
  if (employeesError) {
    return (
        <div className="flex items-center justify-center h-screen p-4">
            <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error: Gagal Memuat Data Karyawan</AlertTitle>
                <AlertDescription>
                   Tidak dapat mengambil data karyawan dari database. Pastikan aturan keamanan Firestore memperbolehkan akses baca ke koleksi 'employees'.
                   <pre className="mt-2 text-xs bg-gray-800 text-white p-2 rounded-md whitespace-pre-wrap">{employeesError.message}</pre>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  if (settingsError) {
      console.warn("Could not fetch office location settings, using default. Error:", settingsError.message);
  }

  return (
    <main className="flex flex-col items-center p-4">
       {settingsError && (
            <Alert variant="warning" className="max-w-md w-full mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Peringatan: Gagal Memuat Pengaturan Kantor</AlertTitle>
                <AlertDescription>
                   Tidak dapat mengambil pengaturan lokasi & jam kerja dari admin. Aplikasi akan menggunakan pengaturan default. Harap hubungi admin jika masalah berlanjut.
                </AlertDescription>
            </Alert>
       )}
       <CheckInClientPage employees={employees || []} officeSettings={officeSettings} />
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <LogIn className="mr-2 h-4 w-4" />
              Admin Login
            </Button>
          </Link>
        </footer>
    </main>
  );
}
