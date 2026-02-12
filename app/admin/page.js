'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { doc, deleteDoc, getFirestore } from 'firebase/firestore';

import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing, fetchListings } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

const LISTINGS_COLLECTION = 'abhur_listings';
const MAX_FILES = 30; // بدون ما نعرضه للمستخدم

function Field({ label, children, hint }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
      {children}
      {hint ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}

function uniq(arr) {
  return Array.from(new Set((arr || []).map((x) => String(x || '').trim()).filter(Boolean)));
}

function toNumberOrNull(v) {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function toTextOrEmpty(v) {
  return v == null ? '' : String(v);
}

function extractStoragePathFromDownloadURL(url) {
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

function extractLatLngFromUrl(url) {
  // يدعم روابط قوقل ماب الشائعة:
  // - .../@lat,lng,..
  // - ?q=lat,lng
  // - ?query=lat,lng
  try {
    const s = String(url || '').trim();
    if (!s) return { lat: null, lng: null };

    // @lat,lng
    const m1 = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m1) return { lat: Number(m1[1]), lng: Number(m1[2]) };

    // q=lat,lng OR query=lat,lng
    const u = new URL(s);
    const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
    const m2 = q.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m2) return { lat: Number(m2[1]), lng: Number(m2[2]) };
  } catch {
    // ignore
  }
  return { lat: null, lng: null };
}

function nowId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function buildGoogleMapsUrl(lat, lng) {
  const a = round6(lat);
  const b = round6(lng);
  return `https://www.google.com/maps?q=${a},${b}`;
}

// ===================== Google Maps loader (ONLY) =====================
let __gmapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps requires browser environment'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (__gmapsPromise) return __gmapsPromise;

  __gmapsPromise = new Promise((resolve, reject) => {
    try {
      if (!apiKey) {
        reject(new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'));
        return;
      }

      const id = 'google-maps-js';
      const existing = document.getElementById(id);
      if (existing) {
        const check = () => (window.google?.maps ? resolve(window.google.maps) : setTimeout(check, 60));
        check();
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=ar&region=SA`;

      script.onload = () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error('Google Maps loaded but window.google.maps not found'));
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));

      document.head.appendChild(script);
    } catch (e) {
      reject(e);
    }
  });

  return __gmapsPromise;
}

function approxSame(a, b, eps = 1e-7) {
  return Math.abs(a - b) <= eps;
}

function MapPicker({ value, onChange }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const listenersRef = useRef([]);

  const [mapErr, setMapErr] = useState('');
  const [geoErr, setGeoErr] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Default center (شمال جدة تقريبًا)
  const defaultCenter = useMemo(() => ({ lat: 21.75, lng: 39.12 }), []);
  const defaultZoom = 13;

  const current = useMemo(() => {
    const v = value && isFiniteNumber(value.lat) && isFiniteNumber(value.lng) ? value : null;
    return v;
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setMapErr('');
      try {
        const gmaps = await loadGoogleMaps(apiKey);
        if (cancelled) return;
        if (!mapElRef.current) return;
        if (mapRef.current) return;

        const center = current ? { lat: current.lat, lng: current.lng } : { lat: defaultCenter.lat, lng: defaultCenter.lng };

        const map = new gmaps.Map(mapElRef.current, {
          center,
          zoom: current ? 16 : defaultZoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          zoomControl: true,
          zoomControlOptions: { position: gmaps.ControlPosition.RIGHT_CENTER },
        });

        const marker = new gmaps.Marker({
          map,
          position: center,
          draggable: true,
        });

        const emit = (lat, lng) => {
          const a = round6(lat);
          const b = round6(lng);
          onChange?.({ lat: a, lng: b });
        };

        // click on map
        listenersRef.current.push(
          map.addListener('click', (e) => {
            if (!e?.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition({ lat, lng });
            emit(lat, lng);
          })
        );

        // drag marker
        listenersRef.current.push(
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (!pos) return;
            emit(pos.lat(), pos.lng());
          })
        );

        mapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);
      } catch (e) {
        console.error(e);
        const msg = String(e?.message || '');
        if (msg.includes('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')) {
          setMapErr('مفتاح Google Maps غير موجود. أضف NEXT_PUBLIC_GOOGLE_MAPS_API_KEY في Vercel/.env.local');
        } else {
          setMapErr('تعذر تحميل خريطة Google. تأكد من المفتاح وتفعيل Google Maps JavaScript API والسماح بالاتصال بـ maps.googleapis.com');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        listenersRef.current.forEach((l) => l?.remove?.());
        listenersRef.current = [];
      } catch {}
      try {
        if (markerRef.current) markerRef.current.setMap(null);
      } catch {}
      markerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value to map/marker
  useEffect(() => {
    try {
      const map = mapRef.current;
      const marker = markerRef.current;
      if (!map || !marker) return;
      if (!current) return;

      const pos = marker.getPosition();
      const curLat = pos?.lat?.();
      const curLng = pos?.lng?.();
      if (typeof curLat === 'number' && typeof curLng === 'number') {
        if (approxSame(curLat, current.lat) && approxSame(curLng, current.lng)) return;
      }

      marker.setPosition({ lat: current.lat, lng: current.lng });
      map.panTo({ lat: current.lat, lng: current.lng });
      if ((map.getZoom?.() || 0) < 16) map.setZoom(16);
    } catch {}
  }, [current]);

  async function useMyLocation() {
    setGeoErr('');
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setGeoErr('المتصفح لا يدعم تحديد الموقع.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = round6(pos.coords.latitude);
          const lng = round6(pos.coords.longitude);
          onChange?.({ lat, lng });
        },
        (err) => {
          console.warn(err);
          setGeoErr('لم يتم السماح بتحديد الموقع أو حدث خطأ في GPS.');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } catch (e) {
      console.error(e);
      setGeoErr('تعذر تحديد موقعك.');
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          اختر الموقع بالنقر على الخريطة أو اسحب العلامة. سيتم حفظ الإحداثيات بدقة.
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={useMyLocation}>استخدم موقعي الحالي</button>
        </div>
      </div>

      <div className="mapWrap" style={{ marginTop: 10 }}>
        <div ref={mapElRef} className="mapEl" />
        {!mapReady && !mapErr ? (
          <div className="mapOverlay muted">جاري تحميل الخريطة…</div>
        ) : null}
        {mapErr ? (
          <div className="mapOverlay" style={{ color: '#b42318' }}>{mapErr}</div>
        ) : null}
      </div>

      {geoErr ? (
        <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>{geoErr}</div>
      ) : null}

      <style jsx>{`
        .mapWrap {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(214, 179, 91, 0.28);
          background: rgba(255,255,255,0.03);
          min-height: 360px;
        }
        .mapEl {
          width: 100%;
          height: 360px;
        }
        .mapOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          text-align: center;
          background: rgba(0,0,0,0.18);
          backdrop-filter: blur(6px);
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

// ===================== Page =====================
export default function AdminPage() {
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

  // ✅ ملفات الصور قبل الرفع
  // { id, file, preview, selected, progress, status: 'ready'|'uploading'|'done'|'error', error? }
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef = useRef(null);

  const emptyForm = useMemo(
    () => ({
      title: '',
      neighborhood: '',
      plan: '',
      part: '',
      dealType: 'sale',
      propertyType: 'أرض',
      propertyClass: '',
      area: '',
      price: '',
      status: 'available',
      direct: true,
      websiteUrl: '', // رابط موقع العقار
      lat: '', // ✅ يتم حفظه تلقائيًا من الخريطة/الرابط
      lng: '', // ✅ يتم حفظه تلقائيًا من الخريطة/الرابط
      description: '',
      images: [], // URLs
    }),
    []
  );

  const [form, setForm] = useState(emptyForm);
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, [auth]);

  // تنظيف object URLs
  useEffect(() => {
    return () => {
      queue.forEach((q) => {
        try {
          if (q?.preview) URL.revokeObjectURL(q.preview);
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(files) {
    setUploadErr('');
    const incoming = Array.from(files || []).filter(Boolean);
    if (!incoming.length) return;

    setQueue((prev) => {
      const left = Math.max(0, MAX_FILES - prev.length);
      const slice = incoming.slice(0, left);
      const next = slice.map((file) => ({
        id: nowId(),
        file,
        preview: URL.createObjectURL(file),
        selected: true,
        progress: 0,
        status: 'ready',
        error: '',
      }));
      return [...prev, ...next];
    });
  }

  function removeQueued(id) {
    setQueue((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.preview) {
        try {
          URL.revokeObjectURL(it.preview);
        } catch {}
      }
      return prev.filter((x) => x.id !== id);
    });
  }

  function toggleQueued(id) {
    setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, selected: !x.selected } : x)));
  }

  function clearQueue() {
    setQueue((prev) => {
      prev.forEach((it) => {
        try {
          if (it?.preview) URL.revokeObjectURL(it.preview);
        } catch {}
      });
      return [];
    });
  }

  async function uploadSelectedImages() {
    setUploadErr('');

    if (!user) {
      setUploadErr('لا يمكن رفع الصور قبل تسجيل الدخول.');
      return;
    }
    if (!storage) {
      setUploadErr('Firebase Storage غير مُعدّ. تأكد من NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET وتمكين Storage في Firebase.');
      return;
    }
    const selected = queue.filter((q) => q.selected && q.status !== 'done');
    if (!selected.length) {
      setUploadErr('حدد صورة واحدة على الأقل للرفع.');
      return;
    }

    setUploading(true);
    try {
      const urls = [];

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        const file = item.file;
        const safeName = String(file.name || 'image')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_\.-]/g, '')
          .slice(0, 80);
        const path = `abhur_images/${user.uid}/${Date.now()}_${i}_${safeName}`;
        const r = storageRef(storage, path);

        // وضع uploading
        setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'uploading', progress: 0, error: '' } : x)));

        const task = uploadBytesResumable(r, file, { contentType: file.type || 'image/jpeg' });
        await new Promise((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => {
              const p = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
              setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: p } : x)));
            },
            (err) => reject(err),
            () => resolve()
          );
        });

        const url = await getDownloadURL(r);
        urls.push(url);
        setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'done', progress: 100 } : x)));
      }

      setForm((p) => ({ ...p, images: uniq([...(p.images || []), ...urls]) }));
      // بعد الرفع: نخلي الموجود "done" في الطابور، ونلغي تحديدها حتى لا يعيد رفعها بالغلط
      setQueue((prev) => prev.map((x) => (x.status === 'done' ? { ...x, selected: false } : x)));
    } catch (e) {
      console.error(e);
      setUploadErr(e?.message || 'فشل رفع الصور.');
      setQueue((prev) => prev.map((x) => (x.status === 'uploading' ? { ...x, status: 'error', error: 'فشل الرفع' } : x)));
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
    clearQueue();
    setUploadErr('');
  }

  function startEdit(item) {
    setCreatedId('');
    setEditingId(item.id);

    const images = Array.isArray(item.images) ? item.images : [];
    const urlFromItem = toTextOrEmpty(item.websiteUrl || item.website || item.url || '');
    const fromUrl = extractLatLngFromUrl(urlFromItem);

    const latFromItem = toNumberOrNull(item.lat);
    const lngFromItem = toNumberOrNull(item.lng);

    const latFinal = isFiniteNumber(latFromItem) ? latFromItem : (isFiniteNumber(fromUrl.lat) ? fromUrl.lat : null);
    const lngFinal = isFiniteNumber(lngFromItem) ? lngFromItem : (isFiniteNumber(fromUrl.lng) ? fromUrl.lng : null);

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
      status: toTextOrEmpty(item.status || 'available'),
      direct: !!item.direct,
      websiteUrl: urlFromItem,
      lat: latFinal == null ? '' : String(round6(latFinal)),
      lng: lngFinal == null ? '' : String(round6(lngFinal)),
      description: toTextOrEmpty(item.description),
      images: uniq(images),
    });

    clearQueue();
    setTab('create');
    window?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function removeImageFromForm(url) {
    setForm((p) => ({ ...p, images: (p.images || []).filter((u) => u !== url) }));
  }

  function setCoords(lat, lng, { updateUrl = true } = {}) {
    const a = round6(lat);
    const b = round6(lng);
    setForm((p) => ({
      ...p,
      lat: String(a),
      lng: String(b),
      websiteUrl: updateUrl ? buildGoogleMapsUrl(a, b) : p.websiteUrl,
    }));
  }

  function clearCoords() {
    setForm((p) => ({ ...p, lat: '', lng: '' }));
  }

  async function saveListing() {
    setBusy(true);
    setCreatedId('');
    try {
      const images = uniq(form.images || []);
      const websiteUrl = String(form.websiteUrl || '').trim();

      // ✅ أولاً: نعتمد إحداثيات الخريطة إن وجدت
      const latFromForm = toNumberOrNull(form.lat);
      const lngFromForm = toNumberOrNull(form.lng);

      let lat = isFiniteNumber(latFromForm) ? latFromForm : null;
      let lng = isFiniteNumber(lngFromForm) ? lngFromForm : null;

      // ✅ ثانياً: لو ما فيه إحداثيات من الخريطة، نجرب نلتقطها من الرابط
      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        const fromUrl = extractLatLngFromUrl(websiteUrl);
        if (isFiniteNumber(fromUrl.lat) && isFiniteNumber(fromUrl.lng)) {
          lat = fromUrl.lat;
          lng = fromUrl.lng;
        }
      }

      const hasCoords = isFiniteNumber(lat) && isFiniteNumber(lng);

      // ✅ لو عندنا إحداثيات ولا يوجد رابط، نبنيه تلقائيًا
      const finalWebsiteUrl = websiteUrl || (hasCoords ? buildGoogleMapsUrl(lat, lng) : '');

      const payload = {
        ...form,
        area: toNumberOrNull(form.area),
        price: toNumberOrNull(form.price),
        images,
        websiteUrl: finalWebsiteUrl,
        ...(hasCoords ? { lat: round6(lat), lng: round6(lng) } : {}),
      };

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
    if (db && typeof db.collection === 'function') {
      await db.collection(LISTINGS_COLLECTION).doc(listingId).delete();
      return;
    }
    if (db) {
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
        console.warn('Delete image failed:', url, e?.message || e);
      }
    }
  }

  async function deleteListing(item) {
    if (!item?.id) return;
    const ok = confirm(`تأكيد حذف الإعلان نهائيًا?\n\n${item.title || item.id}`);
    if (!ok) return;

    setActionBusyId(item.id);
    try {
      await tryDeleteImages(item);
      await hardDeleteFromFirestore(item.id);
      alert('تم حذف الإعلان ✅');
      await loadList();
    } catch (e) {
      console.error(e);
      // fallback: إخفاء بدل الحذف
      try {
        await adminUpdateListing(item.id, { status: 'canceled', archived: true });
        alert('تعذر الحذف النهائي — تم إخفاء الإعلان بدلًا من ذلك ✅');
        await loadList();
      } catch (e2) {
        console.error(e2);
        alert('فشل حذف/إخفاء الإعلان. راجع صلاحيات Firestore/Storage.');
      }
    } finally {
      setActionBusyId('');
    }
  }

  useEffect(() => {
    if (isAdmin && tab === 'manage') loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  // ===== UI helpers (dropzone) =====
  function openPicker() {
    fileInputRef.current?.click?.();
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length) addFiles(files);
  }

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

  const latNum = toNumberOrNull(form.lat);
  const lngNum = toNumberOrNull(form.lng);
  const hasCoords = isFiniteNumber(latNum) && isFiniteNumber(lngNum);

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
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>{editingId ? 'تعديل الإعلان' : 'إضافة إعلان'}</div>
            {editingId ? <button className="btn" onClick={resetToCreate}>إلغاء التعديل</button> : null}
          </div>

          {createdId ? (
            <div className="card" style={{ marginTop: 10, borderColor: 'rgba(21,128,61,.25)', background: 'rgba(21,128,61,.06)' }}>
              تم إنشاء العرض بنجاح. ID: <b>{createdId}</b>
            </div>
          ) : null}

          <div className="grid" style={{ marginTop: 10 }}>
            <div className="col-6">
              <Field label="عنوان العرض">
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: فيلا للبيع في حي الزمرد" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الحي">
                <select className="select" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}>
                  <option value="">اختر</option>
                  {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="مباشر">
                <select className="select" value={form.direct ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, direct: e.target.value === 'yes' })}>
                  <option value="yes">نعم</option>
                  <option value="no">وسيط/وكيل</option>
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="المخطط">
                <input className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="مثال: مخطط الخالدية السياحي272/ب" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الجزء">
                <input className="input" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} placeholder="مثال: الجزء ج " />
              </Field>
            </div>

            <div className="col-3">
              <Field label="بيع/إيجار">
                <select className="select" value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}>
                  {DEAL_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="نوع العقار">
                <select className="select" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                  {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="سكني/تجاري" hint="اختياري — إذا تركته (تلقائي) سيتحدد حسب نوع العقار.">
                <select className="select" value={form.propertyClass} onChange={(e) => setForm({ ...form, propertyClass: e.target.value })}>
                  <option value="">تلقائي</option>
                  {PROPERTY_CLASSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="المساحة (م²)">
                <input className="input" inputMode="numeric" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="مثال: 312" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="السعر">
                <input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="مثال: 1350000" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الحالة">
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.filter((s) => ['available', 'reserved', 'sold', 'rented'].includes(s.key)).map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* ✅ رابط الموقع + خريطة */}
            <div className="col-12">
              <Field
                label="موقع العقار على الخريطة"
                hint="حدد الموقع من الخريطة (الأفضل). ويمكنك أيضًا لصق رابط Google Maps وسيتم التقاط الإحداثيات تلقائيًا."
              >
                <div className="grid" style={{ gap: 10 }}>
                  <div>
                    <input
                      className="input"
                      value={form.websiteUrl}
                      onChange={(e) => {
                        const v = e.target.value;
                        const fromUrl = extractLatLngFromUrl(v);
                        const ok = isFiniteNumber(fromUrl.lat) && isFiniteNumber(fromUrl.lng);
                        setForm((p) => ({
                          ...p,
                          websiteUrl: v,
                          ...(ok ? { lat: String(round6(fromUrl.lat)), lng: String(round6(fromUrl.lng)) } : {}),
                        }));
                      }}
                      placeholder="https://maps.google.com/..."
                    />
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {hasCoords ? (
                          <>تم تحديد: <b>{round6(latNum)}</b>, <b>{round6(lngNum)}</b></>
                        ) : (
                          <>لم يتم تحديد موقع بعد.</>
                        )}
                      </div>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {hasCoords ? (
                          <>
                            <a className="btn" href={buildGoogleMapsUrl(latNum, lngNum)} target="_blank" rel="noreferrer">
                              فتح في خرائط Google
                            </a>
                            <button className="btnDanger" type="button" onClick={clearCoords}>مسح الموقع</button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <MapPicker
                    value={hasCoords ? { lat: latNum, lng: lngNum } : null}
                    onChange={({ lat, lng }) => setCoords(lat, lng, { updateUrl: true })}
                  />
                </div>
              </Field>
            </div>

            <div className="col-12">
              <Field label="وصف (اختياري)">
                <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل إضافية: شارع/واجهة/مميزات…" />
              </Field>
            </div>

            {/* ===== رفع الصور ===== */}
            <div className="col-12">
              <Field label="الصور" hint="اسحب الصور هنا أو اضغط (اختيار صور). بعد ذلك: حدد الصور التي تريد رفعها ثم اضغط (رفع المحدد).">
                <div
                  className="dropzone"
                  onClick={openPicker}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={onDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); }}
                >
                  <div style={{ fontWeight: 900 }}>اسحب وأفلت الصور هنا</div>
                  <div className="muted" style={{ marginTop: 6 }}>أو اضغط لاختيار الصور من الجهاز</div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    addFiles(e.target.files);
                    // reset حتى لو اختار نفس الملف مرة ثانية
                    e.target.value = '';
                  }}
                />

                <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
                  <div className="row">
                    <button className="btn" type="button" onClick={openPicker}>اختيار صور</button>
                    <button className="btnPrimary" type="button" disabled={uploading} onClick={uploadSelectedImages}>
                      {uploading ? 'جاري الرفع…' : 'رفع المحدد'}
                    </button>
                    <button className="btn" type="button" onClick={clearQueue}>تفريغ المحددات</button>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>الصورة التي تم رفعها تُضاف تلقائيًا للإعلان.</div>
                </div>

                {uploadErr ? (
                  <div className="card" style={{ marginTop: 10, borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
                    {uploadErr}
                  </div>
                ) : null}

                {queue.length ? (
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                    {queue.map((q) => (
                      <div key={q.id} className="card" style={{ padding: 10 }}>
                        <div style={{ position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={q.preview} alt="" style={{ width: '100%', height: 92, objectFit: 'cover', borderRadius: 12 }} />
                          <div className="chip">
                            <input
                              type="checkbox"
                              checked={!!q.selected}
                              onChange={() => toggleQueued(q.id)}
                              aria-label="تحديد الصورة"
                            />
                            <span style={{ fontSize: 12, fontWeight: 800 }}>تحديد</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {q.status === 'done' ? 'تم' : q.status === 'uploading' ? 'يرفع…' : q.status === 'error' ? 'فشل' : 'جاهز'}
                            </div>
                            <button className="btnDanger" type="button" onClick={() => removeQueued(q.id)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
                              حذف
                            </button>
                          </div>

                          <div className="progress" style={{ marginTop: 8 }}>
                            <div className="progressBar" style={{ width: `${Math.max(0, Math.min(100, q.progress || 0))}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Field>
            </div>

            {Array.isArray(form.images) && form.images.length ? (
              <div className="col-12">
                <Field label="صور الإعلان" hint="هذه الصور ستظهر للزوار. يمكنك حذف أي صورة من الإعلان.">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                    {form.images.map((url) => (
                      <div key={url} className="card" style={{ padding: 10 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" style={{ width: '100%', height: 92, objectFit: 'cover', borderRadius: 12 }} />
                        <button className="btnDanger" type="button" style={{ width: '100%', marginTop: 10 }} onClick={() => removeImageFromForm(url)}>
                          حذف من الإعلان
                        </button>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            ) : null}

            <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btnPrimary" disabled={busy} onClick={saveListing}>
                {busy ? 'جاري الحفظ…' : (editingId ? 'تحديث الإعلان' : 'إضافة الإعلان')}
              </button>
            </div>
          </div>

          <style jsx>{`
            .dropzone {
              border: 1px dashed rgba(214, 179, 91, 0.45);
              background: rgba(214, 179, 91, 0.06);
              border-radius: 16px;
              padding: 18px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-align: center;
            }
            .dropzone:hover {
              border-color: rgba(214, 179, 91, 0.75);
              background: rgba(214, 179, 91, 0.09);
              transform: translateY(-1px);
            }
            .chip {
              position: absolute;
              top: 10px;
              left: 10px;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 6px 10px;
              border-radius: 999px;
              border: 1px solid rgba(255,255,255,0.18);
              background: rgba(0,0,0,0.55);
              backdrop-filter: blur(10px);
            }
            .progress {
              height: 8px;
              border-radius: 999px;
              overflow: hidden;
              background: rgba(255,255,255,0.08);
              border: 1px solid rgba(255,255,255,0.12);
            }
            .progressBar {
              height: 100%;
              background: linear-gradient(135deg, var(--primary), var(--primary2));
              border-radius: 999px;
              transition: width 0.2s ease;
            }
          `}</style>
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
              {list.map((item) => (
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
