'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from 'lucide-react';
import { useFirestore } from '@/hooks/use-firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { revalidateDashboard } from '@/app/actions';

export function DeleteActivityButton() {
    const db = useFirestore();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleDelete = async () => {
        if (!db) {
             toast({ variant: "destructive", title: "Error", description: "Firestore is not available." });
             return;
        }
        startTransition(async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "worklogs"));
                const batch = writeBatch(db);
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                await revalidateDashboard();
                toast({
                    title: "Success",
                    description: "All activity data has been reset.",
                });
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message ?? 'Failed to delete activity data.',
                });
            }
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset Activity Data
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all attendance
                        records from the database. This is useful for clearing test data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                        {isPending ? "Deleting..." : "Yes, delete everything"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
