'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { WorkLog, Employee, AttendanceStatus } from "@/lib/data-client";
import { Clock, CheckCircle, Hourglass, Camera, MapPin, Calendar, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { FormButton } from '../form-button';
import { useToast } from '@/hooks/use-toast';
import { revalidateDashboard } from '@/app/actions';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firebase';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";


// --- HELPER FUNCTIONS ---

function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatTime(dateString: string | null) {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// --- HYDRATION-SAFE TIME COMPONENT ---
function ClientOnlyTime({ dateString }: { dateString: string | null }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return <>{isClient ? formatTime(dateString) : '--:--'}</>; // Render placeholder on server
}


// --- CHILD COMPONENTS ---

function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
    // This component is disabled as it requires a Google Maps API Key
    // const url = `https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&center=${latitude},${longitude}&zoom=15`;
    return (
        <div className="aspect-video w-full rounded-md overflow-hidden border mt-2 bg-muted flex flex-col items-center justify-center">
             <MapPin className="h-8 w-8 text-muted-foreground" />
             <p className="text-sm text-muted-foreground mt-2">Location Map Disabled</p>
             <p className="text-xs text-muted-foreground/50">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
        </div>
    );
}

function DetailSection({ title, time, photoUrl, latitude, longitude, status, icon, correctionNote }: {
    title: string;
    time: string | null;
    photoUrl: string | null;
    latitude?: number | null;
    longitude?: number | null;
    status?: AttendanceStatus | null;
    icon: React.ReactNode;
    correctionNote?: string | null;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
                {icon}{title}
            </div>
            {photoUrl ? (
                <img src={photoUrl} alt={`${title} photo`} className="rounded-md w-full object-cover border" />
            ) : (
                <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
            )}
            <div className="text-sm space-y-1">
                <div><span className="font-semibold">Time:</span> <ClientOnlyTime dateString={time} /></div>
                {status && <div className="flex items-center gap-1.5"><span className="font-semibold">Status:</span> <Badge variant={status === 'On-Time' ? 'success' : 'warning'}>{status}</Badge></div>}
                {correctionNote && <p className="text-xs italic text-blue-600 border-l-4 border-blue-600 pl-2 mt-2">Note: “{correctionNote}”</p>}
            </div>
            {latitude && longitude ? (
                <LocationMap latitude={latitude} longitude={longitude} />
            ) : (
                 <div className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">No location data</p>
                </div>
            )}
        </div>
    );
}

function CorrectionDialog({ log, open, onOpenChange }: { log: WorkLog, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const db = useFirestore();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!db) return;

        const formData = new FormData(event.currentTarget);
        const checkOutTimeStr = formData.get('checkOutTime') as string;
        const correctionNote = formData.get('correctionNote') as string;
        const workLogId = log.id;

        if (!workLogId || !checkOutTimeStr) {
            setError('Work Log ID and Check-out time are required.');
            return;
        }

        startTransition(async () => {
            try {
                const logRef = doc(db, 'worklogs', workLogId);
                const logDateStr = log.date;
                const checkOutDateTime = new Date(`${logDateStr}T${checkOutTimeStr}`);
                
                if (isNaN(checkOutDateTime.getTime())) throw new Error('Invalid time format provided.');
                
                if (!log.checkInTime) {
                    throw new Error("Cannot calculate duration without a valid check-in time.");
                }
                const checkInTime = new Date(log.checkInTime);
                const durationMs = checkOutDateTime.getTime() - checkInTime.getTime();
                const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
                
                await updateDoc(logRef, {
                    checkOutTime: Timestamp.fromDate(checkOutDateTime),
                    durationHours,
                    correctionNote: correctionNote || 'Manual check-out time added by admin.',
                    checkOutPhotoUrl: null
                });

                await revalidateDashboard();
                toast({ title: "Success", description: "Work log corrected successfully." });
                onOpenChange(false);
            } catch (err: any) {
                setError(err.message || 'Failed to correct work log.');
                toast({ variant: 'destructive', title: "Error", description: err.message });
            }
        });
    };

    const defaultCheckOutTime = "17:00";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Correct Work Log</DialogTitle>
                    <DialogDescription>Manually add a check-out time for this entry.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                             <Label htmlFor="checkOutTime">Check-out Time (24h format)</Label>
                             <Input id="checkOutTime" name="checkOutTime" type="time" required defaultValue={defaultCheckOutTime} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="correctionNote">Reason for Correction</Label>
                             <Textarea id="correctionNote" name="correctionNote" placeholder="e.g., Employee forgot to check-out." />
                        </div>
                         {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <FormButton type="submit" disabled={isPending}>Save Correction</FormButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}


export function RecentAttendance({ 
    recentWorkLogs,
    employeeMap 
}: { 
    recentWorkLogs: WorkLog[], 
    employeeMap: Map<string, Employee> 
}) {
    const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

    const handleRowClick = (log: WorkLog) => {
        setSelectedLog(log);
        setIsDetailOpen(true);
    }
    
    const handleEditClick = (e: React.MouseEvent, log: WorkLog) => {
        e.stopPropagation(); 
        setSelectedLog(log);
        setIsDetailOpen(false);
        setIsCorrectionOpen(true);
    };

    const employee = selectedLog ? employeeMap.get(selectedLog.employeeId) : null;

    const renderStatusBadge = (log: WorkLog) => {
        const { status, leaveApprovalStatus } = log;
        switch (status) {
            case 'On-Time': return <Badge variant="success">On-Time</Badge>;
            case 'Late': return <Badge variant="warning">Late</Badge>;
            case 'On-Leave':
            case 'Sick':
                 if (leaveApprovalStatus === 'approved') return <Badge variant="info">{status}</Badge>;
                 if (leaveApprovalStatus === 'rejected') return <Badge variant="destructive">{status} (Rejected)</Badge>;
                 return <Badge variant="secondary">{status} (Pending)</Badge>;
            case 'Absent':
                return <Badge variant="destructive">Absent</Badge>;
            default:
                return <Badge variant="outline">N/A</Badge>;
        }
    };

  return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Click on a record to see check-in and check-out details.</CardDescription>
        </CardHeader>
        <CardContent>
            {recentWorkLogs.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {recentWorkLogs.map((log) => {
                    const employee = employeeMap.get(log.employeeId);
                    const isLeave = log.status === 'On-Leave' || log.status === 'Sick';
                    return (
                    <TableRow key={log.id} onClick={() => handleRowClick(log)} className="cursor-pointer">
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                <AvatarImage src={employee?.avatar?.imageUrl ?? undefined} alt={employee?.name ?? 'User'} />
                                <AvatarFallback>{employee ? getInitials(employee.name) : '??'}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-0.5">
                                    <p className="font-medium">{employee?.name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString('en-CA')}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{renderStatusBadge(log)}</TableCell>
                        <TableCell>
                            {/* BUG FIX: Show --:-- for leave, otherwise show the relevant time */}
                            {isLeave ? '--:--' : <ClientOnlyTime dateString={log.checkOutTime ?? log.checkInTime} />}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                           {/* BUG FIX: Only show duration if it's greater than 0 */}
                           {log.durationHours > 0 ? `${log.durationHours.toFixed(2)}h` : '--'}
                        </TableCell>
                    </TableRow>
                    );
                })}
                </TableBody>
            </Table>
            ) : (
            <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity found.</p>
            </div>
            )}

            {selectedLog && (
                <>
                    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Work Log Details</DialogTitle>
                                <DialogDescription>
                                    {employee?.name} - {new Date(selectedLog.date).toLocaleDateString('en-CA')}
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid md:grid-cols-2 gap-6 pt-4">
                            {selectedLog.status === 'On-Leave' || selectedLog.status === 'Sick' ? (
                                    <div className="md:col-span-2 space-y-4 p-4 border rounded-lg bg-secondary/50">
                                        <div className="flex items-center gap-2 text-lg font-semibold">
                                            <Calendar className="h-5 w-5" />
                                            {selectedLog.status} Request
                                        </div>
                                        <div className="text-sm flex items-center gap-1.5"><span className="font-semibold">Status:</span> <Badge variant={selectedLog.leaveApprovalStatus === 'approved' ? 'success' : selectedLog.leaveApprovalStatus === 'rejected' ? 'destructive' : 'secondary'}>{selectedLog.leaveApprovalStatus}</Badge></div>
                                        {selectedLog.leaveNote && <p className="text-sm italic border-l-4 pl-3">“{selectedLog.leaveNote}”</p>}
                                    </div>
                            ) : (
                                <>
                                    <DetailSection 
                                        title="Check-in" 
                                        icon={<Clock className="h-5 w-5" />} 
                                        time={selectedLog.checkInTime} 
                                        status={selectedLog.status}
                                        photoUrl={selectedLog.checkInPhotoUrl} 
                                        latitude={selectedLog.checkInLatitude}
                                        longitude={selectedLog.checkInLongitude}
                                    />
                                    {selectedLog.checkOutTime ? (
                                        <DetailSection 
                                            title="Check-out" 
                                            icon={<CheckCircle className="h-5 w-5 text-green-500" />} 
                                            time={selectedLog.checkOutTime} 
                                            photoUrl={selectedLog.checkOutPhotoUrl} 
                                            latitude={selectedLog.checkOutLatitude}
                                            longitude={selectedLog.checkOutLongitude}
                                            correctionNote={selectedLog.correctionNote}
                                        />
                                    ) : (
                                        <div className="space-y-3 p-4 border-dashed border-2 rounded-lg flex flex-col justify-center items-center bg-muted/50">
                                            <Hourglass className="h-10 w-10 text-muted-foreground"/>
                                            <h3 className="text-lg font-semibold">Still Working</h3>
                                            <p className="text-sm text-muted-foreground">Employee has not checked out yet.</p>
                                            <Button size="sm" variant="secondary" onClick={(e) => handleEditClick(e, selectedLog)}>
                                                <Edit className="mr-2 h-4 w-4"/>
                                                Edit & Add Check-out
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    <CorrectionDialog log={selectedLog} open={isCorrectionOpen} onOpenChange={setIsCorrectionOpen} />
                </>
            )}
        </CardContent>
      </Card>
  );
}
