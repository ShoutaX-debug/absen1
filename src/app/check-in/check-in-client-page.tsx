'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import * as imageCompression from 'browser-image-compression';
import {
    addDoc,
    collection,
    serverTimestamp,
    doc,
    updateDoc,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useAuth, errorEmitter, FirestorePermissionError } from '@/firebase';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info, Loader2, ArrowLeft, UserCheck, LocateFixed, Download, CalendarCheck, Clock, Check, ShieldCheck, MapPin, Camera } from 'lucide-react';
import { EmployeeSelect } from '@/components/employee-select';
import { CameraCapture } from '@/components/camera-capture';
import { FormButton } from '@/components/form-button';
import type { WorkLog, Employee, OfficeSettings } from '@/lib/data-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { revalidateDashboard } from '@/app/actions';
import { format, parse } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// --- TYPES ---
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

type LocationState =
    | { status: 'idle' }
    | { status: 'loading', message: string }
    | { status: 'success', coords: GeolocationCoordinates }
    | { status: 'error', message: string };

type LeaveType = 'Sick' | 'On-Leave';

// --- HELPERS ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
}

async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function ClientOnlyTime({ dateString }: { dateString: string | null }) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);
    if (!dateString) return <>--:--</>;
    return <>{isClient ? new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</>;
}

function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="flex flex-col items-center justify-center p-4">
             <div className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-muted-foreground font-medium">
                {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---
export function CheckInClientPage({ employees, officeSettings }: { employees: Employee[], officeSettings: OfficeSettings }) {
    const db = useFirestore();
    const auth = useAuth();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [todaysLog, setTodaysLog] = useState<WorkLog | null>(null);
    const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
    const [distance, setDistance] = useState<number | null>(null);
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

    const [leaveType, setLeaveType] = useState<LeaveType>('On-Leave');
    const [leaveNote, setLeaveNote] = useState('');
    const [showCamera, setShowCamera] = useState(false);

    const [isTransitioning, startTransition] = useTransition();
    const [isActionPending, setIsActionPending] = useState(false);
    const { toast } = useToast();

    const isWorkHoursValid = officeSettings.work_start && officeSettings.work_end;

    // Ensure user is signed in anonymously to allow Storage uploads and Firestore updates
    useEffect(() => {
        if (auth && !auth.currentUser) {
            signInAnonymously(auth)
                .catch(err => console.error(`Anonymous auth failed: ${err.message}`));
        }
    }, [auth]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const fetchTodaysLog = useCallback(async (employeeId: string) => {
        if (!db || !employeeId) return;
        setIsActionPending(true);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const logsQuery = query(
            collection(db, 'worklogs'),
            where('employeeId', '==', employeeId),
            where('date', '==', todayStr)
        );
        try {
            const querySnapshot = await getDocs(logsQuery);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();
                setTodaysLog({
                    id: doc.id,
                    ...data,
                    checkInTime: data.checkInTime?.toDate().toISOString() ?? null,
                    checkOutTime: data.checkOutTime?.toDate().toISOString() ?? null,
                } as WorkLog);
            } else {
                setTodaysLog(null);
            }
        } catch (error) {
            console.error("Error fetching today's log:", error);
            toast({ variant: 'destructive', title: 'Error', description: "Failed to fetch today's log." });
            setTodaysLog(null);
        } finally {
            setIsActionPending(false);
        }
    }, [db, toast]);

    useEffect(() => {
        if (selectedEmployeeId) {
            fetchTodaysLog(selectedEmployeeId);
        } else {
            setTodaysLog(null);
        }
    }, [selectedEmployeeId, fetchTodaysLog]);


    const handleInstallClick = async () => {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            toast({ title: 'Success', description: 'Aplikasi telah berhasil di-install!' });
        }
        setInstallPromptEvent(null);
    };

    const handleGetLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationState({ status: 'error', message: 'Geolocation is not supported by your browser.' });
            return;
        }
        if (!officeSettings) {
            setLocationState({ status: 'error', message: 'Pengaturan lokasi kantor tidak ditemukan. Hubungi Admin.' });
            return;
        }
        setLocationState({ status: 'loading', message: 'Mendapatkan lokasi Anda...' });

        // Try with high accuracy first
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const officeLat = officeSettings.latitude;
                const officeLng = officeSettings.longitude;
                const radius = officeSettings.radius;

                const calculatedDistance = getDistance(userLat, userLng, officeLat, officeLng);
                setDistance(calculatedDistance);
                setLocationState({ status: 'success', coords: position.coords });
            },
            (error) => {
                // Fallback: try again with lower accuracy if timeout
                console.log('High accuracy failed, trying with lower accuracy...', error);
                setLocationState({ status: 'loading', message: 'Mencoba dengan akurasi lebih rendah...' });

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        const officeLat = officeSettings.latitude;
                        const officeLng = officeSettings.longitude;
                        const radius = officeSettings.radius;

                        const calculatedDistance = getDistance(userLat, userLng, officeLat, officeLng);
                        setDistance(calculatedDistance);
                        setLocationState({ status: 'success', coords: position.coords });
                    },
                    (fallbackError) => {
                        setLocationState({
                            status: 'error',
                            message: `Gagal mendapatkan lokasi: ${fallbackError.message}. Pastikan GPS aktif dan izin lokasi diberikan.`
                        });
                    },
                    { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
                );
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
    }, [officeSettings]);

    // --- HELPERS ---

    // async function uploadToFirebase(file: File): Promise<string> { ... } // REMOVED: Using Base64 instead

    const handleSubmitAttendance = async (photoFile: File) => {
        if (!db || !selectedEmployeeId || locationState.status !== 'success') {
             return;
        }

        setIsActionPending(true);

        let photoUrl = '';

        try {
            // Convert to Base64 directly - No Firebase Storage needed
            photoUrl = await fileToDataUrl(photoFile);
        } catch (uploadError: any) {
            console.error(`Image conversion failed: ${uploadError.message}`);
            toast({
                variant: 'destructive',
                title: 'Processing Error',
                description: `Gagal memproses foto: ${uploadError.message || 'Unknown error'}.`
            });
            setIsActionPending(false);
            return;
        }


        if (todaysLog && todaysLog.id && !todaysLog.checkOutTime) { // CHECK-OUT
            const logRef = doc(db, 'worklogs', todaysLog.id);
            const checkOutTime = new Date();

            if (!todaysLog.checkInTime) {
                toast({ variant: 'destructive', title: 'Error', description: 'Cannot check-out without a valid check-in time.' });
                setIsActionPending(false);
                setShowCamera(false);
                return;
            }
            const checkInTime = new Date(todaysLog.checkInTime);

            const durationMs = checkOutTime.getTime() - checkInTime.getTime();
            const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

            const updateData = {
                checkOutTime: Timestamp.fromDate(checkOutTime),
                checkOutPhotoUrl: photoUrl,
                checkOutLatitude: locationState.coords.latitude,
                checkOutLongitude: locationState.coords.longitude,
                durationHours: durationHours,
            };

            try {
                await updateDoc(logRef, updateData);
                toast({ title: "Check-out berhasil!", description: "Anda telah berhasil check-out." });
                await revalidateDashboard(true);
                handleEmployeeChange('');
            } catch (serverError: any) {
                console.error(`Check-out failed: ${serverError.message} (${serverError.code})`);
                const permissionError = new FirestorePermissionError({ path: `worklogs/${todaysLog.id}`, operation: 'update', requestResourceData: { id: todaysLog.id } });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Check Out Error', description: "Could not update your work log. Please try again." });
            }
        } else if (!todaysLog) { // CHECK-IN
            if (!isWorkHoursValid) {
                return; // Guard against missing settings
            }

            const now = new Date();
            const workStartTime = parse(officeSettings.work_start!, 'HH:mm', new Date());
            const lateTime = new Date(workStartTime.getTime() + (officeSettings.late_tolerance || 0) * 60000);

            const status = now <= lateTime ? 'On-Time' : 'Late';

            const newLog = {
                employeeId: selectedEmployeeId,
                date: now.toISOString().split('T')[0],
                status,
                checkInTime: serverTimestamp(),
                checkInPhotoUrl: photoUrl,
                checkInLatitude: locationState.coords.latitude,
                checkInLongitude: locationState.coords.longitude,
                checkOutTime: null, durationHours: 0, leaveApprovalStatus: 'n/a',
            };

            addDoc(collection(db, 'worklogs'), newLog)
                .then(async () => {
                    toast({ title: "Check-in berhasil!", description: `Status Anda: ${status}.` });
                    await revalidateDashboard(true);
                    await fetchTodaysLog(selectedEmployeeId);
                })
                .catch((serverError) => {
                    console.error(`Check-in failed: ${serverError.message} (${serverError.code})`);
                    const permissionError = new FirestorePermissionError({ path: 'worklogs', operation: 'create', requestResourceData: newLog });
                    errorEmitter.emit('permission-error', permissionError);
                    toast({ variant: 'destructive', title: 'Check In Error', description: "Anda mungkin sudah check-in hari ini, atau terjadi kesalahan izin." });
                });
        }

        setIsActionPending(false);
        setShowCamera(false);
    };

    const handleRequestLeave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!db || !selectedEmployeeId || !leaveNote) return;
        setIsActionPending(true);
        const newLog = {
            employeeId: selectedEmployeeId,
            date: new Date().toISOString().split('T')[0],
            status: leaveType,
            leaveNote: leaveNote,
            leaveApprovalStatus: 'pending',
            checkInTime: null,
            checkOutTime: null,
            durationHours: 0,
        };

        addDoc(collection(db, 'worklogs'), newLog)
            .then(async () => {
                toast({ title: "Request Sent", description: "Your leave request is pending approval." });
                await revalidateDashboard(true);
                await fetchTodaysLog(selectedEmployeeId);
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({ path: 'worklogs', operation: 'create', requestResourceData: newLog });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Request Error', description: "You may have already submitted a request today, or there was a permission error." });
            })
            .finally(() => {
                setIsActionPending(false);
            });
    }

    const handleCapture = async (photoBlob: Blob) => {
        const options = { maxSizeMB: 0.1, maxWidthOrHeight: 600, useWebWorker: false };
        try {
            const compressedBlob = await (imageCompression as any).default(photoBlob, options);
            const photoFile = new File([compressedBlob], "capture.jpg", { type: "image/jpeg" });
            await handleSubmitAttendance(photoFile);
        } catch (error: any) {
            console.error("Image compression or capture handling failed", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not process image.' });
        }
    };

    const handleEmployeeChange = (id: string) => {
        setSelectedEmployeeId(id);
        setLocationState({ status: 'idle' });
        setDistance(null);
        setShowCamera(false);
        setLeaveNote('');
        setTodaysLog(null);
    }

    const isProcessing = isTransitioning || isActionPending;

    if (showCamera) {
        return (
            <div className="min-h-screen w-full flex justify-center items-start pt-4 sm:pt-10 bg-gradient-to-b from-blue-50/50 to-white dark:from-gray-950 dark:to-gray-900 p-4">
                <div className="w-full max-w-md space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setShowCamera(false)} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
                    </Button>
                    <Card className="border-0 shadow-xl overflow-hidden">
                         <CardHeader className="pb-2 bg-muted/30">
                            <CardTitle className="text-center text-lg">Ambil Foto</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <CameraCapture onCapture={handleCapture} isProcessing={isActionPending} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const renderLeaveScreen = () => {
        if (!todaysLog) return null;

        let variant: 'info' | 'destructive' | 'success' = 'info';
        if (todaysLog.leaveApprovalStatus === 'approved') variant = 'success';
        if (todaysLog.leaveApprovalStatus === 'rejected') variant = 'destructive';

        return (
            <div className="text-center py-8 text-muted-foreground space-y-3">
                <CalendarCheck className="h-10 w-10 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Pengajuan Izin/Sakit Ditemukan</p>
                <p className="text-sm">
                    Status: <Badge variant={variant} className="capitalize">{todaysLog.leaveApprovalStatus}</Badge>
                </p>
                {todaysLog.leaveNote && <p className="text-sm italic border-l-2 pl-2 text-left ml-4">Catatan: "{todaysLog.leaveNote}"</p>}
                <p className="text-xs pt-4">Anda sudah mengajukan izin untuk hari ini. Tidak ada aksi lebih lanjut yang diperlukan.</p>
            </div>
        )
    };

    const renderAttendanceCompleteScreen = () => {
        if (!todaysLog) return null;
        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                    <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="font-bold text-xl text-foreground">Absensi Lengkap</h3>
                    <p className="text-muted-foreground">Terima kasih atas kerja keras Anda hari ini!</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-6">
                    <div className="bg-muted/50 p-4 rounded-xl text-center">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Masuk</p>
                        <p className="font-bold text-lg"><ClientOnlyTime dateString={todaysLog.checkInTime} /></p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-xl text-center">
                         <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Pulang</p>
                         <p className="font-bold text-lg"><ClientOnlyTime dateString={todaysLog.checkOutTime} /></p>
                    </div>
                </div>
            </div>
        )
    };


    const renderCheckOutScreen = () => {
        if (!todaysLog) return null;

        const now = new Date();
        const workEndTime = isWorkHoursValid ? parse(officeSettings.work_end!, 'HH:mm', now) : null;
        const canCheckOut = workEndTime ? now >= workEndTime : true;

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900 text-center shadow-sm">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Waktu Masuk</p>
                    <p className="text-3xl font-bold text-foreground"><ClientOnlyTime dateString={todaysLog.checkInTime} /></p>
                </div>

                {workEndTime && now < workEndTime && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex gap-3 text-left">
                         <div className="bg-yellow-100 dark:bg-yellow-800 p-2 rounded-full h-fit">
                            <Clock className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm">Belum Waktunya Pulang</p>
                            <p className="text-xs text-yellow-700/80 dark:text-yellow-500/80 mt-1">
                                Jam kerja berakhir pukul {officeSettings.work_end}.
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {locationState.status === 'idle' && (
                        <Button onClick={handleGetLocation} size="lg" className="w-full h-12 text-base shadow-md transition-all hover:scale-[1.02]">
                            <LocateFixed className="mr-2 h-5 w-5" /> Dapatkan Lokasi & Check Out
                        </Button>
                    )}

                    {locationState.status === 'loading' && (
                        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg animate-pulse">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <span className="text-sm text-muted-foreground">{locationState.message}</span>
                        </div>
                    )}

                    {locationState.status === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Gagal Mendapatkan Lokasi</AlertTitle>
                            <AlertDescription>{locationState.message}</AlertDescription>
                            <Button variant="link" size="sm" onClick={handleGetLocation} className="p-0 h-auto mt-2">Coba Lagi</Button>
                        </Alert>
                    )}

                    {locationState.status === 'success' && (
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-center gap-3">
                                <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                                    <MapPin className="h-5 w-5 text-green-700 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-medium text-green-800 dark:text-green-400 text-sm">Lokasi Terverifikasi</p>
                                    <p className="text-xs text-green-700/80 dark:text-green-500/80">Siap untuk check-out.</p>
                                </div>
                            </div>
                            <Button onClick={() => setShowCamera(true)} variant="default" size="lg" className="w-full h-12 text-base shadow-md transition-all hover:scale-[1.02]">
                                <Camera className="mr-2 h-5 w-5" /> Ambil Foto Pulang
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        )
    };

    const renderCheckInScreen = () => {
        if (!isWorkHoursValid) {
            return (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Absensi Ditutup</AlertTitle>
                    <AlertDescription>Admin belum mengatur jam kerja. Silakan hubungi admin untuk mengaktifkan sistem absensi.</AlertDescription>
                </Alert>
            );
        }

        const now = new Date();
        const workStartTime = parse(officeSettings.work_start!, 'HH:mm', new Date());
        const workEndTime = parse(officeSettings.work_end!, 'HH:mm', new Date());

        if (now > workEndTime) {
            return (
                <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Waktu Kerja Telah Berakhir</AlertTitle>
                    <AlertDescription>Jam kerja untuk hari ini telah selesai. Anda tidak dapat melakukan check-in.</AlertDescription>
                </Alert>
            );
        }

        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                    {locationState.status === 'idle' && (
                        <Button onClick={handleGetLocation} size="lg" className="w-full h-12 text-base shadow-md transition-all hover:scale-[1.02]">
                            <LocateFixed className="mr-2 h-5 w-5" /> Dapatkan Lokasi & Check In
                        </Button>
                    )}

                    {locationState.status === 'loading' && (
                        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg animate-pulse">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <span className="text-sm text-muted-foreground">{locationState.message}</span>
                        </div>
                    )}

                    {locationState.status === 'error' && (
                         <Alert variant="destructive" className="animate-in shake">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error Lokasi</AlertTitle>
                            <AlertDescription>{locationState.message}</AlertDescription>
                            <Button variant="link" size="sm" onClick={handleGetLocation} className="p-0 h-auto mt-2">Coba Lagi</Button>
                        </Alert>
                    )}

                    {locationState.status === 'success' && officeSettings && distance !== null && (
                        <div className="space-y-4">
                            {distance <= officeSettings.radius ? (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg flex gap-3">
                                     <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full h-fit">
                                        <MapPin className="h-5 w-5 text-green-700 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-green-800 dark:text-green-400 text-sm">Dalam Jangkauan</p>
                                        <p className="text-xs text-green-700/80 dark:text-green-500/80 mt-1">
                                            Jarak: {distance.toFixed(0)} meter. (Max: {officeSettings.radius}m)
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex gap-3">
                                    <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full h-fit">
                                        <AlertCircle className="h-5 w-5 text-red-700 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-red-800 dark:text-red-400 text-sm">Di Luar Jangkauan</p>
                                        <p className="text-xs text-red-700/80 dark:text-red-500/80 mt-1">
                                            Jarak: <b>{distance.toFixed(0)}m</b>. Anda harus berada dalam radius <b>{officeSettings.radius}m</b> dari kantor.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={() => setShowCamera(true)}
                                disabled={distance > officeSettings.radius}
                                size="lg"
                                className="w-full h-12 text-base shadow-md transition-all hover:scale-[1.02]"
                            >
                                <Camera className="mr-2 h-5 w-5" /> Lanjut Ambil Foto
                            </Button>
                        </div>
                    )}
                </div>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Atau Ajukan Izin</span></div>
                </div>

                <form onSubmit={handleRequestLeave} className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipe Izin</Label>
                        <Select name="leaveType" value={leaveType} onValueChange={(v: LeaveType) => setLeaveType(v)}>
                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="On-Leave">Izin (On-Leave)</SelectItem>
                                <SelectItem value="Sick">Sakit (Sick)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="note">Alasan</Label>
                        <Textarea id="note" name="note" className="bg-background resize-none" placeholder="Contoh: Ada urusan keluarga mendesak..." required value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} />
                    </div>
                    <FormButton type="submit" className="w-full" variant="secondary" disabled={isProcessing || locationState.status === 'loading'}>
                        Kirim Pengajuan
                    </FormButton>
                </form>
            </div>
        );
    };

    const renderContent = () => {
        if (!selectedEmployeeId) {
            return <div className="text-center py-8 text-muted-foreground"><Info className="h-6 w-6 mx-auto mb-2" /><p>Silakan pilih nama Anda untuk memulai.</p></div>;
        }
        // Fix for lint error: access message safely
        const hasLocationMessage = 'message' in locationState && locationState.message;
        if (isProcessing && !hasLocationMessage) {
            return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2">Memeriksa data...</span></div>;
        }

        if (todaysLog) {
            if (todaysLog.status === 'On-Leave' || todaysLog.status === 'Sick') {
                return renderLeaveScreen();
            } else if (todaysLog.checkInTime && todaysLog.checkOutTime) {
                return renderAttendanceCompleteScreen();
            } else if (todaysLog.checkInTime && !todaysLog.checkOutTime) {
                return renderCheckOutScreen();
            }
        }

        return renderCheckInScreen();
    }


    return (
        <div className="min-h-screen w-full flex justify-center items-start pt-4 sm:pt-10 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
            <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden ring-1 ring-gray-900/5 dark:ring-white/10">
                <CardHeader className="pb-2 bg-gradient-to-b from-white to-transparent dark:from-gray-800/50">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="p-3 bg-primary/10 rounded-2xl mb-1">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Portal Kehadiran</CardTitle>
                            <CardDescription>Silakan isi data kehadiran Anda.</CardDescription>
                        </div>
                    </div>
                    <LiveClock />
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="employee" className="text-xs font-semibold uppercase text-muted-foreground ml-1">Nama Karyawan</Label>
                        <EmployeeSelect employees={employees} onSelect={handleEmployeeChange} disabled={isProcessing || locationState.status === 'loading'} value={selectedEmployeeId} />
                    </div>
                    {renderContent()}
                    <div className="text-center pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/30">
                        v2.2 UI Remaster
                    </div>
                </CardContent>
                {installPromptEvent && (
                    <CardFooter>
                        <Button onClick={handleInstallClick} variant="install" className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Install Aplikasi
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
