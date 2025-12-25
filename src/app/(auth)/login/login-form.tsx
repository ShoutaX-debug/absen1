
'use client';

import { useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthErrorCodes } from 'firebase/auth';
import { createSession } from './actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { FormButton } from '@/components/form-button';
import { useSearchParams } from 'next/navigation';

export function LoginForm() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const isSetupMode = searchParams.get('setup') === 'true';
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.com";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!auth) {
      setError("Layanan autentikasi belum siap. Silakan coba lagi sesaat.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      setError("Formulir login ini hanya untuk admin. Karyawan harus menggunakan portal utama.");
      return;
    }

    startTransition(async () => {
      try {
        let userCredential;
        // In setup mode, we prioritize creating a user.
        // If it fails because the user exists, we then try to sign in.
        if (isSetupMode) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (signUpError: any) {
            if (signUpError.code === 'auth/email-already-in-use') {
              // This is expected if the admin account is already created.
              // We can now proceed to sign in with the same credentials.
              userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else if (signUpError.code === 'auth/weak-password') {
              setError('Password terlalu lemah. Harap gunakan minimal 6 karakter.');
              return;
            }
            else {
              // For other creation errors, re-throw to be caught below.
              throw signUpError;
            }
          }
        } else {
          // In normal login mode, we only try to sign in.
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        }

        // If we have a user, create the session and redirect.
        if (userCredential?.user) {
          const { isAdmin } = await createSession(userCredential.user.uid, userCredential.user.email!);
          if (isAdmin) {
            // Use window.location.href for a full page reload to ensure session is picked up
            window.location.href = '/dashboard';
          } else {
            // This case is unlikely if the email check passes, but good for safety.
            setError("Hanya akun dengan status admin yang bisa masuk.");
          }
        } else {
          setError("Gagal mendapatkan kredensial pengguna setelah login/pendaftaran.");
        }

      } catch (err: any) {
        console.error("Login/Signup process failed:", err);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          setError('Email atau password salah.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Terlalu banyak upaya login. Akun Anda diblokir sementara.');
        } else {
          setError(err.message || 'Terjadi kesalahan yang tidak diketahui.');
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            {isSetupMode
              ? 'Buat akun admin utama dengan memasukkan email dan password.'
              : 'Masuk ke dasbor admin Anda.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              required
              defaultValue={adminEmail}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Masukkan password Anda"
              autoFocus
            />
          </div>
          {isSetupMode && (
            <Alert variant="info">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pengaturan Awal Admin</AlertTitle>
              <AlertDescription>
                Akun admin akan dibuat menggunakan email di atas dan password yang Anda masukkan.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Gagal</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <FormButton className="w-full" type="submit" disabled={isPending}>
            {isPending ? 'Memproses...' : (isSetupMode ? 'Buat Akun & Login' : 'Login')}
          </FormButton>
        </CardFooter>
      </Card>
    </form>
  );
}
