'use client';

import { useFirebase } from '@/firebase/provider';

// This is a convenience hook to quickly get the initialized Firebase services.
// It should be used within components that are descendants of FirebaseProvider.

export const useAuth = () => {
    const { auth } = useFirebase();
    if (!auth) throw new Error("useAuth must be used within a FirebaseProvider with a valid auth instance.");
    return auth;
}

export const useFirestore = () => {
    const { firestore } = useFirebase();
    if (!firestore) throw new Error("useFirestore must be used within a FirebaseProvider with a valid firestore instance.");
    return firestore;
}
