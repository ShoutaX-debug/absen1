'use client';

import type { WorkLog, Employee } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTransition } from 'react';
import { useFirestore } from '@/hooks/use-firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { revalidateDashboard } from '@/app/actions';

function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export function LeaveRequests({ pendingLogs, employeeMap }: { 
    pendingLogs: WorkLog[], 
    employeeMap: Map<string, Employee> 
}) {
    const db = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    if (pendingLogs.length === 0) {
        return null;
    }

    const handleAction = async (logId: string, status: 'approved' | 'rejected') => {
        if (!db) return;
        startTransition(async () => {
            try {
                const logRef = doc(db, 'worklogs', logId);
                await updateDoc(logRef, { 
                    leaveApprovalStatus: status,
                    ...(status === 'rejected' && { status: 'Absent' }),
                 });
                await revalidateDashboard();
                toast({
                    title: "Success",
                    description: `Leave request has been ${status}.`,
                });
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || 'Failed to update leave request.',
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Leave Requests</CardTitle>
                <CardDescription>Review and approve or reject recent leave requests from your employees.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pendingLogs.map((log) => {
                        const employee = employeeMap.get(log.employeeId);
                        return (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                     <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={employee?.avatar?.imageUrl ?? undefined} alt={employee?.name ?? 'User'} />
                                        <AvatarFallback>{employee ? getInitials(employee.name) : '??'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{employee?.name || 'Unknown User'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Request for: <span className="font-medium">{log.status}</span> on {new Date(log.date).toLocaleDateString('en-CA')}
                                        </p>
                                        {log.leaveNote && <p className="text-xs italic text-gray-500 mt-1">Note: “{log.leaveNote}”</p>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={() => handleAction(log.id, 'rejected')}
                                        disabled={isPending}
                                    >
                                        Reject
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="default" 
                                        onClick={() => handleAction(log.id, 'approved')}
                                        disabled={isPending}
                                    >
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
