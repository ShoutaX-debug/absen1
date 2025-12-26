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
import { AlertCircle, CheckCircle, Info, Loader2, ArrowLeft, UserCheck, LocateFixed, Download, CalendarCheck, Clock } from 'lucide-react';
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
            console.log("Signing in anonymously...");
            signInAnonymously(auth).catch(err => console.error("Anonymous auth failed", err));
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
        if (!db || !selectedEmployeeId || locationState.status !== 'success') return;

        setIsActionPending(true);

        let photoUrl = '';

        try {
            // Convert to Base64 directly - No Firebase Storage needed
            photoUrl = await fileToDataUrl(photoFile);
        } catch (uploadError: any) {
            console.error("Image conversion failed", uploadError);
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
            } catch (serverError) {
                const permissionError = new FirestorePermissionError({ path: `worklogs/${todaysLog.id}`, operation: 'update', requestResourceData: { id: todaysLog.id } });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Check Out Error', description: "Could not update your work log. Please try again." });
            }
        } else if (!todaysLog) { // CHECK-IN
            if (!isWorkHoursValid) return; // Guard against missing settings

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
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: false };
        try {
            const compressedBlob = await (imageCompression as any).default(photoBlob, options);
            const photoFile = new File([compressedBlob], "capture.jpg", { type: "image/jpeg" });
            await handleSubmitAttendance(photoFile);
        } catch (error) {
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
            <div className="flex justify-center items-start pt-4 sm:pt-10">
                <div className="w-full max-w-md">
                    <button onClick={() => setShowCamera(false)} className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Portal
                    </button>
                    <CameraCapture onCapture={handleCapture} isProcessing={isActionPending} />
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
            <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="font-semibold">Absensi Hari Ini Sudah Lengkap</p>
                <p className="text-sm">Check-in: <ClientOnlyTime dateString={todaysLog.checkInTime} /></p>
                <p className="text-sm">Check-out: <ClientOnlyTime dateString={todaysLog.checkOutTime} /></p>
            </div>
        )
    };


    const renderCheckOutScreen = () => {
        if (!todaysLog) return null;

        const now = new Date();
        const workEndTime = isWorkHoursValid ? parse(officeSettings.work_end!, 'HH:mm', now) : null;
        const canCheckOut = workEndTime ? now >= workEndTime : true;

        return (
            <div className="space-y-4 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Anda check-in pada pukul:</p>
                    <p className="text-2xl font-bold"><ClientOnlyTime dateString={todaysLog.checkInTime} /></p>
                </div>
                {workEndTime && now < workEndTime && (
                    <Alert variant='warning'>
                        <Clock className="h-4 w-4" />
                        <AlertTitle>Belum Waktunya Pulang</AlertTitle>
                        <AlertDescription>Jam kerja berakhir pukul {officeSettings.work_end}. Check-out sebelum waktunya akan tercatat.</AlertDescription>
                    </Alert>
                )}
                {locationState.status === 'idle' && <Button onClick={handleGetLocation} className="w-full"><LocateFixed className="mr-2 h-4 w-4" /> Dapatkan Lokasi & Check Out</Button>}
                {locationState.status === 'loading' && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">{locationState.message}</span></div>}
                {locationState.status === 'error' && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Lokasi</AlertTitle><AlertDescription>{locationState.message}</AlertDescription><Button variant="link" size="sm" onClick={handleGetLocation} className="p-0 h-auto mt-2">Coba Lagi</Button></Alert>}
                {locationState.status === 'success' && (
                    <>
                        <Alert variant="success"><CheckCircle className="h-4 w-4" /><AlertTitle>Lokasi Diterima</AlertTitle><AlertDescription>Silakan lanjutkan untuk check-out.</AlertDescription></Alert>
                        <Button onClick={() => setShowCamera(true)} className="w-full">Lanjut Ambil Foto Check-out</Button>
                    </>
                )}
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
            <>
                <div className="space-y-4 text-center">
                    {locationState.status === 'idle' && <Button onClick={handleGetLocation} className="w-full"><LocateFixed className="mr-2 h-4 w-4" /> Dapatkan Lokasi & Check In</Button>}
                    {locationState.status === 'loading' && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /> <span className="ml-2">{locationState.message}</span></div>}
                    {locationState.status === 'error' && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Lokasi</AlertTitle><AlertDescription>{locationState.message}</AlertDescription><Button variant="link" size="sm" onClick={handleGetLocation} className="p-0 h-auto mt-2">Coba Lagi</Button></Alert>}
                    {locationState.status === 'success' && officeSettings && distance !== null && (
                        <>
                            {distance <= officeSettings.radius ? (
                                <Alert variant="success"><CheckCircle className="h-4 w-4" /><AlertTitle>Anda Berada di Area Kantor</AlertTitle><AlertDescription>Jarak Anda: {distance.toFixed(0)} meter dari kantor. Silakan lanjutkan.</AlertDescription></Alert>
                            ) : (
                                <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Anda di Luar Jangkauan</AlertTitle><AlertDescription>Anda berada <b>{distance.toFixed(0)} meter</b> dari kantor. Batas radius adalah <b>{officeSettings.radius} meter</b>.</AlertDescription></Alert>
                            )}
                            <Button onClick={() => setShowCamera(true)} disabled={distance > officeSettings.radius} className="w-full">Lanjut Ambil Foto</Button>
                        </>
                    )}
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Atau Ajukan Izin</span></div></div>
                <form onSubmit={handleRequestLeave} className="space-y-4">
                    <div className="space-y-2"><Label>Tipe Izin</Label><Select name="leaveType" value={leaveType} onValueChange={(v: LeaveType) => setLeaveType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="On-Leave">Izin (On-Leave)</SelectItem><SelectItem value="Sick">Sakit (Sick)</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="note">Catatan / Alasan</Label><Textarea id="note" name="note" placeholder="e.g., Ada urusan keluarga." required value={leaveNote} onChange={(e) => setLeaveNote(e.target.value)} /></div>
                    <FormButton type="submit" className="w-full" variant="secondary" disabled={isProcessing || locationState.status === 'loading'}>Kirim Pengajuan Izin</FormButton>
                </form>
            </>
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
        <div className="flex justify-center items-start pt-4 sm:pt-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <UserCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Portal Karyawan</CardTitle>
                            <CardDescription>Pilih nama Anda untuk mencatat kehadiran hari ini.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="employee">Nama Karyawan</Label>
                        <EmployeeSelect employees={employees} onSelect={handleEmployeeChange} disabled={isProcessing || locationState.status === 'loading'} value={selectedEmployeeId} />
                    </div>
                    {renderContent()}
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
