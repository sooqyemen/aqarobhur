'use client';

import { useEffect, useMemo, useState } from 'react';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing, fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

function Field({ label, children, hint }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
      {children}
      {hint ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

function extractLatLngFromUrl(url) {
  try {
    const u = String(url || '').trim();
    if (!u) return null;

    // شكل: .../@21.5,39.1,17z
    const m1 = u.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m1) return { lat: Number(m1[1]), lng: Number(m1[2]) };

    // شكل: q=21.5,39.1
    const m2 = u.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m2) return { lat: Number(m2[1]), lng: Number(m2[2]) };

    // شكل: ll=21.5,39.1
    const m3 = u.match(/[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m3) return { lat: Number(m3[1]), lng: Number(m3[2]) };

    return null;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const { auth, storage } = getFirebase();

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState('create');
  const [createdId, setCreatedId] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const [createForm, setCreateForm] = useState({
    title: '',
    neighborhood: '',
    plan: '',
    part: '',
    dealType: 'sale',
    propertyType: 'أرض',
    propertyClass: '',
    area: '',
    price: '',
    locationUrl: '',
    lat: '',
    lng: '',
    status: 'available',
    direct: true,
    description: '',
    imagesText: '',
  });

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), [auth]);

  async function uploadSelectedImages() {
    setUploadErr('');
    if (!user) {
      setUploadErr('لا يمكن رفع الصور قبل تسجيل الدخول.');
      return;
    }
    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadErr('اختر صورة أو أكثر.');
      return;
    }
    if (!storage) {
      setUploadErr('Firebase Storage غير مُعدّ. تأكد من NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET وتمكين Storage في Firebase.');
      return;
    }

    // حماية من اختيار عدد كبير بالخطأ
    const files = Array.isArray(selectedFiles) ? selectedFiles.slice(0, 30) : [];
    if (Array.isArray(selectedFiles) && selectedFiles.length > files.length) {
      setUploadErr('تم اختيار صور كثيرة. سيتم رفع جزء منها فقط.');
    }

    setUploading(true);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = String(file.name || 'image')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_\.-]/g, '')
          .slice(0, 80);
        const path = `abhur_images/${user.uid}/${Date.now()}_${i}_${safeName}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
        const url = await getDownloadURL(r);
        urls.push(url);
      }

      setCreateForm((p) => {
        const current = String(p.imagesText || '').trim();
        const merged = [...(current ? [current] : []), ...urls].join('\n');
        return { ...p, imagesText: merged };
      });
      setSelectedFiles([]);
    } catch (e) {
      console.error(e);
      setUploadErr(e?.message || 'فشل رفع الصور.');
    } finally {
      setUploading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setAuthErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setAuthErr('فشل تسجيل الدخول. تأكد من الإيميل/الرمز وأن الحساب موجود في Firebase Auth.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function logout() { await signOut(auth); }

  async function createListing() {
    setBusy(true);
    setCreatedId('');
    try {
      const images = String(createForm.imagesText || '').split('\n').map(s => s.trim()).filter(Boolean);

      const id = await adminCreateListing({
        ...createForm,
        area: createForm.area ? Number(createForm.area) : null,
        price: createForm.price ? Number(createForm.price) : null,
        images,
      });

      setCreatedId(id);
      setCreateForm({ ...createForm, title:'', plan:'', part:'', area:'', price:'', locationUrl:'', lat:'', lng:'', description:'', imagesText:'' });
    } catch (err) {
      alert('حصل خطأ أثناء إضافة العرض. راجع إعداد Firebase وقواعد Firestore.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function loadList() {
    setLoadingList(true);
    try {
      const data = await fetchListings({ filters: {}, onlyPublic: false });
      setList(data);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { if (isAdmin && tab === 'manage') loadList(); }, [isAdmin, tab]);

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
          <h1 style={{ margin: '6px 0 4px' }}>تسجيل دخول الأدمن</h1>
          <div className="muted">سجّل بحساب Email/Password الذي أنشأته في Firebase Auth</div>

          <section className="card" style={{ marginTop: 12 }}>
            <form onSubmit={login} className="grid">
              <div className="col-6">
                <Field label="الإيميل">
                  <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
              </div>
              <div className="col-6">
                <Field label="الرمز">
                  <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
                </Field>
              </div>

              <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
                <button className="btnPrimary" disabled={busy}>{busy ? 'جاري الدخول…' : 'دخول'}</button>
              </div>

              {authErr ? (
                <div className="col-12">
                  <div className="card" style={{ borderColor:'rgba(180,35,24,.25)', background:'rgba(180,35,24,.05)' }}>{authErr}</div>
                </div>
              ) : null}
            </form>
          </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
          <h1 style={{ margin: '6px 0 4px' }}>غير مصرح</h1>
          <div className="muted">هذا الحساب ليس ضمن قائمة الأدمن.</div>
          <section className="card" style={{ marginTop: 12 }}>
            <div className="muted">الإيميل: {user.email || '—'}</div>
            <div className="muted" style={{ marginTop: 8 }}>
              أضف الإيميل داخل <code>NEXT_PUBLIC_ADMIN_EMAILS</code> في Vercel ثم أعد النشر.
            </div>
            <div style={{ marginTop: 12 }}><button className="btn" onClick={logout}>تسجيل خروج</button></div>
          </section>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '6px 0 4px' }}>لوحة الأدمن</h1>
            <div className="muted" style={{ fontSize: 13 }}>مرحبًا: {user.email}</div>
          </div>
          <button className="btn" onClick={logout}>تسجيل خروج</button>
        </div>

        <section className="card" style={{ marginTop: 12 }}>
          <div className="row">
            <button className={tab === 'create' ? 'btnPrimary' : 'btn'} onClick={() => setTab('create')}>إضافة عرض</button>
            <button className={tab === 'manage' ? 'btnPrimary' : 'btn'} onClick={() => setTab('manage')}>إدارة العروض</button>
          </div>
        </section>

        {tab === 'create' ? (
          <section className="card" style={{ marginTop: 12 }}>
            <div className="grid">
              <div className="col-6">
                <Field label="عنوان العرض">
                  <input className="input" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="مثال: أرض زاوية في الزمرد" />
                </Field>
              </div>

              <div className="col-3">
                <Field label="الحي">
                  <select className="select" value={createForm.neighborhood} onChange={(e) => setCreateForm({ ...createForm, neighborhood: e.target.value })}>
                    <option value="">اختر</option>
                    {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
              </div>

              <div className="col-3">
                <Field label="مباشر">
                  <select className="select" value={createForm.direct ? 'yes' : 'no'} onChange={(e) => setCreateForm({ ...createForm, direct: e.target.value === 'yes' })}>
                    <option value="yes">نعم</option>
                    <option value="no">لا</option>
                  </select>
                </Field>
              </div>

              <div className="col-3">
                <Field label="المخطط">
                  <input className="input" value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })} placeholder="مثال: 505 أو 99جس" />
                </Field>
              </div>

              <div className="col-3">
                <Field label="الجزء">
                  <input className="input" value={createForm.part} onChange={(e) => setCreateForm({ ...createForm, part: e.target.value })} placeholder="مثال: أ/ب أو 1ط" />
                </Field>
              </div>

              <div className="col-3">
                <Field label="بيع/إيجار">
                  <select className="select" value={createForm.dealType} onChange={(e) => setCreateForm({ ...createForm, dealType: e.target.value })}>
                    {DEAL_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="col-3">
                <Field label="نوع العقار">
                  <select className="select" value={createForm.propertyType} onChange={(e) => setCreateForm({ ...createForm, propertyType: e.target.value })}>
                    {PROPERTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>

              <div className="col-3">
                <Field label="سكني/تجاري" hint="اختياري — إذا تركته (تلقائي) سيتحدد حسب نوع العقار.">
                  <select className="select" value={createForm.propertyClass} onChange={(e) => setCreateForm({ ...createForm, propertyClass: e.target.value })}>
                    <option value="">تلقائي</option>
                    {PROPERTY_CLASSES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="col-3">
                <Field label="المساحة (م²)">
                  <input className="input" inputMode="numeric" value={createForm.area} onChange={(e) => setCreateForm({ ...createForm, area: e.target.value })} placeholder="مثال: 600" />
                </Field>
              </div>

              <div className="col-3">
                <Field label="السعر">
                  <input className="input" inputMode="numeric" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} placeholder="مثال: 1200000" />
                </Field>
              </div>

              <div className="col-6">
                <Field
                  label="رابط الموقع (اختياري)"
                  hint="يمكنك وضع رابط من خرائط Google. إذا كان الرابط يحتوي على الإحداثيات سيتم تعبئتها تلقائياً." 
                >
                  <input
                    className="input"
                    value={createForm.locationUrl}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = extractLatLngFromUrl(v);
                      setCreateForm((p) => ({
                        ...p,
                        locationUrl: v,
                        // لو الرابط يحوي إحداثيات نعبّيها تلقائياً (بدون إجبار)
                        lat: parsed && Number.isFinite(parsed.lat) ? String(parsed.lat) : p.lat,
                        lng: parsed && Number.isFinite(parsed.lng) ? String(parsed.lng) : p.lng,
                      }));
                    }}
                    placeholder="مثال: https://maps.app.goo.gl/..."
                  />
                </Field>
              </div>

              <div className="col-3">
                <Field
                  label="خط العرض (lat) — اختياري"
                  hint="لو أضفت lat/lng سيظهر العرض على صفحة الخريطة."
                >
                  <input className="input" inputMode="decimal" value={createForm.lat} onChange={(e) => setCreateForm({ ...createForm, lat: e.target.value })} placeholder="مثال: 21.7001" />
                </Field>
              </div>

              <div className="col-3">
                <Field label="خط الطول (lng) — اختياري">
                  <input className="input" inputMode="decimal" value={createForm.lng} onChange={(e) => setCreateForm({ ...createForm, lng: e.target.value })} placeholder="مثال: 39.1234" />
                </Field>
              </div>


              <div className="col-3">
                <Field label="الحالة">
                  <select className="select" value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}>
                    {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="col-12">
                <Field label="وصف (اختياري)">
                  <textarea className="input" rows={4} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="تفاصيل إضافية: شارع/واجهة/مميزات…" />
                </Field>
              </div>

              <div className="col-12">
                <Field
                  label="رفع الصور (اختياري)"
                  hint="اختر صور ثم اضغط (رفع الصور) وسيتم إضافة الروابط تلقائياً في خانة روابط الصور."
                >
                  <input
                    className="input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      setUploadErr('');
                      const files = Array.from(e.target.files || []);
                      const picked = files.slice(0, 30);
                      if (files.length > picked.length) {
                        setUploadErr('تم اختيار صور كثيرة.');
                      }
                      setSelectedFiles(picked);
                    }}
                  />

                  {selectedFiles.length ? (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                      {selectedFiles.slice(0, 6).map((f, idx) => {
                        const src = URL.createObjectURL(f);
                        return (
                          <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                            <img
                              src={src}
                              alt={f.name}
                              style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                              onLoad={() => URL.revokeObjectURL(src)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={uploadSelectedImages}
                      disabled={uploading || busy || !selectedFiles.length}
                    >
                      {uploading ? 'جاري الرفع…' : 'رفع الصور'}
                    </button>
                  </div>

                  {uploadErr ? (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(180,35,24,.25)',
                        background: 'rgba(180,35,24,.05)',
                      }}
                    >
                      {uploadErr}
                    </div>
                  ) : null}
                </Field>
              </div>

              <div className="col-12">
                <Field label="روابط الصور (كل رابط في سطر)" hint="يمكنك لصق روابط جاهزة، أو استخدم رفع الصور بالأعلى.">
                  <textarea className="input" rows={4} value={createForm.imagesText} onChange={(e) => setCreateForm({ ...createForm, imagesText: e.target.value })} placeholder="https://...
https://..." />
                </Field>
              </div>

              <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btnPrimary" disabled={busy} onClick={createListing}>
                  {busy ? 'جاري الحفظ…' : 'حفظ العرض'}
                </button>
              </div>

              {createdId ? (
                <div className="col-12"><div className="badge ok">تمت الإضافة ✅ رقم: {createdId}</div></div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800 }}>إدارة العروض</div>
              <button className="btn" onClick={loadList}>تحديث</button>
            </div>

            {loadingList ? (
              <div className="muted" style={{ marginTop: 10 }}>جاري التحميل…</div>
            ) : list.length === 0 ? (
              <div className="muted" style={{ marginTop: 10 }}>لا توجد عروض.</div>
            ) : (
              <div style={{ marginTop: 10, display:'grid', gap:10 }}>
                {list.map(item => (
                  <div key={item.id} className="card">
                    <div className="row" style={{ justifyContent:'space-between' }}>
                      <div style={{ fontWeight: 900 }}>{item.title || 'عرض'}</div>
                      {statusBadge(item.status)}
                    </div>
                    <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {item.neighborhood || '—'} • {item.plan || '—'} • {item.part || '—'}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 900 }}>{formatPriceSAR(item.price)}</div>

                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn" onClick={() => adminUpdateListing(item.id, { status:'available' }).then(loadList)}>متاح</button>
                      <button className="btn" onClick={() => adminUpdateListing(item.id, { status:'reserved' }).then(loadList)}>محجوز</button>
                      <button className="btnDanger" onClick={() => adminUpdateListing(item.id, { status:'sold' }).then(loadList)}>مباع</button>
                      <button className="btn" onClick={() => adminUpdateListing(item.id, { status:'rented' }).then(loadList)}>مؤجر</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
    </div>
  );
}
