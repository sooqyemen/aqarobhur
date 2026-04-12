'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebase } from '@/lib/firebaseClient';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { isAdminUser } from '@/lib/admin'; 

export default function AccountPage() {
  const { auth } = getFirebase();

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setIsAuthLoading(false);
    });
    return () => unsub();
  }, [auth]);

  async function doLogin(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setPass('');
    } catch (error) {
      setErr('بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى.');
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
      setErr('تعذر تسجيل الخروج. يرجى التأكد من اتصالك بالإنترنت.');
    } finally {
      setBusy(false);
    }
  }

  if (isAuthLoading) {
    return (
      <div className="container authContainer">
         <div className="loadingSpinner"></div>
         <p className="muted" style={{marginTop: '15px'}}>جاري التحقق من الحساب...</p>
         
         <style jsx>{`
            .authContainer { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; }
            .loadingSpinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
         `}</style>
      </div>
    );
  }

  const isAdmin = isAdminUser(user);

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="container pageStack">
        <div className="pageHeader">
          <h1 className="pageTitle">إدارة الحساب</h1>
          <p className="pageSubtitle">بوابة تسجيل الدخول الخاصة بإدارة منصة عقار أبحر</p>
        </div>

        <div className="authWrapper">
          {user ? (
            /* واجهة المستخدم المسجل للدخول */
            <div className="authCard loggedInCard">
              <div className="userInfo">
                <div className="avatarCircle">
                  <span className="material-icons-outlined">person</span>
                </div>
                <div className="userDetails">
                  <div className="userEmail">{user.email}</div>
                  <div className={`userRole ${isAdmin ? 'adminRole' : ''}`}>
                    {isAdmin ? 'صلاحية: مدير النظام (Admin)' : 'صلاحية: مستخدم'}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="adminActions">
                  <Link href="/admin" className="btnPrimary adminBtn">
                    <span className="material-icons-outlined">dashboard</span>
                    الدخول إلى لوحة التحكم
                  </Link>
                </div>
              )}

              {err && <div className="errorMsg">{err}</div>}

              <button className="btnLogout" onClick={doLogout} disabled={busy}>
                <span className="material-icons-outlined">logout</span>
                {busy ? 'جاري الخروج...' : 'تسجيل خروج'}
              </button>
            </div>
          ) : (
            /* واجهة تسجيل الدخول */
            <form className="authCard loginForm" onSubmit={doLogin}>
              <div className="formHeader">
                 <span className="material-icons-outlined lockIcon">lock</span>
                 <h2>تسجيل الدخول</h2>
              </div>

              <div className="inputGroup">
                <label htmlFor="emailInput">البريد الإلكتروني</label>
                <div className="inputWithIcon">
                  <span className="material-icons-outlined">email</span>
                  <input
                    id="emailInput"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="inputGroup">
                <label htmlFor="passInput">كلمة المرور</label>
                <div className="inputWithIcon">
                  <span className="material-icons-outlined">vpn_key</span>
                  <input
                    id="passInput"
                    className="input"
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {err && <div className="errorBanner">{err}</div>}

              <button
                className="btnPrimary loginBtn"
                type="submit"
                disabled={busy || !email || !pass}
              >
                {busy ? (
                  <span className="material-icons-outlined" style={{ animation: 'spin 1s linear infinite' }}>refresh</span>
                ) : (
                  <>تسجيل الدخول <span className="material-icons-outlined">login</span></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .pageStack { max-width: 600px; margin: 40px auto; }
        .pageHeader { text-align: center; margin-bottom: 30px; }
        .pageTitle { font-size: 28px; font-weight: 900; color: var(--text); margin: 0 0 8px 0; }
        .pageSubtitle { color: var(--muted); margin: 0; font-size: 15px; }

        .authCard { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid var(--border); }
        
        .loggedInCard { display: flex; flex-direction: column; gap: 20px; }
        .userInfo { display: flex; align-items: center; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; }
        .avatarCircle { width: 50px; height: 50px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--muted); }
        .avatarCircle .material-icons-outlined { font-size: 28px; }
        .userEmail { font-weight: 800; font-size: 16px; color: var(--text); word-break: break-all; }
        .userRole { font-size: 13px; color: var(--muted); margin-top: 4px; font-weight: 600; }
        .adminRole { color: var(--primary); background: rgba(15, 118, 110, 0.1); padding: 4px 10px; border-radius: 10px; display: inline-block; }
        
        .adminActions { border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); padding: 20px 0; }
        .adminBtn { width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 16px; padding: 14px; }
        
        .btnLogout { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s; }
        .btnLogout:hover:not(:disabled) { background: #fed7d7; }
        .btnLogout:disabled { opacity: 0.6; cursor: not-allowed; }

        .formHeader { display: flex; flex-direction: column; align-items: center; margin-bottom: 25px; }
        .lockIcon { font-size: 40px; color: var(--primary); background: rgba(15, 118, 110, 0.1); padding: 15px; border-radius: 50%; margin-bottom: 10px; }
        .formHeader h2 { margin: 0; font-size: 22px; font-weight: 800; color: var(--text); }

        .inputGroup { margin-bottom: 20px; }
        .inputGroup label { display: block; font-weight: 700; color: var(--muted); margin-bottom: 8px; font-size: 14px; }
        
        .inputWithIcon { position: relative; display: flex; align-items: center; }
        .inputWithIcon .material-icons-outlined { position: absolute; right: 15px; color: #a0aec0; font-size: 20px; }
        .inputWithIcon .input { width: 100%; padding: 14px 45px 14px 15px; border: 1px solid var(--border); border-radius: 12px; font-size: 15px; transition: border-color 0.2s; }
        .inputWithIcon .input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); }

        .errorBanner { background: #fff5f5; color: #c53030; padding: 12px 15px; border-radius: 10px; font-size: 14px; font-weight: 600; margin-bottom: 20px; border: 1px solid #fed7d7; text-align: center; }

        .loginBtn { width: 100%; padding: 16px; font-size: 16px; font-weight: 800; display: flex; justify-content: center; align-items: center; gap: 8px; border-radius: 12px; }
        .loginBtn:disabled { background: #a0aec0; cursor: not-allowed; }
      `}</style>
    </>
  );
}
