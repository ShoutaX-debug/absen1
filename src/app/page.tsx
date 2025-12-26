
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
        <div className="flex justify-center items-start pt-4 sm:pt-10 animate-fade-in">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/50 backdrop-blur-sm">
                <CardHeader className="animate-pulse">
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <Skeleton className="h-16 w-16 rounded-2xl" />
                        <div className="space-y-2 text-center w-full flex flex-col items-center">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8 animate-pulse delay-100">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-32 mx-auto" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                    <div className="text-center py-8 space-y-4">
                        <Skeleton className="h-12 w-12 mx-auto rounded-full" />
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
    <main className="flex flex-col items-center p-4 min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
       {settingsError && (
            <Alert variant="warning" className="max-w-md w-full mb-4 animate-slide-in-up">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Peringatan: Gagal Memuat Pengaturan Kantor</AlertTitle>
                <AlertDescription>
                   Tidak dapat mengambil pengaturan lokasi & jam kerja dari admin. Aplikasi akan menggunakan pengaturan default. Harap hubungi admin jika masalah berlanjut.
                </AlertDescription>
            </Alert>
       )}
       <CheckInClientPage employees={employees || []} officeSettings={officeSettings} />
        <footer className="mt-8 text-center text-sm text-muted-foreground flex flex-col gap-2 animate-fade-in duration-1000 delay-500">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-colors">
              <LogIn className="mr-2 h-4 w-4" />
              Admin Login
            </Button>
          </Link>
          <div className="text-[10px] opacity-50 hover:opacity-100 transition-opacity cursor-default">
            System v2.3 (Verified) - {new Date().toISOString()}
          </div>
        </footer>
    </main>
  );
}
