'use client';

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebase } from './firebaseClient';

// ✅ نستخدم كولكشن موحّد داخل الموقع
// - الأساسي: abhur_listings (اللي يضيفه الأدمن)
// - legacy اختياري: listings (لو عندك عروض قديمة هناك)
const COL = 'abhur_listings';
const LEGACY_COL = 'listings';

const REQ = 'abhur_requests';

const colRef = (db, name) => collection(db, name);
const listingsCol = (db) => colRef(db, COL);
const legacyListingsCol = (db) => colRef(db, LEGACY_COL);
const requestsCol = (db) => colRef(db, REQ);

function tsToMillis(v) {
  try {
    if (!v) return 0;
    // Firestore Timestamp has toMillis()
    if (typeof v.toMillis === 'function') return v.toMillis();
    // Date
    if (v instanceof Date) return v.getTime();
    // number
    if (typeof v === 'number') return v;
  } catch (_) {}
  return 0;
}

function normalizeDoc(d) {
  const data = d.data ? d.data() : (d || {});
  const docId = d.id || data.id || '';
  // ✅ نخلي id دائمًا = docId (حتى لو داخل البيانات فيه id قديم)
  return { ...data, id: docId };
}

async function getFromBothCollections(getPrimary, getLegacy, { includeLegacy = false } = {}) {
  const primary = await getPrimary();
  if (!includeLegacy) return primary;

  // ✅ legacy قد يكون مقفول بالقواعد (permission-denied) — ما نخلي الموقع يطيح
  let legacy = [];
  try {
    legacy = await getLegacy();
  } catch (e) {
    const msg = String(e?.message || '');
    // تجاهل أخطاء الصلاحيات للـlegacy فقط
    if (e?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      legacy = [];
    } else {
      throw e;
    }
  }

  // دمج + ترتيب
  const merged = [...primary, ...legacy];
  merged.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
  return merged;
}

export async function fetchLatestListings({ onlyPublic = true, n = 12, includeLegacy = false } = {}) {
  const { db } = getFirebase();

  // ✅ “متاح/محجوز” للزوار (حتى ما يصير لخبطة بين الصفحات)
  const statusClause = onlyPublic ? where('status', 'in', ['available', 'reserved']) : null;

  const buildQuery = (ref) => {
    const parts = [];
    if (statusClause) parts.push(statusClause);
    parts.push(orderBy('createdAt', 'desc'));
    parts.push(limit(n));
    return query(ref, ...parts);
  };

  const primaryFn = async () => {
    const snap = await getDocs(buildQuery(listingsCol(db)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  };

  const legacyFn = async () => {
    const snap = await getDocs(buildQuery(legacyListingsCol(db)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  };

  return await getFromBothCollections(primaryFn, legacyFn, { includeLegacy });
}

export async function fetchListings({ filters = {}, onlyPublic = true, includeLegacy = false } = {}) {
  const { db } = getFirebase();

  const buildQuery = (ref) => {
    const clauses = [];
    if (onlyPublic) clauses.push(where('status', 'in', ['available', 'reserved']));
    if (filters.neighborhood) clauses.push(where('neighborhood', '==', filters.neighborhood));
    if (filters.dealType) clauses.push(where('dealType', '==', filters.dealType));
    if (filters.propertyType) clauses.push(where('propertyType', '==', filters.propertyType));
    if (filters.plan) clauses.push(where('plan', '==', filters.plan));
    if (filters.part) clauses.push(where('part', '==', filters.part));

    clauses.push(orderBy('createdAt', 'desc'));
    clauses.push(limit(80));

    return query(ref, ...clauses);
  };

  const primaryFn = async () => {
    const snap = await getDocs(buildQuery(listingsCol(db)));
    // ✅ id آخر شيء
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  };

  const legacyFn = async () => {
    const snap = await getDocs(buildQuery(legacyListingsCol(db)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  };

  return await getFromBothCollections(primaryFn, legacyFn, { includeLegacy });
}

export async function fetchListingById(id, { includeLegacy = false } = {}) {
  const { db } = getFirebase();

  // 1) الأساسي
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (snap.exists()) return { ...snap.data(), id: snap.id };

  // 2) legacy (لو العرض قديم وكان في كولكشن listings)
  if (includeLegacy) {
    const ref2 = doc(db, LEGACY_COL, id);
    const snap2 = await getDoc(ref2);
    if (snap2.exists()) return { ...snap2.data(), id: snap2.id };
  }

  return null;
}

export async function adminCreateListing(payload) {
  const { db } = getFirebase();
  const clean = {
    title: String(payload.title || '').trim() || 'عرض عقاري',
    neighborhood: String(payload.neighborhood || '').trim() || '',
    plan: String(payload.plan || '').trim() || '',
    part: String(payload.part || '').trim() || '',
    dealType: String(payload.dealType || 'sale'),
    propertyType: String(payload.propertyType || ''),
    area: payload.area ? Number(payload.area) : null,
    price: payload.price ? Number(payload.price) : null,
    direct: !!payload.direct,
    status: String(payload.status || 'available'),
    description: String(payload.description || '').trim() || '',
    images: Array.isArray(payload.images) ? payload.images.filter(Boolean) : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(listingsCol(db), clean);
  return ref.id;
}

export async function adminUpdateListing(id, patch) {
  const { db } = getFirebase();
  const ref = doc(db, COL, id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function createRequest(payload) {
  const { db } = getFirebase();
  const clean = {
    name: String(payload.name || '').trim(),
    phone: String(payload.phone || '').trim(),
    neighborhood: String(payload.neighborhood || '').trim(),
    part: String(payload.part || '').trim(),
    budget: payload.budget ? Number(payload.budget) : null,
    note: String(payload.note || '').trim(),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(requestsCol(db), clean);
  return ref.id;
}
