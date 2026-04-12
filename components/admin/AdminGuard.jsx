'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin';

export default function AdminGuard({ children, title = 'جاري التحقق من الصلاحيات...' }) {
  const { auth } = getFirebase();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && isAdminUser(user)) {
        setAuthorized(true);
      } else {
        router.push('/account'); // توجيه غير المصرح لهم لصفحة الدخول
      }
      setChecking(false);
    });
    return () => unsub();
  }, [auth, router]);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--primary)', fontWeight: 'bold' }}>
        <span className="material-icons-outlined" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}>autorenew</span>
        {title}
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
