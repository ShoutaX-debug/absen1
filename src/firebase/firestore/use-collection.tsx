'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal representation of a Query, to safely access its path.
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and implements detailed permission error handling.
 *
 * IMPORTANT! The `targetRefOrQuery` argument MUST be memoized using `useMemoFirebase`
 * to prevent re-renders and potential infinite loops.
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} memoizedTargetRefOrQuery -
 * The memoized Firestore CollectionReference or Query. Hook waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error state.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>))  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query/ref is not provided, reset state and do nothing.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        // Map snapshot docs to a new array with IDs.
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id
        }));

        setData(results);
        setError(null); // Clear any previous error on success.
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // --- CONTEXTUAL ERROR HANDLING ---
        // On error, create and emit a detailed FirestorePermissionError.

        let path: string;
        // Safely determine the path from either a collection reference or a query.
        if (memoizedTargetRefOrQuery.type === 'collection') {
          path = (memoizedTargetRefOrQuery as CollectionReference).path;
        } else {
           // This accesses an internal but stable property to get the query's path.
          const internalQuery = memoizedTargetRefOrQuery as unknown as InternalQuery;
          path = internalQuery._query.path.canonicalString();
        }

        // Create the rich, contextual error object.
        const contextualError = new FirestorePermissionError({
          operation: 'list', // 'list' is the correct operation for collection queries.
          path: path,
        });

        setError(contextualError); // Set local error state for the component using the hook.
        setData(null);
        setIsLoading(false);

        // Emit the error to the global listener, which will throw it for the Next.js overlay.
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // Cleanup function to unsubscribe from the listener on unmount.
    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]); // Re-run effect if the memoized query/ref changes.

  return { data, isLoading, error };
}
