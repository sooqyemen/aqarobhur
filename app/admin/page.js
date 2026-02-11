'use client';

import { useEffect, useMemo, useState } from 'react';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, deleteDoc, getFirestore } from 'firebase/firestore';
import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing, fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

const LISTINGS_COLLECTION = 'abhur_listings';

function Field({ label, children, hint }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
      {children}
      {hint ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

function uniqLines(txt) {
  return Array.from(
    new Set(
      String(txt || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

function toNumberOrNull(v) {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function toTextOrEmpty(v) {
  return v == null ? '' : String(v);
}

function extractStoragePathFromDownloadURL(url) {
  // يدعم روابط Firebase Storage الشائعة:
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media&token=...
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf('/o/');
    if (idx === -1) return '';
    const encoded = u.pathname.slice(idx + 3);
    return decodeURIComponent(encoded);
  } catch {
    return '';
  }
}

export default function AdminPage() {
  // نحاول استخراج أكبر قدر ممكن من getFirebase (بعض المشاريع ترجع db/app)
  const fb = getFirebase();
  const auth = fb?.auth;
  const storage = fb?.storage;
  const db = fb?.db || fb?.firestore;
  const app = fb?.app;

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState('create');
  const [createdId, setCreatedId] = useState('');

  const [editingId, setEditingId] = useState('');
  const [actionBusyId, setActionBusyId] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const emptyForm = useMemo(() => ({
    title: '',
    neighborhood: '',
    plan: '',
    part: '',
    dealType: 'sale',
    propertyType: 'أرض',
    propertyClass: '',
    area: '',
    price: '',
    lat: '',
    lng: '',
    status: 'available',
    direct: true,
    websiteUrl: '',
    description: '',
    imagesText: '',
  }), []);

  const [form, setForm] = useState(emptyForm);

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  const imagesPreview = useMemo(() => uniqLines(form.imagesText), [form.imagesText]);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, [auth]);

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

    setUploading(true);
    try {
      const urls = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
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

      setForm((p) => {
        const merged = uniqLines([p.imagesText, ...urls].filter(Boolean).join('\n')).join('\n');
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

  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  function resetToCreate() {
    setEditingId('');
    setCreatedId('');
    setForm(emptyForm);
    setSelectedFiles([]);
    setUploadErr('');
  }

  function startEdit(item) {
    setCreatedId('');
    setEditingId(item.id);

    const images = Array.isArray(item.images) ? item.images : [];
    const lat = item.lat ?? item.latitude ?? null;
    const lng = item.lng ?? item.longitude ?? null;

    setForm({
      ...emptyForm,
      title: toTextOrEmpty(item.title),
      neighborhood: toTextOrEmpty(item.neighborhood),
      plan: toTextOrEmpty(item.plan),
      part: toTextOrEmpty(item.part),
      dealType: toTextOrEmpty(item.dealType || 'sale'),
      propertyType: toTextOrEmpty(item.propertyType || 'أرض'),
      propertyClass: toTextOrEmpty(item.propertyClass || ''),
      area: item.area == null ? '' : String(item.area),
      price: item.price == null ? '' : String(item.price),
      lat: lat == null ? '' : String(lat),
      lng: lng == null ? '' : String(lng),
      status: toTextOrEmpty(item.status || 'available'),
      direct: !!item.direct,
      websiteUrl: toTextOrEmpty(item.websiteUrl || item.website || item.url || ''),
      description: toTextOrEmpty(item.description),
      imagesText: uniqLines(images).join('\n'),
    });

    setTab('create');
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function removeImageFromForm(url) {
    setForm((p) => {
      const next = uniqLines(p.imagesText).filter((u) => u !== url).join('\n');
      return { ...p, imagesText: next };
    });
  }

  async function saveListing() {
    setBusy(true);
    setCreatedId('');
    try {
      const images = uniqLines(form.imagesText);

      const payload = {
        ...form,
        area: toNumberOrNull(form.area),
        price: toNumberOrNull(form.price),
        lat: toNumberOrNull(form.lat),
        lng: toNumberOrNull(form.lng),
        images,
        websiteUrl: String(form.websiteUrl || '').trim(),
      };

      // نظافة بسيطة: لا نرسل imagesText للقاعدة (نحتفظ فقط بالمصفوفة images)
      delete payload.imagesText;

      if (editingId) {
        await adminUpdateListing(editingId, payload);
        alert('تم تحديث الإعلان ✅');
        await loadList();
      } else {
        const id = await adminCreateListing(payload);
        setCreatedId(id);
        alert('تمت إضافة الإعلان ✅');
      }

      resetToCreate();
    } catch (err) {
      alert('حصل خطأ أثناء حفظ الإعلان. راجع إعداد Firebase وقواعد Firestore.');
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

  async function hardDeleteFromFirestore(listingId) {
    // نحاول كل الاحتمالات المتوقعة (compat/modular/app)
    if (db && typeof db.collection === 'function') {
      // compat Firestore
      await db.collection(LISTINGS_COLLECTION).doc(listingId).delete();
      return;
    }
    if (db) {
      // modular Firestore instance
      await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId));
      return;
    }
    if (app) {
      const f = getFirestore(app);
      await deleteDoc(doc(f, LISTINGS_COLLECTION, listingId));
      return;
    }
    throw new Error('Firestore instance not found (db/app missing)');
  }

  async function tryDeleteImages(item) {
    if (!storage) return;
    const images = Array.isArray(item.images) ? item.images : [];
    for (const url of images) {
      const path = extractStoragePathFromDownloadURL(url);
      if (!path) continue;
      try {
        await deleteObject(storageRef(storage, path));
      } catch (e) {
        // ممكن تفشل لو قواعد Storage ما تسمح — نتجاهل ونكمل
        console.warn('Delete image failed:', url, e?.message || e);
      }
    }
  }

  async function deleteListing(item) {
    if (!item?.id) return;
    const ok = confirm(`تأكيد حذف الإعلان نهائيًا؟\n\n${item.title || item.id}`);
    if (!ok) return;

    setActionBusyId(item.id);
    try {
      // 1) نحاول حذف الصور (اختياري)
      await tryDeleteImages(item);

      // 2) نحذف وثيقة الإعلان
      await hardDeleteFromFirestore(item.id);

      alert('تم حذف الإعلان ✅');
      await loadList();
    } catch (e) {
      console.error(e);

      // كحل احتياطي لو الحذف النهائي فشل (بسبب عدم توفر db/app مثلاً):
      // نخفي الإعلان بتغيير الحالة إلى ملغي + archived
      try {
        await adminUpdateListing(item.id, { status: 'canceled', archived: true });
        alert('تعذر الحذف النهائي — تم إخفاء الإعلان بدلًا من ذلك ✅');
        await loadList();
      } catch (e2) {
        console.error(e2);
        alert('فشل حذف/إخفاء الإعلان. راجع صلاحيات Firestore/Storage وتأكد أن getFirebase يعيد db أو app.');
      }
    } finally {
      setActionBusyId('');
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
                <div className="card" style={{ borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>{authErr}</div>
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

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn" onClick={logout}>تسجيل خروج</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '6px 0 0' }}>لوحة الأدمن</h1>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{user.email}</div>
        </div>
        <button className="btn" onClick={logout}>تسجيل خروج</button>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <button className={tab === 'create' ? 'btnPrimary' : 'btn'} onClick={() => setTab('create')}>إضافة/تعديل عرض</button>
          <button className={tab === 'manage' ? 'btnPrimary' : 'btn'} onClick={() => setTab('manage')}>إدارة العروض</button>
        </div>
      </section>

      {tab === 'create' ? (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems:'center' }}>
            <div style={{ fontWeight: 900 }}>
              {editingId ? 'تعديل الإعلان' : 'إضافة إعلان'}
            </div>

            {editingId ? (
              <button className="btn" onClick={resetToCreate}>إلغاء التعديل</button>
            ) : null}
          </div>

          {createdId ? (
            <div className="card" style={{ marginTop: 10, borderColor:'rgba(21,128,61,.25)', background:'rgba(21,128,61,.06)' }}>
              تم إنشاء العرض بنجاح. ID: <b>{createdId}</b>
            </div>
          ) : null}

          <div className="grid" style={{ marginTop: 10 }}>
            <div className="col-6">
              <Field label="عنوان العرض">
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: أرض زاوية في الزمرد" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الحي">
                <select className="select" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}>
                  <option value="">اختر</option>
                  {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="مباشر">
                <select className="select" value={form.direct ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, direct: e.target.value === 'yes' })}>
                  <option value="yes">نعم</option>
                  <option value="no">لا</option>
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="المخطط">
                <input className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="مثال: 505 أو 99جس" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الجزء">
                <input className="input" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} placeholder="مثال: أ/ب أو 1ط" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="بيع/إيجار">
                <select className="select" value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}>
                  {DEAL_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="نوع العقار">
                <select className="select" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                  {PROPERTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="سكني/تجاري" hint="اختياري — إذا تركته (تلقائي) سيتحدد حسب نوع العقار.">
                <select className="select" value={form.propertyClass} onChange={(e) => setForm({ ...form, propertyClass: e.target.value })}>
                  <option value="">تلقائي</option>
                  {PROPERTY_CLASSES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="المساحة (م²)">
                <input className="input" inputMode="numeric" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="مثال: 600" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="السعر">
                <input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="مثال: 1200000" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="خط العرض (lat) — اختياري" hint="لو أضفت lat/lng سيظهر العرض على صفحة الخريطة.">
                <input className="input" inputMode="decimal" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="مثال: 21.7001" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="خط الطول (lng) — اختياري">
                <input className="input" inputMode="decimal" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="مثال: 39.1234" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الحالة">
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-12">
              <Field label="رابط موقع الإعلان (اختياري)" hint="مثال: رابط قوقل ماب / رابط صفحة خارجية / رابط ملف.">
                <input className="input" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://..." />
              </Field>
            </div>

            <div className="col-12">
              <Field label="وصف (اختياري)">
                <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل إضافية: شارع/واجهة/مميزات…" />
              </Field>
            </div>

            <div className="col-12">
              <Field label="رفع صور (متعدد)">
                <div className="row" style={{ alignItems: 'center' }}>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                  <button className="btnPrimary" type="button" disabled={uploading} onClick={uploadSelectedImages}>
                    {uploading ? 'جاري الرفع…' : 'رفع الصور'}
                  </button>
                </div>

                {uploadErr ? (
                  <div
                    className="card"
                    style={{
                      marginTop: 10,
                      borderColor: 'rgba(180,35,24,.25)',
                      background: 'rgba(180,35,24,.05)',
                    }}
                  >
                    {uploadErr}
                  </div>
                ) : null}
              </Field>
            </div>

            {imagesPreview.length ? (
              <div className="col-12">
                <Field label="معاينة الصور" hint="اضغط حذف لإزالة الصورة من الإعلان (لا يحذفها من التخزين إلا عند حذف الإعلان).">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                    {imagesPreview.map((url) => (
                      <div key={url} className="card" style={{ padding: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10 }} />
                        <button className="btnDanger" type="button" style={{ width: '100%', marginTop: 8 }} onClick={() => removeImageFromForm(url)}>
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            ) : null}

            <div className="col-12">
              <Field label="روابط الصور (كل رابط في سطر)" hint="يمكنك لصق روابط جاهزة، أو استخدم رفع الصور بالأعلى.">
                <textarea className="input" rows={4} value={form.imagesText} onChange={(e) => setForm({ ...form, imagesText: e.target.value })} placeholder="https://...
https://..." />
              </Field>
            </div>

            <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btnPrimary" disabled={busy} onClick={saveListing}>
                {busy ? 'جاري الحفظ…' : (editingId ? 'تحديث الإعلان' : 'إضافة الإعلان')}
              </button>
            </div>
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
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {list.map(item => (
                <div key={item.id} className="card">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 900, lineHeight: 1.3 }}>{item.title || 'عرض'}</div>
                    {statusBadge(item.status)}
                  </div>

                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    {item.neighborhood || '—'} • {item.plan || '—'} • {item.part || '—'}
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 900 }}>{formatPriceSAR(item.price)}</div>

                  <div className="row" style={{ marginTop: 10, justifyContent: 'space-between', gap: 8 }}>
                    <button className="btn" onClick={() => startEdit(item)}>تعديل</button>
                    <button className="btnDanger" disabled={actionBusyId === item.id} onClick={() => deleteListing(item)}>
                      {actionBusyId === item.id ? 'جاري الحذف…' : 'حذف'}
                    </button>
                  </div>

                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'available' }).then(loadList)}>متاح</button>
                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'reserved' }).then(loadList)}>محجوز</button>
                    <button className="btnDanger" onClick={() => adminUpdateListing(item.id, { status: 'sold' }).then(loadList)}>مباع</button>
                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'rented' }).then(loadList)}>مؤجر</button>
                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'canceled' }).then(loadList)}>ملغي</button>
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
