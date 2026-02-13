'use client';

/**
 * لوحة تحكم الأدمن - إدارة عقارات أبحر
 * refactored: أكثر احترافية وتنظيماً مع فصل المسؤوليات واستخدام hooks مخصصة
 */

// ===================== الواردات =====================
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import {
  DEAL_TYPES,
  NEIGHBORHOODS,
  PROPERTY_TYPES,
  STATUS_OPTIONS,
  PROPERTY_CLASSES,
} from '@/lib/taxonomy';
import { formatPriceSAR, statusBadge } from '@/lib/format';

// ===================== الثوابت =====================
const LISTINGS_COLLECTION = 'abhur_listings';
const MAX_FILES = 30;
const UPLOAD_CONCURRENCY = 2;
const IMAGE_TIMEOUT_MS = 180000;
const VIDEO_TIMEOUT_MS = 600000;
const STALL_MS = 20000;
const WATCH_INTERVAL_MS = 1200;

// ===================== دوال المساعدة العامة =====================
const uniq = (arr) => Array.from(new Set((arr || []).map(String).filter(Boolean)));

const toNumberOrNull = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

const toTextOrEmpty = (v) => (v == null ? '' : String(v));

const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);

const round6 = (n) => Math.round(n * 1e6) / 1e6;

const nowId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const approxSame = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;

const buildGoogleMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${round6(lat)},${round6(lng)}`;

const extractLatLngFromUrl = (url) => {
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
};

const extractStoragePathFromDownloadURL = (url) => {
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf('/o/');
    if (idx === -1) return '';
    const encoded = u.pathname.slice(idx + 3);
    return decodeURIComponent(encoded);
  } catch {
    return '';
  }
};

const isVideoUrl = (url) => /\.(mp4|mov|webm|mkv|avi|wmv|flv|3gp|m4v)(\?|$)/i.test(String(url));

const formatStorageError = (e) => {
  const code = String(e?.code || '');
  const msg = String(e?.message || '');
  if (msg.toLowerCase().includes('appcheck')) return 'رفع الملفات مرفوض بسبب App Check.';
  if (code === 'upload-stalled') return 'الرفع توقف بدون تقدم.';
  if (code === 'upload-timeout') return 'انتهت مهلة الرفع.';
  if (code === 'storage/unauthorized' || code === 'permission-denied')
    return 'لا توجد صلاحيات لرفع الملفات.';
  if (code === 'storage/bucket-not-found')
    return 'Storage Bucket غير صحيح.';
  if (code === 'storage/retry-limit-exceeded')
    return 'تعذر إكمال الرفع بسبب انقطاع في الشبكة.';
  if (code === 'storage/canceled') return 'تم إلغاء الرفع.';
  if (code === 'storage/quota-exceeded') return 'تم تجاوز سعة التخزين.';
  return msg || 'فشل رفع الملفات.';
};

// ===================== مكون حقل النموذج =====================
const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <div className="muted" style={{ fontSize: 13, marginBottom: 6, fontWeight: 700 }}>
      {label}
    </div>
    {children}
    {hint && <div className="muted" style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>{hint}</div>}
  </div>
);

// ===================== تحميل Google Maps (Singleton) =====================
let gmapsPromise = null;

const loadGoogleMaps = (apiKey) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('بيئة المتصفح مطلوبة'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (gmapsPromise) return gmapsPromise;

  gmapsPromise = new Promise((resolve, reject) => {
    try {
      if (!apiKey) {
        reject(new Error('مفتاح Google Maps غير موجود'));
        return;
      }

      const scriptId = 'google-maps-js';
      const existing = document.getElementById(scriptId);
      if (existing) {
        const check = () => (window.google?.maps ? resolve(window.google.maps) : setTimeout(check, 60));
        check();
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=ar&region=SA`;

      script.onload = () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error('تم تحميل Google Maps لكن الكائن غير متوفر'));
      };
      script.onerror = () => reject(new Error('فشل تحميل Google Maps'));

      document.head.appendChild(script);
    } catch (e) {
      reject(e);
    }
  });

  return gmapsPromise;
};

// ===================== مكون منتقي الخريطة =====================
const MapPicker = ({ value, onChange }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const listenersRef = useRef([]);
  const resizeObserverRef = useRef(null);
  const winResizeRef = useRef(null);

  const [mapErr, setMapErr] = useState('');
  const [geoErr, setGeoErr] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const defaultCenter = useMemo(() => ({ lat: 21.75, lng: 39.12 }), []);
  const current = useMemo(
    () => (value && isFiniteNumber(value.lat) && isFiniteNumber(value.lng) ? value : null),
    [value]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setMapErr('');
      try {
        const gmaps = await loadGoogleMaps(apiKey);
        if (cancelled || !mapElRef.current || mapRef.current) return;

        const center = current
          ? { lat: current.lat, lng: current.lng }
          : { lat: defaultCenter.lat, lng: defaultCenter.lng };

        const map = new gmaps.Map(mapElRef.current, {
          center,
          zoom: current ? 16 : 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          zoomControl: true,
          zoomControlOptions: { position: gmaps.ControlPosition.RIGHT_CENTER },
        });

        const marker = new gmaps.Marker({
          map,
          position: center,
          draggable: true,
          animation: gmaps.Animation?.DROP,
        });

        const emitPosition = (lat, lng) => {
          onChange?.({ lat: round6(lat), lng: round6(lng) });
        };

        listenersRef.current.push(
          map.addListener('click', (e) => {
            if (!e?.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition({ lat, lng });
            emitPosition(lat, lng);
          }),
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (pos) emitPosition(pos.lat(), pos.lng());
          })
        );

        const forceResize = () => {
          try {
            if (!mapRef.current) return;
            gmaps.event.trigger(mapRef.current, 'resize');
            const pos = markerRef.current?.getPosition?.();
            const c = pos ? { lat: pos.lat(), lng: pos.lng() } : center;
            mapRef.current.panTo(c);
          } catch {}
        };

        listenersRef.current.push(
          gmaps.event.addListenerOnce(map, 'idle', () => {
            [60, 240, 900].forEach((ms) => setTimeout(forceResize, ms));
          })
        );

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserverRef.current = new ResizeObserver(() => requestAnimationFrame(forceResize));
          resizeObserverRef.current.observe(mapElRef.current);
        }

        winResizeRef.current = forceResize;
        window.addEventListener('resize', winResizeRef.current);

        mapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);

        setTimeout(forceResize, 50);
      } catch (e) {
        console.error(e);
        setMapErr('تعذر تحميل الخريطة. تأكد من المفتاح وتفعيل الخدمة.');
      }
    };

    init();

    return () => {
      cancelled = true;
      listenersRef.current.forEach((l) => l?.remove?.());
      listenersRef.current = [];
      markerRef.current?.setMap?.(null);
      mapRef.current = null;
      resizeObserverRef.current?.disconnect?.();
      if (winResizeRef.current) window.removeEventListener('resize', winResizeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !current) return;
    const pos = markerRef.current.getPosition();
    if (pos && approxSame(pos.lat(), current.lat) && approxSame(pos.lng(), current.lng)) return;
    markerRef.current.setPosition({ lat: current.lat, lng: current.lng });
    mapRef.current.panTo({ lat: current.lat, lng: current.lng });
    if ((mapRef.current.getZoom?.() || 0) < 16) mapRef.current.setZoom(16);
    window.google?.maps?.event?.trigger?.(mapRef.current, 'resize');
  }, [current]);

  const useMyLocation = useCallback(() => {
    setGeoErr('');
    if (!navigator?.geolocation) {
      setGeoErr('المتصفح لا يدعم تحديد الموقع.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange?.({ lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) }),
      () => setGeoErr('تعذر تحديد الموقع.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [onChange]);

  return (
    <div style={{ width: '100%' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: 12 }}>اختر الموقع بالنقر على الخريطة أو اسحب العلامة.</span>
        <button className="btn" type="button" onClick={useMyLocation} style={{ fontSize: 12, padding: '6px 10px' }}>
          📍 موقعي الحالي
        </button>
      </div>

      <div className="mapWrap" style={{ marginTop: 10 }}>
        <div ref={mapElRef} className="mapEl" />
        {!mapReady && !mapErr && <div className="mapOverlay muted">جاري تحميل الخريطة…</div>}
        {mapErr && <div className="mapOverlay" style={{ color: '#b42318' }}>{mapErr}</div>}
      </div>

      {geoErr && <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>{geoErr}</div>}

      <style jsx>{`
        .mapWrap {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(214, 179, 91, 0.28);
          background: rgba(255,255,255,0.03);
        }
        .mapEl {
          width: 100%;
          height: 420px;
        }
        @media (max-width: 768px) {
          .mapEl { height: 320px; }
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
};

// ===================== Hook مخصص للمصادقة =====================
const useAuth = () => {
  const fb = getFirebase();
  const auth = fb?.auth;
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, [auth]);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAuthErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      setAuthErr('فشل تسجيل الدخول. تأكد من الإيميل/الرمز.');
    } finally {
      setBusy(false);
    }
  };

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
  }, [auth]);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  return { user, email, setEmail, pass, setPass, authErr, busy, login, logout, isAdmin };
};

// ===================== Hook مخصص لرفع الملفات =====================
const useFileUpload = (user, storage, onUploaded) => {
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef = useRef(null);

  const addFiles = useCallback((files) => {
    setUploadErr('');
    const incoming = Array.from(files || []).filter(Boolean);
    if (!incoming.length) return;

    setQueue((prev) => {
      const remaining = MAX_FILES - prev.length;
      const slice = incoming.slice(0, remaining);
      const newItems = slice.map((file) => ({
        id: nowId(),
        file,
        preview: URL.createObjectURL(file),
        type: file.type || '',
        selected: true,
        progress: 0,
        status: 'ready',
        error: '',
      }));
      return [...prev, ...newItems];
    });
  }, []);

  const removeQueued = useCallback((id) => {
    setQueue((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const toggleSelected = useCallback((id) => {
    setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, selected: !x.selected } : x)));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
      return [];
    });
  }, []);

  const uploadOne = useCallback(
    async (item, idx, uid) => {
      const file = item.file;
      const isVideo = file?.type?.startsWith('video/') || false;
      const folder = isVideo ? 'abhur_videos' : 'abhur_images';
      const timeoutMs = isVideo ? VIDEO_TIMEOUT_MS : IMAGE_TIMEOUT_MS;

      const safeName = String(file?.name || 'file')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\.-]/g, '')
        .slice(0, 100);
      const path = `${folder}/${uid}/${Date.now()}_${idx}_${safeName}`;
      const fileRef = storageRef(storage, path);

      setQueue((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, status: 'uploading', progress: 0, error: '' } : x))
      );

      const metadata = { contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg') };
      const task = uploadBytesResumable(fileRef, file, metadata);

      let lastBytes = 0;
      let lastTick = Date.now();
      const startedAt = Date.now();

      return new Promise((resolve, reject) => {
        const watcher = setInterval(() => {
          const now = Date.now();
          if (now - startedAt > timeoutMs) {
            task.cancel();
            const err = new Error('upload-timeout');
            err.code = 'upload-timeout';
            clearInterval(watcher);
            reject(err);
          } else if (now - lastTick > STALL_MS) {
            task.cancel();
            const err = new Error('upload-stalled');
            err.code = 'upload-stalled';
            clearInterval(watcher);
            reject(err);
          }
        }, WATCH_INTERVAL_MS);

        const unsubscribe = task.on(
          'state_changed',
          (snap) => {
            const bt = snap.bytesTransferred || 0;
            if (bt !== lastBytes) {
              lastBytes = bt;
              lastTick = Date.now();
            }
            const p = snap.totalBytes ? Math.round((bt / snap.totalBytes) * 100) : 0;
            setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: p } : x)));
          },
          (err) => {
            clearInterval(watcher);
            unsubscribe();
            reject(err);
          },
          () => {
            clearInterval(watcher);
            unsubscribe();
            resolve();
          }
        );
      })
        .then(() => getDownloadURL(task.snapshot.ref))
        .then((url) => {
          setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'done', progress: 100 } : x)));
          return url;
        });
    },
    [storage]
  );

  const runPool = async (items, concurrency, worker) => {
    const results = [];
    let i = 0;
    const workers = Array(concurrency).fill(0).map(async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await worker(items[idx], idx);
      }
    });
    await Promise.all(workers);
    return results;
  };

  const uploadSelected = useCallback(async () => {
    setUploadErr('');
    if (!user) {
      setUploadErr('يجب تسجيل الدخول أولاً.');
      return;
    }
    if (!storage) {
      setUploadErr('خدمة التخزين غير متوفرة.');
      return;
    }

    const selected = queue.filter((q) => q.selected && q.status !== 'done' && q.status !== 'uploading');
    if (!selected.length) {
      setUploadErr('حدد ملفًا واحدًا على الأقل للرفع.');
      return;
    }

    setUploading(true);
    const uid = user.uid || 'anon';
    const errors = [];

    try {
      const urls = await runPool(selected, UPLOAD_CONCURRENCY, async (it, idx) => {
        try {
          return await uploadOne(it, idx, uid);
        } catch (e) {
          const msg = formatStorageError(e);
          errors.push(msg);
          setQueue((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: 'error', error: msg } : x)));
          return null;
        }
      });

      const okUrls = uniq(urls.filter(Boolean));
      if (okUrls.length) {
        onUploaded?.(okUrls);
      }

      setQueue((prev) =>
        prev.map((x) => (selected.some((s) => s.id === x.id) ? { ...x, selected: false } : x))
      );

      if (errors.length) {
        setUploadErr(`تم رفع ${okUrls.length} من ${selected.length}. بعض الملفات فشلت.`);
      }
    } finally {
      setUploading(false);
    }
  }, [queue, user, storage, uploadOne, onUploaded]);

  return {
    queue,
    uploading,
    uploadErr,
    fileInputRef,
    addFiles,
    removeQueued,
    toggleSelected,
    clearQueue,
    uploadSelected,
    setUploadErr,
  };
};

// ===================== Hook مخصص للقوائم =====================
const useListings = () => {
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await fetchListings({ filters: {}, onlyPublic: false });
      setList(data);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const deleteListing = useCallback(
    async (item, storage, db) => {
      if (!item?.id) return;
      if (!confirm(`تأكيد حذف الإعلان نهائيًا؟\n\n${item.title || item.id}`)) return;

      setActionBusyId(item.id);
      try {
        // حذف الوسائط
        const media = Array.isArray(item.images) ? item.images : [];
        for (const url of media) {
          const path = extractStoragePathFromDownloadURL(url);
          if (path && storage) {
            try {
              await deleteObject(storageRef(storage, path));
            } catch (e) {
              console.warn('فشل حذف الملف:', url, e);
            }
          }
        }

        // حذف من Firestore
        if (db && typeof db.collection === 'function') {
          await db.collection(LISTINGS_COLLECTION).doc(item.id).delete();
        } else if (db) {
          await deleteDoc(doc(db, LISTINGS_COLLECTION, item.id));
        } else {
          const fb = getFirebase();
          const firestore = getFirestore(fb.app);
          await deleteDoc(doc(firestore, LISTINGS_COLLECTION, item.id));
        }

        alert('تم الحذف ✅');
        await loadList();
      } catch (e) {
        console.error(e);
        // محاولة إخفاء الإعلان بدلاً من الحذف
        try {
          await adminUpdateListing(item.id, { status: 'canceled', archived: true });
          alert('تعذر الحذف النهائي — تم إخفاء الإعلان بدلاً من ذلك ✅');
          await loadList();
        } catch {
          alert('فشل حذف/إخفاء الإعلان.');
        }
      } finally {
        setActionBusyId('');
      }
    },
    [loadList]
  );

  return { list, loadingList, actionBusyId, loadList, deleteListing };
};

// ===================== النموذج الفارغ =====================
const EMPTY_FORM = {
  title: '',
  neighborhood: '',
  plan: '',
  part: '',
  lotNumber: '',
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
  bedrooms: '',
  bathrooms: '',
  floor: '',
  lounges: '',
  majlis: '',
  kitchen: false,
  maidRoom: false,
  streetWidth: '',
  facade: '',
  age: '',
  driverRoom: false,
  yard: false,
};

// ===================== مكون النموذج الرئيسي =====================
const CreateEditForm = ({
  editingId,
  form,
  setForm,
  onSave,
  onReset,
  busy,
  createdId,
  uploader,
  storage,
  db,
}) => {
  const { queue, uploading, uploadErr, fileInputRef, addFiles, removeQueued, toggleSelected, clearQueue, uploadSelected, setUploadErr } =
    uploader;

  const latNum = toNumberOrNull(form.lat);
  const lngNum = toNumberOrNull(form.lng);
  const hasCoords = isFiniteNumber(latNum) && isFiniteNumber(lngNum);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files?.length) addFiles(files);
    },
    [addFiles]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click?.();
  }, [fileInputRef]);

  const setCoords = useCallback(
    (lat, lng, updateUrl = true) => {
      const a = round6(lat);
      const b = round6(lng);
      setForm((p) => ({
        ...p,
        lat: String(a),
        lng: String(b),
        websiteUrl: updateUrl ? buildGoogleMapsUrl(a, b) : p.websiteUrl,
      }));
    },
    [setForm]
  );

  const clearCoords = useCallback(() => {
    setForm((p) => ({ ...p, lat: '', lng: '' }));
  }, [setForm]);

  const removeMediaFromForm = useCallback(
    (url) => {
      setForm((p) => ({ ...p, images: (p.images || []).filter((u) => u !== url) }));
    },
    [setForm]
  );

  const handleWebsiteUrlChange = useCallback(
    (e) => {
      const v = e.target.value;
      const fromUrl = extractLatLngFromUrl(v);
      const ok = isFiniteNumber(fromUrl.lat) && isFiniteNumber(fromUrl.lng);
      setForm((p) => ({
        ...p,
        websiteUrl: v,
        ...(ok ? { lat: String(round6(fromUrl.lat)), lng: String(round6(fromUrl.lng)) } : {}),
      }));
    },
    [setForm]
  );

  const yesNoSelect = (val, onVal) => (
    <select className="select" value={val ? 'yes' : 'no'} onChange={(e) => onVal(e.target.value === 'yes')}>
      <option value="yes">نعم</option>
      <option value="no">لا</option>
    </select>
  );

  const isApartment = form.propertyType === 'شقة';
  const isVilla = form.propertyType === 'فيلا';

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 900 }}>{editingId ? 'تعديل الإعلان' : 'إضافة إعلان'}</div>
        {editingId && (
          <button className="btn" onClick={onReset}>
            إلغاء التعديل
          </button>
        )}
      </div>

      {createdId && (
        <div className="card" style={{ marginTop: 10, borderColor: 'rgba(21,128,61,.25)', background: 'rgba(21,128,61,.06)' }}>
          تم إنشاء العرض بنجاح. ID: <b>{createdId}</b>
        </div>
      )}

      <div className="grid" style={{ marginTop: 10 }}>
        {/* الحقول الأساسية */}
        <div className="col-6">
          <Field label="عنوان العرض">
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: فيلا للبيع في حي الزمرد"
            />
          </Field>
        </div>

        <div className="col-3">
          <Field label="الحي">
            <select className="select" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}>
              <option value="">اختر</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="col-3">
          <Field label="مباشر">
            <select
              className="select"
              value={form.direct ? 'yes' : 'no'}
              onChange={(e) => setForm({ ...form, direct: e.target.value === 'yes' })}
            >
              <option value="yes">نعم</option>
              <option value="no">وسيط/وكيل</option>
            </select>
          </Field>
        </div>

        <div className="col-3">
          <Field label="المخطط">
            <input className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="مثال: مخطط الخالدية السياحي" />
          </Field>
        </div>

        <div className="col-3">
          <Field label="الجزء">
            <input className="input" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} placeholder="مثال: الجزء ج" />
          </Field>
        </div>

        <div className="col-3">
          <Field label="رقم القطعة" hint="مهم للأراضي">
            <input className="input" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} placeholder="مثال: 250" />
          </Field>
        </div>

        <div className="col-3">
          <Field label="بيع/إيجار">
            <select className="select" value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}>
              {DEAL_TYPES.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="col-3">
          <Field label="نوع العقار">
            <select className="select" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
              {PROPERTY_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="col-3">
          <Field label="سكني/تجاري" hint="اختياري">
            <select className="select" value={form.propertyClass} onChange={(e) => setForm({ ...form, propertyClass: e.target.value })}>
              <option value="">تلقائي</option>
              {PROPERTY_CLASSES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="col-3">
          <Field label="المساحة (م²)">
            <input
              className="input"
              inputMode="numeric"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder="مثال: 312"
            />
          </Field>
        </div>

        <div className="col-3">
          <Field label="السعر">
            <input
              className="input"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="مثال: 1350000"
            />
          </Field>
        </div>

        <div className="col-3">
          <Field label="الحالة">
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* الحقول الديناميكية للشقة */}
        {isApartment && (
          <div className="col-12">
            <div className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>تفاصيل الشقة</div>
              <div className="grid">
                <div className="col-3">
                  <Field label="الدور">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })}
                      placeholder="مثال: 3"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد الغرف">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.bedrooms}
                      onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                      placeholder="مثال: 4"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد الصالات">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.lounges}
                      onChange={(e) => setForm({ ...form, lounges: e.target.value })}
                      placeholder="مثال: 1"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد المجالس">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.majlis}
                      onChange={(e) => setForm({ ...form, majlis: e.target.value })}
                      placeholder="مثال: 1"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد دورات المياه">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.bathrooms}
                      onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                      placeholder="مثال: 3"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="مطبخ راكب؟">{yesNoSelect(form.kitchen, (v) => setForm({ ...form, kitchen: v }))}</Field>
                </div>
                <div className="col-3">
                  <Field label="غرفة خادمة؟">{yesNoSelect(form.maidRoom, (v) => setForm({ ...form, maidRoom: v }))}</Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* الحقول الديناميكية للفيلا */}
        {isVilla && (
          <div className="col-12">
            <div className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>تفاصيل الفيلا</div>
              <div className="grid">
                <div className="col-3">
                  <Field label="عمر العقار (سنة)">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      placeholder="مثال: 5"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عرض الشارع (م)">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.streetWidth}
                      onChange={(e) => setForm({ ...form, streetWidth: e.target.value })}
                      placeholder="مثال: 20"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="الواجهة">
                    <input
                      className="input"
                      value={form.facade}
                      onChange={(e) => setForm({ ...form, facade: e.target.value })}
                      placeholder="شمال / جنوب / شرق / غرب"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد الغرف">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.bedrooms}
                      onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                      placeholder="مثال: 6"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد الصالات">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.lounges}
                      onChange={(e) => setForm({ ...form, lounges: e.target.value })}
                      placeholder="مثال: 2"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="عدد دورات المياه">
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.bathrooms}
                      onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                      placeholder="مثال: 5"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="غرفة خادمة؟">{yesNoSelect(form.maidRoom, (v) => setForm({ ...form, maidRoom: v }))}</Field>
                </div>
                <div className="col-3">
                  <Field label="غرفة سائق؟">{yesNoSelect(form.driverRoom, (v) => setForm({ ...form, driverRoom: v }))}</Field>
                </div>
                <div className="col-3">
                  <Field label="حوش؟">{yesNoSelect(form.yard, (v) => setForm({ ...form, yard: v }))}</Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* حقل الموقع + الخريطة */}
        <div className="col-12">
          <Field
            label="موقع العقار على الخريطة"
            hint="حدد الموقع من الخريطة (الأفضل). يمكنك أيضاً لصق رابط Google Maps."
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <input
                className="input"
                value={form.websiteUrl}
                onChange={handleWebsiteUrlChange}
                placeholder="https://maps.google.com/..."
              />
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  {hasCoords ? (
                    <>
                      تم تحديد: <b>{round6(latNum)}</b>, <b>{round6(lngNum)}</b>
                    </>
                  ) : (
                    'لم يتم تحديد موقع بعد.'
                  )}
                </span>
                {hasCoords && (
                  <div className="row" style={{ gap: 8 }}>
                    <a
                      className="btn"
                      href={buildGoogleMapsUrl(latNum, lngNum)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح في خرائط Google
                    </a>
                    <button className="btnDanger" type="button" onClick={clearCoords}>
                      مسح الموقع
                    </button>
                  </div>
                )}
              </div>
              <MapPicker value={hasCoords ? { lat: latNum, lng: lngNum } : null} onChange={({ lat, lng }) => setCoords(lat, lng, true)} />
            </div>
          </Field>
        </div>

        {/* الوصف */}
        <div className="col-12">
          <Field label="وصف (اختياري)">
            <textarea
              className="input"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="تفاصيل إضافية: شارع/واجهة/مميزات…"
            />
          </Field>
        </div>

        {/* رفع الوسائط */}
        <div className="col-12">
          <Field label="الصور والفيديو" hint="اسحب الملفات هنا أو اضغط (اختيار ملفات). ثم اضغط (رفع المحدد).">
            <div
              className="dropzone"
              onClick={openFilePicker}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openFilePicker()}
            >
              <div style={{ fontWeight: 900 }}>اسحب وأفلت الصور والفيديوهات هنا</div>
              <div className="muted" style={{ marginTop: 6 }}>أو اضغط لاختيار الملفات من الجهاز</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" type="button" onClick={openFilePicker}>
                  اختيار ملفات
                </button>
                <button className="btnPrimary" type="button" disabled={uploading} onClick={uploadSelected}>
                  {uploading ? 'جاري الرفع…' : `رفع المحدد (x${UPLOAD_CONCURRENCY})`}
                </button>
                <button className="btn" type="button" onClick={clearQueue}>
                  تفريغ القائمة
                </button>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                الملفات التي تم رفعها تُضاف تلقائياً للإعلان.
              </span>
            </div>

            {uploadErr && (
              <div className="card" style={{ marginTop: 10, borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
                {uploadErr}
              </div>
            )}

            {/* عرض قائمة الانتظار */}
            {queue.length > 0 && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {queue.map((q) => (
                  <div key={q.id} className="card" style={{ padding: 10 }}>
                    <div style={{ position: 'relative' }}>
                      {q.type?.startsWith('video/') ? (
                        <video
                          src={q.preview}
                          style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 12, background: '#000' }}
                          muted
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.preview} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 12 }} />
                      )}

                      <div className="chip">
                        <input
                          type="checkbox"
                          checked={!!q.selected}
                          onChange={() => toggleSelected(q.id)}
                          aria-label="تحديد الملف"
                          disabled={q.status === 'uploading'}
                        />
                        <span style={{ fontSize: 12, fontWeight: 800 }}>تحديد</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {q.status === 'done' ? 'تم ✅' : q.status === 'uploading' ? 'يرفع…' : q.status === 'error' ? 'فشل ❌' : 'جاهز'}
                        </span>
                        <button className="btnDanger" type="button" onClick={() => removeQueued(q.id)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
                          حذف
                        </button>
                      </div>

                      <div className="progress" style={{ marginTop: 8 }}>
                        <div className="progressBar" style={{ width: `${Math.min(100, q.progress || 0)}%` }} />
                      </div>

                      {q.error && <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>{q.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>

        {/* عرض الوسائط المرفوعة في النموذج */}
        {Array.isArray(form.images) && form.images.length > 0 && (
          <div className="col-12">
            <Field label="صور/فيديو الإعلان" hint="هذه الملفات ستظهر للزوار. يمكنك حذف أي ملف من الإعلان.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {form.images.map((url) => (
                  <div key={url} className="card" style={{ padding: 10 }}>
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 12, background: '#000' }}
                        controls
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 12 }} />
                    )}
                    <button className="btnDanger" type="button" style={{ width: '100%', marginTop: 10 }} onClick={() => removeMediaFromForm(url)}>
                      حذف من الإعلان
                    </button>
                  </div>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* زر الحفظ */}
        <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btnPrimary" disabled={busy} onClick={onSave}>
            {busy ? 'جاري الحفظ…' : editingId ? 'تحديث الإعلان' : 'إضافة الإعلان'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 15px; }
        .col-12 { grid-column: span 12; }
        .col-6 { grid-column: span 6; }
        .col-3 { grid-column: span 3; }
        @media (max-width: 768px) {
          .col-6, .col-3 { grid-column: span 12; }
        }
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
          background: rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .progressBar {
          height: 100%;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border-radius: 999px;
          transition: width 0.2s ease;
        }
      `}</style>
    </section>
  );
};

// ===================== مكون إدارة القوائم =====================
const ManageListings = ({ list, loadingList, actionBusyId, onLoad, onDelete, onEdit, storage, db }) => {
  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 800 }}>إدارة العروض</div>
        <button className="btn" onClick={onLoad}>
          تحديث
        </button>
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

              <div className="row" style={{ marginTop: 10, justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => onEdit(item)}>
                  تعديل
                </button>
                <button className="btnDanger" disabled={actionBusyId === item.id} onClick={() => onDelete(item, storage, db)}>
                  {actionBusyId === item.id ? 'جاري الحذف…' : 'حذف'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ===================== الصفحة الرئيسية =====================
export default function AdminPage() {
  const fb = getFirebase();
  const auth = fb?.auth;
  const storage = fb?.storage;
  const db = fb?.db || fb?.firestore;

  // hooks
  const { user, email, setEmail, pass, setPass, authErr, busy, login, logout, isAdmin } = useAuth();
  const { list, loadingList, actionBusyId, loadList, deleteListing } = useListings();
  const [tab, setTab] = useState('create');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [createdId, setCreatedId] = useState('');

  // رفع الملفات
  const uploader = useFileUpload(user, storage, (newUrls) => {
    setForm((p) => ({ ...p, images: uniq([...(p.images || []), ...newUrls]) }));
  });

  // تحميل القائمة عند التبديل لإدارة العروض
  useEffect(() => {
    if (isAdmin && tab === 'manage') loadList();
  }, [isAdmin, tab, loadList]);

  const resetForm = useCallback(() => {
    setEditingId('');
    setCreatedId('');
    setForm(EMPTY_FORM);
    uploader.clearQueue();
    uploader.setUploadErr('');
  }, [uploader]);

  const startEdit = useCallback(
    (item) => {
      setCreatedId('');
      setEditingId(item.id);

      const media = Array.isArray(item.images) ? item.images : [];
      const urlFromItem = toTextOrEmpty(item.websiteUrl || item.website || item.url || '');
      const fromUrl = extractLatLngFromUrl(urlFromItem);
      const latFromItem = toNumberOrNull(item.lat);
      const lngFromItem = toNumberOrNull(item.lng);
      const latFinal = isFiniteNumber(latFromItem) ? latFromItem : (isFiniteNumber(fromUrl.lat) ? fromUrl.lat : null);
      const lngFinal = isFiniteNumber(lngFromItem) ? lngFromItem : (isFiniteNumber(fromUrl.lng) ? fromUrl.lng : null);

      setForm({
        ...EMPTY_FORM,
        title: toTextOrEmpty(item.title),
        neighborhood: toTextOrEmpty(item.neighborhood),
        plan: toTextOrEmpty(item.plan),
        part: toTextOrEmpty(item.part),
        lotNumber: toTextOrEmpty(item.lotNumber || item.plotNumber || item.lot || item.lotNo || ''),
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
        images: uniq(media),
        bedrooms: item.bedrooms == null ? '' : String(item.bedrooms),
        bathrooms: item.bathrooms == null ? '' : String(item.bathrooms),
        floor: item.floor == null ? '' : String(item.floor),
        lounges: item.lounges == null ? '' : String(item.lounges),
        majlis: item.majlis == null ? '' : String(item.majlis),
        kitchen: !!item.kitchen,
        maidRoom: !!item.maidRoom,
        streetWidth: item.streetWidth == null ? '' : String(item.streetWidth),
        facade: toTextOrEmpty(item.facade),
        age: item.age == null ? '' : String(item.age),
        driverRoom: !!item.driverRoom,
        yard: !!item.yard,
      });

      uploader.clearQueue();
      setTab('create');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [uploader]
  );

  const normalizePayload = useCallback((payload) => {
    const out = { ...payload };
    out.area = toNumberOrNull(out.area);
    out.price = toNumberOrNull(out.price);
    out.bedrooms = toNumberOrNull(out.bedrooms);
    out.bathrooms = toNumberOrNull(out.bathrooms);
    out.floor = toNumberOrNull(out.floor);
    out.lounges = toNumberOrNull(out.lounges);
    out.majlis = toNumberOrNull(out.majlis);
    out.streetWidth = toNumberOrNull(out.streetWidth);
    out.age = toNumberOrNull(out.age);
    out.kitchen = !!out.kitchen;
    out.maidRoom = !!out.maidRoom;
    out.driverRoom = !!out.driverRoom;
    out.yard = !!out.yard;
    out.facade = toTextOrEmpty(out.facade).trim();
    out.lotNumber = toTextOrEmpty(out.lotNumber).trim();
    return out;
  }, []);

  const saveListing = useCallback(async () => {
    // تعطيل الأزرار أثناء الحفظ
    // (يمكن إضافة حالة حفظ منفصلة لكننا نستخدم busy من useAuth)
    // ولكن busy تستخدم للوجين فقط، لذا نستخدم useState محلي
    // لتبسيط سنستخدم متغير محلي
    const saveBusy = busy; // لكن busy خاصة بالدخول
    // نضيف state للحفظ
    // سنضيف حالة حفظ داخلية
    // (يمكن إضافتها لكن للتبسيط نستخدم alert فقط)
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

      let payload = {
        ...form,
        images,
        websiteUrl: finalWebsiteUrl,
        ...(hasCoords ? { lat: round6(lat), lng: round6(lng) } : {}),
      };

      payload = normalizePayload(payload);

      if (editingId) {
        await adminUpdateListing(editingId, payload);
        alert('تم تحديث الإعلان ✅');
        await loadList();
      } else {
        const id = await adminCreateListing(payload);
        setCreatedId(id);
        alert('تمت إضافة الإعلان ✅');
      }

      resetForm();
    } catch (err) {
      alert('حصل خطأ أثناء حفظ الإعلان. راجع إعدادات Firebase.');
      console.error(err);
    }
  }, [form, editingId, normalizePayload, loadList, resetForm]);

  // عرض شاشة الدخول إذا لم يكن هناك مستخدم
  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 16, maxWidth: 520, margin: '0 auto' }}>
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
              <button className="btnPrimary" disabled={busy}>
                {busy ? 'جاري الدخول…' : 'دخول'}
              </button>
            </div>

            {authErr && (
              <div className="col-12">
                <div className="card" style={{ borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
                  {authErr}
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    );
  }

  // إذا لم يكن أدمن
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
            <button className="btn" onClick={logout}>
              تسجيل خروج
            </button>
          </div>
        </section>
      </div>
    );
  }

  // الصفحة الرئيسية للأدمن
  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '6px 0 0' }}>لوحة الأدمن</h1>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {user.email}
          </div>
        </div>
        <button className="btn" onClick={logout}>
          تسجيل خروج
        </button>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <button className={tab === 'create' ? 'btnPrimary' : 'btn'} onClick={() => setTab('create')}>
            إضافة/تعديل عرض
          </button>
          <button className={tab === 'manage' ? 'btnPrimary' : 'btn'} onClick={() => setTab('manage')}>
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
          busy={busy} // يمكن إضافة حالة حفظ منفصلة لكننا نمررها
          createdId={createdId}
          uploader={uploader}
          storage={storage}
          db={db}
        />
      ) : (
        <ManageListings
          list={list}
          loadingList={loadingList}
          actionBusyId={actionBusyId}
          onLoad={loadList}
          onDelete={deleteListing}
          onEdit={startEdit}
          storage={storage}
          db={db}
        />
      )}
    </div>
  );
}
