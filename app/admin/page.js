'use client';

/**
 * لوحة تحكم الأدمن - إدارة عقارات أبحر
 * (نسخة محسنة لتفادي ظهور النصوص بدون تنسيق)
 * - إزالة <style jsx>
 * - إلغاء الاعتماد على كلاسات غير موجودة (grid/col-*/dropzone/progress/map..)
 * - استخدام inline styles + كلاسات المشروع الأساسية
 */

// ===================== الواردات =====================
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, deleteDoc, getFirestore } from 'firebase/firestore';

import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing, fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

// ===================== ثوابت =====================
const LISTINGS_COLLECTION = 'abhur_listings';
const MAX_FILES = 30;

// ===================== مكونات مساعدة =====================
function Field({ label, children, hint }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6, fontWeight: 900 }}>
        {label}
      </div>
      {children}
      {hint ? (
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />;
}

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ===================== رفع الملفات =====================
function useUploader(storage) {
  const [queue, setQueue] = useState([]); // [{name, progress, url, refPath}]
  const [uploading, setUploading] = useState(false);

  const removeAt = useCallback(
    async (idx) => {
      const item = queue[idx];
      if (!item) return;
      // حذف من Storage إذا عنده refPath
      if (item.refPath) {
        try {
          await deleteObject(storageRef(storage, item.refPath));
        } catch {}
      }
      setQueue((prev) => prev.filter((_, i) => i !== idx));
    },
    [queue, storage]
  );

  const addFiles = useCallback(
    async (files) => {
      if (!storage) return;

      const arr = Array.from(files || []);
      if (!arr.length) return;

      const available = Math.max(0, MAX_FILES - queue.length);
      const picked = arr.slice(0, available);
      if (!picked.length) return;

      setUploading(true);

      for (const file of picked) {
        const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_');
        const path = `abhur_uploads/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`;
        const refObj = storageRef(storage, path);

        // إضافة عنصر مؤقت في القائمة
        const localId = `${path}`;
        setQueue((prev) => [
          ...prev,
          { id: localId, name: file.name || 'file', progress: 0, url: '', refPath: path },
        ]);

        await new Promise((resolve) => {
          const task = uploadBytesResumable(refObj, file);

          task.on(
            'state_changed',
            (snap) => {
              const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
              setQueue((prev) =>
                prev.map((x) => (x.id === localId ? { ...x, progress: pct } : x))
              );
            },
            () => {
              // فشل: نحذف العنصر
              setQueue((prev) => prev.filter((x) => x.id !== localId));
              resolve();
            },
            async () => {
              try {
                const url = await getDownloadURL(task.snapshot.ref);
                setQueue((prev) =>
                  prev.map((x) => (x.id === localId ? { ...x, url, progress: 100 } : x))
                );
              } catch {
                setQueue((prev) => prev.filter((x) => x.id !== localId));
              }
              resolve();
            }
          );
        });
      }

      setUploading(false);
    },
    [storage, queue.length]
  );

  const urls = useMemo(() => queue.map((q) => q.url).filter(Boolean), [queue]);

  return {
    queue,
    urls,
    uploading,
    addFiles,
    removeAt,
    setQueue,
  };
}

// ===================== نموذج إنشاء/تعديل =====================
function CreateEditForm({ editingId, form, setForm, onSave, onReset, busy, createdId, uploader }) {
  const isEdit = !!editingId;

  const onPickNeighborhood = (v) => setForm((p) => ({ ...p, neighborhood: v }));

  return (
    <section className="card" style={{ padding: 14, marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 950 }}>{isEdit ? 'تعديل الإعلان' : 'إضافة إعلان'}</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={onReset} disabled={busy}>
            مسح
          </button>
          <button className="btn btnPrimary" type="button" onClick={onSave} disabled={busy}>
            {busy ? '...' : isEdit ? 'حفظ التعديل' : 'حفظ الإعلان'}
          </button>
        </div>
      </div>

      {createdId ? (
        <div
          className="card"
          style={{
            marginTop: 12,
            padding: 12,
            borderColor: 'rgba(16,185,129,.25)',
            background: 'rgba(16,185,129,.07)',
          }}
        >
          <div style={{ fontWeight: 900 }}>تم الحفظ ✅</div>
          <div className="muted" style={{ marginTop: 6 }}>
            رقم الإعلان: <b>{createdId}</b>
          </div>
        </div>
      ) : null}

      {(uploader.uploading || busy) && (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {busy ? 'جاري حفظ الإعلان…' : 'جاري رفع الملفات…'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
        {/* خطوة 1 */}
        <div>
          <Field label="اختر نوع الصفقة">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {DEAL_TYPES.map((deal) => (
                <label key={deal.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="dealType"
                    checked={form.dealType === deal.key}
                    onChange={() => setForm((p) => ({ ...p, dealType: deal.key }))}
                  />
                  <span style={{ fontWeight: 900 }}>{deal.label}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* خطوة 2 */}
        <div>
          <Field label="نوع العقار">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={form.propertyType === t ? 'btn btnPrimary' : 'btn'}
                  onClick={() => setForm((p) => ({ ...p, propertyType: t }))}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* أساسيات */}
        <div>
          <Divider />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="عنوان الإعلان">
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="مثال: أرض في الياقوت 99جس مباشر"
              />
            </Field>

            <Field label="السعر (ريال)">
              <input
                className="input"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value.replace(/[^\d]/g, '') }))}
                placeholder="مثال: 950000"
              />
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                {form.price ? `المعاينة: ${formatPriceSAR(Number(form.price))}` : ''}
              </div>
            </Field>

            <Field label="المساحة (م²) - اختياري">
              <input
                className="input"
                inputMode="numeric"
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value.replace(/[^\d]/g, '') }))}
                placeholder="مثال: 400"
              />
            </Field>

            <Field label="الحي">
              <select className="input" value={form.neighborhood} onChange={(e) => onPickNeighborhood(e.target.value)}>
                <option value="">اختر الحي</option>
                {NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="المخطط (اختياري)">
              <input
                className="input"
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                placeholder="مثال: 99جس"
              />
            </Field>

            <Field label="الجزء (اختياري)">
              <input
                className="input"
                value={form.part}
                onChange={(e) => setForm((p) => ({ ...p, part: e.target.value }))}
                placeholder="مثال: أ / ب / 1ط ..."
              />
            </Field>

            <Field label="حالة الإعلان">
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 6 }}>{statusBadge(form.status)}</div>
            </Field>

            <Field label="تصنيف (سكني/تجاري) - اختياري">
              <select
                className="input"
                value={form.propertyClass}
                onChange={(e) => setForm((p) => ({ ...p, propertyClass: e.target.value }))}
              >
                <option value="">بدون</option>
                {PROPERTY_CLASSES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="وصف الإعلان (اختياري)">
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                style={{ resize: 'vertical' }}
                placeholder="اكتب تفاصيل إضافية…"
              />
            </Field>

            <Field label="رقم ترخيص الإعلان (اختياري)">
              <input
                className="input"
                value={form.licenseNumber}
                onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                placeholder="مثال: 1234567890"
              />
            </Field>
          </div>
        </div>

        {/* رفع الصور/فيديو */}
        <div>
          <Divider />
          <div
            style={{
              border: '1px dashed rgba(15,23,42,0.25)',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: 14,
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 950 }}>رفع صور/فيديو</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                (حد أقصى {MAX_FILES} ملف)
              </div>
            </div>

            <label className="btn btnPrimary" style={{ cursor: 'pointer' }}>
              اختر ملفات
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => uploader.addFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {uploader.queue.length ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {uploader.queue.map((q, idx) => (
                <div key={q.id || `${q.name}-${idx}`} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.name}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {q.url ? 'تم الرفع' : `جاري الرفع: ${q.progress || 0}%`}
                      </div>
                    </div>

                    <button className="btn" type="button" onClick={() => uploader.removeAt(idx)}>
                      حذف
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(214,179,91,0.22)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, q.progress || 0)}%`,
                        height: '100%',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
                        borderRadius: 999,
                      }}
                    />
                  </div>

                  {q.url ? (
                    <div className="muted" style={{ marginTop: 8, fontSize: 12, wordBreak: 'break-all' }}>
                      {q.url}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              لم يتم اختيار ملفات.
            </div>
          )}
        </div>

        {/* الموقع (بدون خريطة هنا لتفادي تعقيد إضافي — يحفظ lat/lng فقط) */}
        <div>
          <Divider />
          <Field label="الموقع (Lat/Lng) - اختياري" hint="يمكنك إدخال الإحداثيات يدويًا الآن، أو نضيف خريطة محسنة في ملف مستقل لاحقًا.">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: '1 1 200px' }}
                value={form.lat}
                onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                placeholder="Latitude"
              />
              <input
                className="input"
                style={{ flex: '1 1 200px' }}
                value={form.lng}
                onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                placeholder="Longitude"
              />
            </div>
          </Field>
        </div>
      </div>
    </section>
  );
}

// ===================== إدارة العروض =====================
function ManageListings({ list, loadingList, actionBusyId, onLoad, onDelete, onEdit }) {
  return (
    <section className="card" style={{ padding: 14, marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 950 }}>إدارة العروض</div>
        <button className="btn" type="button" onClick={onLoad} disabled={loadingList}>
          {loadingList ? '...' : 'تحديث'}
        </button>
      </div>

      {loadingList ? (
        <div className="muted" style={{ marginTop: 10 }}>
          جاري تحميل العروض…
        </div>
      ) : null}

      {!loadingList && (!list || list.length === 0) ? (
        <div className="muted" style={{ marginTop: 10 }}>
          لا توجد عروض حالياً.
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(list || []).map((it) => (
          <div key={it.id} className="card" style={{ padding: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.title || 'بدون عنوان'}
                </div>
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  {it.neighborhood ? `${it.neighborhood} • ` : ''}
                  {it.dealType === 'sale' ? 'بيع' : it.dealType === 'rent' ? 'إيجار' : it.dealType || ''}
                  {it.price ? ` • ${formatPriceSAR(it.price)}` : ''}
                </div>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => onEdit(it.id)}
                  disabled={actionBusyId === it.id}
                >
                  تعديل
                </button>
                <button
                  className="btn btnDanger"
                  type="button"
                  onClick={() => onDelete(it)}
                  disabled={actionBusyId === it.id}
                >
                  حذف
                </button>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>{statusBadge(it.status)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===================== الصفحة الرئيسية للأدمن =====================
export default function AdminPage() {
  const { auth, storage } = getFirebase();
  const db = getFirestore();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // login
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // tabs
  const [tab, setTab] = useState('create'); // create | manage

  // form
  const [editingId, setEditingId] = useState('');
  const [createdId, setCreatedId] = useState('');

  const [saving, setSaving] = useState(false);

  const initialForm = useMemo(
    () => ({
      dealType: 'sale',
      propertyType: 'أرض',
      propertyClass: '',
      title: '',
      price: '',
      area: '',
      neighborhood: '',
      plan: '',
      part: '',
      status: 'available',
      description: '',
      licenseNumber: '',
      lat: '',
      lng: '',
      images: [],
    }),
    []
  );

  const [form, setForm] = useState(initialForm);

  // list
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');

  const uploader = useUploader(storage);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setChecking(false);
    });
    return () => unsub();
  }, [auth]);

  const isAdmin = isAdminUser(user);

  const resetForm = useCallback(() => {
    setEditingId('');
    setCreatedId('');
    setForm(initialForm);
    uploader.setQueue([]);
  }, [initialForm, uploader]);

  const doLogin = async (e) => {
    e.preventDefault();
    setAuthErr('');
    setAuthBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setPass('');
    } catch {
      setAuthErr('بيانات الدخول غير صحيحة.');
    } finally {
      setAuthBusy(false);
    }
  };

  const doLogout = async () => {
    setAuthBusy(true);
    setAuthErr('');
    try {
      await signOut(auth);
    } catch {
      setAuthErr('تعذر تسجيل الخروج.');
    } finally {
      setAuthBusy(false);
    }
  };

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetchListings({ includeLegacy: false, onlyPublic: false, max: 300 });
      setList(Array.isArray(res) ? res : []);
    } catch {
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'manage' && isAdmin) loadList();
  }, [tab, isAdmin, loadList]);

  const startEdit = useCallback(
    (id) => {
      const it = (list || []).find((x) => x.id === id || x.docId === id);
      if (!it) return;

      setTab('create');
      setCreatedId('');
      setEditingId(id);

      setForm((p) => ({
        ...p,
        dealType: it.dealType || 'sale',
        propertyType: it.propertyType || 'أرض',
        propertyClass: it.propertyClass || '',
        title: it.title || '',
        price: it.price != null ? String(it.price) : '',
        area: it.area != null ? String(it.area) : '',
        neighborhood: it.neighborhood || '',
        plan: it.plan || '',
        part: it.part || '',
        status: it.status || 'available',
        description: it.description || '',
        licenseNumber: it.licenseNumber || '',
        lat: it.lat != null ? String(it.lat) : '',
        lng: it.lng != null ? String(it.lng) : '',
        images: Array.isArray(it.images) ? it.images : [],
      }));

      // مزامنة الصور الحالية داخل queue (عرض فقط)
      const imgs = Array.isArray(it.images) ? it.images : [];
      uploader.setQueue(
        imgs.map((url, i) => ({
          id: `existing_${id}_${i}`,
          name: `existing_${i + 1}`,
          progress: 100,
          url,
          refPath: '', // لا نحذف ملفات قديمة من هنا إلا إذا كانت موجودة فعلاً في storage
        }))
      );
    },
    [list, uploader]
  );

  const saveListing = useCallback(async () => {
    setSaving(true);
    setAuthErr('');
    try {
      const payload = {
        dealType: form.dealType || 'sale',
        propertyType: form.propertyType || 'أرض',
        propertyClass: form.propertyClass || '',
        title: String(form.title || '').trim(),
        price: toNum(form.price),
        area: toNum(form.area),
        neighborhood: String(form.neighborhood || '').trim(),
        plan: String(form.plan || '').trim(),
        part: String(form.part || '').trim(),
        status: form.status || 'available',
        description: String(form.description || '').trim(),
        licenseNumber: String(form.licenseNumber || '').trim(),
        lat: toNum(form.lat),
        lng: toNum(form.lng),
        images: uploader.urls.length ? uploader.urls : (Array.isArray(form.images) ? form.images : []),
        updatedAt: new Date(),
      };

      if (!payload.title) {
        setAuthErr('اكتب عنوان الإعلان.');
        setSaving(false);
        return;
      }

      if (!payload.neighborhood) {
        setAuthErr('اختر الحي.');
        setSaving(false);
        return;
      }

      let id = editingId;

      if (editingId) {
        await adminUpdateListing(editingId, payload);
      } else {
        const created = await adminCreateListing(payload);
        id = created?.id || created || '';
      }

      setCreatedId(id || 'تم');
      setEditingId(id || editingId);
      await loadList();
    } catch (e) {
      setAuthErr(String(e?.message || 'تعذر حفظ الإعلان.'));
    } finally {
      setSaving(false);
    }
  }, [editingId, form, uploader.urls, loadList]);

  const deleteListing = useCallback(
    async (it) => {
      const id = it?.id || it?.docId;
      if (!id) return;

      setActionBusyId(id);
      try {
        // حذف وثيقة Firestore
        await deleteDoc(doc(db, LISTINGS_COLLECTION, id));
        await loadList();
      } catch {
        // ignore
      } finally {
        setActionBusyId('');
      }
    },
    [db, loadList]
  );

  if (checking) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          جاري التحقق…
        </section>
      </div>
    );
  }

  // ====== غير مسجل ======
  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>تسجيل دخول الأدمن</h1>

          <form onSubmit={doLogin} style={{ marginTop: 12 }}>
            <Field label="البريد">
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>

            <Field label="كلمة المرور">
              <input
                className="input"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
              />
            </Field>

            {authErr ? (
              <div style={{ marginTop: 10, color: 'var(--danger)', fontWeight: 900 }}>{authErr}</div>
            ) : null}

            <button className="btn btnPrimary" style={{ marginTop: 12, width: '100%' }} disabled={authBusy}>
              {authBusy ? '...' : 'دخول'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ====== ليس أدمن ======
  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 950 }}>غير مصرح</div>
          <div className="muted" style={{ marginTop: 8 }}>
            هذا الحساب لا يملك صلاحية الأدمن.
          </div>

          <button className="btn" style={{ marginTop: 12 }} onClick={doLogout} disabled={authBusy}>
            تسجيل خروج
          </button>
        </section>
      </div>
    );
  }

  // ====== أدمن ======
  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <section className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              لوحة تحكم الأدمن
            </div>
          </div>

          <button className="btn" type="button" onClick={doLogout} disabled={authBusy}>
            خروج
          </button>
        </div>

        {authErr ? (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(220,38,38,.22)', background: 'rgba(220,38,38,.06)' }}>
            <div style={{ fontWeight: 900 }}>{authErr}</div>
          </div>
        ) : null}

        <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button className={tab === 'create' ? 'btn btnPrimary' : 'btn'} onClick={() => setTab('create')} type="button">
            إضافة/تعديل
          </button>
          <button className={tab === 'manage' ? 'btn btnPrimary' : 'btn'} onClick={() => setTab('manage')} type="button">
            إدارة العروض
          </button>
        </div>
      </section>

      {tab === 'create' ? (
        <CreateEditForm
          editingId={editingId}
          form={form}
          setForm={setForm}
          onSave={saveListing}
          onReset={() => resetForm()}
          busy={saving}
          createdId={createdId}
          uploader={uploader}
        />
      ) : (
        <ManageListings
          list={list}
          loadingList={loadingList}
          actionBusyId={actionBusyId}
          onLoad={loadList}
          onDelete={deleteListing}
          onEdit={startEdit}
        />
      )}
    </div>
  );
}
