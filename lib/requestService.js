import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebaseClient';

// نستخدم نفس اسم الجدول القديم لضمان عمل البيانات السابقة
const REQ_COLLECTION = 'fanar_requests';

export async function fetchRequests(max = 250) {
  const { db } = getFirebase();
  const q = query(collection(db, REQ_COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateRequestStatus(id, status) {
  const { db } = getFirebase();
  await updateDoc(doc(db, REQ_COLLECTION, id), { 
    status, 
    updatedAt: new Date() 
  });
}

export async function deleteRequestsBulk(ids) {
  const { db } = getFirebase();
  await Promise.all(ids.map(id => deleteDoc(doc(db, REQ_COLLECTION, id))));
}
