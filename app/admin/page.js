'use client';

/**
 * لوحة تحكم الأدمن - إدارة عقارات أبحر
 * نسخة ديناميكية بالكامل:
 * - خطوة 1: اختيار نوع الصفقة (بيع/إيجار)
 * - خطوة 2: اختيار نوع العقار
 * - خطوة 3: ظهور الحقول حسب نوع العقار
 *
 * ملاحظة مهمة:
 * - هذه الصفحة تحتوي CSS محلي (Scoped) داخل .adminWrap لضمان عدم اعتمادها على الستايل العام
 *   ولمنع اللخبطة بعد نقل الستايلات إلى ملف عام.
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

// ===================== الثوابت =====================
const LISTINGS_COLLECTION = 'abhur_listings';
const MAX_FILES = 30;

const UPLOAD_CONCURRENCY = 2;
const IMAGE_TIMEOUT_MS = 180000;
const VIDEO_TIMEOUT_MS = 600000;
const STALL_MS = 20000;
const WATCH_INTERVAL_MS = 1200;

// حدود مدينة جدة التقريبية
const JEDDAH_BOUNDS = {
  north: 22.0,
  south: 21.0,
  east: 39.5,
  west: 39.0,
};

// ===================== دوال مساعدة =====================
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
  if (code === 'storage/unauthorized' || code === 'permission-denied') return 'لا توجد صلاحيات لرفع الملفات.';
  if (code === 'storage/bucket-not-found') return 'Storage Bucket غير صحيح.';
  if (code === 'storage/retry-limit-exceeded') return 'تعذر إكمال الرفع بسبب انقطاع في الشبكة.';
  if (code === 'storage/canceled') return 'تم إلغاء الرفع.';
  if (code === 'storage/quota-exceeded') return 'تم تجاوز سعة التخزين.';
  return msg || 'فشل رفع الملفات.';
};

// ===================== مكون حقل =====================
const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <div className="muted" style={{ fontSize: 13, marginBottom: 6, fontWeight: 800 }}>
      {label}
    </div>
    {children}
    {hint && (
      <div className="muted" style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
        {hint}
      </div>
    )}
  </div>
);

// ===================== تحميل Google Maps =====================
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&v=weekly&language=ar&region=SA`;

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

// ===================== MapPicker (مستقر + داخل جدة) =====================
const MapPicker = ({ value, onChange }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const listenersRef = useRef([]);
  const resizeObserverRef = useRef(null);
  const winResizeRef = useRef(null);
  const lastValidPositionRef = useRef(null);

  const [mapErr, setMapErr] = useState('');
  const [geoErr, setGeoErr] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [boundsMsg, setBoundsMsg] = useState('');

  const defaultCenter = useMemo(() => ({ lat: 21.7628, lng: 39.0994 }), []);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const isWithinJeddah = useCallback((lat, lng) => {
    return (
      lat >= JEDDAH_BOUNDS.south &&
      lat <= JEDDAH_BOUNDS.north &&
      lng >= JEDDAH_BOUNDS.west &&
      lng <= JEDDAH_BOUNDS.east
    );
  }, []);

  const current = useMemo(
    () => (value && isFiniteNumber(value.lat) && isFiniteNumber(value.lng) ? value : null),
    [value]
  );

  useEffect(() => {
    if (current && isWithinJeddah(current.lat, current.lng)) {
      lastValidPositionRef.current = { lat: current.lat, lng: current.lng };
    }
  }, [current, isWithinJeddah]);

  const emitPosition = useCallback(
    (lat, lng) => {
      if (!isWithinJeddah(lat, lng)) {
        setBoundsMsg('تنبيه: الموقع خارج حدود مدينة جدة. الرجاء اختيار موقع داخل جدة.');
        const back = lastValidPositionRef.current || defaultCenter;
        try {
          markerRef.current?.setPosition?.(back);
          mapRef.current?.panTo?.(back);
        } catch {}
        return;
      }
      setBoundsMsg('');
      lastValidPositionRef.current = { lat, lng };
      try {
        onChangeRef.current?.({ lat: round6(lat), lng: round6(lng) });
      } catch {}
    },
    [isWithinJeddah, defaultCenter]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setMapErr('');
      try {
        const gmaps = await loadGoogleMaps(apiKey);
        if (cancelled || !mapElRef.current || mapRef.current) return;

        const center =
          current && isWithinJeddah(current.lat, current.lng)
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

        lastValidPositionRef.current = { lat: center.lat, lng: center.lng };

        listenersRef.current.push(
          map.addListener('click', (e) => {
            if (!e?.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition({ lat, lng });
            emitPosition(lat, lng);
          })
        );

        listenersRef.current.push(
          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (!pos) return;
            const lat = pos.lat();
            const lng = pos.lng();
            emitPosition(lat, lng);
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
      try {
        listenersRef.current.forEach((l) => l?.remove?.());
      } catch {}
      listenersRef.current = [];
      try {
        markerRef.current?.setMap?.(null);
      } catch {}
      mapRef.current = null;
      markerRef.current = null;
      try {
        resizeObserverRef.current?.disconnect?.();
      } catch {}
      if (winResizeRef.current) window.removeEventListener('resize', winResizeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !current) return;

    const pos = markerRef.current.getPosition();
    if (pos && approxSame(pos.lat(), current.lat) && approxSame(pos.lng(), current.lng)) return;

    if (isWithinJeddah(current.lat, current.lng)) {
      markerRef.current.setPosition({ lat: current.lat, lng: current.lng });
      mapRef.current.panTo({ lat: current.lat, lng: current.lng });
      if ((mapRef.current.getZoom?.() || 0) < 16) mapRef.current.setZoom(16);
      lastValidPositionRef.current = { lat: current.lat, lng: current.lng };
    } else {
      setBoundsMsg('تنبيه: الموقع المحدد خارج مدينة جدة. سيتم تجاهله.');
    }

    window.google?.maps?.event?.trigger?.(mapRef.current, 'resize');
  }, [current, isWithinJeddah]);

  const useMyLocation = useCallback(() => {
    setGeoErr('');
    if (!navigator?.geolocation) {
      setGeoErr('المتصفح لا يدعم تحديد الموقع.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (isWithinJeddah(lat, lng)) {
          emitPosition(lat, lng);
        } else {
          setGeoErr('موقعك الحالي خارج مدينة جدة. لا يمكن استخدامه.');
        }
      },
      () => setGeoErr('تعذر تحديد الموقع.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [emitPosition, isWithinJeddah]);

  return (
    <div style={{ width: '100%' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: 12 }}>
          اختر الموقع بالنقر على الخريطة أو اسحب العلامة. (داخل جدة فقط)
        </span>
        <button className="btn" type="button" onClick={useMyLocation} style={{ fontSize: 12, padding: '6px 10px' }}>
          موقعي الحالي
        </button>
      </div>

      <div className="mapWrap" style={{ marginTop: 10 }}>
        <div ref={mapElRef} className="mapEl" />
        {!mapReady && !mapErr && <div className="mapOverlay muted">جاري تحميل الخريطة…</div>}
        {mapErr && (
          <div className="mapOverlay" style={{ color: '#b42318' }}>
            {mapErr}
          </div>
        )}
      </div>

      {boundsMsg && (
        <div className="muted" style={{ marginTop: 8, color: '#b45f06', fontSize: 12, fontWeight: 900 }}>
          {boundsMsg}
        </div>
      )}
      {geoErr && (
        <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>
          {geoErr}
        </div>
      )}
    </div>
  );
};

// ===================== Hook: Auth =====================
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
    return onAuthStateChanged(auth, (u) => setUser(u || null));
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
    try {
      if (auth) await signOut(auth);
    } catch {}
  }, [auth]);

  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  return { user, email, setEmail, pass, setPass, authErr, busy, login, logout, isAdmin };
};

// ===================== Hook: Upload =====================
const useFileUpload = (user, storage, onUploaded) => {
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef = useRef(null);

  const queueRef = useRef([]);
  const uploadingRef = useRef(false);
  const autoKickRef = useRef(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    uploadingRef.current = uploading;
  }, [uploading]);

  useEffect(() => {
    return () => {
      if (autoKickRef.current) clearTimeout(autoKickRef.current);
      try {
        (queueRef.current || []).forEach((it) => it?.preview && URL.revokeObjectURL(it.preview));
      } catch {}
    };
  }, []);

  const isVideoFile = useCallback((file) => {
    const name = String(file?.name || '').toLowerCase();
    return (
      String(file?.type || '').startsWith('video/') ||
      /\.(mp4|mov|webm|mkv|avi|wmv|flv|3gp|m4v)(\?|$)/i.test(name)
    );
  }, []);

  const makeSafeName = useCallback((file) => {
    const raw = String(file?.name || 'file');
    let safe = raw.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\.-]/g, '').slice(0, 100);
    if (!safe || safe.replace(/[_.-]/g, '') === '') {
      safe = `file_${Date.now()}_${Math.random().toString(16).slice(2)}.bin`;
    }
    return safe;
  }, []);

  const addFiles = useCallback((files) => {
    setUploadErr('');
    const incoming = Array.from(files || []).filter(Boolean);
    if (!incoming.length) return;

    setQueue((prev) => {
      const remaining = Math.max(0, MAX_FILES - prev.length);
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

  const retryQueued = useCallback((id) => {
    setQueue((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'ready', selected: true, progress: 0, error: '' } : x)));
    setUploadErr('');
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
      return [];
    });
    setUploadErr('');
  }, []);

  const uploadOne = useCallback(
    async (item, idx, uid) => {
      const file = item.file;
      const isVideo = isVideoFile(file);

      // ✅ انتبه: يحتاج Storage Rules تسمح لـ abhur_videos أيضاً
      const folder = isVideo ? 'abhur_videos' : 'abhur_images';
      const timeoutMs = isVideo ? VIDEO_TIMEOUT_MS : IMAGE_TIMEOUT_MS;

      const safeName = makeSafeName(file);
      const path = `${folder}/${uid}/${Date.now()}_${idx}_${safeName}`;
      const fileRef = storageRef(storage, path);

      setQueue((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'uploading', progress: 0, error: '' } : x)));

      const metadata = {
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        cacheControl: 'public,max-age=31536000',
      };

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
            return;
          }

          if (now - lastTick > STALL_MS) {
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
    [storage, isVideoFile, makeSafeName]
  );

  const runPool = async (items, concurrency, worker) => {
    const results = [];
    let i = 0;
    const workers = Array(concurrency)
      .fill(0)
      .map(async () => {
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
    if (uploadingRef.current) return;

    const currentQueue = queueRef.current || [];
    const selected = currentQueue.filter((q) => q.selected && q.status !== 'done' && q.status !== 'uploading');
    if (!selected.length) return;

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
      if (okUrls.length) onUploaded?.(okUrls);

      setQueue((prev) => prev.map((x) => (selected.some((s) => s.id === x.id) ? { ...x, selected: false } : x)));

      if (errors.length) {
        setUploadErr(`تم رفع ${okUrls.length} من ${selected.length}. يوجد ملفات فشلت.`);
      }
    } finally {
      setUploading(false);
    }
  }, [user, storage, uploadOne, onUploaded]);

  // auto-kick
  useEffect(() => {
    if (!user || !storage) return;
    if (uploading) return;

    const hasPending = queue.some((q) => q.selected && q.status === 'ready');
    if (!hasPending) return;

    if (autoKickRef.current) clearTimeout(autoKickRef.current);
    autoKickRef.current = setTimeout(() => {
      uploadSelected();
    }, 200);

    return () => {
      if (autoKickRef.current) clearTimeout(autoKickRef.current);
    };
  }, [queue, user, storage, uploading, uploadSelected]);

  return {
    queue,
    uploading,
    uploadErr,
    fileInputRef,
    addFiles,
    removeQueued,
    toggleSelected,
    retryQueued,
    clearQueue,
    uploadSelected,
    setUploadErr,
    setQueue,
  };
};

// ===================== Hook: Listings =====================
const useListings = () => {
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionBusyId, setActionBusyId] = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      // يدعم أكثر من signature
      const rows = await fetchListings({ onlyPublic: false, includeLegacy: false, max: 500 });
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      try {
        const rows = await fetchListings({ filters: {}, onlyPublic: false });
        setList(Array.isArray(rows) ? rows : []);
      } catch {
        setList([]);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  const deleteListing = useCallback(async (item, storage, db) => {
    const id = item?.id || item?.docId;
    if (!id) return;

    if (!confirm(`تأكيد حذف الإعلان نهائيًا؟\n\n${item.title || id}`)) return;

    setActionBusyId(id);
    try {
      const media = Array.isArray(item.images) ? item.images : [];
      for (const url of media) {
        const path = extractStoragePathFromDownloadURL(url);
        if (path && storage) {
          try {
            await deleteObject(storageRef(storage, path));
          } catch {}
        }
      }

      const firestore = db || getFirestore();
      await deleteDoc(doc(firestore, LISTINGS_COLLECTION, id));

      await loadList();
      alert('تم الحذف');
    } catch (e) {
      console.error(e);
      try {
        await adminUpdateListing(id, { status: 'canceled', archived: true });
        alert('تعذر الحذف النهائي — تم إخفاء الإعلان بدلاً من ذلك');
        await loadList();
      } catch {
        alert('فشل حذف/إخفاء الإعلان.');
      }
    } finally {
      setActionBusyId('');
    }
  }, [loadList]);

  return { list, loadingList, actionBusyId, loadList, deleteListing };
};

// ===================== نموذج فارغ =====================
const EMPTY_FORM = {
  title: '',
  neighborhood: '',
  plan: '',
  part: '',
  lotNumber: '',
  dealType: '',
  propertyType: '',
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
  // فيلا/شقة
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
  // عمارة
  numApartments: '',
  numShops: '',
  numFloors: '',
  hasElevator: false,
  hasGenerator: false,
  parkingSpaces: '',
};

// ===================== Create/Edit Form =====================
const CreateEditForm = ({ editingId, form, setForm, onSave, onReset, busy, createdId, uploader }) => {
  const { queue, uploading, uploadErr, fileInputRef, addFiles, removeQueued, toggleSelected, retryQueued, uploadSelected } = uploader;

  const latNum = toNumberOrNull(form.lat);
  const lngNum = toNumberOrNull(form.lng);
  const hasCoords = isFiniteNumber(latNum) && isFiniteNumber(lngNum);

  const dealTypeChosen = !!form.dealType;
  const propertyTypeChosen = !!form.propertyType;

  const handleDealTypeChange = (e) => {
    const dealType = e.target.value;
    setForm((p) => ({ ...p, dealType, propertyType: '' }));
  };

  const handlePropertyTypeChange = (e) => {
    setForm((p) => ({ ...p, propertyType: e.target.value }));
  };

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click?.();
  }, [fileInputRef]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files?.length) addFiles(files);
  }, [addFiles]);

  const setCoords = useCallback((lat, lng, updateUrl = true) => {
    const a = round6(lat);
    const b = round6(lng);
    setForm((p) => ({
      ...p,
      lat: String(a),
      lng: String(b),
      websiteUrl: updateUrl ? buildGoogleMapsUrl(a, b) : p.websiteUrl,
    }));
  }, [setForm]);

  const clearCoords = useCallback(() => {
    setForm((p) => ({ ...p, lat: '', lng: '' }));
  }, [setForm]);

  const removeMediaFromForm = useCallback((url) => {
    setForm((p) => ({ ...p, images: (p.images || []).filter((u) => u !== url) }));
  }, [setForm]);

  const handleWebsiteUrlChange = useCallback((e) => {
    const v = e.target.value;
    const fromUrl = extractLatLngFromUrl(v);
    const ok = isFiniteNumber(fromUrl.lat) && isFiniteNumber(fromUrl.lng);
    setForm((p) => ({
      ...p,
      websiteUrl: v,
      ...(ok ? { lat: String(round6(fromUrl.lat)), lng: String(round6(fromUrl.lng)) } : {}),
    }));
  }, [setForm]);

  const yesNoSelect = (val, onVal) => (
    <select className="select" value={val ? 'yes' : 'no'} onChange={(e) => onVal(e.target.value === 'yes')}>
      <option value="yes">نعم</option>
      <option value="no">لا</option>
    </select>
  );

  const pricePreview = useMemo(() => {
    const n = toNumberOrNull(form.price);
    return n == null ? '' : formatPriceSAR(n);
  }, [form.price]);

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 950 }}>{editingId ? 'تعديل الإعلان' : 'إضافة إعلان'}</div>
        {editingId ? (
          <button className="btn" onClick={onReset} type="button">
            إلغاء التعديل
          </button>
        ) : null}
      </div>

      {createdId ? (
        <div className="card" style={{ marginTop: 10, borderColor: 'rgba(21,128,61,.25)', background: 'rgba(21,128,61,.06)' }}>
          تم حفظ الإعلان. ID: <b>{createdId}</b>
        </div>
      ) : null}

      {(uploading || busy) ? (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {busy ? 'جاري حفظ الإعلان…' : 'جاري رفع الملفات…'}
        </div>
      ) : null}

      <div className="grid" style={{ marginTop: 10 }}>
        {/* الخطوة 1 */}
        <div className="col-12">
          <Field label="اختر نوع الصفقة">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {DEAL_TYPES.map((deal) => (
                <label key={deal.key} className="radio-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input type="radio" name="dealType" value={deal.key} checked={form.dealType === deal.key} onChange={handleDealTypeChange} />
                  {deal.label}
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* الخطوة 2 */}
        {dealTypeChosen ? (
          <div className="col-12">
            <Field label="اختر نوع العقار">
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                {PROPERTY_TYPES.map((type) => (
                  <label key={type} className="radio-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" name="propertyType" value={type} checked={form.propertyType === type} onChange={handlePropertyTypeChange} />
                    {type}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        ) : null}

        {/* الخطوة 3 */}
        {propertyTypeChosen ? (
          <>
            {/* مشتركة */}
            <div className="col-6">
              <Field label="عنوان العرض">
                <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="مثال: فيلا للبيع في حي الزمرد" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الحي">
                <select className="select" value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}>
                  <option value="">اختر</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="مباشر">
                <select className="select" value={form.direct ? 'yes' : 'no'} onChange={(e) => setForm((p) => ({ ...p, direct: e.target.value === 'yes' }))}>
                  <option value="yes">نعم</option>
                  <option value="no">وسيط/وكيل</option>
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="المخطط">
                <input className="input" value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))} placeholder="مثال: مخطط الخالدية السياحي" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="الجزء">
                <input className="input" value={form.part} onChange={(e) => setForm((p) => ({ ...p, part: e.target.value }))} placeholder="مثال: الجزء ج" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="رقم القطعة" hint="مهم للأراضي">
                <input className="input" value={form.lotNumber} onChange={(e) => setForm((p) => ({ ...p, lotNumber: e.target.value }))} placeholder="مثال: 250" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="سكني/تجاري" hint="اختياري">
                <select className="select" value={form.propertyClass} onChange={(e) => setForm((p) => ({ ...p, propertyClass: e.target.value }))}>
                  <option value="">تلقائي</option>
                  {PROPERTY_CLASSES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="col-3">
              <Field label="المساحة (م²)">
                <input className="input" inputMode="numeric" value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} placeholder="مثال: 312" />
              </Field>
            </div>

            <div className="col-3">
              <Field label="السعر">
                <input className="input" inputMode="numeric" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="مثال: 1350000" />
                {pricePreview ? <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>المعاينة: {pricePreview}</div> : null}
              </Field>
            </div>

            <div className="col-3">
              <Field label="الحالة">
                <select className="select" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <div style={{ marginTop: 8 }}>{statusBadge(form.status)}</div>
              </Field>
            </div>

            {/* تفاصيل حسب النوع */}
            {form.propertyType === 'فيلا' ? (
              <div className="col-12">
                <div className="card" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>تفاصيل الفيلا</div>
                  <div className="grid">
                    <div className="col-3">
                      <Field label="عمر العقار (سنة)">
                        <input className="input" inputMode="numeric" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} placeholder="مثال: 5" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عرض الشارع (م)">
                        <input className="input" inputMode="numeric" value={form.streetWidth} onChange={(e) => setForm((p) => ({ ...p, streetWidth: e.target.value }))} placeholder="مثال: 20" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="الواجهة">
                        <input className="input" value={form.facade} onChange={(e) => setForm((p) => ({ ...p, facade: e.target.value }))} placeholder="شمال / جنوب / شرق / غرب" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد الغرف">
                        <input className="input" inputMode="numeric" value={form.bedrooms} onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))} placeholder="مثال: 6" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد الصالات">
                        <input className="input" inputMode="numeric" value={form.lounges} onChange={(e) => setForm((p) => ({ ...p, lounges: e.target.value }))} placeholder="مثال: 2" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد دورات المياه">
                        <input className="input" inputMode="numeric" value={form.bathrooms} onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))} placeholder="مثال: 5" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="غرفة خادمة؟">{yesNoSelect(form.maidRoom, (v) => setForm((p) => ({ ...p, maidRoom: v })))}</Field>
                    </div>
                    <div className="col-3">
                      <Field label="غرفة سائق؟">{yesNoSelect(form.driverRoom, (v) => setForm((p) => ({ ...p, driverRoom: v })))}</Field>
                    </div>
                    <div className="col-3">
                      <Field label="حوش؟">{yesNoSelect(form.yard, (v) => setForm((p) => ({ ...p, yard: v })))}</Field>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {form.propertyType === 'شقة' ? (
              <div className="col-12">
                <div className="card" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>تفاصيل الشقة</div>
                  <div className="grid">
                    <div className="col-3">
                      <Field label="الدور">
                        <input className="input" inputMode="numeric" value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))} placeholder="مثال: 3" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد الغرف">
                        <input className="input" inputMode="numeric" value={form.bedrooms} onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))} placeholder="مثال: 4" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد الصالات">
                        <input className="input" inputMode="numeric" value={form.lounges} onChange={(e) => setForm((p) => ({ ...p, lounges: e.target.value }))} placeholder="مثال: 1" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد المجالس">
                        <input className="input" inputMode="numeric" value={form.majlis} onChange={(e) => setForm((p) => ({ ...p, majlis: e.target.value }))} placeholder="مثال: 1" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد دورات المياه">
                        <input className="input" inputMode="numeric" value={form.bathrooms} onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))} placeholder="مثال: 3" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="مطبخ راكب؟">{yesNoSelect(form.kitchen, (v) => setForm((p) => ({ ...p, kitchen: v })))}</Field>
                    </div>
                    <div className="col-3">
                      <Field label="غرفة خادمة؟">{yesNoSelect(form.maidRoom, (v) => setForm((p) => ({ ...p, maidRoom: v })))}</Field>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {form.propertyType === 'أرض' ? (
              <div className="col-12">
                <div className="card" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>تفاصيل الأرض</div>
                  <div className="grid">
                    <div className="col-3">
                      <Field label="عرض الشارع (م)">
                        <input className="input" inputMode="numeric" value={form.streetWidth} onChange={(e) => setForm((p) => ({ ...p, streetWidth: e.target.value }))} placeholder="مثال: 20" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="الواجهة">
                        <input className="input" value={form.facade} onChange={(e) => setForm((p) => ({ ...p, facade: e.target.value }))} placeholder="شمال / جنوب / شرق / غرب" />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {form.propertyType === 'عمارة' ? (
              <div className="col-12">
                <div className="card" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 950, marginBottom: 10 }}>تفاصيل العمارة</div>
                  <div className="grid">
                    <div className="col-3">
                      <Field label="عدد الشقق">
                        <input className="input" inputMode="numeric" value={form.numApartments} onChange={(e) => setForm((p) => ({ ...p, numApartments: e.target.value }))} placeholder="مثال: 12" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد المحلات">
                        <input className="input" inputMode="numeric" value={form.numShops} onChange={(e) => setForm((p) => ({ ...p, numShops: e.target.value }))} placeholder="مثال: 4" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="عدد الأدوار">
                        <input className="input" inputMode="numeric" value={form.numFloors} onChange={(e) => setForm((p) => ({ ...p, numFloors: e.target.value }))} placeholder="مثال: 5" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="مواقف سيارات">
                        <input className="input" inputMode="numeric" value={form.parkingSpaces} onChange={(e) => setForm((p) => ({ ...p, parkingSpaces: e.target.value }))} placeholder="مثال: 20" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="مصعد؟">{yesNoSelect(form.hasElevator, (v) => setForm((p) => ({ ...p, hasElevator: v })))}</Field>
                    </div>
                    <div className="col-3">
                      <Field label="مولد؟">{yesNoSelect(form.hasGenerator, (v) => setForm((p) => ({ ...p, hasGenerator: v })))}</Field>
                    </div>
                    <div className="col-3">
                      <Field label="عمر العقار (سنة)">
                        <input className="input" inputMode="numeric" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} placeholder="مثال: 10" />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="الواجهة">
                        <input className="input" value={form.facade} onChange={(e) => setForm((p) => ({ ...p, facade: e.target.value }))} placeholder="شمال / جنوب / شرق / غرب" />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* الموقع */}
            <div className="col-12">
              <Field
                label="موقع العقار على الخريطة"
                hint="حدد الموقع من الخريطة (داخل جدة). يمكنك أيضاً لصق رابط Google Maps."
              >
                <div style={{ display: 'grid', gap: 10 }}>
                  <input className="input" value={form.websiteUrl} onChange={handleWebsiteUrlChange} placeholder="https://maps.google.com/..." />

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

                    {hasCoords ? (
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <a className="btn" href={buildGoogleMapsUrl(latNum, lngNum)} target="_blank" rel="noreferrer">
                          فتح في خرائط Google
                        </a>
                        <button className="btnDanger" type="button" onClick={clearCoords}>
                          مسح الموقع
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <MapPicker value={hasCoords ? { lat: latNum, lng: lngNum } : null} onChange={({ lat, lng }) => setCoords(lat, lng, true)} />
                </div>
              </Field>
            </div>

            {/* الوصف */}
            <div className="col-12">
              <Field label="وصف (اختياري)">
                <textarea className="input" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="تفاصيل إضافية…" />
              </Field>
            </div>

            {/* رفع */}
            <div className="col-12">
              <Field label="الصور والفيديو" hint="اسحب الملفات هنا أو اضغط لاختيارها. يتم الرفع تلقائيًا.">
                <div
                  className="dropzone"
                  onClick={openFilePicker}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openFilePicker()}
                >
                  <div style={{ fontWeight: 950 }}>اسحب وأفلت الصور والفيديوهات هنا</div>
                  <div className="muted" style={{ marginTop: 6 }}>أو اضغط لاختيار الملفات</div>
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

                {uploadErr ? (
                  <div className="card" style={{ marginTop: 10, borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
                    {uploadErr}
                  </div>
                ) : null}

                {queue.length ? (
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {queue.map((q) => (
                      <div key={q.id} className="card" style={{ padding: 10 }}>
                        <div style={{ position: 'relative' }}>
                          {q.type?.startsWith('video/') ? (
                            <video src={q.preview} style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 12, background: '#000' }} muted playsInline />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={q.preview} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 12 }} />
                          )}

                          <div className="chip">
                            <input type="checkbox" checked={!!q.selected} onChange={() => toggleSelected(q.id)} aria-label="تحديد الملف" disabled={q.status === 'uploading'} />
                            <span style={{ fontSize: 12, fontWeight: 900 }}>تحديد</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {q.status === 'done' ? 'تم' : q.status === 'uploading' ? 'يرفع…' : q.status === 'error' ? 'فشل' : 'جاهز'}
                            </span>

                            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                              {q.status === 'error' ? (
                                <button className="btn" type="button" onClick={() => retryQueued(q.id)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
                                  إعادة المحاولة
                                </button>
                              ) : null}
                              <button className="btnDanger" type="button" onClick={() => removeQueued(q.id)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
                                حذف
                              </button>
                            </div>
                          </div>

                          <div className="progress" style={{ marginTop: 8 }}>
                            <div className="progressBar" style={{ width: `${Math.min(100, q.progress || 0)}%` }} />
                          </div>

                          {q.error ? <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>{q.error}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {queue.some((x) => x.selected && x.status === 'ready') ? (
                  <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className="btn" type="button" onClick={uploadSelected} disabled={uploading}>
                      رفع المحدد
                    </button>
                  </div>
                ) : null}
              </Field>
            </div>

            {/* الوسائط المضافة للإعلان */}
            {Array.isArray(form.images) && form.images.length ? (
              <div className="col-12">
                <Field label="صور/فيديو الإعلان" hint="هذه الملفات ستظهر للزوار. يمكنك حذف أي ملف.">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {form.images.map((url) => (
                      <div key={url} className="card" style={{ padding: 10 }}>
                        {isVideoUrl(url) ? (
                          <video src={url} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 12, background: '#000' }} controls playsInline />
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
            ) : null}

            {/* حفظ */}
            <div className="col-12 row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="btnPrimary" disabled={busy || uploading} onClick={onSave}>
                {busy ? 'جاري الحفظ…' : uploading ? 'انتظر اكتمال رفع الملفات…' : editingId ? 'تحديث الإعلان' : 'إضافة الإعلان'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

// ===================== Manage =====================
const ManageListings = ({ list, loadingList, actionBusyId, onLoad, onDelete, onEdit, storage, db }) => {
  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontWeight: 900 }}>إدارة العروض</div>
        <button className="btn" onClick={onLoad} type="button" disabled={loadingList}>
          {loadingList ? 'تحميل…' : 'تحديث'}
        </button>
      </div>

      {loadingList ? (
        <div className="muted" style={{ marginTop: 10 }}>جاري التحميل…</div>
      ) : list.length === 0 ? (
        <div className="muted" style={{ marginTop: 10 }}>لا توجد عروض.</div>
      ) : (
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {list.map((item) => {
            const id = item?.id || item?.docId || '';
            const busy = actionBusyId === id;

            return (
              <div key={id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 950, lineHeight: 1.3 }}>{item.title || 'عرض'}</div>
                  {statusBadge(item.status)}
                </div>

                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {item.neighborhood || '—'} • {item.plan || '—'} • {item.part || '—'}
                </div>

                <div style={{ marginTop: 8, fontWeight: 950 }}>
                  {item.price != null ? formatPriceSAR(Number(item.price)) : '—'}
                </div>

                <div className="row" style={{ marginTop: 10, justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" onClick={() => onEdit(item)} type="button">
                    تعديل
                  </button>
                  <button className="btnDanger" disabled={busy} onClick={() => onDelete(item, storage, db)} type="button">
                    {busy ? 'جاري الحذف…' : 'حذف'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ===================== Admin Page =====================
export default function AdminPage() {
  const fb = getFirebase();
  const storage = fb?.storage;
  const db = fb?.db || getFirestore();

  const { user, email, setEmail, pass, setPass, authErr, busy: authBusy, login, logout, isAdmin } = useAuth();
  const { list, loadingList, actionBusyId, loadList, deleteListing } = useListings();

  const [tab, setTab] = useState('create');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [saving, setSaving] = useState(false);

  const uploader = useFileUpload(user, storage, (newUrls) => {
    setForm((p) => ({ ...p, images: uniq([...(p.images || []), ...newUrls]) }));
  });

  useEffect(() => {
    if (isAdmin && tab === 'manage') loadList();
  }, [isAdmin, tab, loadList]);

  const resetForm = useCallback(({ keepCreatedId = false } = {}) => {
    setEditingId('');
    if (!keepCreatedId) setCreatedId('');
    setForm(EMPTY_FORM);
    uploader.clearQueue();
    uploader.setUploadErr('');
  }, [uploader]);

  const startEdit = useCallback((item) => {
    const id = item?.id || item?.docId || '';
    if (!id) return;

    setCreatedId('');
    setEditingId(id);

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
      direct: item.direct == null ? true : !!item.direct,
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

      numApartments: item.numApartments == null ? '' : String(item.numApartments),
      numShops: item.numShops == null ? '' : String(item.numShops),
      numFloors: item.numFloors == null ? '' : String(item.numFloors),
      hasElevator: !!item.hasElevator,
      hasGenerator: !!item.hasGenerator,
      parkingSpaces: item.parkingSpaces == null ? '' : String(item.parkingSpaces),
    });

    uploader.clearQueue();
    uploader.setUploadErr('');
    setTab('create');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }, [uploader]);

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

    out.numApartments = toNumberOrNull(out.numApartments);
    out.numShops = toNumberOrNull(out.numShops);
    out.numFloors = toNumberOrNull(out.numFloors);
    out.parkingSpaces = toNumberOrNull(out.parkingSpaces);

    out.kitchen = !!out.kitchen;
    out.maidRoom = !!out.maidRoom;
    out.driverRoom = !!out.driverRoom;
    out.yard = !!out.yard;
    out.hasElevator = !!out.hasElevator;
    out.hasGenerator = !!out.hasGenerator;

    out.facade = toTextOrEmpty(out.facade).trim();
    out.lotNumber = toTextOrEmpty(out.lotNumber).trim();
    out.plan = toTextOrEmpty(out.plan).trim();
    out.part = toTextOrEmpty(out.part).trim();
    out.neighborhood = toTextOrEmpty(out.neighborhood).trim();

    return out;
  }, []);

  const saveListing = useCallback(async () => {
    if (saving) return;

    if (uploader.uploading) {
      alert('انتظر اكتمال رفع الملفات ثم احفظ الإعلان.');
      return;
    }

    const title = String(form.title || '').trim();
    const neighborhood = String(form.neighborhood || '').trim();

    if (!form.dealType) {
      alert('اختر نوع الصفقة.');
      return;
    }
    if (!form.propertyType) {
      alert('اختر نوع العقار.');
      return;
    }
    if (!title) {
      alert('اكتب عنوان الإعلان.');
      return;
    }
    if (!neighborhood) {
      alert('اختر الحي.');
      return;
    }

    setSaving(true);
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
        title,
        neighborhood,
        images,
        websiteUrl: finalWebsiteUrl,
        ...(hasCoords ? { lat: round6(lat), lng: round6(lng) } : { lat: null, lng: null }),
        updatedAt: new Date(),
      };

      payload = normalizePayload(payload);

      if (editingId) {
        await adminUpdateListing(editingId, payload);
        alert('تم تحديث الإعلان');
        setCreatedId('');
        await loadList();
        resetForm();
      } else {
        const created = await adminCreateListing(payload);
        const id = created?.id || created || '';
        setCreatedId(id || 'تم');
        alert('تمت إضافة الإعلان');
        resetForm({ keepCreatedId: true });
      }
    } catch (err) {
      console.error(err);
      alert(String(err?.message || 'حصل خطأ أثناء حفظ الإعلان.'));
    } finally {
      setSaving(false);
    }
  }, [saving, uploader.uploading, form, editingId, normalizePayload, loadList, resetForm]);

  // ===================== UI =====================
  return (
    <div className="adminWrap">
      {!user ? (
        <div className="container" style={{ paddingTop: 16, maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ margin: '6px 0 4px' }}>تسجيل دخول الأدمن</h1>
          <div className="muted">سجّل بحساب Email/Password الموجود في Firebase Auth</div>

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

              {authErr ? (
                <div className="col-12">
                  <div className="card" style={{ borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
                    {authErr}
                  </div>
                </div>
              ) : null}

              <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
                <button className="btnPrimary" disabled={authBusy}>
                  {authBusy ? 'جاري الدخول…' : 'دخول'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : !isAdmin ? (
        <div className="container" style={{ paddingTop: 16 }}>
          <h1 style={{ margin: '6px 0 4px' }}>غير مصرح</h1>
          <div className="muted">هذا الحساب ليس ضمن صلاحيات الأدمن.</div>
          <section className="card" style={{ marginTop: 12 }}>
            <div className="muted">الإيميل: {user.email || '—'}</div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={logout} type="button">تسجيل خروج</button>
            </div>
          </section>
        </div>
      ) : (
        <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: '6px 0 0' }}>لوحة الأدمن</h1>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{user.email}</div>
            </div>
            <button className="btn" onClick={logout} type="button">تسجيل خروج</button>
          </div>

          <section className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className={tab === 'create' ? 'btnPrimary' : 'btn'} onClick={() => setTab('create')} type="button">
                إضافة/تعديل عرض
              </button>
              <button className={tab === 'manage' ? 'btnPrimary' : 'btn'} onClick={() => setTab('manage')} type="button">
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
              storage={storage}
              db={db}
            />
          )}
        </div>
      )}

      {/* ===== CSS محلي لضمان عدم اللخبطة بعد نقل الستايلات ===== */}
      <style jsx>{`
        .adminWrap :global(.card) {
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 16px;
          padding: 14px;
          background: #fff;
        }

        .adminWrap :global(.row) {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .adminWrap :global(.muted) {
          color: rgba(0,0,0,0.6);
        }

        .adminWrap .grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 14px;
        }
        .adminWrap .col-12 { grid-column: span 12; }
        .adminWrap .col-6 { grid-column: span 6; }
        .adminWrap .col-3 { grid-column: span 3; }

        @media (max-width: 768px) {
          .adminWrap .col-6,
          .adminWrap .col-3 { grid-column: span 12; }
        }

        .adminWrap :global(.input),
        .adminWrap .select {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 12px;
          padding: 10px 12px;
          background: #fff;
          outline: none;
        }

        .adminWrap :global(.btn),
        .adminWrap .btnDanger,
        .adminWrap .btnPrimary {
          border-radius: 12px;
          padding: 10px 14px;
          border: 1px solid rgba(0,0,0,0.14);
          background: #fff;
          cursor: pointer;
          font-weight: 800;
        }

        .adminWrap .btnPrimary {
          border: none;
          color: #111;
          background: linear-gradient(135deg, var(--primary, #d6b35b), var(--primary2, #b68b40));
        }

        .adminWrap .btnDanger {
          border: 1px solid rgba(180,35,24,.25);
          background: rgba(180,35,24,.06);
          color: #b42318;
        }

        .adminWrap .radio-label {
          background: rgba(214, 179, 91, 0.06);
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(214, 179, 91, 0.35);
          cursor: pointer;
          user-select: none;
        }
        .adminWrap .radio-label input[type="radio"] {
          accent-color: var(--primary, #d6b35b);
        }

        .adminWrap .dropzone {
          border: 1px dashed rgba(214, 179, 91, 0.55);
          background: rgba(214, 179, 91, 0.06);
          border-radius: 16px;
          padding: 18px;
          cursor: pointer;
          text-align: center;
        }

        .adminWrap .chip {
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
          color: #fff;
        }

        .adminWrap .progress {
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .adminWrap .progressBar {
          height: 100%;
          background: linear-gradient(135deg, var(--primary, #d6b35b), var(--primary2, #b68b40));
          border-radius: 999px;
          transition: width 0.2s ease;
        }

        .adminWrap .mapWrap {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(214, 179, 91, 0.28);
          background: rgba(255, 255, 255, 0.03);
        }
        .adminWrap .mapEl {
          width: 100%;
          height: 420px;
        }
        @media (max-width: 768px) {
          .adminWrap .mapEl { height: 320px; }
        }
        .adminWrap .mapOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          text-align: center;
          background: rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(6px);
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}
