

'use client';

import { useState, useEffect, useTransition } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firebase';
import type { OfficeSettings } from '@/lib/data-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormButton } from '@/components/form-button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Clock } from 'lucide-react';
import { revalidateDashboard } from '@/app/actions';

const LOCATION_DOC_ID = 'main_office';

const defaultOfficeSettings: OfficeSettings = {
    id: LOCATION_DOC_ID,
    latitude: -6.930917, 
    longitude: 107.534083,
    radius: 50,
    work_start: '08:00',
    work_end: '17:00',
    late_tolerance: 15,
};


function SettingsSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="border rounded-lg">
                <div className="p-6">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="p-6 border-t">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
            </div>
        </div>
    )
}


export default function SettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Partial<OfficeSettings>>(defaultOfficeSettings);

  useEffect(() => {
    if (!db) return;
    const fetchSettings = async () => {
        setLoading(true);
        const docRef = doc(db, 'settings', LOCATION_DOC_ID);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings(docSnap.data() as OfficeSettings);
            } else {
                await setDoc(docRef, defaultOfficeSettings);
                setSettings(defaultOfficeSettings);
            }
        } catch (error: any) {
            console.error("Error fetching settings, using defaults", error);
            setSettings(defaultOfficeSettings); // Fallback to default on error
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch settings. Using default values.'});
        } finally {
            setLoading(false);
        }
    };
    fetchSettings();
  }, [db, toast]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db) return;

    const formData = new FormData(event.currentTarget);
    const lat = parseFloat(formData.get('latitude') as string);
    const lon = parseFloat(formData.get('longitude') as string);
    const rad = parseInt(formData.get('radius') as string, 10);
    const work_start = formData.get('work_start') as string;
    const work_end = formData.get('work_end') as string;
    const late_tolerance = parseInt(formData.get('late_tolerance') as string, 10);

    if (isNaN(lat) || isNaN(lon) || isNaN(rad) || isNaN(late_tolerance)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter valid numbers for location and tolerance fields.' });
        return;
    }
    
    if (!work_start || !work_end) {
        toast({ variant: 'destructive', title: 'Error', description: 'Work start and end times are required.' });
        return;
    }

    if (work_start >= work_end) {
        toast({ variant: 'destructive', title: 'Error', description: 'Jam masuk harus sebelum jam pulang.' });
        return;
    }
    
    startTransition(async () => {
        try {
            const docRef = doc(db, 'settings', LOCATION_DOC_ID);
            const newSettingsData: OfficeSettings = { 
                id: LOCATION_DOC_ID, 
                latitude: lat, 
                longitude: lon, 
                radius: rad,
                work_start,
                work_end,
                late_tolerance
            };
            await setDoc(docRef, newSettingsData, { merge: true });
            setSettings(newSettingsData);
            await revalidateDashboard(true);
            toast({ title: 'Success', description: 'Pengaturan berhasil disimpan.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };
  
  if (loading) {
      return <SettingsSkeleton />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Pengaturan Aplikasi</h1>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lokasi Kantor</CardTitle>
            <CardDescription>
              Atur koordinat GPS dan radius yang diizinkan untuk absensi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Cara Mendapatkan Koordinat</AlertTitle>
                <AlertDescription>
                    Anda bisa mendapatkan Latitude dan Longitude dari Google Maps. Cukup klik kanan pada lokasi kantor Anda di peta dan salin koordinatnya.
                </AlertDescription>
            </Alert>
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input id="latitude" name="latitude" type="number" step="any" required defaultValue={settings.latitude} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input id="longitude" name="longitude" type="number" step="any" required defaultValue={settings.longitude} />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (dalam meter)</Label>
              <Input id="radius" name="radius" type="number" required defaultValue={settings.radius} />
              <p className="text-xs text-muted-foreground">Jarak toleransi dari titik lokasi kantor. Contoh: 50</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Jam Kerja</CardTitle>
            <CardDescription>
              Atur jam kerja global yang berlaku untuk semua karyawan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <Alert variant="info">
                <Clock className="h-4 w-4" />
                <AlertTitle>Format Waktu</AlertTitle>
                <AlertDescription>
                    Gunakan format 24-jam (HH:mm), contohnya: 08:00 untuk jam 8 pagi atau 17:00 untuk jam 5 sore.
                </AlertDescription>
            </Alert>
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="work_start">Jam Masuk</Label>
                    <Input id="work_start" name="work_start" type="time" required defaultValue={settings.work_start} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="work_end">Jam Pulang</Label>
                    <Input id="work_end" name="work_end" type="time" required defaultValue={settings.work_end} />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="late_tolerance">Toleransi Keterlambatan (menit)</Label>
              <Input id="late_tolerance" name="late_tolerance" type="number" required defaultValue={settings.late_tolerance} />
              <p className="text-xs text-muted-foreground">Contoh: 15. Jika jam masuk 08:00, karyawan dianggap terlambat setelah 08:15.</p>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end">
            <FormButton type="submit" disabled={isPending} className="w-full md:w-auto">
              {isPending ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
            </FormButton>
        </div>
      </form>
    </div>
  );
}
