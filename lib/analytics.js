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

export const ANALYTICS_SUMMARY_COLLECTION = 'abhur_site_stats';
export const ANALYTICS_DAILY_COLLECTION = 'abhur_daily_stats';
export const ANALYTICS_PAGES_COLLECTION = 'abhur_page_stats';

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

  const summaryRef = doc(db, ANALYTICS_SUMMARY_COLLECTION, 'summary');
  const todayRef = doc(db, ANALYTICS_DAILY_COLLECTION, todayKey);
  const pageRef = doc(db, ANALYTICS_PAGES_COLLECTION, pageDocId);

  const batch = writeBatch(db);

  batch.set(
    summaryRef,
    {
      totalPageViews: increment(1),
      totalVisits: increment(visitInc),
      lastPath: clean,
      lastReferrer: referrerHost,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    todayRef,
    {
      date: todayKey,
      pageViews: increment(1),
      visits: increment(visitInc),
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
  };
}

export async function fetchAnalyticsSummary() {
  const { db } = getFirebase();
  const todayKey = getRiyadhDateKey();

  try {
    const [summarySnap, todaySnap, topPagesSnap, dailySnap] = await Promise.all([
      getDoc(doc(db, ANALYTICS_SUMMARY_COLLECTION, 'summary')),
      getDoc(doc(db, ANALYTICS_DAILY_COLLECTION, todayKey)),
      getDocs(query(collection(db, ANALYTICS_PAGES_COLLECTION), orderBy('views', 'desc'), limit(7))),
      getDocs(query(collection(db, ANALYTICS_DAILY_COLLECTION), orderBy('date', 'desc'), limit(7))),
    ]);

    const summary = summarySnap.exists() ? summarySnap.data() : {};
    const today = todaySnap.exists() ? todaySnap.data() : {};

    return {
      totalPageViews: numberValue(summary.totalPageViews),
      totalVisits: numberValue(summary.totalVisits),
      todayPageViews: numberValue(today.pageViews),
      todayVisits: numberValue(today.visits),
      lastPath: String(summary.lastPath || ''),
      lastReferrer: String(summary.lastReferrer || ''),
      topPages: topPagesSnap.docs.map(mapPageDoc),
      dailyStats: dailySnap.docs.map(mapDailyDoc),
    };
  } catch (error) {
    console.warn('[Analytics] fetchAnalyticsSummary failed:', error?.message || error);
    return {
      totalPageViews: 0,
      totalVisits: 0,
      todayPageViews: 0,
      todayVisits: 0,
      lastPath: '',
      lastReferrer: '',
      topPages: [],
      dailyStats: [],
      error: error?.message || 'تعذر تحميل إحصائيات المشاهدات.',
    };
  }
}
