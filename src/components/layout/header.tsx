
'use client';

import Link from 'next/link';
import {
  Building,
  Menu,
  Users,
  Home,
  FileText,
  LogOut,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { logout } from '@/app/(auth)/login/actions';


const adminNavItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/employees', icon: Users, label: 'Karyawan' },
    { href: '/reports', icon: FileText, label: 'Laporan' },
    { href: '/settings', icon: Settings, label: 'Pengaturan' },
];

export function Header() {

  const handleLogout = async () => {
    await logout();
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Buka menu navigasi</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold mb-4"
            >
              <Building className="h-6 w-6 text-primary" />
              <span className="">GeoAttend</span>
            </Link>
            
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Admin Menu</p>
            {adminNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        {/* Can add search or breadcrumbs here */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar>
              <AvatarImage
                src="https://picsum.photos/seed/admin/100/100"
                alt="Admin"
                data-ai-hint="person portrait"
              />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <span className="sr-only">Buka menu pengguna</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
           <DropdownMenuItem asChild><Link href="/">Employee Portal</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
