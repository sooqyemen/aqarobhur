// lib/taxonomy.js
// =============================
// قوائم ثابتة + مساعدات تطبيع للأحياء/الفئات

const _NEIGHBORHOODS = [
  // ✅ أحياء (مدينة جدة ثابتة في صفحة الطلب)
  'أبحر الشمالية',
  'الأمواج',
  'الشراع',
  'الفردوس',
  'الصواري',
  'الياقوت',
  'اللؤلؤ',
  'الزمرد',
  'المنارات',
  'الفنار',
  'البحيرات',
  'النور',
  'المروج',
  'الخليج',
  'النجمة',
  'الزهور',
  'الغربية',
  'الشويصي',
  'الشويضي',
  'الغدير',
  'الربيع',
  'العقيق',
  'العبير',
  'الدرة',
  'المجاميع',
  'الفرقان',
  'اليسر',
  'الجزيرة',
  'الوداد',
  'النداء',
  'البيان',
  'المجد',
  'رضوى',
  'البوادر',
  'أم سدرة',
  'الهجرة',
  'العويجا',
  // ✅ أحياء أخرى ذكرتها (اختياري لكن مفيدة)
  'طيبة',
  'الرياض',
  'قباء',
  'الشرائع',
];

// ✅ إزالة التكرار (كان مكرر "الزهور")
export const NEIGHBORHOODS = Array.from(new Set(_NEIGHBORHOODS));

// ✅ الأحياء المميزة بالصفحة الرئيسية (حسب طلبك + إضافة الفردوس/المروج/النور)
export const FEATURED_NEIGHBORHOODS = [
  { key: 'obhur-north', label: 'أبحر الشمالية' },
  { key: 'al-shiraa', label: 'الشراع' },
  { key: 'al-amwaj', label: 'الأمواج' },
  { key: 'al-sawari', label: 'الصواري' },
  { key: 'al-yacout', label: 'الياقوت' },
  { key: 'al-zomorod', label: 'الزمرد' },
  { key: 'al-lulu', label: 'اللؤلؤ' },
  { key: 'al-fanar', label: 'الفنار' },
  { key: 'al-buhairat', label: 'البحيرات' },
  { key: 'al-firdaws', label: 'الفردوس' },
  { key: 'al-muruj', label: 'المروج' },
  { key: 'al-nour', label: 'النور' },
];

export const NEIGHBORHOOD_ALIASES = {
  // تصحيح شائع (المعتمد: الشويصي)
  'الشويضي': 'الشويصي',
};

export function normalizeNeighborhoodName(name) {
  const t = String(name || '').trim();
  return NEIGHBORHOOD_ALIASES[t] || t;
}

const FEATURED_BY_KEY = FEATURED_NEIGHBORHOODS.reduce((acc, n) => {
  acc[n.key] = n.label;
  return acc;
}, {});

function safeDecode(s) {
  try {
    return decodeURIComponent(String(s));
  } catch (_) {
    return String(s);
  }
}

export function neighborhoodLabelFromKey(key) {
  const k = String(key || '').trim().toLowerCase();
  return FEATURED_BY_KEY[k] || '';
}

// ✅ يدعم:
// - slug إنجليزي: al-zomorod
// - اسم عربي: الزمرد
// - اسم عربي مع فراغات
export function normalizeNeighborhoodKey(slugOrName) {
  const raw = safeDecode(slugOrName);
  const s = String(raw || '').trim();
  if (!s) return '';

  const k = s.toLowerCase();
  if (FEATURED_BY_KEY[k]) return k;

  const name = normalizeNeighborhoodName(s);

  // مطابقة مباشرة بالاسم
  const found = FEATURED_NEIGHBORHOODS.find((x) => x.label === name);
  if (found) return found.key;

  // مطابقة بعد إزالة الفراغات
  const compact = name.replace(/\s+/g, '');
  for (const x of FEATURED_NEIGHBORHOODS) {
    if (x.label.replace(/\s+/g, '') === compact) return x.key;
  }

  return '';
}

export const DEAL_TYPES = [
  { key: 'sale', label: 'بيع' },
  { key: 'rent', label: 'إيجار' },
];

export const PROPERTY_CLASSES = [
  { key: 'residential', label: 'سكني' },
  { key: 'commercial', label: 'تجاري' },
];

export const PROPERTY_TYPES = [
  'أرض',
  'فيلا',
  'شقة',
  'دور',
  'عمارة',
  'محل/تجاري',
];

export const PROPERTY_TYPES_RESIDENTIAL = ['أرض', 'فيلا', 'شقة', 'دور', 'عمارة'];
export const PROPERTY_TYPES_COMMERCIAL = ['محل/تجاري'];

export function getPropertyTypesByClass(propertyClass) {
  if (propertyClass === 'commercial') return PROPERTY_TYPES_COMMERCIAL;
  if (propertyClass === 'residential') return PROPERTY_TYPES_RESIDENTIAL;
  return PROPERTY_TYPES;
}

export function inferPropertyClass(propertyType) {
  const t = String(propertyType || '').toLowerCase();
  if (!t) return '';
  if (t.includes('تجاري') || t.includes('محل') || t.includes('مكتب') || t.includes('مستودع')) return 'commercial';
  return 'residential';
}

export const STATUS_OPTIONS = [
  { key: 'available', label: 'متاح' },
  { key: 'reserved', label: 'محجوز' },
  { key: 'sold', label: 'مباع' },
  { key: 'canceled', label: 'ملغي' },
];
