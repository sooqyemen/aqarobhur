// lib/listingUtils.js

export function normalizeStatusLabel(item) {
  const status = String(item?.status || 'available');
  const isRent = String(item?.dealType || '').toLowerCase() === 'rent';

  if (status === 'sold') return isRent ? 'مؤجر' : 'مباع';
  if (status === 'reserved') return 'محجوز';
  if (status === 'canceled' || status === 'hidden') return 'غير متاح';
  return 'متاح';
}

export function normalizeDealTypeLabel(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'rent') return 'إيجار';
  if (v === 'sale') return 'بيع';
  return '';
}

export function formatArea(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toLocaleString('ar-SA')} م²`;
}

export function getLocationText(item) {
  return [item?.neighborhood, item?.plan, item?.part].filter(Boolean).join(' • ') || 'غير محدد';
}

export function isFiniteCoord(v) {
  const n = Number(v);
  return Number.isFinite(n);
}

export function getMapHref(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getSafeImages(item) {
  if (!Array.isArray(item?.images)) return [];
  return item.images.filter(Boolean);
}

export function normalizePhoneDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `966${digits.slice(1)}`;
  if (digits.startsWith('966')) return digits;
  return digits;
}
