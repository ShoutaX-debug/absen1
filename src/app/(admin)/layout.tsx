
import { AppSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { redirect } from 'next/navigation';
import { getSession } from '../(auth)/login/actions';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session = await getSession();
  
  // If there's no session or the user is not an admin, redirect them.
  if (!session || !session.isAdmin) {
    // Redirect to the login page.
    // The query param is helpful to show a special message on the login page for first-time setup.
    const loginUrl = '/login?setup=true';
    redirect(loginUrl);
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <AppSidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}
