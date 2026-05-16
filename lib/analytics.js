import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebase } from './firebaseClient';

export const ANALYTICS_DAILY_COLLECTION = 'abhur_daily_stats';
export const ANALYTICS_RETENTION_DAYS = 3;

export function getRiyadhDateKey(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function getLastDateKeys(count = ANALYTICS_RETENTION_DAYS) {
  const keys = [];
  const now = new Date();

  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(getRiyadhDateKey(d));
  }

  return keys;
}

function safeDocId(value) {
  const text = String(value || '/').trim() || '/';
  return encodeURIComponent(text).replace(/\./g, '%2E').slice(0, 420);
}

function cleanPath(path) {
  const text = String(path || '/').trim();
  if (!text) return '/';

  try {
    const url = new URL(text, 'https://aqarobhur.com');
    return `${url.pathname}${url.search || ''}`;
  } catch {
    return text.startsWith('/') ? text : `/${text}`;
  }
}

function normalizeReferrer(referrer) {
  const text = String(referrer || '').trim();
  if (!text) return '';

  try {
    const url = new URL(text);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return text.slice(0, 120);
  }
}

function extractListingId(path) {
  const clean = cleanPath(path);
  const match = clean.match(/^\/listing\/([^/?#]+)/);
  if (!match?.[1]) return '';

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapPageDoc(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    path: String(data.path || ''),
    title: String(data.title || ''),
    listingId: String(data.listingId || ''),
    views: numberValue(data.views),
    visits: numberValue(data.visits),
    lastReferrer: String(data.lastReferrer || ''),
  };
}

function mapDailyDoc(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    date: String(data.date || docSnap.id),
    pageViews: numberValue(data.pageViews),
    visits: numberValue(data.visits),
    uniquePages: numberValue(data.uniquePages),
    lastPath: String(data.lastPath || ''),
    lastReferrer: String(data.lastReferrer || ''),
  };
}

async function cleanupOldAnalyticsDays(db) {
  try {
    const keep = new Set(getLastDateKeys(ANALYTICS_RETENTION_DAYS));
    const dailySnap = await getDocs(query(collection(db, ANALYTICS_DAILY_COLLECTION), orderBy('date', 'desc'), limit(20)));
    const oldDocs = dailySnap.docs.filter((item) => !keep.has(item.id));

    if (!oldDocs.length) return;

    const batch = writeBatch(db);

    for (const oldDoc of oldDocs) {
      const pagesSnap = await getDocs(query(collection(db, ANALYTICS_DAILY_COLLECTION, oldDoc.id, 'pages'), limit(50)));
      pagesSnap.docs.forEach((pageDoc) => batch.delete(pageDoc.ref));
      batch.delete(oldDoc.ref);
    }

    await batch.commit();
  } catch (error) {
    console.warn('[Analytics] cleanup failed:', error?.message || error);
  }
}

export async function trackPageView({
  path = '/',
  title = '',
  referrer = '',
  isNewVisit = false,
} = {}) {
  const { db } = getFirebase();

  const clean = cleanPath(path);
  const todayKey = getRiyadhDateKey();
  const pageDocId = safeDocId(clean);
  const listingId = extractListingId(clean);
  const referrerHost = normalizeReferrer(referrer);
  const visitInc = isNewVisit ? 1 : 0;

  const todayRef = doc(db, ANALYTICS_DAILY_COLLECTION, todayKey);
  const pageRef = doc(db, ANALYTICS_DAILY_COLLECTION, todayKey, 'pages', pageDocId);

  const batch = writeBatch(db);

  batch.set(
    todayRef,
    {
      date: todayKey,
      pageViews: increment(1),
      visits: increment(visitInc),
      lastPath: clean,
      lastReferrer: referrerHost,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    pageRef,
    {
      path: clean,
      title: String(title || '').trim().slice(0, 180),
      listingId,
      views: increment(1),
      visits: increment(visitInc),
      lastReferrer: referrerHost,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  cleanupOldAnalyticsDays(db);
}

export async function fetchAnalyticsSummary() {
  const { db } = getFirebase();
  const dateKeys = getLastDateKeys(ANALYTICS_RETENTION_DAYS);
  const todayKey = dateKeys[0];

  try {
    const [todaySnap, todayPagesSnap, ...dailySnaps] = await Promise.all([
      getDoc(doc(db, ANALYTICS_DAILY_COLLECTION, todayKey)),
      getDocs(query(collection(db, ANALYTICS_DAILY_COLLECTION, todayKey, 'pages'), orderBy('views', 'desc'), limit(12))),
      ...dateKeys.map((dateKey) => getDoc(doc(db, ANALYTICS_DAILY_COLLECTION, dateKey))),
    ]);

    const today = todaySnap.exists() ? todaySnap.data() : {};
    const dailyStats = dailySnaps.map((snap, index) => {
      if (snap.exists()) return mapDailyDoc(snap);
      return {
        id: dateKeys[index],
        date: dateKeys[index],
        pageViews: 0,
        visits: 0,
        uniquePages: 0,
        lastPath: '',
        lastReferrer: '',
      };
    });

    const todayPages = todayPagesSnap.docs.map(mapPageDoc);

    return {
      retentionDays: ANALYTICS_RETENTION_DAYS,
      todayDate: todayKey,
      todayPageViews: numberValue(today.pageViews),
      todayVisits: numberValue(today.visits),
      todayUniquePages: todayPages.length,
      lastPath: String(today.lastPath || ''),
      lastReferrer: String(today.lastReferrer || ''),
      todayPages,
      topPages: todayPages,
      dailyStats,
    };
  } catch (error) {
    console.warn('[Analytics] fetchAnalyticsSummary failed:', error?.message || error);
    return {
      retentionDays: ANALYTICS_RETENTION_DAYS,
      todayDate: todayKey,
      todayPageViews: 0,
      todayVisits: 0,
      todayUniquePages: 0,
      lastPath: '',
      lastReferrer: '',
      todayPages: [],
      topPages: [],
      dailyStats: dateKeys.map((dateKey) => ({
        id: dateKey,
        date: dateKey,
        pageViews: 0,
        visits: 0,
        uniquePages: 0,
        lastPath: '',
        lastReferrer: '',
      })),
      error: error?.message || 'تعذر تحميل إحصائيات المشاهدات.',
    };
  }
}
