'use client';

import {
  collection, addDoc, doc, getDoc, getDocs, limit, orderBy,
  query, updateDoc, where, serverTimestamp
} from 'firebase/firestore';
import { getFirebase } from './firebaseClient';

const COL = 'abhur_listings';
const REQ = 'abhur_requests';

const listingsCol = (db) => collection(db, COL);
const requestsCol = (db) => collection(db, REQ);

export async function fetchLatestListings({ onlyAvailable = true, n = 12 } = {}) {
  const { db } = getFirebase();
  const base = [orderBy('createdAt', 'desc'), limit(n)];
  const q = onlyAvailable
    ? query(listingsCol(db), where('status', '==', 'available'), ...base)
    : query(listingsCol(db), ...base);

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchListings({ filters = {}, onlyPublic = true } = {}) {
  const { db } = getFirebase();
  const clauses = [];

  if (onlyPublic) clauses.push(where('status', 'in', ['available', 'reserved']));
  if (filters.neighborhood) clauses.push(where('neighborhood', '==', filters.neighborhood));
  if (filters.dealType) clauses.push(where('dealType', '==', filters.dealType));
  if (filters.propertyType) clauses.push(where('propertyType', '==', filters.propertyType));
  if (filters.plan) clauses.push(where('plan', '==', filters.plan));
  if (filters.part) clauses.push(where('part', '==', filters.part));

  const q = query(listingsCol(db), ...clauses, orderBy('createdAt', 'desc'), limit(60));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchListingById(id) {
  const { db } = getFirebase();
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
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
