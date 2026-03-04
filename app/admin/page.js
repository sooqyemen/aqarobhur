'use client';

/**
 * لوحة تحكم الأدمن - إدارة عقارات أبحر
 * - inline styles + كلاسات المشروع الأساسية
 * - رفع الصور/الفيديو: تتبع بالـ id + إظهار الأخطاء + إعادة اختيار نفس الملف
 * - الخريطة: إصلاح اختفاء الخريطة بعد اختيار الموقع (عدم إعادة التهيئة مع كل render)
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, deleteDoc, getFirestore } from 'firebase/firestore';

import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing, fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

const LISTINGS_COLLECTION = 'abhur_listings';
const MAX_FILES = 30;

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

// ===================== خريطة اختيار الموقع =====================

const JEDDAH_BOUNDS = { north: 22.0, south: 21.0, east: 39.5, west: 39.0 };
const DEFAULT_CENTER = { lat: 21.7628, lng: 39.0994 };

function isFiniteNum(n) {
  return typeof n === 'number' && Number.isFinite(n);
}
function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}
function inJeddahBounds(lat, lng) {
  return (
    lat <= JEDDAH_BOUNDS.north &&
    lat >= JEDDAH_BOUNDS.south &&
    lng <= JEDDAH_BOUNDS.east &&
    lng >= JEDDAH_BOUNDS.west
  );
}

let __gmapsPromise = null;
function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
  if (__gmapsPromise) return __gmapsPromise;

  __gmapsPromise = new Promise((resolve, reject) => {
    const scriptId = 'google-maps-js';
    const existing = document.getElementById(scriptId);

    if (existing) {
      const check = () => {
        if (window.google && window.google.maps) resolve(window.google.maps);
        else setTimeout(check, 60);
      };
      check();
      return;
    }

    const cbName = `__gmaps_admin_cb_${Date.now()}`;
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
    script.id = scriptId;
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

function MapPicker({ lat, lng, onChange }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const listenersRef = useRef([]);
  const lastValidRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [boundsMsg, setBoundsMsg] = useState('');
  const [geoErr, setGeoErr] = useState('');

  // ✅ تثبيت onChange (عشان ما تتغير applyPos وتتسبب بإعادة تهيئة الخريطة)
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ✅ applyPos ثابتة (لا تعتمد على onChange مباشرة)
  const applyPos = useCallback((lat0, lng0, { pan = true } = {}) => {
    if (!isFiniteNum(lat0) || !isFiniteNum(lng0)) return;

    if (!inJeddahBounds(lat0, lng0)) {
      setBoundsMsg('اختر موقعًا داخل حدود جدة فقط.');
      const back = lastValidRef.current || DEFAULT_CENTER;
      try {
        markerRef.current?.setPosition?.(back);
        mapRef.current?.panTo?.(back);
      } catch {}
      return;
    }

    setBoundsMsg('');
    lastValidRef.current = { lat: lat0, lng: lng0 };

    // ✅ استدعاء onChange من ref
    try {
      onChangeRef.current?.({ lat: round6(lat0), lng: round6(lng0) });
    } catch {}

    try {
      markerRef.current?.setPosition?.({ lat: lat0, lng: lng0 });
      if (pan) mapRef.current?.panTo?.({ lat: lat0, lng: lng0 });
    } catch {}
  }, []);

  // ✅ تهيئة الخريطة مرة واحدة فقط (يعالج “الصندوق الأبيض”)
  useEffect(() => {
    let alive = true;

    async function init() {
      setErr('');
      setBoundsMsg('');
      setGeoErr('');

      // لو الخريطة غير مهيأة، أظهر شاشة التحميل
      if (!mapRef.current) setReady(false);

      try {
        if (!apiKey) throw new Error('تعذر تحميل الخريطة. تأكد من NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
        const maps = await loadGoogleMaps(apiKey);
        if (!alive) return;

        const el = mapElRef.current;
        if (!el) return;

        if (mapRef.current && markerRef.current) {
          setReady(true);
          return;
        }

        const has = isFiniteNum(lat) && isFiniteNum(lng) && inJeddahBounds(lat, lng);
        const center = has ? { lat, lng } : DEFAULT_CENTER;

        const map = new maps.Map(el, {
          center,
          zoom: has ? 16 : 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          scaleControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });

        const marker = new maps.Marker({
          position: center,
          map,
          draggable: true,
        });

        mapRef.current = map;
        markerRef.current = marker;

        listenersRef.current.push(
          map.addListener('click', (e) => {
            const lat1 = e?.latLng?.lat?.();
            const lng1 = e?.latLng?.lng?.();
            if (!isFiniteNum(lat1) || !isFiniteNum(lng1)) return;
            applyPos(lat1, lng1);
          })
        );

        listenersRef.current.push(
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            const lat1 = pos?.lat?.();
            const lng1 = pos?.lng?.();
            if (!isFiniteNum(lat1) || !isFiniteNum(lng1)) return;
            applyPos(lat1, lng1);
          })
        );

        if (has) {
          lastValidRef.current = { lat, lng };
          // بدون setForm هنا حتى لا يصير loop
          try {
            marker.setPosition(center);
          } catch {}
        } else {
          lastValidRef.current = null;
        }

        setReady(true);

        setTimeout(() => {
          try {
            maps.event.trigger(map, 'resize');
            map.setCenter(marker.getPosition());
          } catch {}
        }, 250);
      } catch (e) {
        if (!alive) return;
        setErr(String(e?.message || 'تعذر تحميل الخريطة.'));
        setReady(false);
      }
    }

    init();

    return () => {
      alive = false;
      try {
        (listenersRef.current || []).forEach((l) => l?.remove?.());
      } catch {}
      listenersRef.current = [];
      try {
        markerRef.current?.setMap?.(null);
      } catch {}
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, applyPos, lat, lng]);

  // تحديث الماركر إذا تغيّرت الإحداثيات من الخارج
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!isFiniteNum(lat) || !isFiniteNum(lng)) return;
    if (!inJeddahBounds(lat, lng)) return;

    try {
      const pos = markerRef.current.getPosition();
      const same = pos && Math.abs(pos.lat() - lat) < 1e-7 && Math.abs(pos.lng() - lng) < 1e-7;
      if (same) return;

      markerRef.current.setPosition({ lat, lng });
      mapRef.current.panTo({ lat, lng });
      lastValidRef.current = { lat, lng };
      if ((mapRef.current.getZoom?.() || 0) < 16) mapRef.current.setZoom(16);
      window.google?.maps?.event?.trigger?.(mapRef.current, 'resize');
    } catch {}
  }, [lat, lng]);

  const useMyLocation = useCallback(() => {
    setGeoErr('');
    setBoundsMsg('');

    if (!navigator?.geolocation) {
      setGeoErr('المتصفح لا يدعم تحديد الموقع.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat1 = pos?.coords?.latitude;
        const lng1 = pos?.coords?.longitude;
        if (!isFiniteNum(lat1) || !isFiniteNum(lng1)) {
          setGeoErr('تعذر استخدام موقعك الحالي.');
          return;
        }
        applyPos(lat1, lng1);
      },
      () => setGeoErr('تعذر الحصول على موقعك الحالي.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [applyPos]);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="muted" style={{ fontSize: 12 }}>
          اضغط على الخريطة لتحديد الموقع أو اسحب الدبوس. (داخل جدة فقط)
        </div>
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

        {!ready && !err ? (
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
              background: 'rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(6px)',
              fontWeight: 800,
            }}
          >
            جاري تحميل الخريطة…
          </div>
        ) : null}

        {err ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 14,
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(6px)',
              fontWeight: 800,
              color: '#b42318',
              direction: 'rtl',
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      {boundsMsg ? (
        <div className="muted" style={{ marginTop: 8, color: '#b45f06', fontSize: 12, fontWeight: 900 }}>
          {boundsMsg}
        </div>
      ) : null}

      {geoErr ? (
        <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>
          {geoErr}
        </div>
      ) : null}
    </div>
  );
}

// ===================== رفع الملفات =====================
function useUploader(storage) {
  const [queue, setQueue] = useState([]); // [{id,name,progress,url,refPath,error}]
  const [uploading, setUploading] = useState(false);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const removeAt = useCallback(
    async (idx) => {
      const current = queueRef.current || [];
      const item = current[idx];
      if (!item) return;

      setQueue((prev) => prev.filter((_, i) => i !== idx));

      if (storage && item.refPath) {
        try {
          await deleteObject(storageRef(storage, item.refPath));
        } catch {}
      }
    },
    [storage]
  );

  const addFiles = useCallback(
    async (files) => {
      if (!storage) return;

      const arr = Array.from(files || []);
      if (!arr.length) return;

      const currentLen = (queueRef.current || []).length;
      const available = Math.max(0, MAX_FILES - currentLen);
      const picked = arr.slice(0, available);
      if (!picked.length) return;

      setUploading(true);

      for (const file of picked) {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_');
        const refPath = `abhur_uploads/${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`;
        const refObj = storageRef(storage, refPath);

        setQueue((prev) => [...prev, { id, name: file.name || 'file', progress: 0, url: '', refPath, error: '' }]);

        await new Promise((resolve) => {
          const task = uploadBytesResumable(refObj, file);

          task.on(
            'state_changed',
            (snap) => {
              const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
              setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, progress: pct } : x)));
            },
            (err) => {
              setQueue((prev) =>
                prev.map((x) => (x.id === id ? { ...x, error: String(err?.message || 'فشل رفع الملف') } : x))
              );
              resolve();
            },
            async () => {
              try {
                const url = await getDownloadURL(task.snapshot.ref);
                setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, url, progress: 100 } : x)));
              } catch (e) {
                setQueue((prev) =>
                  prev.map((x) => (x.id === id ? { ...x, error: String(e?.message || 'تعذر استخراج الرابط') } : x))
                );
              }
              resolve();
            }
          );
        });
      }

      setUploading(false);
    },
    [storage]
  );

  const urls = useMemo(() => queue.map((q) => q.url).filter(Boolean), [queue]);

  return { queue, setQueue, uploading, addFiles, removeAt, urls };
}

// ===================== نموذج إنشاء/تعديل =====================
function CreateEditForm({ editingId, form, setForm, onSave, onReset, busy, createdId, uploader }) {
  const { queue, uploading, addFiles, removeAt } = uploader;

  const pricePreview = form.price ? formatPriceSAR(Number(form.price)) : '';

  // ✅ تثبيت onChange للـ MapPicker (هذا وحده كان كفيل بحل “الصندوق الأبيض”)
  const onMapPick = useCallback(
    ({ lat, lng }) => setForm((p) => ({ ...p, lat: String(lat), lng: String(lng) })),
    [setForm]
  );

  return (
    <section className="card" style={{ padding: 14, marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontWeight: 950 }}>{editingId ? 'تعديل إعلان' : 'إضافة إعلان جديد'}</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={onReset} disabled={busy || uploading}>
            مسح
          </button>
          <button className="btn btnPrimary" type="button" onClick={onSave} disabled={busy || uploading}>
            {busy ? 'جاري الحفظ…' : uploading ? 'انتظر اكتمال الرفع…' : editingId ? 'تحديث الإعلان' : 'نشر الإعلان'}
          </button>
        </div>
      </div>

      {createdId ? (
        <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(16,185,129,.25)', background: 'rgba(16,185,129,.07)', fontWeight: 900 }}>
          تم حفظ الإعلان. رقم الإعلان: <b>{createdId}</b>
        </div>
      ) : null}

      <Field label="نوع الصفقة">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          {DEAL_TYPES.map((d) => (
            <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="dealType" checked={form.dealType === d.key} onChange={() => setForm((p) => ({ ...p, dealType: d.key }))} />
              <span style={{ fontWeight: 900 }}>{d.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="نوع العقار">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {PROPERTY_TYPES.map((t) => (
            <button key={t} type="button" className={form.propertyType === t ? 'btn btnPrimary' : 'btn'} onClick={() => setForm((p) => ({ ...p, propertyType: t }))}>
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="تصنيف (سكني/تجاري) - اختياري">
        <select className="input" value={form.propertyClass} onChange={(e) => setForm((p) => ({ ...p, propertyClass: e.target.value }))}>
          <option value="">بدون</option>
          {PROPERTY_CLASSES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="عنوان الإعلان">
        <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="مثال: أرض في الياقوت مخطط العمرية" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="السعر (ريال)">
          <input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value.replace(/[^\d]/g, '') }))} placeholder="مثال: 950000" />
          {pricePreview ? <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>المعاينة: {pricePreview}</div> : null}
        </Field>

        <Field label="المساحة (م²) - اختياري">
          <input className="input" inputMode="numeric" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value.replace(/[^\d]/g, '') }))} placeholder="مثال: 400" />
        </Field>
      </div>

      <Field label="الحي">
        <select className="input" value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}>
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
          <input className="input" value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))} placeholder="مثال: بايزيد" />
        </Field>

        <Field label="الجزء (اختياري)">
          <input className="input" value={form.part} onChange={(e) => setForm((p) => ({ ...p, part: e.target.value }))} placeholder="مثال: ج / ..." />
        </Field>
      </div>

      <Field label="حالة الإعلان">
        <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <div style={{ marginTop: 6 }}>{statusBadge(form.status)}</div>
      </Field>

      <Field label="رقم ترخيص الإعلان (اختياري)">
        <input className="input" value={form.licenseNumber} onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))} placeholder="مثال: 1234567890" />
      </Field>

      <Field label="الوصف (اختياري)">
        <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} placeholder="اكتب تفاصيل إضافية…" />
      </Field>

      <Divider />
      <Field label="رفع صور/فيديو" hint={`حد أقصى ${MAX_FILES} ملف`}>
        <label className="btn btnPrimary" style={{ cursor: 'pointer' }}>
          اختر ملفات
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>

        {queue.length ? (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map((q, idx) => (
              <div key={q.id || `${q.name}_${idx}`} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {q.url ? 'تم الرفع' : q.error ? 'فشل الرفع' : `جاري الرفع: ${q.progress || 0}%`}
                    </div>
                    {q.error ? (
                      <div className="muted" style={{ marginTop: 6, color: 'var(--danger)', fontSize: 12 }}>
                        {q.error}
                      </div>
                    ) : null}
                  </div>
                  <button className="btn" type="button" onClick={() => removeAt(idx)} style={{ fontSize: 12 }}>
                    حذف
                  </button>
                </div>

                <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: 'rgba(214,179,91,0.22)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, q.progress || 0)}%`, height: '100%', background: 'linear-gradient(135deg, var(--primary), var(--primary2))', borderRadius: 999 }} />
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
      </Field>

      <Divider />
      <Field label="الموقع على الخريطة" hint="حدد الموقع من الخريطة (داخل جدة فقط).">
        <MapPicker lat={toNum(form.lat)} lng={toNum(form.lng)} onChange={onMapPick} />

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
            الإحداثيات المختارة:{' '}
            <span style={{ color: 'var(--text)', fontWeight: 950 }}>
              {form.lat ? form.lat : '—'} , {form.lng ? form.lng : '—'}
            </span>
          </div>

          <button className="btn" type="button" onClick={() => setForm((p) => ({ ...p, lat: '', lng: '' }))} style={{ fontSize: 12, padding: '6px 10px' }}>
            مسح الموقع
          </button>
        </div>
      </Field>
    </section>
  );
}

// ===================== إدارة العروض =====================
function ManageListings({ list, loadingList, actionBusyId, onLoad, onDelete, onEdit }) {
  const dangerBtnStyle = {
    border: '1px solid rgba(220,38,38,.35)',
    background: 'rgba(220,38,38,.08)',
    color: '#b42318',
  };

  return (
    <section className="card" style={{ padding: 14, marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 950 }}>إدارة العروض</div>
        <button className="btn" type="button" onClick={onLoad} disabled={loadingList}>
          {loadingList ? 'تحميل…' : 'تحديث القائمة'}
        </button>
      </div>

      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
        {list.length ? `عدد العروض: ${list.length}` : 'لا توجد عروض حالياً.'}
      </div>

      {list.length ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((it) => {
            const id = it?.id || it?.docId || '';
            const busy = actionBusyId === id;

            return (
              <div key={id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 240 }}>
                    <div style={{ fontWeight: 950 }}>{it.title || '—'}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {it.neighborhood ? `الحي: ${it.neighborhood}` : ''}{' '}
                      {it.price != null ? `• السعر: ${formatPriceSAR(Number(it.price))}` : ''}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn" type="button" onClick={() => onEdit(id)} disabled={busy}>
                      تعديل
                    </button>
                    <button className="btn" type="button" onClick={() => onDelete(it)} style={dangerBtnStyle} disabled={busy}>
                      {busy ? '...' : 'حذف'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default function AdminPage() {
  const fb = getFirebase();
  const auth = fb?.auth;
  const storage = fb?.storage;
  const db = getFirestore();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState('');

  const [tab, setTab] = useState('create'); // create | manage

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

  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');

  const uploader = useUploader(storage);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setChecking(false);
      return;
    }
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

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await fetchListings({ onlyPublic: false, includeLegacy: false, max: 500 });
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const editListing = useCallback(
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

      const imgs = Array.isArray(it.images) ? it.images : [];
      uploader.setQueue(
        imgs.map((url, i) => ({
          id: `existing_${id}_${i}`,
          name: `existing_${i + 1}`,
          progress: 100,
          url,
          refPath: '',
          error: '',
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
        images: uploader.urls.length ? uploader.urls : Array.isArray(form.images) ? form.images : [],
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
        await deleteDoc(doc(db, LISTINGS_COLLECTION, id));
        await loadList();
      } finally {
        setActionBusyId('');
      }
    },
    [db, loadList]
  );

  if (checking) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>جاري التحقق…</section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 950 }}>لوحة الأدمن</div>
          </div>

          <div className="muted" style={{ marginTop: 8 }}>
            سجل دخول الأدمن لإضافة/إدارة الإعلانات.
          </div>

          <form onSubmit={login} style={{ marginTop: 12 }}>
            <Field label="البريد">
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>

            <Field label="كلمة المرور">
              <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
            </Field>

            {authErr ? <div style={{ marginTop: 10, color: 'var(--danger)', fontWeight: 900 }}>{authErr}</div> : null}

            <button className="btn btnPrimary" style={{ marginTop: 12, width: '100%' }} disabled={authBusy}>
              {authBusy ? '...' : 'دخول'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 950 }}>غير مصرح</div>
          <div className="muted" style={{ marginTop: 8 }}>هذا الحساب لا يملك صلاحية الأدمن.</div>
          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn" onClick={logout} disabled={authBusy}>تسجيل خروج</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 30 }}>
      <section className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 950 }}>لوحة الأدمن</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" onClick={logout} disabled={authBusy}>خروج</button>
          </div>
        </div>

        {authErr ? (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(220,38,38,.22)', background: 'rgba(220,38,38,.06)', fontWeight: 900 }}>
            {authErr}
          </div>
        ) : null}

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button className={tab === 'create' ? 'btn btnPrimary' : 'btn'} type="button" onClick={() => setTab('create')}>
            إضافة/تعديل
          </button>
          <button className={tab === 'manage' ? 'btn btnPrimary' : 'btn'} type="button" onClick={() => setTab('manage')}>
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
          onReset={resetForm}
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
          onEdit={editListing}
        />
      )}
    </div>
  );
}
