'use client';

// ===================== الواردات =====================
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

// ===================== الثوابت =====================
const MAX_FILES = 30;

// حدود مدينة جدة التقريبية
const JEDDAH_BOUNDS = {
  north: 22.0,
  south: 21.0,
  east: 39.5,
  west: 39.0,
};

// افتراضي: شمال جدة (أبحر)
const DEFAULT_CENTER = { lat: 21.7628, lng: 39.0994 };

// ===================== مساعدات =====================
function Field({ label, hint, children }) {
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

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function inJeddahBounds(lat, lng) {
  return (
    lat <= JEDDAH_BOUNDS.north &&
    lat >= JEDDAH_BOUNDS.south &&
    lng <= JEDDAH_BOUNDS.east &&
    lng >= JEDDAH_BOUNDS.west
  );
}

function toFixed6(n) {
  if (!Number.isFinite(n)) return '';
  return Number(n).toFixed(6);
}

// ===================== تحميل Google Maps (Singleton) =====================
let __gmapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (__gmapsPromise) return __gmapsPromise;

  __gmapsPromise = new Promise((resolve, reject) => {
    const cbName = `__gmaps_add_cb_${Date.now()}`;
    window[cbName] = () => {
      try {
        resolve(window.google.maps);
      } catch (e) {
        reject(e);
      } finally {
        try {
          delete window[cbName];
        } catch {}
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('تعذر تحميل سكربت Google Maps.'));
    document.head.appendChild(script);
  });

  return __gmapsPromise;
}

// ===================== صفحة إضافة إعلان =====================
export default function AddListingPage() {
  const fb = getFirebase();
  const auth = fb?.auth;
  const storage = fb?.storage;

  // Auth
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState('');

  const isAdmin = isAdminUser(user);

  // Form
  const [editingId, setEditingId] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [saveOk, setSaveOk] = useState('');

  const [form, setForm] = useState({
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
    direct: false,
    lat: '',
    lng: '',
    images: [],
  });

  // Upload
  const [queue, setQueue] = useState([]); // {id,name,progress,url}
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  // Map
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapErr, setMapErr] = useState('');
  const [boundsMsg, setBoundsMsg] = useState('');
  const [geoErr, setGeoErr] = useState('');

  // ===================== Auth handlers =====================
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setChecking(false);
    });
    return () => unsub();
  }, [auth]);

  const login = async (e) => {
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

  const logout = async () => {
    setAuthErr('');
    setAuthBusy(true);
    try {
      await signOut(auth);
    } catch {
      setAuthErr('تعذر تسجيل الخروج.');
    } finally {
      setAuthBusy(false);
    }
  };

  // ===================== رفع الملفات =====================
  const uploadFiles = useCallback(
    async (files) => {
      setUploadErr('');
      if (!storage) {
        setUploadErr('Storage غير جاهز.');
        return;
      }

      const arr = Array.from(files || []);
      if (!arr.length) return;

      const available = Math.max(0, MAX_FILES - (form.images?.length || 0) - queue.length);
      const picked = arr.slice(0, available);
      if (!picked.length) return;

      setUploading(true);

      for (const file of picked) {
        const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_');
        const path = `abhur_uploads/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`;
        const refObj = storageRef(storage, path);
        const id = path;

        // add queue item
        setQueue((prev) => [...prev, { id, name: file.name || 'file', progress: 0, url: '' }]);

        await new Promise((resolve) => {
          const task = uploadBytesResumable(refObj, file);

          task.on(
            'state_changed',
            (snap) => {
              const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
              setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, progress: pct } : x)));
            },
            () => {
              // fail -> remove
              setQueue((prev) => prev.filter((x) => x.id !== id));
              setUploadErr('تعذر رفع بعض الملفات.');
              resolve();
            },
            async () => {
              try {
                const url = await getDownloadURL(task.snapshot.ref);
                setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, url, progress: 100 } : x)));
                setForm((p) => ({
                  ...p,
                  images: Array.from(new Set([...(p.images || []), url])),
                }));
              } catch {
                setQueue((prev) => prev.filter((x) => x.id !== id));
                setUploadErr('تعذر الحصول على رابط الملف.');
              }
              resolve();
            }
          );
        });
      }

      setUploading(false);
    },
    [storage, form.images, queue.length]
  );

  const removeImageUrl = (url) => {
    setForm((p) => ({ ...p, images: (p.images || []).filter((x) => x !== url) }));
  };

  // ===================== الخريطة =====================
  useEffect(() => {
    let alive = true;

    async function init() {
      setMapErr('');
      setBoundsMsg('');
      setGeoErr('');

      try {
        if (!apiKey) throw new Error('تعذر تحميل الخريطة. تأكد من NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
        const maps = await loadGoogleMaps(apiKey);
        if (!alive) return;

        const el = mapElRef.current;
        if (!el) return;

        const center = DEFAULT_CENTER;

        const map = new maps.Map(el, {
          center,
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          scaleControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });

        mapRef.current = map;

        const marker = new maps.Marker({
          position: center,
          map,
          draggable: true,
        });
        markerRef.current = marker;

        const applyPos = (lat, lng) => {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (!inJeddahBounds(lat, lng)) {
            setBoundsMsg('اختر موقعًا داخل حدود جدة فقط.');
            return;
          }

          setBoundsMsg('');
          setForm((p) => ({ ...p, lat: toFixed6(lat), lng: toFixed6(lng) }));
        };

        // إن كان عندنا قيم محفوظة
        const initLat = toNum(form.lat);
        const initLng = toNum(form.lng);
        if (Number.isFinite(initLat) && Number.isFinite(initLng)) {
          marker.setPosition({ lat: initLat, lng: initLng });
          map.setCenter({ lat: initLat, lng: initLng });
          applyPos(initLat, initLng);
        } else {
          marker.setPosition(center);
          map.setCenter(center);
          applyPos(center.lat, center.lng);
        }

        map.addListener('click', (e) => {
          const lat = e?.latLng?.lat?.();
          const lng = e?.latLng?.lng?.();
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          marker.setPosition({ lat, lng });
          applyPos(lat, lng);
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          const lat = pos?.lat?.();
          const lng = pos?.lng?.();
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          applyPos(lat, lng);
        });

        setMapReady(true);

        setTimeout(() => {
          try {
            maps.event.trigger(map, 'resize');
            map.setCenter(marker.getPosition());
          } catch {}
        }, 250);
      } catch (e) {
        if (!alive) return;
        setMapErr(String(e?.message || 'تعذر تحميل الخريطة.'));
        setMapReady(false);
      }
    }

    // لا تهيّئ الخريطة قبل تسجيل الدخول كأدمن (لتخفيف الحمل)
    if (user && isAdmin) init();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, user, isAdmin]);

  const useMyLocation = async () => {
    setGeoErr('');
    setBoundsMsg('');

    if (!navigator.geolocation) {
      setGeoErr('المتصفح لا يدعم تحديد الموقع.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          if (!inJeddahBounds(lat, lng)) {
            setBoundsMsg('موقعك الحالي خارج حدود جدة في الإعدادات الحالية.');
            return;
          }

          setForm((p) => ({ ...p, lat: toFixed6(lat), lng: toFixed6(lng) }));
          setBoundsMsg('');

          if (markerRef.current) markerRef.current.setPosition({ lat, lng });
          if (mapRef.current) mapRef.current.setCenter({ lat, lng });
        } catch {
          setGeoErr('تعذر استخدام موقعك الحالي.');
        }
      },
      () => setGeoErr('تعذر الحصول على موقعك الحالي.')
    );
  };

  // ===================== حفظ الإعلان =====================
  const resetForm = () => {
    setEditingId('');
    setCreatedId('');
    setSaveErr('');
    setSaveOk('');
    setUploadErr('');
    setQueue([]);
    setBoundsMsg('');
    setGeoErr('');

    setForm({
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
      direct: false,
      // ✅ نرجع لمركز أبحر بدل ما نخليها فاضية (وبما إن الإدخال صار من الخريطة فقط)
      lat: toFixed6(DEFAULT_CENTER.lat),
      lng: toFixed6(DEFAULT_CENTER.lng),
      images: [],
    });

    // إعادة الدبوس لأبحر إذا الخريطة موجودة
    try {
      if (markerRef.current) markerRef.current.setPosition(DEFAULT_CENTER);
      if (mapRef.current) mapRef.current.setCenter(DEFAULT_CENTER);
    } catch {}
  };

  const handleSave = async () => {
    setSaveErr('');
    setSaveOk('');
    setCreatedId('');

    if (!isAdmin) {
      setSaveErr('غير مصرح.');
      return;
    }

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
      direct: !!form.direct,
      lat: toNum(form.lat),
      lng: toNum(form.lng),
      images: Array.isArray(form.images) ? form.images : [],
      updatedAt: new Date(),
    };

    if (!payload.title) return setSaveErr('اكتب عنوان الإعلان.');
    if (!payload.neighborhood) return setSaveErr('اختر الحي.');

    // ✅ الآن الموقع مطلوب ويأتي من الخريطة فقط
    if (payload.lat == null || payload.lng == null) {
      return setSaveErr('حدد الموقع على الخريطة.');
    }

    if (!inJeddahBounds(payload.lat, payload.lng)) {
      return setSaveErr('الموقع خارج حدود جدة. اختر موقعًا صحيحًا.');
    }

    setSaveBusy(true);
    try {
      let id = editingId;

      if (editingId) {
        await adminUpdateListing(editingId, payload);
        id = editingId;
      } else {
        const created = await adminCreateListing(payload);
        id = created?.id || created || '';
        setEditingId(id);
      }

      setCreatedId(id || 'تم');
      setSaveOk('تم حفظ الإعلان بنجاح.');
    } catch (e) {
      setSaveErr(String(e?.message || 'تعذر حفظ الإعلان.'));
    } finally {
      setSaveBusy(false);
    }
  };

  // ===================== UI =====================
  const pricePreview = form.price ? formatPriceSAR(Number(form.price)) : '';

  if (checking) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          جاري التحقق…
        </section>
      </div>
    );
  }

  // غير مسجل
  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>إضافة إعلان</h1>
            <Link className="btn" href="/">
              الرئيسية
            </Link>
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            سجل دخول الأدمن لإضافة إعلان.
          </div>

          <form onSubmit={login} style={{ marginTop: 12 }}>
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
              <div style={{ marginTop: 10, color: 'var(--danger)', fontWeight: 900 }}>
                {authErr}
              </div>
            ) : null}

            <button className="btn btnPrimary" style={{ marginTop: 12, width: '100%' }} disabled={authBusy}>
              {authBusy ? '...' : 'دخول'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ليس أدمن
  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 950 }}>غير مصرح</div>
          <div className="muted" style={{ marginTop: 8 }}>
            هذا الحساب لا يملك صلاحية الأدمن.
          </div>

          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Link className="btn" href="/">
              الرئيسية
            </Link>
            <button className="btn" onClick={logout} disabled={authBusy}>
              تسجيل خروج
            </button>
          </div>
        </section>
      </div>
    );
  }

  // أدمن
  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
      <section className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 950 }}>إضافة إعلان</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn" href="/admin">
              لوحة الأدمن
            </Link>
            <button className="btn" onClick={logout} disabled={authBusy}>
              خروج
            </button>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          هذه صفحة إضافة إعلان سريعة (بدون قائمة إدارة).
        </div>
      </section>

      {/* رسائل */}
      {saveErr ? (
        <section
          className="card"
          style={{
            marginTop: 12,
            padding: 12,
            borderColor: 'rgba(220,38,38,.22)',
            background: 'rgba(220,38,38,.06)',
            fontWeight: 900,
          }}
        >
          {saveErr}
        </section>
      ) : null}

      {saveOk ? (
        <section
          className="card"
          style={{
            marginTop: 12,
            padding: 12,
            borderColor: 'rgba(16,185,129,.25)',
            background: 'rgba(16,185,129,.07)',
            fontWeight: 900,
          }}
        >
          {saveOk}
          {createdId ? (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              رقم الإعلان: <b>{createdId}</b>
            </div>
          ) : null}
        </section>
      ) : null}

      {uploadErr ? (
        <section
          className="card"
          style={{
            marginTop: 12,
            padding: 12,
            borderColor: 'rgba(220,38,38,.22)',
            background: 'rgba(220,38,38,.06)',
            fontWeight: 850,
          }}
        >
          {uploadErr}
        </section>
      ) : null}

      {/* النموذج */}
      <section className="card" style={{ padding: 14, marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 950 }}>{editingId ? 'تعديل إعلان' : 'إضافة إعلان جديد'}</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={resetForm} disabled={saveBusy || uploading}>
              مسح
            </button>
            <button className="btn btnPrimary" type="button" onClick={handleSave} disabled={saveBusy || uploading}>
              {saveBusy ? 'جاري الحفظ…' : uploading ? 'انتظر اكتمال الرفع…' : editingId ? 'تحديث الإعلان' : 'نشر الإعلان'}
            </button>
          </div>
        </div>

        <Field label="نوع الصفقة">
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {DEAL_TYPES.map((d) => (
              <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="radio"
                  name="dealType"
                  checked={form.dealType === d.key}
                  onChange={() => setForm((p) => ({ ...p, dealType: d.key }))}
                />
                <span style={{ fontWeight: 900 }}>{d.label}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="نوع العقار">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
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

        <Field label="عنوان الإعلان">
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="مثال: أرض في الياقوت مخطط العمرية "
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="السعر (ريال)">
            <input
              className="input"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="مثال: 950000"
            />
            {pricePreview ? (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                المعاينة: {pricePreview}
              </div>
            ) : null}
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
        </div>

        <Field label="الحي">
          <select
            className="input"
            value={form.neighborhood}
            onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
          >
            <option value="">اختر الحي</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="المخطط (اختياري)">
            <input
              className="input"
              value={form.plan}
              onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
              placeholder="مثال:بايزيد"
            />
          </Field>

          <Field label="الجزء (اختياري)">
            <input
              className="input"
              value={form.part}
              onChange={(e) => setForm((p) => ({ ...p, part: e.target.value }))}
              placeholder="مثال: ج /  ..."
            />
          </Field>
        </div>

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

        <Field label="رقم ترخيص الإعلان (اختياري)">
          <input
            className="input"
            value={form.licenseNumber}
            onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))}
            placeholder="مثال: 1234567890"
          />
        </Field>

        <Field label="مباشر من المالك؟">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={!!form.direct}
              onChange={(e) => setForm((p) => ({ ...p, direct: e.target.checked }))}
            />
            <span style={{ fontWeight: 900 }}>مباشر</span>
          </label>
        </Field>

        <Field label="الوصف (اختياري)">
          <textarea
            className="input"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            style={{ resize: 'vertical' }}
            placeholder="اكتب تفاصيل إضافية…"
          />
        </Field>

        {/* رفع */}
        <div style={{ marginTop: 12 }}>
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
                onChange={(e) => uploadFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {uploading ? (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              جاري رفع الملفات…
            </div>
          ) : null}

          {/* قائمة الرفع */}
          {queue.length ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {queue.map((q) => (
                <div key={q.id} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.name}
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {q.url ? 'تم الرفع' : `جاري الرفع: ${q.progress || 0}%`}
                      </div>
                    </div>
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
                </div>
              ))}
            </div>
          ) : null}

          {/* الصور النهائية */}
          {Array.isArray(form.images) && form.images.length ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>الصور/الملفات المرفوعة</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {form.images.map((url) => (
                  <div
                    key={url}
                    className="card"
                    style={{
                      width: 160,
                      padding: 10,
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      background: '#fff',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: '100%',
                        height: 110,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: '#f1f5f9',
                        display: 'block',
                      }}
                    />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => removeImageUrl(url)}
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* الخريطة */}
        <div style={{ marginTop: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 950 }}>الموقع على الخريطة</div>
            <button className="btn" type="button" onClick={useMyLocation} style={{ fontSize: 12, padding: '6px 10px' }}>
              موقعي الحالي
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              position: 'relative',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(214, 179, 91, 0.28)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <div
              ref={mapElRef}
              style={{
                width: '100%',
                height: typeof window !== 'undefined' && window.innerWidth <= 768 ? 320 : 420,
              }}
            />

            {!mapReady && !mapErr ? (
              <div
                className="muted"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 14,
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.18)',
                  backdropFilter: 'blur(6px)',
                  fontWeight: 800,
                }}
              >
                جاري تحميل الخريطة…
              </div>
            ) : null}

            {mapErr ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 14,
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.18)',
                  backdropFilter: 'blur(6px)',
                  fontWeight: 800,
                  color: '#b42318',
                }}
              >
                {mapErr}
              </div>
            ) : null}
          </div>

          {/* ✅ بديل حقول الإدخال اليدوي: عرض الإحداثيات فقط */}
          <div className="muted" style={{ marginTop: 10, fontSize: 12, fontWeight: 900 }}>
            الإحداثيات (تلقائيًا من الخريطة):{' '}
            <span style={{ fontWeight: 950, color: 'var(--text)' }}>
              {form.lat || '—'} , {form.lng || '—'}
            </span>
          </div>

          {boundsMsg ? (
            <div className="muted" style={{ marginTop: 8, color: '#b45f06', fontSize: 12, fontWeight: 'bold' }}>
              {boundsMsg}
            </div>
          ) : null}

          {geoErr ? (
            <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>
              {geoErr}
            </div>
          ) : null}
        </div>

        {/* زر حفظ سفلي */}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btnPrimary" type="button" onClick={handleSave} disabled={saveBusy || uploading}>
            {saveBusy ? 'جاري الحفظ…' : uploading ? 'انتظر اكتمال الرفع…' : editingId ? 'تحديث الإعلان' : 'نشر الإعلان'}
          </button>
        </div>
      </section>

      <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        تقدر ترجع إلى <Link href="/admin">لوحة الأدمن</Link> أو <Link href="/listings">كل العروض</Link>.
      </div>
    </div>
  );
}
