import { Suspense } from 'react';
import { LoginForm } from './login-form';
import { Building } from 'lucide-react';

function LoginPageContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
       <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center text-center mb-6">
            <Building className="h-10 w-10 text-primary mb-3" />
            <h1 className="text-2xl font-semibold tracking-tight">
                GeoAttend
            </h1>
            <p className="text-sm text-muted-foreground">
                Admin Login
            </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}