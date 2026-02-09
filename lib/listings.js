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

async function getFromBothCollections(getPrimary, getLegacy, { includeLegacy = true } = {}) {
  const primary = await getPrimary();
  if (!includeLegacy) return primary;

  const legacy = await getLegacy();
  // دمج + ترتيب
  const merged = [...primary, ...legacy];
  merged.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
  return merged;
}

export async function fetchLatestListings({ onlyPublic = true, n = 12, includeLegacy = true } = {}) {
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

export async function fetchListings({ filters = {}, onlyPublic = true, includeLegacy = true } = {}) {
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

export async function fetchListingById(id, { includeLegacy = true } = {}) {
  const { db } = getFirebase();

  // ✅ حماية: إذا وصل id فاضي/undefined لا نسوي استعلامات
  if (!id) return null;

  const cleanId = String(id);

  async function tryGetByDocId(colName, docId) {
    try {
      const ref = doc(db, colName, docId);
      const snap = await getDoc(ref);
      if (snap.exists()) return { ...snap.data(), id: snap.id };
    } catch (e) {
      // تجاهل أخطاء المعرّف غير صالح فقط
      const msg = String(e?.message || '');
      if (e?.code === 'invalid-argument' || msg.includes('Invalid document reference')) {
        return null;
      }
      throw e;
    }
    return null;
  }

  async function tryFindByField(colName, field, value) {
    const q = query(collection(db, colName), where(field, '==', value), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { ...d.data(), id: d.id };
    }
    return null;
  }

  async function tryFindByAnyField(colName) {
    const fields = ['publicId', 'listingId', 'code', 'number', 'ref', 'legacyId'];
    const candidates = [cleanId];
    // جرب رقم لو كان الإدخال رقم
    const asNum = Number(cleanId);
    if (!Number.isNaN(asNum)) candidates.push(asNum);

    for (const v of candidates) {
      for (const f of fields) {
        try {
          const found = await tryFindByField(colName, f, v);
          if (found) return found;
        } catch (e) {
          // ignore missing index here (shouldn't happen) or permission for legacy
          throw e;
        }
      }
    }
    return null;
  }

  // 1) الأساسي: docId
  const byDoc = await tryGetByDocId(COL, cleanId);
  if (byDoc) return byDoc;

  // 2) الأساسي: بحث بالحقل (إذا كان الرابط مبني على رقم/كود داخل البيانات)
  const byField = await tryFindByAnyField(COL);
  if (byField) return byField;

  // 3) legacy (لو العرض قديم وكان في كولكشن listings)
  if (includeLegacy) {
    try {
      const legacyByDoc = await tryGetByDocId(LEGACY_COL, cleanId);
      if (legacyByDoc) return legacyByDoc;
      const legacyByField = await tryFindByAnyField(LEGACY_COL);
      if (legacyByField) return legacyByField;
    } catch (e) {
      const msg = String(e?.message || '');
      if (e?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
        // تجاهل legacy إذا كان مقفول بالقواعد
      } else {
        throw e;
      }
    }
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
