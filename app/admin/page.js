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
const MAX_FILES = 30;

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
  try {
    const s = String(url || '').trim();
    if (!s) return { lat: null, lng: null };

    const m1 = s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m1) return { lat: Number(m1[1]), lng: Number(m1[2]) };

    const u = new URL(s);
    const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
    const m2 = q.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m2) return { lat: Number(m2[1]), lng: Number(m2[2]) };
  } catch {}
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
let _gmapsPromise = null;

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps requires browser'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_gmapsPromise) return _gmapsPromise;

  _gmapsPromise = new Promise((resolve, reject) => {
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

  return _gmapsPromise;
}

function GoogleMapPicker({ value, onChange }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const listenersRef = useRef([]);

  const [mapErr, setMapErr] = useState('');
  const [geoErr, setGeoErr] = useState('');
  const [ready, setReady] = useState(false);

  // شمال جدة تقريبًا
  const defaultCenter = useMemo(() => ({ lat: 21.75, lng: 39.12 }), []);
  const initial = useMemo(() => {
    if (value && isFiniteNumber(value.lat) && isFiniteNumber(value.lng)) return value;
    return null;
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setMapErr('');
      setGeoErr('');
      try {
        const gmaps = await loadGoogleMaps(apiKey);
        if (cancelled) return;
        if (!mapElRef.current) return;
        if (mapRef.current) return;

        const center = initial ? { lat: initial.lat, lng: initial.lng } : defaultCenter;

        const map = new gmaps.Map(mapElRef.current, {
          center,
          zoom: initial ? 16 : 13,
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

        // click to set
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
          marker.addListener('dragend', (e) => {
            const pos = marker.getPosition();
            if (!pos) return;
            emit(pos.lat(), pos.lng());
          })
        );

        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      } catch (e) {
        console.error(e);
        const msg = String(e?.message || '');
        if (msg.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')) {
          setMapErr('مفتاح Google Maps غير موجود. أضف NEXT_PUBLIC_GOOGLE_MAPS_API_KEY في Vercel/.env.local');
        } else {
          setMapErr('تعذر تحميل Google Maps. تأكد من API Key وتفعيل Maps JavaScript API والسماح بالاتصال بـ maps.googleapis.com');
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

  // Sync external value -> marker/map
  useEffect(() => {
    try {
      const map = mapRef.current;
      const marker = markerRef.current;
      if (!map || !marker) return;
      if (!value || !isFiniteNumber(value.lat) || !isFiniteNumber(value.lng)) return;

      const pos = marker.getPosition();
      const curLat = pos?.lat?.();
      const curLng = pos?.lng?.();

      if (typeof curLat === 'number' && typeof curLng === 'number') {
        if (Math.abs(curLat - value.lat) < 1e-7 && Math.abs(curLng - value.lng) < 1e-7) return;
      }

      marker.setPosition({ lat: value.lat, lng: value.lng });
      map.panTo({ lat: value.lat, lng: value.lng });
      if ((map.getZoom?.() || 0) < 16) map.setZoom(16);
    } catch {}
  }, [value]);

  function useMyLocation() {
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
        () => setGeoErr('لم يتم السماح بتحديد الموقع أو حدث خطأ في GPS.'),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } catch {
      setGeoErr('تعذر تحديد موقعك.');
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="muted" style={{ fontSize: 12 }}>
          اختر الموقع بالنقر على الخريطة أو اسحب المؤشر.
        </div>
        <button className="btn" type="button" onClick={useMyLocation}>استخدم موقعي الحالي</button>
      </div>

      <div className="gmapWrap" style={{ marginTop: 10 }}>
        <div ref={mapElRef} className="gmapEl" />
        {!ready && !mapErr ? (
          <div className="gmapOverlay muted">جاري تحميل Google Maps…</div>
        ) : null}
        {mapErr ? (
          <div className="gmapOverlay" style={{ color: '#b42318' }}>{mapErr}</div>
        ) : null}
      </div>

      {geoErr ? (
        <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>{geoErr}</div>
      ) : null}

      <style jsx>{`
        .gmapWrap {
          position: relative;
          width: 100%;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(214, 179, 91, 0.28);
          background: rgba(255,255,255,0.03);
          min-height: 360px;
        }
        .gmapEl {
          width: 100%;
          height: 360px;
        }
        .gmapOverlay {
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
      websiteUrl: '',
      lat: '',
      lng: '',
      description: '',
      images: [],
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

      const latFromForm = toNumberOrNull(form.lat);
      const lngFromForm = toNumberOrNull(form.lng);

      let lat = isFiniteNumber(latFromForm) ? latFromForm : null;
      let lng = isFiniteNumber(lngFromForm) ? lngFromForm : null;

      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
        const fromUrl = extractLatLngFromUrl(websiteUrl);
        if (isFiniteNumber(fromUrl.lat) && isFiniteNumber(fromUrl.lng)) {
          lat = fromUrl.lat;
          lng = fromUrl.lng;
        }
      }

      const hasCoords = isFiniteNumber(lat) && isFiniteNumber(lng);
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
    const ok = confirm(`تأكيد حذف الإعلان نهائيًا؟\n\n${item.title || item.id}`);
    if (!ok) return;

    setActionBusyId(item.id);
    try {
      await tryDeleteImages(item);
      await hardDeleteFromFirestore(item.id);
      alert('تم حذف الإعلان ✅');
      await loadList();
    } catch (e) {
      console.error(e);
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
            {/* ... بقية الحقول كما هي ... */}

            <div className="col-12">
              <Field
                label="موقع العقار (Google Maps فقط)"
                hint="حدد الموقع من الخريطة أو الصق رابط Google Maps، وسيتم حفظ lat/lng بدقة."
              >
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
                  placeholder="https://www.google.com/maps?q=..."
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

                <div style={{ marginTop: 10 }}>
                  <GoogleMapPicker
                    value={hasCoords ? { lat: latNum, lng: lngNum } : null}
                    onChange={({ lat, lng }) => setCoords(lat, lng, { updateUrl: true })}
                  />
                </div>
              </Field>
            </div>

            {/* بقية الصفحة كما عندك (الصور/الحفظ/الإدارة) بدون تغيير */}
          </div>
        </section>
      ) : (
        <section className="card" style={{ marginTop: 12 }}>
          {/* إدارة العروض كما هي */}
        </section>
      )}
    </div>
  );
}
