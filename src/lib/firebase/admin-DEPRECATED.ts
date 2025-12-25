
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';

// THIS FILE IS DEPRECATED.
// The app now uses a client-side approach for most data access,
// and controlled server actions for admin tasks.
// A full Admin SDK initialization is no longer performed on app startup.

export function initializeAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    const errorMessage = `Firebase Admin SDK initialization failed. The following environment variables are missing: ${missingEnvVars.join(', ')}.`;
    console.error(errorMessage);
    // We throw this so the server action fails clearly.
    throw new Error(errorMessage);
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  };

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully for a server action.");
    return app;
  } catch (error: any) {
    console.error("ERROR: Firebase Admin SDK initialization failed for a server action.");
    console.error("Detailed Error:", error);
    throw new Error(
      `Firebase Admin SDK could not be initialized. Original error: ${error.message}`
    );
  }
}
