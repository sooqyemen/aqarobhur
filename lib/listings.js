import {
  collection,
  addDoc,
  deleteDoc,
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
import { inferPropertyClass, normalizeNeighborhoodName } from './taxonomy';

const COL = 'abhur_listings';
const LEGACY_COL = 'listings';
const REQ = 'abhur_requests';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.ogg'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.svg'];

const colRef = (db, name) => collection(db, name);
const listingsCol = (db) => colRef(db, COL);
const legacyListingsCol = (db) => colRef(db, LEGACY_COL);
const requestsCol = (db) => colRef(db, REQ);

function tsToMillis(v) {
  try {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
  } catch (_) {}
  return 0;
}

function looksLikeVideo(url = '') {
  const lower = String(url || '').toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
}

function looksLikeImage(url = '') {
  const lower = String(url || '').toLowerCase();
  if (!lower) return false;
  if (looksLikeVideo(lower)) return false;
  if (IMAGE_EXTENSIONS.some((ext) => lower.includes(ext))) return true;
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/');
}

function normalizeMediaEntry(entry, forcedKind = '') {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!url) return null;
    const kind = forcedKind === 'video' || looksLikeVideo(url) ? 'video' : 'image';
    return { url, refPath: '', name: '', kind };
  }

  const url = String(
    entry.url || entry.src || entry.href || entry.downloadURL || entry.secure_url || ''
  ).trim();
  if (!url) return null;

  const explicitKind = String(forcedKind || entry.kind || entry.type || entry.mediaType || '')
    .trim()
    .toLowerCase();

  let kind = 'image';
  if (explicitKind === 'video' || looksLikeVideo(url)) kind = 'video';
  else if (explicitKind === 'image' || looksLikeImage(url)) kind = 'image';

  return {
    url,
    refPath: String(entry.refPath || entry.path || entry.storagePath || '').trim(),
    name: String(entry.name || entry.fileName || entry.filename || '').trim(),
    kind,
  };
}

function normalizeMediaList(list, forcedKind = '') {
  const source = Array.isArray(list) ? list : [];
  const seenUrls = new Set();
  const seenRefs = new Set();
  const output = [];

  for (const entry of source) {
    const normalized = normalizeMediaEntry(entry, forcedKind);
    if (!normalized?.url) continue;

    const urlKey = normalized.url;
    const refKey = normalized.refPath || '';

    if (seenUrls.has(urlKey) || (refKey && seenRefs.has(refKey))) continue;

    seenUrls.add(urlKey);
    if (refKey) seenRefs.add(refKey);
    output.push(normalized);
  }

  return output;
}

function dedupeStrings(list) {
  return Array.from(
    new Set(
      (Array.isArray(list) ? list : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

function splitMediaUrls(media = []) {
  const items = normalizeMediaList(media);
  const images = dedupeStrings(items.filter((item) => item.kind !== 'video').map((item) => item.url));
  const videos = dedupeStrings(items.filter((item) => item.kind === 'video').map((item) => item.url));
  return { images, videos };
}

function collectLegacyMedia(item = {}) {
  const mixedCollections = [
    ...(Array.isArray(item.imagesMeta) ? item.imagesMeta : []),
    ...(Array.isArray(item.mediaMeta) ? item.mediaMeta : []),
    ...(Array.isArray(item.media) ? item.media : []),
    ...(Array.isArray(item.gallery) ? item.gallery : []),
    ...(Array.isArray(item.photos) ? item.photos : []),
  ];

  const singleImages = [item.image, item.imageUrl, item.cover, item.coverImage, item.thumbnail, item.photo]
    .filter(Boolean)
    .map((url) => ({ url, kind: 'image' }));

  const singleVideos = [item.video, item.videoUrl]
    .filter(Boolean)
    .map((url) => ({ url, kind: 'video' }));

  const arrayImages = (Array.isArray(item.images) ? item.images : []).map((entry) => ({
    ...(typeof entry === 'string' ? { url: entry } : entry),
    kind: typeof entry === 'object' && entry?.kind ? entry.kind : 'image',
  }));

  const arrayVideos = (Array.isArray(item.videos) ? item.videos : []).map((entry) => ({
    ...(typeof entry === 'string' ? { url: entry } : entry),
    kind: 'video',
  }));

  return normalizeMediaList([
    ...mixedCollections,
    ...singleImages,
    ...singleVideos,
    ...arrayImages,
    ...arrayVideos,
  ]);
}

function deriveMediaFields(payload = {}) {
  const allMedia = collectLegacyMedia(payload);
  const { images, videos } = splitMediaUrls(allMedia);
  return {
    imagesMeta: allMedia,
    images,
    videos,
  };
}

function normalizeListingRecord(item = {}) {
  const mediaFields = deriveMediaFields(item);
  return {
    ...item,
    ...mediaFields,
    licenseNumber: String(item.licenseNumber || item.license || '').trim(),
    contactPhone: String(item.contactPhone || item.phone || item.mobile || item.whatsapp || '').trim(),
  };
}

function mapDocs(snap) {
  return snap.docs.map((d) => normalizeListingRecord({ ...d.data(), id: d.id }));
}

async function getFromBothCollections(getPrimary, getLegacy, { includeLegacy = false } = {}) {
  const primary = await getPrimary();
  if (!includeLegacy) return primary;

  try {
    const legacy = await getLegacy();
    const merged = [...primary, ...legacy];
    merged.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
    return merged;
  } catch (e) {
    const msg = String(e?.message || '');
    if (e?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      return primary;
    }
    throw e;
  }
}

async function fetchPublicBase(db, max = 200, refOverride) {
  const ref = refOverride || listingsCol(db);
  const q = query(ref, where('status', 'in', ['available', 'reserved']), limit(max));
  const snap = await getDocs(q);
  const items = mapDocs(snap);
  items.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
  return items;
}

async function fetchAdminBase(db, max = 500, refOverride) {
  const ref = refOverride || listingsCol(db);
  const q = query(ref, orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return mapDocs(snap);
}

function applyClientFilters(items, filters = {}) {
  const f = filters || {};
  return items.filter((it) => {
    if (f.neighborhood && String(it.neighborhood || '').trim() !== String(f.neighborhood).trim()) return false;
    if (f.dealType && String(it.dealType || '').trim() !== String(f.dealType).trim()) return false;
    if (f.propertyType && String(it.propertyType || '').trim() !== String(f.propertyType).trim()) return false;
    if (f.plan && String(it.plan || '').trim() !== String(f.plan).trim()) return false;
    if (f.part && String(it.part || '').trim() !== String(f.part).trim()) return false;
    if (f.q) {
      const q = String(f.q).toLowerCase().trim();
      const hay = `${it.title || ''} ${it.description || ''} ${it.neighborhood || ''} ${it.plan || ''} ${it.part || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.propertyClass) {
      const cls = String(it.propertyClass || '').trim() || inferPropertyClass(it.propertyType);
      if (cls !== f.propertyClass) return false;
    }
    return true;
  });
}

export async function fetchLatestListings({ onlyPublic = true, n = 12, includeLegacy = false } = {}) {
  const { db } = getFirebase();
  const max = Math.max(80, n * 10);

  const primaryFn = async () => {
    const items = onlyPublic ? await fetchPublicBase(db, max) : await fetchAdminBase(db, Math.max(n, 80));
    return items.slice(0, n);
  };

  const legacyFn = async () => {
    const legacyRef = legacyListingsCol(db);
    const items = onlyPublic ? await fetchPublicBase(db, max, legacyRef) : await fetchAdminBase(db, Math.max(n, 80), legacyRef);
    return items.slice(0, n);
  };

  return await getFromBothCollections(primaryFn, legacyFn, { includeLegacy });
}

export async function fetchListings({ filters = {}, onlyPublic = true, includeLegacy = false, max = 240 } = {}) {
  const { db } = getFirebase();

  const primaryFn = async () => {
    const base = onlyPublic ? await fetchPublicBase(db, max) : await fetchAdminBase(db, Math.max(max, 300));
    return applyClientFilters(base, filters);
  };

  const legacyFn = async () => {
    const legacyRef = legacyListingsCol(db);
    const base = onlyPublic ? await fetchPublicBase(db, max, legacyRef) : await fetchAdminBase(db, Math.max(max, 300), legacyRef);
    return applyClientFilters(base, filters);
  };

  return await getFromBothCollections(primaryFn, legacyFn, { includeLegacy });
}

export async function fetchListingById(id, { includeLegacy = true } = {}) {
  const { db } = getFirebase();
  if (!id) return null;

  const cleanId = String(id);

  async function tryGetByDocId(colName, docId) {
    try {
      const ref = doc(db, colName, docId);
      const snap = await getDoc(ref);
      if (snap.exists()) return normalizeListingRecord({ ...snap.data(), id: snap.id });
    } catch (e) {
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
      return normalizeListingRecord({ ...d.data(), id: d.id });
    }
    return null;
  }

  async function tryFindByAnyField(colName) {
    const fields = ['publicId', 'listingId', 'code', 'number', 'ref', 'legacyId'];
    const candidates = [cleanId];
    const asNum = Number(cleanId);
    if (!Number.isNaN(asNum)) candidates.push(asNum);

    for (const v of candidates) {
      for (const f of fields) {
        const found = await tryFindByField(colName, f, v);
        if (found) return found;
      }
    }
    return null;
  }

  const byDoc = await tryGetByDocId(COL, cleanId);
  if (byDoc) return byDoc;

  const byField = await tryFindByAnyField(COL);
  if (byField) return byField;

  if (includeLegacy) {
    try {
      const legacyByDoc = await tryGetByDocId(LEGACY_COL, cleanId);
      if (legacyByDoc) return legacyByDoc;
      const legacyByField = await tryFindByAnyField(LEGACY_COL);
      if (legacyByField) return legacyByField;
    } catch (e) {
      const msg = String(e?.message || '');
      if (!(e?.code === 'permission-denied' || msg.includes('Missing or insufficient permissions'))) {
        throw e;
      }
    }
  }

  return null;
}

export async function adminCreateListing(payload) {
  const { db } = getFirebase();

  const propertyType = String(payload.propertyType || '').trim();
  const propertyClass = String(payload.propertyClass || '').trim() || inferPropertyClass(propertyType) || 'residential';
  const mediaFields = deriveMediaFields(payload);

  const clean = {
    title: String(payload.title || '').trim() || 'عرض عقاري',
    neighborhood: normalizeNeighborhoodName(String(payload.neighborhood || '').trim() || ''),
    plan: String(payload.plan || '').trim() || '',
    part: String(payload.part || '').trim() || '',
    lat: payload.lat !== undefined && payload.lat !== null && payload.lat !== '' ? Number(payload.lat) : null,
    lng: payload.lng !== undefined && payload.lng !== null && payload.lng !== '' ? Number(payload.lng) : null,
    dealType: String(payload.dealType || 'sale'),
    propertyType,
    propertyClass,
    area: payload.area ? Number(payload.area) : null,
    price: payload.price ? Number(payload.price) : null,
    direct: !!payload.direct,
    status: String(payload.status || 'available'),
    description: String(payload.description || '').trim() || '',
    licenseNumber: String(payload.licenseNumber || '').trim() || '',
    contactPhone: String(payload.contactPhone || '').trim() || '',
    ...mediaFields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!(Number.isFinite(clean.lat) && Number.isFinite(clean.lng))) {
    clean.lat = null;
    clean.lng = null;
  }

  const ref = await addDoc(listingsCol(db), clean);
  return ref.id;
}

export async function adminUpdateListing(id, patch) {
  const { db } = getFirebase();
  const ref = doc(db, COL, id);
  const next = { ...patch };

  if (next.propertyType && !next.propertyClass) {
    next.propertyClass = inferPropertyClass(next.propertyType) || 'residential';
  }
  if (next.neighborhood) {
    next.neighborhood = normalizeNeighborhoodName(String(next.neighborhood || '').trim());
  }

  if (
    next.imagesMeta != null ||
    next.images != null ||
    next.videos != null ||
    next.media != null ||
    next.gallery != null ||
    next.photos != null ||
    next.image != null ||
    next.imageUrl != null ||
    next.cover != null ||
    next.video != null ||
    next.videoUrl != null
  ) {
    const mediaFields = deriveMediaFields(next);
    next.imagesMeta = mediaFields.imagesMeta;
    next.images = mediaFields.images;
    next.videos = mediaFields.videos;
  }

  if (next.licenseNumber != null) next.licenseNumber = String(next.licenseNumber || '').trim();
  if (next.contactPhone != null) next.contactPhone = String(next.contactPhone || '').trim();

  await updateDoc(ref, { ...next, updatedAt: serverTimestamp() });
}

export async function adminDeleteListing(id) {
  if (!id) throw new Error('معرّف الإعلان مطلوب');
  const { db } = getFirebase();
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
  return { success: true };
}

export async function createRequest(payload) {
  const { db } = getFirebase();

  const clean = {
    dealType: String(payload.dealType || '').trim(),
    propertyType: String(payload.propertyType || '').trim(),
    ownershipType: String(payload.ownershipType || '').trim(),
    city: String(payload.city || 'جدة').trim(),
    region: String(payload.region || '').trim(),
    neighborhood: normalizeNeighborhoodName(String(payload.neighborhood || '').trim()),
    plan: String(payload.plan || '').trim(),
    part: String(payload.part || '').trim(),
    areaMin: payload.areaMin !== undefined && payload.areaMin !== null && payload.areaMin !== '' ? Number(payload.areaMin) : null,
    areaMax: payload.areaMax !== undefined && payload.areaMax !== null && payload.areaMax !== '' ? Number(payload.areaMax) : null,
    budgetMin: payload.budgetMin !== undefined && payload.budgetMin !== null && payload.budgetMin !== '' ? Number(payload.budgetMin) : null,
    budgetMax: payload.budgetMax !== undefined && payload.budgetMax !== null && payload.budgetMax !== '' ? Number(payload.budgetMax) : null,
    paymentMethod: String(payload.paymentMethod || '').trim(),
    seriousness: String(payload.seriousness || '').trim(),
    goal: String(payload.goal || '').trim(),
    wantsSimilar: String(payload.wantsSimilar || '').trim(),
    name: String(payload.name || '').trim(),
    phone: String(payload.phone || '').trim(),
    note: String(payload.note || '').trim(),
    waText: String(payload.waText || '').trim(),
    status: String(payload.status || 'new').trim() || 'new',
    adminNote: String(payload.adminNote || '').trim(),
    source: String(payload.source || 'web').trim() || 'web',
    sourceType: String(payload.sourceType || '').trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(requestsCol(db), clean);
  return ref.id;
}

export async function fetchRequestsAdmin({ max = 300 } = {}) {
  const { db } = getFirebase();
  const q = query(requestsCol(db), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function updateRequestAdmin(id, patch = {}) {
  const { db } = getFirebase();
  const ref = doc(db, REQ, id);
  const clean = {
    ...patch,
    updatedAt: serverTimestamp(),
  };
  if (clean.status != null) clean.status = String(clean.status || '').trim() || 'new';
  if (clean.adminNote != null) clean.adminNote = String(clean.adminNote || '').trim();
  await updateDoc(ref, clean);
}

export async function deleteRequestAdmin(id) {
  const { db } = getFirebase();
  await deleteDoc(doc(db, REQ, id));
}
