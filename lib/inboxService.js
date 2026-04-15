'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getFirebase } from './firebaseClient';
import { ensureSourceContact } from './contactUtils';
import { adminCreateListing, createRequest } from './listings';

export const INBOX_COLLECTION = 'fanar_inbox_entries';
export const EXTRACTED_COLLECTION = 'fanar_extracted_items';

function mapDocs(snap) {
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function cleanString(value) {
  return String(value || '').trim();
}

function cleanNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeStatus(value) {
  const allowed = ['auto_saved', 'needs_review', 'ignored', 'possible_duplicate', 'expired'];
  const v = cleanString(value);
  return allowed.includes(v) ? v : 'needs_review';
}

function normalizeIsoDate(value) {
  const text = cleanString(value);
  if (!text) return '';
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function isExpiredItem(item) {
  const expiresAt = normalizeIsoDate(item?.expiresAt);
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

async function findExtractedItemByDuplicateKey(db, duplicateKey) {
  const key = cleanString(duplicateKey);
  if (!key) return null;

  const q = query(
    collection(db, EXTRACTED_COLLECTION),
    where('duplicateKey', '==', key),
    limit(1),
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const found = snap.docs[0];
  return { id: found.id, ...found.data() };
}

export async function fetchInboxEntries(max = 100) {
  const { db } = getFirebase();
  const q = query(collection(db, INBOX_COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return mapDocs(snap);
}

export async function fetchExtractedItems(max = 150) {
  const { db } = getFirebase();
  const q = query(collection(db, EXTRACTED_COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return mapDocs(snap);
}

export async function saveInboxEntry(payload) {
  const { db } = getFirebase();
  const source = ensureSourceContact(payload.source || {});

  const ref = await addDoc(collection(db, INBOX_COLLECTION), {
    rawText: cleanString(payload.rawText),
    parsedText: cleanString(payload.parsedText),
    source,
    sourceType: cleanString(payload.sourceType || source.sourceType || 'الوارد الذكي'),
    fileName: cleanString(payload.fileName),
    fileType: cleanString(payload.fileType),
    importMode: cleanString(payload.importMode || 'paste'),
    status: cleanString(payload.status || 'review'),
    aiSummary: cleanString(payload.aiSummary),
    aiStats: payload.aiStats || null,
    retentionDays: Number(payload.retentionDays || 8),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function saveExtractedItems({ inboxEntryId, items = [] }) {
  const { db } = getFirebase();
  const saved = [];

  for (const item of items) {
    const source = ensureSourceContact(item.source || {});
    const duplicateKey = cleanString(item.duplicateKey);
    const existing = duplicateKey ? await findExtractedItemByDuplicateKey(db, duplicateKey) : null;

    const normalizedItem = {
      inboxEntryId: cleanString(inboxEntryId),
      recordType: cleanString(item.recordType || 'ignored'),
      extractionStatus: normalizeStatus(item.extractionStatus || 'needs_review'),
      confidence: Number(item.confidence || 0),
      summary: cleanString(item.summary),
      listing: item.listing || null,
      request: item.request || null,
      rawText: cleanString(item.rawText),
      reason: cleanString(item.reason),
      groupMeta: item.groupMeta || null,
      source,
      messageDate: normalizeIsoDate(item.messageDate),
      expiresAt: normalizeIsoDate(item.expiresAt),
      publishedAt: normalizeIsoDate(item.publishedAt),
      isFresh: typeof item.isFresh === 'boolean' ? item.isFresh : true,
      ageDays: cleanNumber(item.ageDays),
      sourceHash: cleanString(item.sourceHash),
      duplicateKey,
      retentionDays: Number(item.retentionDays || 8),
      lastSeenAt: nowIso(),
      updatedAt: serverTimestamp(),
    };

    if (existing) {
      const nextStatus = isExpiredItem(normalizedItem)
        ? 'expired'
        : (existing.extractionStatus === 'auto_saved' ? 'auto_saved' : normalizeStatus(normalizedItem.extractionStatus));

      const patch = {
        ...normalizedItem,
        extractionStatus: nextStatus,
        duplicateOf: cleanString(existing.duplicateOf || existing.id),
        occurrenceCount: Number(existing.occurrenceCount || 1) + 1,
        firstSeenAt: cleanString(existing.firstSeenAt || normalizedItem.messageDate || nowIso()),
        promotedCollection: cleanString(existing.promotedCollection),
        promotedDocId: cleanString(existing.promotedDocId),
      };

      await updateDoc(doc(db, EXTRACTED_COLLECTION, existing.id), patch);

      saved.push({
        id: existing.id,
        ...existing,
        ...normalizedItem,
        extractionStatus: nextStatus,
        duplicateOf: cleanString(existing.duplicateOf || existing.id),
        occurrenceCount: Number(existing.occurrenceCount || 1) + 1,
        firstSeenAt: cleanString(existing.firstSeenAt || normalizedItem.messageDate || nowIso()),
        promotedCollection: cleanString(existing.promotedCollection),
        promotedDocId: cleanString(existing.promotedDocId),
      });

      continue;
    }

    const firstSeenAt = cleanString(normalizedItem.messageDate || nowIso());
    const finalStatus = isExpiredItem(normalizedItem)
      ? 'expired'
      : normalizeStatus(normalizedItem.extractionStatus);

    const ref = await addDoc(collection(db, EXTRACTED_COLLECTION), {
      ...normalizedItem,
      extractionStatus: finalStatus,
      duplicateOf: '',
      occurrenceCount: 1,
      firstSeenAt,
      createdAt: serverTimestamp(),
    });

    saved.push({
      id: ref.id,
      ...item,
      ...normalizedItem,
      extractionStatus: finalStatus,
      source,
      duplicateOf: '',
      occurrenceCount: 1,
      firstSeenAt,
    });
  }

  return saved;
}

export async function updateExtractedItemStatus(id, extractionStatus, patch = {}) {
  const { db } = getFirebase();
  const ref = doc(db, EXTRACTED_COLLECTION, id);

  await updateDoc(ref, {
    extractionStatus: normalizeStatus(extractionStatus),
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function promoteExtractedItem(item) {
  const source = ensureSourceContact(item.source || {});

  if (item.recordType === 'request') {
    const requestPayload = {
      ...(item.request || {}),
      name: cleanString(item.request?.name) || source.contactName,
      phone: cleanString(item.request?.phone) || source.contactPhone,
      sourceType: source.sourceType,
      sourceContactName: source.contactName,
      sourceContactPhone: source.contactPhone,
      sourceContactRole: source.contactRole,
      rawText: cleanString(item.rawText),
      status: 'new',
      source: 'smart_inbox',
    };

    const id = await createRequest(requestPayload);
    return { id, collection: 'fanar_requests' };
  }

  if (item.recordType === 'listing') {
    if (normalizeStatus(item.extractionStatus) === 'expired' || isExpiredItem(item) || item.isFresh === false) {
      throw new Error('هذا العرض منتهي الصلاحية ولن يُرفع إلى المنصة.');
    }

    const listingPayload = {
      ...(item.listing || {}),
      title: cleanString(item.listing?.title || item.summary || 'عرض عقاري'),
      sourceType: source.sourceType,
      sourceContactName: source.contactName,
      sourceContactPhone: source.contactPhone,
      sourceContactRole: source.contactRole,
      rawText: cleanString(item.rawText),
      status: cleanString(item.listing?.status || 'available'),
      messageDate: normalizeIsoDate(item.messageDate),
      expiresAt: normalizeIsoDate(item.expiresAt),
      publishedAt: nowIso(),
      duplicateKey: cleanString(item.duplicateKey),
      sourceHash: cleanString(item.sourceHash),
      isFresh: item.isFresh !== false,
    };

    const id = await adminCreateListing(listingPayload);
    return { id, collection: 'fanar_listings' };
  }

  return null;
}

async function cleanupEmptyInboxEntries(db, inboxEntryIds = []) {
  const uniqueIds = Array.from(new Set((inboxEntryIds || []).map((id) => cleanString(id)).filter(Boolean)));

  for (const inboxEntryId of uniqueIds) {
    const remainingQuery = query(
      collection(db, EXTRACTED_COLLECTION),
      where('inboxEntryId', '==', inboxEntryId),
      limit(1),
    );
    const remaining = await getDocs(remainingQuery);
    if (remaining.empty) {
      await deleteDoc(doc(db, INBOX_COLLECTION, inboxEntryId));
    }
  }
}

export async function deleteExtractedItemsBulk(items = []) {
  const { db } = getFirebase();
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.id) : [];
  if (!safeItems.length) return { deletedCount: 0 };

  const batches = [];
  let batch = writeBatch(db);
  let ops = 0;

  function pushDelete(ref) {
    batch.delete(ref);
    ops += 1;
    if (ops >= 450) {
      batches.push(batch.commit());
      batch = writeBatch(db);
      ops = 0;
    }
  }

  const inboxEntryIds = [];

  for (const item of safeItems) {
    const promotedCollection = cleanString(item.promotedCollection);
    const promotedDocId = cleanString(item.promotedDocId);
    const inboxEntryId = cleanString(item.inboxEntryId);

    if (promotedCollection && promotedDocId) {
      pushDelete(doc(db, promotedCollection, promotedDocId));
    }

    pushDelete(doc(db, EXTRACTED_COLLECTION, item.id));

    if (inboxEntryId) {
      inboxEntryIds.push(inboxEntryId);
    }
  }

  if (ops > 0) {
    batches.push(batch.commit());
  }

  await Promise.all(batches);
  await cleanupEmptyInboxEntries(db, inboxEntryIds);

  return { deletedCount: safeItems.length };
}

export async function deleteExtractedItemEverywhere(item) {
  return await deleteExtractedItemsBulk([item]);
}
