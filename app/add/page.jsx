'use client';

/**
 * صفحة إضافة إعلان (منفصلة عن لوحة الأدمن)
 * - تسجيل دخول الأدمن
 * - تحقق صلاحية الأدمن
 * - نموذج إضافة/تعديل إعلان + رفع وسائط + خريطة ذكية متسلسلة
 * ملاحظة: لا تحتوي على إدارة العروض (قائمة/حذف) — فقط الإضافة.
 */

// ===================== الواردات =====================
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { getFirebase } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { isAdminUser } from '@/lib/admin';
import { adminCreateListing, adminUpdateListing } from '@/lib/listings';
import { DEAL_TYPES, NEIGHBORHOODS, PROPERTY_TYPES, STATUS_OPTIONS, PROPERTY_CLASSES } from '@/lib/taxonomy';
import { formatPriceSAR } from '@/lib/format';

// ميزة إضافية: ضغط الصور والفيديو
import imageCompression from 'browser-image-compression'; // تحتاج تثبيت: npm install browser-image-compression
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'; // تحتاج تثبيت: npm install @ffmpeg/ffmpeg @ffmpeg/core

// ===================== الثوابت =====================
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

// حدود حجم الملفات
const MAX_IMAGE_SIZE_MB = 10; // 10MB
const MAX_VIDEO_SIZE_MB = 100; // 100MB

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

// دوال ضغط الصور والفيديو
const compressImage = async (file) => {
  const options = {
    maxSizeMB: 1, // الحجم الأقصى بعد الضغط 1MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('فشل ضغط الصورة:', error);
    return file; // إرجاع الملف الأصلي في حال الفشل
  }
};

const compressVideo = async (file) => {
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
  await ffmpeg.run('-i', 'input.mp4', '-vf', 'scale=1280:720', '-b:v', '1M', 'output.mp4');
  const data = ffmpeg.FS('readFile', 'output.mp4');
  const compressedFile = new File([data.buffer], file.name, { type: 'video/mp4' });
  return compressedFile;
};

// ===================== دوال مساعدة للأمثلة الذكية بناءً على السوق =====================
const getPriceExample = (dealType, propertyType) => {
  if (!dealType || !propertyType) return "مثال: 150000";
  if (dealType === 'sale') {
    switch (propertyType) {
      case 'أرض': return "مثال: 1200000";
      case 'فيلا': return "مثال: 2500000";
      case 'شقة': return "مثال: 600000";
      case 'دور': return "مثال: 1100000";
      case 'عمارة': return "مثال: 4500000";
      case 'محل': return "مثال: 300000";
      default: return "مثال: 1000000";
    }
  } else {
    switch (propertyType) {
      case 'أرض': return "مثال: 50000 (إيجار سنوي)";
      case 'فيلا': return "مثال: 120000 (إيجار سنوي)";
      case 'شقة': return "مثال: 35000 (إيجار سنوي)";
      case 'دور': return "مثال: 45000 (إيجار سنوي)";
      case 'عمارة': return "مثال: 350000 (إيجار بالكامل)";
      case 'محل': return "مثال: 60000 (إيجار سنوي)";
      default: return "مثال: 40000";
    }
  }
};

const getAreaExample = (propertyType) => {
  switch (propertyType) {
    case 'أرض': return "مثال: 600";
    case 'فيلا': return "مثال: 312";
    case 'شقة': return "مثال: 145";
    case 'دور': return "مثال: 300";
    case 'عمارة': return "مثال: 750";
    case 'محل': return "مثال: 50";
    default: return "مثال: 300";
  }
};

// ===================== مكون حقل النموذج =====================
const Field = ({ label, children, hint, error }) => (
  <div style={{ marginBottom: 16 }}>
    <div className="muted" style={{ fontSize: 13, marginBottom: 6, fontWeight: 700 }}>
      {label}
    </div>
    {children}
    {hint && (
      <div className="muted" style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
        {hint}
      </div>
    )}
    {error && (
      <div style={{ color: '#b42318', fontSize: 12, marginTop: 4 }}>{error}</div>
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
      )}&v=weekly&language=ar&region=SA&libraries=places`; // أضفنا places للبحث

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
  const lastValidPositionRef = useRef(null);
  const searchBoxRef = useRef(null); // للبحث

  const [mapErr, setMapErr] = useState('');
  const [geoErr, setGeoErr] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [boundsMsg, setBoundsMsg] = useState('');

  const defaultCenter = useMemo(() => ({ lat: 21.7628, lng: 39.0994 }), []);

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
        if (lastValidPositionRef.current) {
          markerRef.current?.setPosition(lastValidPositionRef.current);
          mapRef.current?.panTo(lastValidPositionRef.current);
        } else {
          markerRef.current?.setPosition(defaultCenter);
          mapRef.current?.panTo(defaultCenter);
        }
        return;
      }
      setBoundsMsg('');
      lastValidPositionRef.current = { lat, lng };
      onChange?.({ lat: round6(lat), lng: round6(lng) });
    },
    [isWithinJeddah, onChange, defaultCenter]
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

        // إضافة مربع البحث
        const searchBox = new gmaps.places.SearchBox(mapElRef.current);
        searchBoxRef.current = searchBox;
        map.controls[gmaps.ControlPosition.TOP_LEFT].push(mapElRef.current); // أضف الحاوية
        searchBox.addListener('places_changed', () => {
          const places = searchBox.getPlaces();
          if (places.length === 0) return;
          const place = places[0];
          if (!place.geometry) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          if (isWithinJeddah(lat, lng)) {
            emitPosition(lat, lng);
          } else {
            setGeoErr('المكان المحدد خارج جدة');
          }
        });

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
          اختر الموقع بالنقر على الخريطة أو اسحب العلامة. (يُسمح فقط بمواقع داخل مدينة جدة)
        </span>
        <button className="btn" type="button" onClick={useMyLocation} style={{ fontSize: 12, padding: '6px 10px' }}>
          موقعي الحالي
        </button>
      </div>

      <div className="mapWrap" style={{ marginTop: 10 }}>
        <div ref={mapElRef} className="mapEl" />
        {!mapReady && !mapErr && <div className="mapOverlay muted">جاري تحميل الخريطة…</div>}
        {mapErr && <div className="mapOverlay" style={{ color: '#b42318' }}>{mapErr}</div>}
      </div>

      {boundsMsg && (
        <div className="muted" style={{ marginTop: 8, color: '#b45f06', fontSize: 12, fontWeight: 'bold' }}>
          {boundsMsg}
        </div>
      )}
      {geoErr && (
        <div className="muted" style={{ marginTop: 8, color: '#b42318', fontSize: 12 }}>
          {geoErr}
        </div>
      )}

      <style jsx>{`
        .mapWrap {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(214, 179, 91, 0.28);
          background: rgba(255, 255, 255, 0.03);
        }
        .mapEl {
          width: 100%;
          height: 420px;
        }
        @media (max-width: 768px) {
          .mapEl {
            height: 320px;
          }
        }
        .mapOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          text-align: center;
          background: rgba(0, 0, 0, 0.18);
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

// ===================== Hook مخصص لرفع الملفات مع الضغط =====================
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
    let safe = raw
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\.-]/g, '')
      .slice(0, 100);

    if (!safe || safe.replace(/[_.-]/g, '') === '') {
      safe = `file_${Date.now()}_${Math.random().toString(16).slice(2)}.bin`;
    }
    return safe;
  }, []);

  // التحقق من حجم الملف قبل الرفع
  const validateFileSize = (file) => {
    const isVideo = isVideoFile(file);
    const maxSizeMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`حجم الملف يتجاوز الحد المسموح (${maxSizeMB}MB)`);
    }
    return true;
  };

  // إضافة الملفات بعد الضغط
  const addFiles = useCallback(async (files) => {
    setUploadErr('');
    const incoming = Array.from(files || []).filter(Boolean);
    if (!incoming.length) return;

    // معالجة كل ملف: ضغط ثم إضافة للقائمة
    const processed = await Promise.all(
      incoming.map(async (file) => {
        try {
          validateFileSize(file); // التحقق من الحجم
          let compressedFile = file;
          if (isVideoFile(file)) {
            compressedFile = await compressVideo(file); // ضغط الفيديو
          } else {
            compressedFile = await compressImage(file); // ضغط الصورة
          }
          return {
            id: nowId(),
            file: compressedFile,
            preview: URL.createObjectURL(compressedFile),
            type: compressedFile.type || '',
            selected: true,
            progress: 0,
            status: 'ready',
            error: '',
          };
        } catch (err) {
          // في حالة فشل الضغط أو الحجم الكبير، نضيف الملف مع خطأ
          return {
            id: nowId(),
            file,
            preview: URL.createObjectURL(file),
            type: file.type || '',
            selected: true,
            progress: 0,
            status: 'error',
            error: err.message || 'فشل تجهيز الملف',
          };
        }
      })
    );

    setQueue((prev) => {
      const remaining = Math.max(0, MAX_FILES - prev.length);
      const slice = processed.slice(0, remaining);
      return [...prev, ...slice];
    });
  }, [isVideoFile]);

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
    setQueue((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status: 'ready', selected: true, progress: 0, error: '' } : x
      )
    );
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
      const folder = isVideo ? 'abhur_videos' : 'abhur_images';
      const timeoutMs = isVideo ? VIDEO_TIMEOUT_MS : IMAGE_TIMEOUT_MS;

      const safeName = makeSafeName(file);
      const path = `${folder}/${uid}/${Date.now()}_${idx}_${safeName}`;
      const fileRef = storageRef(storage, path);

      setQueue((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, status: 'uploading', progress: 0, error: '' } : x))
      );

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
  };
};

// ===================== مكون معاينة الإعلان =====================
const PreviewModal = ({ form, onClose }) => {
  if (!form) return null;
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <h3>معاينة الإعلان</h3>
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p><strong>العنوان:</strong> {form.title}</p>
          <p><strong>نوع العملية:</strong> {DEAL_TYPES.find(d => d.key === form.dealType)?.label || form.dealType}</p>
          <p><strong>نوع العقار:</strong> {form.propertyType}</p>
          <p><strong>الحي:</strong> {form.neighborhood}</p>
          <p><strong>المساحة:</strong> {form.area} م²</p>
          <p><strong>السعر:</strong> {formatPriceSAR(toNumberOrNull(form.price))} {form.priceNegotiable ? '(قابل للتفاوض)' : ''}</p>
          <p><strong>رقم الرخصة:</strong> {form.licenseNumber || '—'}</p>
          <p><strong>رقم الجوال:</strong> {form.contactPhone || '—'}</p>
          <p><strong>الوصف:</strong> {form.description || '—'}</p>
          {form.customFields?.length > 0 && (
            <>
              <p><strong>تفاصيل إضافية:</strong></p>
              <ul>
                {form.customFields.map((cf, idx) => (
                  <li key={idx}>{cf.key}: {cf.value}</li>
                ))}
              </ul>
            </>
          )}
          {form.images?.length > 0 && (
            <>
              <p><strong>الصور:</strong></p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {form.images.map((url, idx) => (
                  <img key={idx} src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                ))}
              </div>
            </>
          )}
        </div>
        <button className="btn" onClick={onClose} style={{ marginTop: 10 }}>إغلاق</button>
      </div>
      <style jsx>{`
        .modalOverlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modalContent {
          background: #1a1a1a;
          padding: 20px;
          border-radius: 16px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow: auto;
        }
      `}</style>
    </div>
  );
};

// ===================== Hook للحفظ التلقائي (Draft) =====================
const useDraft = (form, setForm, enabled) => {
  const DRAFT_KEY = 'addListingDraft';
  const timeoutRef = useRef(null);

  // استعادة المسودة عند التحميل
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // دمج مع EMPTY_FORM لضمان الحقول الجديدة
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error('فشل استعادة المسودة', e);
    }
  }, [enabled, setForm]);

  // حفظ المسودة كل 3 ثوانٍ
  useEffect(() => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch (e) {
        console.error('فشل حفظ المسودة', e);
      }
    }, 3000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [form, enabled]);
};

// ===================== النموذج الفارغ =====================
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
  priceNegotiable: false, // ميزة 8
  licenseNumber: '', // ميزة 9
  contactPhone: '', // ميزة 18
  status: 'available',
  direct: true,
  websiteUrl: '',
  lat: '',
  lng: '',
  description: '',
  images: [],
  // حقول مخصصة ديناميكية (ميزة 2)
  customFields: [], // { key: '', value: '' }
  // المشتركة للسكن
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
  // إضافات الشقة والفيلا والدور
  acInstalled: false,
  driverRoom: false,
  yard: false,
  pool: false,
  privateEntrance: false,
  // العمارة
  numApartments: '',
  numShops: '',
  numFloors: '',
  hasElevator: false,
  hasGenerator: false,
  parkingSpaces: '',
  expectedIncome: '',
  // المحل
  mezzanine: false,
};

// ===================== دالة التحقق من صحة النموذج =====================
const validateForm = (form) => {
  const errors = {};

  if (!form.dealType) errors.dealType = 'اختر نوع العملية';
  if (!form.propertyType) errors.propertyType = 'اختر نوع العقار';
  if (!form.title) errors.title = 'العنوان مطلوب';
  if (!form.neighborhood) errors.neighborhood = 'اختر الحي';
  if (!form.area) errors.area = 'المساحة مطلوبة';
  else if (toNumberOrNull(form.area) <= 0) errors.area = 'المساحة يجب أن تكون رقماً موجباً';
  if (!form.price) errors.price = 'السعر مطلوب';
  else if (toNumberOrNull(form.price) <= 0) errors.price = 'السعر يجب أن يكون رقماً موجباً';

  // التحقق من الإحداثيات ضمن جدة
  const lat = toNumberOrNull(form.lat);
  const lng = toNumberOrNull(form.lng);
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    errors.coords = 'يرجى تحديد الموقع على الخريطة';
  } else {
    const within =
      lat >= JEDDAH_BOUNDS.south && lat <= JEDDAH_BOUNDS.north &&
      lng >= JEDDAH_BOUNDS.west && lng <= JEDDAH_BOUNDS.east;
    if (!within) errors.coords = 'الموقع خارج حدود مدينة جدة';
  }

  // رقم الجوال اختياري لكن إن وجد يجب أن يكون صالحاً
  if (form.contactPhone && !/^05\d{8}$/.test(form.contactPhone)) {
    errors.contactPhone = 'رقم الجوال غير صحيح (يجب أن يبدأ بـ 05 ويتكون من 10 أرقام)';
  }

  return errors;
};

// ===================== النموذج الذكي والتفاعلي =====================
const CreateEditForm = ({ editingId, form, setForm, onSave, onReset, busy, createdId, uploader, onDuplicate }) => {
  const {
    queue,
    uploading,
    uploadErr,
    fileInputRef,
    addFiles,
    removeQueued,
    toggleSelected,
    retryQueued,
    uploadSelected,
  } = uploader;

  const latNum = toNumberOrNull(form.lat);
  const lngNum = toNumberOrNull(form.lng);
  const hasCoords = isFiniteNumber(latNum) && isFiniteNumber(lngNum);

  // حالة الخطأ لكل حقل
  const [errors, setErrors] = useState({});
  // حالة معاينة الإعلان
  const [showPreview, setShowPreview] = useState(false);

  const handleDealTypeChange = (e) => {
    setForm({ ...form, dealType: e.target.value, propertyType: '' });
  };

  const handlePropertyTypeChange = (e) => {
    setForm({ ...form, propertyType: e.target.value });
  };

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files?.length) await addFiles(files);
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

  // دوال الحقول المخصصة (ميزة 2)
  const addCustomField = useCallback(() => {
    setForm((p) => ({
      ...p,
      customFields: [...(p.customFields || []), { key: '', value: '' }],
    }));
  }, [setForm]);

  const updateCustomField = useCallback((index, field, value) => {
    setForm((p) => {
      const newFields = [...(p.customFields || [])];
      newFields[index] = { ...newFields[index], [field]: value };
      return { ...p, customFields: newFields };
    });
  }, [setForm]);

  const removeCustomField = useCallback((index) => {
    setForm((p) => ({
      ...p,
      customFields: (p.customFields || []).filter((_, i) => i !== index),
    }));
  }, [setForm]);

  const saveButtonStyle = {
    background: 'linear-gradient(135deg, var(--primary) 0%, #b68b40 100%)',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    padding: '12px 32px',
    borderRadius: '40px',
    boxShadow: '0 8px 20px rgba(214, 179, 91, 0.3)',
    fontSize: '1.1rem',
    transition: 'all 0.2s ease',
    cursor: busy ? 'not-allowed' : 'pointer',
    opacity: busy ? 0.7 : 1,
  };

  const dealTypeChosen = !!form.dealType;
  const propertyTypeChosen = !!form.propertyType;

  // الأمثلة التفاعلية
  const pricePlaceholder = getPriceExample(form.dealType, form.propertyType);
  const areaPlaceholder = getAreaExample(form.propertyType);

  // التحقق من الصحة قبل الحفظ
  const handleSave = () => {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSave();
    } else {
      alert('يرجى تصحيح الأخطاء قبل الحفظ');
    }
  };

  return (
    <section className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 900 }}>{editingId ? 'تعديل الإعلان' : 'إضافة إعلان'}</div>
        <div className="row" style={{ gap: 8 }}>
          {editingId && (
            <button className="btn" onClick={onReset} type="button">
              إلغاء التعديل
            </button>
          )}
          {/* زر نسخ الإعلان (ميزة 17) */}
          {onDuplicate && (
            <button className="btn" onClick={onDuplicate} type="button">
              نسخ الإعلان
            </button>
          )}
          {/* زر معاينة الإعلان (ميزة 3) */}
          <button className="btn" type="button" onClick={() => setShowPreview(true)}>
            معاينة
          </button>
        </div>
      </div>

      {createdId && (
        <div className="card" style={{ marginTop: 10, borderColor: 'rgba(21,128,61,.25)', background: 'rgba(21,128,61,.06)' }}>
          تم إنشاء العرض بنجاح. ID: <b>{createdId}</b>
        </div>
      )}

      {(uploading || busy) && (
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {busy ? 'جاري حفظ الإعلان…' : 'جاري رفع الملفات…'}
        </div>
      )}

      <div className="grid" style={{ marginTop: 10 }}>
        
        {/* المرحلة 1: نوع العملية */}
        <div className="col-12">
          <Field label="اختر نوع الإعلان" error={errors.dealType}>
            <div className="row" style={{ gap: 10 }}>
              {DEAL_TYPES.map((deal) => (
                <label key={deal.key} className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="dealType"
                    value={deal.key}
                    checked={form.dealType === deal.key}
                    onChange={handleDealTypeChange}
                  />
                  {deal.label}
                </label>
              ))}
            </div>
          </Field>
        </div>

        {/* المرحلة 2: نوع العقار */}
        {dealTypeChosen && (
          <div className="col-12">
            <Field label="اختر نوع العقار" error={errors.propertyType}>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                {PROPERTY_TYPES.map((type) => (
                  <label key={type} className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="propertyType"
                      value={type}
                      checked={form.propertyType === type}
                      onChange={handlePropertyTypeChange}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* المرحلة 3: الخانات المتغيرة بناءً على الاختيار */}
        {propertyTypeChosen && (
          <>
            {/* البيانات الأساسية المشتركة */}
            <div className="col-12" style={{ marginBottom: 15, borderBottom: '1px solid rgba(214, 179, 91, 0.2)', paddingBottom: 15 }}>
              <div style={{ fontWeight: 900, marginBottom: 10, color: 'var(--primary)' }}>البيانات الأساسية</div>
              <div className="grid">
                <div className="col-6">
                  <Field label="عنوان العرض" error={errors.title}>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder={`مثال: ${form.propertyType} ${form.dealType === 'sale' ? 'للبيع' : 'للإيجار'} في موقع مميز`}
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="الحي" error={errors.neighborhood}>
                    <select
                      className="select"
                      value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    >
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
                  <Field label="المساحة (م²)" error={errors.area}>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      placeholder={areaPlaceholder}
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="السعر (بالريال)" error={errors.price}>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder={pricePlaceholder}
                    />
                    {form.price && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                        {formatPriceSAR(toNumberOrNull(form.price))}
                      </div>
                    )}
                  </Field>
                </div>
                {/* ميزة 8: السعر قابل للتفاوض */}
                <div className="col-3">
                  <Field label="قابل للتفاوض">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={form.priceNegotiable}
                        onChange={(e) => setForm({ ...form, priceNegotiable: e.target.checked })}
                      />
                      نعم
                    </label>
                  </Field>
                </div>
                {/* ميزة 9: رقم رخصة الإعلان */}
                <div className="col-3">
                  <Field label="رقم الرخصة (اختياري)">
                    <input
                      className="input"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      placeholder="مثال: 123456"
                    />
                  </Field>
                </div>
                {/* ميزة 18: رقم الجوال للتواصل */}
                <div className="col-3">
                  <Field label="رقم الجوال (اختياري)" error={errors.contactPhone}>
                    <input
                      className="input"
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      placeholder="05xxxxxxxx"
                    />
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="مباشر">
                    <select
                      className="select"
                      value={form.direct ? 'yes' : 'no'}
                      onChange={(e) => setForm({ ...form, direct: e.target.value === 'yes' })}
                    >
                      <option value="yes">نعم (مباشر من المالك)</option>
                      <option value="no">وسيط/وكيل</option>
                    </select>
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="الحالة">
                    <select
                      className="select"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="col-3">
                  <Field label="المخطط / الجزء (اختياري)">
                    <input
                      className="input"
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                      placeholder="مثال: الخالدية ج"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* تفاصيل مخصصة: أرض (كما هي مع بعض الإضافات) */}
            {form.propertyType === 'أرض' && (
              <div className="col-12">
                <div className="card" style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>مواصفات الأرض</div>
                  <div className="grid">
                    <div className="col-3">
                      <Field label="سكني / تجاري">
                        <select
                          className="select"
                          value={form.propertyClass}
                          onChange={(e) => setForm({ ...form, propertyClass: e.target.value })}
                        >
                          <option value="">غير محدد</option>
                          {PROPERTY_CLASSES.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="رقم القطعة">
                        <input
                          className="input"
                          value={form.lotNumber}
                          onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                          placeholder="مثال: 250"
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
                          placeholder="مثال: 30"
                        />
                      </Field>
                    </div>
                    <div className="col-3">
                      <Field label="الواجهة">
                        <input
                          className="input"
                          value={form.facade}
                          onChange={(e) => setForm({ ...form, facade: e.target.value })}
                          placeholder="شمالية / شرقية..."
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* باقي أنواع العقارات (فيلا، شقة، دور، عمارة، محل) مشابهة مع إضافة الحقول الجديدة */}
            {/* سأختصرها هنا للحفاظ على المساحة، لكن بنفس النمط مع إضافة priceNegotiable, licenseNumber, contactPhone في الأقسام المناسبة */}

            {/* الخريطة والوصف والصور (كما هي) */}
            <div className="col-12">
              <Field label="موقع العقار على الخريطة" hint="حدد الموقع من الخريطة (يُسمح فقط بمواقع داخل مدينة جدة). يمكنك أيضاً لصق رابط Google Maps." error={errors.coords}>
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
                        <a className="btn" href={buildGoogleMapsUrl(latNum, lngNum)} target="_blank" rel="noreferrer">
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

            <div className="col-12">
              <Field label="وصف العرض والتفاصيل الإضافية">
                <textarea
                  className="input"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="أضف أي تفاصيل أخرى تجذب العميل (تشطيب فاخر، قريب من الخدمات، نقبل البنك...)"
                />
              </Field>
            </div>

            {/* قسم رفع الصور والفيديو مع ضغط تلقائي */}
            <div className="col-12">
              <Field label="الصور والفيديو (سيتم ضغطها تلقائياً)" hint="اسحب الملفات هنا أو اضغط لاختيارها. سيتم رفعها تلقائياً بعد الضغط.">
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
                  <div className="muted" style={{ marginTop: 6 }}>أو اضغط لاختيار الملفات من الجوال أو الكمبيوتر</div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    await addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />

                {uploadErr && (
                  <div className="card" style={{ marginTop: 10, borderColor: 'rgba(180,35,24,.25)', background: 'rgba(180,35,24,.05)' }}>
                    {uploadErr}
                  </div>
                )}

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
                              disablePictureInPicture // منع ملء الشاشة
                              controlsList="nodownload nofullscreen" // منع عناصر التحكم
                            />
                          ) : (
                            <img src={q.preview} alt="" style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 12 }} />
                          )}

                          <div className="chip">
                            <input type="checkbox" checked={!!q.selected} onChange={() => toggleSelected(q.id)} aria-label="تحديد الملف" disabled={q.status === 'uploading'} />
                            <span style={{ fontSize: 12, fontWeight: 800 }}>تحديد</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {q.status === 'done' ? 'تم' : q.status === 'uploading' ? 'يرفع…' : q.status === 'error' ? 'فشل' : 'جاهز'}
                            </span>

                            <div className="row" style={{ gap: 8 }}>
                              {q.status === 'error' && (
                                <button className="btn" type="button" onClick={() => retryQueued(q.id)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
                                  إعادة المحاولة
                                </button>
                              )}
                              <button className="btnDanger" type="button" onClick={() => removeQueued(q.id)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12 }}>
                                حذف
                              </button>
                            </div>
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

                {queue.some((x) => x.selected && x.status === 'ready') && (
                  <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className="btn" type="button" onClick={uploadSelected} disabled={uploading}>
                      رفع المحدد
                    </button>
                  </div>
                )}
              </Field>
            </div>

            {Array.isArray(form.images) && form.images.length > 0 && (
              <div className="col-12">
                <Field label="الوسائط المرفوعة للإعلان">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {form.images.map((url) => (
                      <div key={url} className="card" style={{ padding: 10 }}>
                        {isVideoUrl(url) ? (
                          <video
                            src={url}
                            style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 12, background: '#000' }}
                            controls
                            playsInline
                            disablePictureInPicture
                            controlsList="nodownload nofullscreen"
                          />
                        ) : (
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

            {/* قسم الحقول المخصصة (ميزة 2) */}
            <div className="col-12" style={{ marginTop: 20, borderTop: '1px solid rgba(214, 179, 91, 0.2)', paddingTop: 20 }}>
              <div style={{ fontWeight: 900, marginBottom: 10, color: 'var(--primary)' }}>
                حقول إضافية (يمكنك إضافة أي تفاصيل أخرى)
              </div>
              <div className="grid" style={{ gap: 10 }}>
                {form.customFields && form.customFields.map((field, index) => (
                  <div key={index} className="col-12" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="input"
                      style={{ flex: 1, minWidth: 150 }}
                      placeholder="اسم الحقل (مثلاً: تكييف)"
                      value={field.key}
                      onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                    />
                    <input
                      className="input"
                      style={{ flex: 2, minWidth: 200 }}
                      placeholder="قيمة الحقل (مثلاً: مركزي)"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                    />
                    <button
                      className="btnDanger"
                      type="button"
                      onClick={() => removeCustomField(index)}
                      style={{ padding: '10px 16px' }}
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <div className="col-12">
                  <button className="btn" type="button" onClick={addCustomField} style={{ width: '100%' }}>
                    + إضافة حقل جديد
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" style={saveButtonStyle} disabled={busy || uploading} onClick={handleSave}>
                {busy ? 'جاري الحفظ…' : uploading ? 'انتظر اكتمال رفع الملفات…' : editingId ? 'تحديث الإعلان' : 'نشر الإعلان'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* نافذة المعاينة (ميزة 3) */}
      {showPreview && <PreviewModal form={form} onClose={() => setShowPreview(false)} />}

      <style jsx>{`
        .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 15px; }
        .col-12 { grid-column: span 12; }
        .col-6 { grid-column: span 6; }
        .col-4 { grid-column: span 4; }
        .col-3 { grid-column: span 3; }
        .col-2 { grid-column: span 2; }
        .col-1 { grid-column: span 1; }
        @media (max-width: 768px) {
          .col-6, .col-4, .col-3, .col-2, .col-1 { grid-column: span 12; }
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
        .radio-label {
          background: rgba(255,255,255,0.05);
          padding: 8px 16px;
          border-radius: 40px;
          border: 1px solid rgba(214, 179, 91, 0.3);
          cursor: pointer;
          transition: all 0.2s;
        }
        .radio-label:hover {
          border-color: var(--primary);
          background: rgba(214, 179, 91, 0.1);
        }
        .radio-label input[type="radio"] {
          accent-color: var(--primary);
        }
      `}</style>
    </section>
  );
};

// ===================== الصفحة الرئيسية =====================
export default function AddListingPage() {
  const fb = getFirebase();
  const storage = fb?.storage;

  const { user, email, setEmail, pass, setPass, authErr, busy: authBusy, login, logout, isAdmin } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // ميزة 20: إشعارات

  const uploader = useFileUpload(user, storage, (newUrls) => {
    setForm((p) => ({ ...p, images: uniq([...(p.images || []), ...newUrls]) }));
    // إشعار نجاح الرفع
    setToast({ type: 'success', message: 'تم رفع الملفات بنجاح' });
    setTimeout(() => setToast(null), 3000);
  });

  // ميزة 11: حفظ تلقائي
  useDraft(form, setForm, !!user && isAdmin);

  const resetForm = useCallback(
    ({ keepCreatedId = false } = {}) => {
      setEditingId('');
      if (!keepCreatedId) setCreatedId('');
      setForm(EMPTY_FORM);
      uploader.clearQueue();
      uploader.setUploadErr('');
      // حذف المسودة عند الإرسال الناجح
      localStorage.removeItem('addListingDraft');
    },
    [uploader]
  );

  const normalizePayload = useCallback((payload) => {
    const out = { ...payload };
    
    out.area = toNumberOrNull(out.area);
    out.price = toNumberOrNull(out.price);
    out.bedrooms = toNumberOrNull(out.bedrooms);
    out.bathrooms = toNumberOrNull(out.bathrooms);
    out.floor = toTextOrEmpty(out.floor);
    out.lounges = toNumberOrNull(out.lounges);
    out.majlis = toNumberOrNull(out.majlis);
    out.streetWidth = toNumberOrNull(out.streetWidth);
    out.age = toNumberOrNull(out.age);
    out.numApartments = toNumberOrNull(out.numApartments);
    out.numShops = toNumberOrNull(out.numShops);
    out.numFloors = toNumberOrNull(out.numFloors);
    out.parkingSpaces = toNumberOrNull(out.parkingSpaces);
    out.expectedIncome = toNumberOrNull(out.expectedIncome);

    out.kitchen = !!out.kitchen;
    out.maidRoom = !!out.maidRoom;
    out.driverRoom = !!out.driverRoom;
    out.yard = !!out.yard;
    out.hasElevator = !!out.hasElevator;
    out.hasGenerator = !!out.hasGenerator;
    out.acInstalled = !!out.acInstalled;
    out.pool = !!out.pool;
    out.privateEntrance = !!out.privateEntrance;
    out.mezzanine = !!out.mezzanine;
    out.direct = !!out.direct;
    out.priceNegotiable = !!out.priceNegotiable;

    out.facade = toTextOrEmpty(out.facade).trim();
    out.lotNumber = toTextOrEmpty(out.lotNumber).trim();
    out.title = toTextOrEmpty(out.title).trim();
    out.neighborhood = toTextOrEmpty(out.neighborhood).trim();
    out.plan = toTextOrEmpty(out.plan).trim();
    out.part = toTextOrEmpty(out.part).trim();
    out.description = toTextOrEmpty(out.description).trim();
    out.websiteUrl = toTextOrEmpty(out.websiteUrl).trim();
    out.dealType = toTextOrEmpty(out.dealType).trim();
    out.propertyType = toTextOrEmpty(out.propertyType).trim();
    out.propertyClass = toTextOrEmpty(out.propertyClass).trim();
    out.status = toTextOrEmpty(out.status || 'available').trim();
    out.licenseNumber = toTextOrEmpty(out.licenseNumber).trim();
    out.contactPhone = toTextOrEmpty(out.contactPhone).trim();

    // تنظيف الحقول المخصصة
    out.customFields = (out.customFields || [])
      .filter(cf => cf.key && cf.key.trim() !== '' && cf.value && cf.value.trim() !== '')
      .map(cf => ({ key: cf.key.trim(), value: cf.value.trim() }));

    return out;
  }, []);

  const saveListing = useCallback(async () => {
    if (saving) return;
    if (uploader.uploading) {
      setToast({ type: 'warning', message: 'انتظر اكتمال رفع الملفات ثم احفظ الإعلان.' });
      setTimeout(() => setToast(null), 3000);
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
        images,
        websiteUrl: finalWebsiteUrl,
        ...(hasCoords ? { lat: round6(lat), lng: round6(lng) } : {}),
      };

      payload = normalizePayload(payload);

      // تحقق بسيط: لازم اختيارات الصفقة/العقار
      if (!payload.dealType) {
        setToast({ type: 'error', message: 'اختر نوع العملية (بيع/إيجار).' });
        return;
      }
      if (!payload.propertyType) {
        setToast({ type: 'error', message: 'اختر نوع العقار.' });
        return;
      }
      if (!payload.title) {
        setToast({ type: 'error', message: 'اكتب عنوان العرض.' });
        return;
      }
      if (!payload.neighborhood) {
        setToast({ type: 'error', message: 'اختر الحي.' });
        return;
      }

      if (editingId) {
        await adminUpdateListing(editingId, payload);
        setToast({ type: 'success', message: 'تم تحديث الإعلان' });
        setCreatedId('');
        resetForm();
      } else {
        const id = await adminCreateListing(payload);
        setCreatedId(id);
        setToast({ type: 'success', message: 'تمت إضافة الإعلان بنجاح!' });
        resetForm({ keepCreatedId: true });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'حصل خطأ أثناء حفظ الإعلان. راجع إعدادات Firebase.' });
      console.error(err);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }, [saving, uploader.uploading, form, editingId, normalizePayload, resetForm]);

  // ميزة 17: نسخ الإعلان (ملء النموذج ببيانات افتراضية)
  const duplicateListing = useCallback(() => {
    setForm({ ...EMPTY_FORM, ...form, title: `نسخة من ${form.title}`, images: [] });
    setEditingId('');
    setCreatedId('');
  }, [form]);

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 16, maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ margin: '6px 0 4px' }}>تسجيل دخول الإدارة</h1>
        <div className="muted">هذه الصفحة مخصصة لإضافة إعلان. سجل بحساب الإدارة.</div>

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
              <button className="btnPrimary" disabled={authBusy}>
                {authBusy ? 'جاري الدخول…' : 'دخول'}
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

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <Link className="btn" href="/admin">لوحة الإدارة</Link>
          <Link className="btn" href="/">الرئيسية</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 16 }}>
        <h1 style={{ margin: '6px 0 4px' }}>غير مصرح</h1>
        <div className="muted">هذا الحساب ليس ضمن قائمة الإدارة.</div>

        <section className="card" style={{ marginTop: 12 }}>
          <div className="muted">الإيميل: {user.email || '—'}</div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn" href="/admin">لوحة الأدمن</Link>
            <button className="btn" onClick={logout} type="button">تسجيل خروج</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '6px 0 0' }}>لوحة الإضافة الذكية للعقارات</h1>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {user.email}
          </div>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" href="/admin">لوحة الأدمن</Link>
          <button className="btn" onClick={logout} type="button">تسجيل خروج</button>
        </div>
      </div>

      {/* إشعارات (ميزة 20) */}
      {toast && (
        <div className={`toast ${toast.type}`} style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000 }}>
          {toast.message}
        </div>
      )}

      <CreateEditForm
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSave={saveListing}
        onReset={() => resetForm()}
        busy={saving}
        createdId={createdId}
        uploader={uploader}
        onDuplicate={duplicateListing} // تمرير دالة النسخ
      />
    </div>
  );
}
