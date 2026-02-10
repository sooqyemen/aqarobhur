'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin';

export default function AccountPage() {
  const { auth } = getFirebase();

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, [auth]);

  async function doLogin(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setPass('');
    } catch (e2) {
      setErr('بيانات الدخول غير صحيحة أو لا يوجد حساب.');
    } finally {
      setBusy(false);
    }
  }

  async function doLogout() {
    setBusy(true);
    setErr('');
    try {
      await signOut(auth);
    } catch {
      setErr('تعذر تسجيل الخروج.');
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = isAdminUser(user);

  return (
    <div className="container">
      <div className="head">
        <h1 className="h1">الحساب</h1>
        <div className="muted">الأدمن لا يظهر للزوار — فقط هنا إذا كنت أدمن.</div>
      </div>

      {user ? (
        <div className="card box">
          <div className="row">
            <div>
              <div className="name">{user.email}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {isAdmin ? 'صلاحية: أدمن' : 'صلاحية: مستخدم'}
              </div>
            </div>
            <button className="btn" onClick={doLogout} disabled={busy}>تسجيل خروج</button>
          </div>

          {isAdmin ? (
            <div className="admin">
              <Link href="/admin" className="btn btnPrimary">الدخول إلى لوحة الأدمن</Link>
            </div>
          ) : null}
        </div>
      ) : (
        <form className="card box" onSubmit={doLogin}>
          <div className="muted" style={{ marginBottom: 10 }}>سجّل دخولك لإدارة العروض (للأدمن فقط).</div>

          <label className="lbl">البريد</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />

          <label className="lbl">كلمة المرور</label>
          <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />

          {err ? <div className="err">{err}</div> : null}

          <button className="btn btnPrimary" type="submit" disabled={busy || !email || !pass}>
            {busy ? '...' : 'تسجيل دخول'}
          </button>
        </form>
      )}

      <style jsx>{`
        .head{margin:16px 0 12px}
        .h1{margin:0;font-size:18px;font-weight:900}
        .box{padding:16px}
        .row{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .name{font-weight:900}
        .lbl{display:block;margin-top:10px;margin-bottom:6px;font-weight:900}
        .err{margin-top:10px;color:var(--danger);font-weight:900}
        .admin{margin-top:12px}
      `}</style>
    </div>
  );
}
