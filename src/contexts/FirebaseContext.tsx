import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../lib/firebase';
import {
  type AuthSubject,
  canAccessAdminDashboard,
  canManageAds,
  canManageUsersAndRoles,
  canPublishArticles,
} from '../lib/rbac';
import { type FirestoreUserRecord, syncUserAccount } from '../lib/firestoreService';
import { formatFirebaseAuthError } from '../lib/authErrors';

interface FirebaseContextValue {
  firebaseUser: User | null;
  userRecord: FirestoreUserRecord | null;
  authSubject: AuthSubject | null;
  authReady: boolean;
  firestoreConnected: boolean;
  authError: string | null;
  isAdminStaff: boolean;
  hasAdsPermission: boolean;
  hasPublishPermission: boolean;
  hasRoleAdminPermission: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userRecord, setUserRecord] = useState<FirestoreUserRecord | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection().then((res) => {
      setFirestoreConnected(res.connected);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (user) {
        try {
          const synced = await syncUserAccount(user);
          setUserRecord(synced);
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Unable to sync account profile.');
          setUserRecord(null);
        }
      } else {
        setUserRecord(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
      setAuthError(formatFirebaseAuthError(err, hostname));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const authSubject = useMemo<AuthSubject | null>(() => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      role: userRecord?.role ?? 'reader',
      isActive: userRecord?.isActive ?? true,
    };
  }, [firebaseUser, userRecord]);

  const value = useMemo<FirebaseContextValue>(
    () => ({
      firebaseUser,
      userRecord,
      authSubject,
      authReady,
      firestoreConnected,
      authError,
      isAdminStaff: canAccessAdminDashboard(authSubject),
      hasAdsPermission: canManageAds(authSubject),
      hasPublishPermission: canPublishArticles(authSubject),
      hasRoleAdminPermission: canManageUsersAndRoles(authSubject),
      signInWithGoogle,
      signOutUser,
    }),
    [
      firebaseUser,
      userRecord,
      authSubject,
      authReady,
      firestoreConnected,
      authError,
      signInWithGoogle,
      signOutUser,
    ]
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
