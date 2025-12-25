'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore } from '@/hooks/use-firebase';
import type { Employee } from '@/lib/data-client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserPlus, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FormButton } from '@/components/form-button';

function getInitials(name: string) {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export default function EmployeeClientPage({ initialEmployees }: { initialEmployees: Employee[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  const openDialogForNew = () => {
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  const openDialogForEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!db || !confirm('Are you sure you want to delete this employee?')) return;

    startTransition(async () => {
        try {
            await deleteDoc(doc(db, 'employees', id));
            toast({ title: 'Success', description: 'Employee deleted successfully.' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) {
        toast({ variant: 'destructive', title: 'Error', description: 'Name and email are required.' });
        return;
    }
    
    startTransition(async () => {
        try {
            if (editingEmployee) {
                const docRef = doc(db, 'employees', editingEmployee.id);
                await updateDoc(docRef, { name, email });
                toast({ title: 'Success', description: 'Employee updated successfully.' });
            } else {
                await addDoc(collection(db, 'employees'), { name, email });
                toast({ title: 'Success', description: 'Employee added successfully.' });
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Employee Management</h1>
          <Button onClick={openDialogForNew} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>View, add, edit, and remove your employee data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                           <AvatarImage src={employee.avatar?.imageUrl} alt={employee.name} />
                           <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{employee.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{employee.email}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDialogForEdit(employee)} className="flex items-center gap-2 cursor-pointer">
                            <Pencil className="h-4 w-4"/> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(employee.id)} className="flex items-center gap-2 text-destructive cursor-pointer">
                            <Trash2 className="h-4 w-4"/> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Change the employee details below.' : 'Fill in the details for the new employee.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" name="name" defaultValue={editingEmployee?.name ?? ''} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email ?? ''} className="col-span-3" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <FormButton type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </FormButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
