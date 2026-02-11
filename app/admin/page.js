'use client';

import { useEffect, useMemo, useState } from 'react';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  ref as storageRef,
  refFromURL,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

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

function parseLines(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeWebsiteUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  // إذا كتب بدون https
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const EMPTY_FORM = {
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
};

function itemToForm(item) {
  // دعم أكثر من شكل بيانات (images[], coords[], lat/lng)
  const coords = Array.isArray(item?.coords) ? item.coords : null;
  const lat = item?.lat ?? (coords ? coords[0] : '');
  const lng = item?.lng ?? (coords ? coords[1] : '');

  const imagesArr = Array.isArray(item?.images) ? item.images : [];
  const imagesText = imagesArr.length ? imagesArr.join('\n') : '';

  return {
    ...EMPTY_FORM,
    title: item?.title || '',
    neighborhood: item?.neighborhood || '',
    plan: item?.plan || '',
    part: item?.part || '',
    dealType: item?.dealType || 'sale',
    propertyType: item?.propertyType || 'أرض',
    propertyClass: item?.propertyClass || '',
    area: item?.area != null ? String(item.area) : '',
    price: item?.price != null ? String(item.price) : '',
    lat: lat != null && lat !== '' ? String(lat) : '',
    lng: lng != null && lng !== '' ? String(lng) : '',
    status: item?.status || 'available',
    direct: typeof item?.direct === 'boolean' ? item.direct : true,
    websiteUrl: item?.websiteUrl || '',
    description: item?.description || '',
    imagesText,
  };
}

export default function AdminPage() {
  const fb = getFirebase();
  const auth = fb?.auth;
  const storage = fb?.storage;

  let db = fb?.db || null;
  if (!db) {
    try {
      db = fb?.app ? getFirestore(fb.app) : getFirestore();
    } catch {
      db = null;
    }
  }

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState('create');
  const [createdId, setCreatedId] = useState('');

  const [editingId, setEditingId] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [actionErr, setActionErr] = useState('');

  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  const imageUrls = useMemo(() => parseLines(createForm.imagesText), [createForm.imagesText]);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, [auth]);

  function resetForm() {
    setCreateForm(EMPTY_FORM);
    setEditingId('');
    setCreatedId('');
    setSelectedFiles([]);
    setUploadErr('');
    setActionErr('');
  }

  function startEdit(item) {
    setActionErr('');
    setUploadErr('');
    setCreatedId('');
    setEditingId(item?.id || '');
    setCreateForm(itemToForm(item));
    setTab('create');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    resetForm();
  }

  function removeImageUrl(url) {
    setCreateForm((p) => {
      const urls = parseLines(p.imagesText).filter((u) => u !== url);
      return { ...p, imagesText: urls.join('\n') };
    });
  }

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

      setCreateForm((p) => {
        const existing = parseLines(p.imagesText);
        const merged = [...existing, ...urls].join('\n');
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

  async function saveListing() {
    setBusy(true);
    setActionErr('');
    setCreatedId('');

    try {
      const images = parseLines(createForm.imagesText);

      const websiteUrl = normalizeWebsiteUrl(createForm.websiteUrl);

      const payload = {
        title: String(createForm.title || '').trim(),
        neighborhood: String(createForm.neighborhood || '').trim(),
        plan: String(createForm.plan || '').trim(),
        part: String(createForm.part || '').trim(),
        dealType: createForm.dealType || 'sale',
        propertyType: createForm.propertyType || 'أرض',
        propertyClass: String(createForm.propertyClass || '').trim() || '',
        area: createForm.area ? Number(createForm.area) : null,
        price: createForm.price ? Number(createForm.price) : null,
        lat: createForm.lat ? Number(createForm.lat) : null,
        lng: createForm.lng ? Number(createForm.lng) : null,
        status: createForm.status || 'available',
        direct: !!createForm.direct,
        websiteUrl: websiteUrl || null,
        description: String(createForm.description || '').trim(),
        images,
      };

      if (editingId) {
        await adminUpdateListing(editingId, payload);
        setCreatedId(editingId);
      } else {
        const id = await adminCreateListing(payload);
        setCreatedId(id);
      }

      // بعد الحفظ: روح لإدارة العروض وحدث القائمة
      setEditingId('');
      setCreateForm(EMPTY_FORM);
      setTab('manage');
      await loadList();
    } catch (err) {
      console.error(err);
      setActionErr('حصل خطأ أثناء الحفظ. راجع إعداد Firebase وقواعد Firestore.');
    } finally {
      setBusy(false);
    }
  }

  async function loadList() {
    setLoadingList(true);
    setActionErr('');
    try {
      const data = await fetchListings({ filters: {}, onlyPublic: false });
      setList(data || []);
    } catch (e) {
      console.error(e);
      setActionErr('تعذر تحميل العروض.');
    } finally {
      setLoadingList(false);
    }
  }

  async function deleteListing(item) {
    const id = item?.id;
    if (!id) return;
    const ok = typeof window !== 'undefined' ? window.confirm('هل أنت متأكد من حذف هذا الإعلان نهائيًا؟') : false;
    if (!ok) return;

    setBusy(true);
    setActionErr('');

    try {
      // محاولة حذف الصور من Storage (اختياري) — لو فشل ما يمنع حذف الإعلان
      const urls = Array.isArray(item?.images) ? item.images : [];
      if (storage && urls.length) {
        for (const url of urls) {
          try {
            const r = refFromURL(storage, url);
            await deleteObject(r);
          } catch (e) {
            // تجاهل الأخطاء (قد تكون صلاحيات/رابط خارجي/صورة محذوفة)
            console.warn('delete image failed', e);
          }
        }
      }

      if (!db) {
        throw new Error('Firestore غير جاهز في getFirebase().');
      }
      await deleteDoc(doc(db, LISTINGS_COLLECTION, id));

      // لو كنت تعدّل نفس الإعلان، ألغِ التعديل
      if (editingId === id) cancelEdit();

      await loadList();
    } catch (err) {
      console.error(err);
      setActionErr('فشل حذف الإعلان. تأكد أن قواعد Firestore تسمح delete للأدمن.');
    } finally {
      setBusy(false);
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
          <button className={tab === 'create' ? 'btnPrimary' : 'btn'} onClick={() => setTab('create')}>
            {editingId ? 'تعديل عرض' : 'إضافة عرض'}
          </button>
          <button className={tab === 'manage' ? 'btnPrimary' : 'btn'} onClick={() => setTab('manage')}>إدارة العروض</button>
        </div>
      </section>

      {actionErr ? (
        <section className="card" style={{ marginTop: 12, borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
          {actionErr}
        </section>
      ) : null}

      {tab === 'create' ? (
        <section className="card" style={{ marginTop: 12 }}>
          {editingId ? (
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900 }}>وضع تعديل ✅</div>
                <div className="muted" style={{ fontSize: 13 }}>رقم الإعلان: {editingId}</div>
              </div>
              <button className="btn" type="button" onClick={cancelEdit}>إلغاء التعديل</button>
            </div>
          ) : null}

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

            <div className="col-3">
              <Field label="خط العرض (lat) — اختياري" hint="لو أضفت lat/lng سيظهر العرض على صفحة الخريطة.">
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
              <Field label="رابط الموقع للإعلان (اختياري)" hint="إذا عندك رابط إعلان خارجي أو رابط موقع/خرائط، اكتب الرابط هنا.">
                <input
                  className="input"
                  type="url"
                  dir="ltr"
                  value={createForm.websiteUrl}
                  onChange={(e) => setCreateForm({ ...createForm, websiteUrl: e.target.value })}
                  placeholder="https://example.com/..."
                />
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
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
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
                    {uploading ? `جاري الرفع… (${selectedFiles.length})` : 'رفع الصور'}
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
              <Field label={`روابط الصور (كل رابط في سطر) — ${imageUrls.length}`} hint="يمكنك لصق روابط جاهزة، أو استخدم رفع الصور بالأعلى.">
                <textarea
                  className="input"
                  rows={4}
                  value={createForm.imagesText}
                  onChange={(e) => setCreateForm({ ...createForm, imagesText: e.target.value })}
                  placeholder="https://...\nhttps://..."
                />

                {imageUrls.length ? (
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {imageUrls.slice(0, 12).map((url) => (
                      <div key={url} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff', position: 'relative' }}>
                        <img src={url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                        <button
                          type="button"
                          className="btnDanger"
                          onClick={() => removeImageUrl(url)}
                          style={{ position: 'absolute', top: 6, left: 6, padding: '6px 10px', borderRadius: 10 }}
                          title="حذف الصورة من الإعلان"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Field>
            </div>

            <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btnPrimary" disabled={busy} onClick={saveListing}>
                {busy ? 'جاري الحفظ…' : (editingId ? 'تحديث الإعلان' : 'حفظ الإعلان')}
              </button>
            </div>

            {createdId ? (
              <div className="col-12">
                <div className="badge ok">{editingId ? 'تم التحديث ✅' : 'تم الحفظ ✅'} رقم: {createdId}</div>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800 }}>إدارة العروض</div>
            <button className="btn" onClick={loadList} disabled={busy}>تحديث</button>
          </div>

          {loadingList ? (
            <div className="muted" style={{ marginTop: 10 }}>جاري التحميل…</div>
          ) : list.length === 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>لا توجد عروض.</div>
          ) : (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {list.map((item) => (
                <div key={item.id} className="card">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 900 }}>{item.title || 'عرض'}</div>
                    {statusBadge(item.status)}
                  </div>

                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    {item.neighborhood || '—'} • {item.plan || '—'} • {item.part || '—'}
                  </div>

                  <div style={{ marginTop: 8, fontWeight: 900 }}>{formatPriceSAR(item.price)}</div>

                  {item.websiteUrl ? (
                    <div style={{ marginTop: 8 }}>
                      <a className="muted" href={item.websiteUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                        فتح رابط الإعلان
                      </a>
                    </div>
                  ) : null}

                  <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => startEdit(item)} disabled={busy}>تعديل</button>
                    <button className="btnDanger" onClick={() => deleteListing(item)} disabled={busy}>حذف</button>

                    <div style={{ flex: 1 }} />

                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'available' }).then(loadList)} disabled={busy}>متاح</button>
                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'reserved' }).then(loadList)} disabled={busy}>محجوز</button>
                    <button className="btnDanger" onClick={() => adminUpdateListing(item.id, { status: 'sold' }).then(loadList)} disabled={busy}>مباع</button>
                    <button className="btn" onClick={() => adminUpdateListing(item.id, { status: 'canceled' }).then(loadList)} disabled={busy}>ملغي</button>
                  </div>

                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    رقم: {item.id}
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
