import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebase } from '@/lib/firebaseClient';

const REQ_COLLECTION = 'abhur_requests';

export async function createRequest(payload = {}) {
  const { db } = getFirebase();
  const clean = {
    ...payload,
    status: String(payload.status || 'new').trim() || 'new',
    source: String(payload.source || 'web').trim() || 'web',
    sourceType: String(payload.sourceType || '').trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, REQ_COLLECTION), clean);
  return ref.id;
}

export async function fetchRequests(max = 250) {
  const { db } = getFirebase();
  const q = query(collection(db, REQ_COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateRequestStatus(id, status) {
  const { db } = getFirebase();
  await updateDoc(doc(db, REQ_COLLECTION, id), {
    status,
    updatedAt: new Date(),
  });
}

export async function deleteRequestsBulk(ids) {
  const { db } = getFirebase();
  await Promise.all(ids.map((id) => deleteDoc(doc(db, REQ_COLLECTION, id))));
}
