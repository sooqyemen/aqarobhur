'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin';

export default function AdminGuard({ children, title = 'جاري التحقق من الصلاحيات...' }) {
  const router = useRouter();

  const [auth, setAuth] = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    try {
      const fb = getFirebase();
      setAuth(fb?.auth || null);
      setFirebaseReady(true);
    } catch (error) {
      console.error('Firebase init error in AdminGuard:', error);
      setFirebaseError('تعذر تهيئة Firebase. تأكد من متغيرات البيئة NEXT_PUBLIC_FIREBASE_*');
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && isAdminUser(user)) {
        setAuthorized(true);
      } else {
        router.push('/account');
      }
      setChecking(false);
    });

    return () => unsub();
  }, [auth, router]);

  if (firebaseError) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: '#c53030',
          fontWeight: 'bold',
          textAlign: 'center',
          padding: '0 16px',
        }}
      >
        {firebaseError}
      </div>
    );
  }

  if (checking || !firebaseReady) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: 'var(--primary)',
          fontWeight: 'bold',
        }}
      >
        <span
          className="material-icons-outlined"
          style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}
        >
          autorenew
        </span>
        {title}
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}