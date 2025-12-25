
'use client';

import Link from 'next/link';
import {
  Building,
  Home,
  Users,
  FileText,
  Settings
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const adminNavItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/employees', icon: Users, label: 'Karyawan' },
    { href: '/reports', icon: FileText, label: 'Laporan' },
    { href: '/settings', icon: Settings, label: 'Pengaturan' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-card text-card-foreground md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Building className="h-6 w-6 text-primary" />
            <span className="">GeoAttend</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            
            <p className="px-3 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
            {adminNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  { 'bg-muted text-primary': pathname.startsWith(item.href) }
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
