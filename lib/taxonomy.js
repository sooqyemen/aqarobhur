// lib/taxonomy.js

export const AREAS = [
  {
    key: 'abhur-north',
    label: 'أبحر الشمالية',
    neighborhoods: [
      'أبحر الشمالية',
      'الفردوس',
      'الشراع',
      'الأمواج',
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
    ],
  },
  {
    key: 'jawharat-alarous',
    label: 'جوهرة العروس',
    neighborhoods: [
      'النجمة',
      'الزهور',
      'الغربية',
      'الشويضي',
      'الغدير',
      'الربيع',
      'الدرة',
      'العبير',
      'العقيق',
      'المجامع',
      'الفرقان',
      'اليسر',
      'الجزيرة',
    ],
  },
  {
    key: 'taybah-sub',
    label: 'طيبة الفرعية',
    neighborhoods: ['الوداد', 'التوفيق', 'الندى', 'البيان', 'المجد'],
  },
  {
    key: 'alhijrah',
    label: 'الهجرة',
    neighborhoods: ['رضوى', 'البوادر', 'أم سدرة', 'الهجرة', 'العويجاء', 'الشرائع'],
  },
];

export const NEIGHBORHOODS = AREAS.flatMap((area) => area.neighborhoods);

export const FEATURED_NEIGHBORHOODS = [
  { key: 'abhur-north', label: 'أبحر الشمالية' },
  { key: 'al-fanar', label: 'الفنار' },
  { key: 'al-zomorod', label: 'الزمرد' },
  { key: 'al-yacout', label: 'الياقوت' },
  { key: 'al-shiraa', label: 'الشراع' },
  { key: 'al-amwaj', label: 'الأمواج' },
  { key: 'al-sawari', label: 'الصواري' },
  { key: 'al-lulu', label: 'اللؤلؤ' },
  { key: 'al-buhairat', label: 'البحيرات' },
  { key: 'al-nour', label: 'النور' },
  { key: 'al-muruj', label: 'المروج' },
  { key: 'al-abir', label: 'العبير' },
  { key: 'al-nada', label: 'الندى' },
  { key: 'al-sharayea', label: 'الشرائع' },
];

export const NEIGHBORHOOD_ALIASES = {
  النداء: 'الندى',
  العويجا: 'العويجاء',
  العويجة: 'العويجاء',
  طيبة: 'طيبة الفرعية',
  الشويصي: 'الشويضي',
  'ابحر الشمالية': 'أبحر الشمالية',
  'ابحر الشماليه': 'أبحر الشمالية',
  'أبحر الشماليه': 'أبحر الشمالية',
  امسدرة: 'أم سدرة',
  'ام سدرة': 'أم سدرة',
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

export function normalizeNeighborhoodKey(slugOrName) {
  const raw = safeDecode(slugOrName);
  const s = String(raw || '').trim();
  if (!s) return '';

  const k = s.toLowerCase();
  if (FEATURED_BY_KEY[k]) return k;

  const name = normalizeNeighborhoodName(s);
  const found = FEATURED_NEIGHBORHOODS.find((x) => x.label === name);
  if (found) return found.key;

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

export const PROPERTY_TYPES = ['أرض', 'فيلا', 'شقة', 'دور', 'عمارة', 'محل/تجاري'];
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
  if (t.includes('تجاري') || t.includes('محل') || t.includes('مكتب') || t.includes('مستودع')) {
    return 'commercial';
  }
  return 'residential';
}

export const STATUS_OPTIONS = [
  { key: 'available', label: 'متاح' },
  { key: 'reserved', label: 'محجوز' },
  { key: 'sold', label: 'مباع' },
  { key: 'canceled', label: 'ملغي' },
];
