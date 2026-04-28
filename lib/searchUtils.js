const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const AREAS = [
  'أبحر الشمالية', 'ابحر الشمالية', 'الفردوس', 'الشراع', 'الأمواج', 'الامواج', 'الصواري',
  'الياقوت', 'اللؤلؤ', 'اللؤلؤة', 'الزمرد', 'المنارات', 'الفنار', 'البحيرات', 'النور',
  'المروج', 'الخليج',
  'جوهرة العروس', 'النجمة', 'الزهور', 'الغربية', 'الشويضي', 'الشويصي', 'الغدير',
  'الربيع', 'الدرة', 'العبير', 'العقيق', 'المجامع', 'الفرقان', 'اليسر', 'الجزيرة',
  'طيبة الفرعية', 'الوداد', 'التوفيق', 'الندى', 'البيان', 'المجد',
  'الهجرة', 'رضوى', 'البوادر', 'أم سدرة', 'ام سدرة', 'العويجاء', 'الشرائع',
];

const PROPERTY_PATTERNS = [
  { re: /\b(?:أرض|ارض|اراضي|أراضي|قطعة|قطع)\b/u, value: 'أرض' },
  { re: /\b(?:فيلا|فلة|فله|فلل|فيلاّت|فيلات)\b/u, value: 'فيلا' },
  { re: /\b(?:شقة|شقق|دور|ادوار|أدوار)\b/u, value: 'شقة' },
  { re: /\b(?:عمارة|عماره|عماير|عمائر)\b/u, value: 'عمارة' },
  { re: /\b(?:فندق|فنادق|شقق\s*فندقية|شقق\s*فندقيه)\b/u, value: 'فندق' },
  { re: /\b(?:استراحة|استراحه|شاليه|شاليهات)\b/u, value: 'استراحة' },
  { re: /\b(?:محل|محلات|معرض|معارض|مكتب|مكاتب)\b/u, value: 'محل' },
  { re: /\b(?:مستودع|مستودعات|ورشة|ورشه)\b/u, value: 'مستودع' },
];

function normalizeText(value = '') {
  return String(value || '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDigits(value = '') {
  return String(value || '')
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN_DIGITS.indexOf(d)))
    .replace(/,/g, '');
}

function parseMoney(text = '') {
  const normalized = normalizeDigits(text);
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(مليون|ملايين|الف|ألف|الاف|آلاف|k|K)?/gu)];
  if (!matches.length) return null;

  let best = null;
  for (const match of matches) {
    const raw = Number(match[1]);
    if (!Number.isFinite(raw) || raw <= 0) continue;

    const unit = String(match[2] || '').toLowerCase();
    let value = raw;
    if (/مليون|ملايين/.test(unit)) value = raw * 1000000;
    else if (/الف|ألف|الاف|آلاف|k/.test(unit)) value = raw * 1000;

    // تجاهل أرقام القطع/المخططات الصغيرة جداً، وخذ أكبر مبلغ منطقي مذكور في السؤال.
    if (value >= 10000 && (!best || value > best)) best = value;
  }

  return best;
}

function parseArea(text = '') {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/(?:مساح(?:ه|ة)|م(?:تر|٢|2)|م²)\D{0,10}(\d{2,6})|(?:فوق|اكثر من|أكثر من|اقل من|أقل من|حدود)\s*(\d{2,6})\s*(?:م|متر|م²)/u);
  if (!match) return null;
  const area = Number(match[1] || match[2]);
  return Number.isFinite(area) && area > 0 ? area : null;
}

function detectNeighborhood(originalText = '') {
  const normalized = normalizeText(originalText);
  const found = AREAS.find((area) => normalized.includes(normalizeText(area)));
  if (!found) return '';

  const aliases = {
    'ابحر الشمالية': 'أبحر الشمالية',
    'الامواج': 'الأمواج',
    'ام سدرة': 'أم سدرة',
    'الشويصي': 'الشويضي',
  };

  return aliases[found] || found;
}

function detectPropertyType(originalText = '') {
  const normalized = normalizeText(originalText);
  const found = PROPERTY_PATTERNS.find((item) => item.re.test(normalized));
  return found?.value || '';
}

export function extractSearchFilters(question = '') {
  const text = String(question || '').trim();
  const normalized = normalizeText(text);
  const filters = {};

  const propertyType = detectPropertyType(text);
  if (propertyType) filters.propertyType = propertyType;

  if (/\b(?:سكني|سكنيه|سكنية)\b/u.test(normalized)) filters.propertyClass = 'residential';
  if (/\b(?:تجاري|تجاريه|تجارية)\b/u.test(normalized)) filters.propertyClass = 'commercial';

  if (/\b(?:ايجار|إيجار|للايجار|للإيجار|اجار|سنوي|شهري)\b/u.test(text)) filters.dealType = 'rent';
  if (/\b(?:بيع|للبيع|شراء|تمليك)\b/u.test(text)) filters.dealType = 'sale';
  if (/\b(?:مباشر|مالك|من المالك)\b/u.test(normalized)) filters.directOnly = true;

  const targetPrice = parseMoney(text);
  if (targetPrice) {
    const isUpperBudget = /\b(?:بحدود|حدود|الى|إلى|اقل|أقل|تحت|لا يتجاوز|ميزانية|ميزانيه)\b/u.test(text);
    if (isUpperBudget) {
      filters.priceMax = Math.round(targetPrice * 1.1);
    } else {
      filters.priceMin = Math.round(targetPrice * 0.85);
      filters.priceMax = Math.round(targetPrice * 1.15);
    }
  }

  const targetArea = parseArea(text);
  if (targetArea) {
    if (/\b(?:فوق|اكثر من|أكثر من)\b/u.test(text)) filters.areaMin = targetArea;
    else if (/\b(?:اقل من|أقل من|تحت)\b/u.test(text)) filters.areaMax = targetArea;
    else {
      filters.areaMin = Math.round(targetArea * 0.85);
      filters.areaMax = Math.round(targetArea * 1.15);
    }
  }

  const neighborhood = detectNeighborhood(text);
  if (neighborhood) filters.neighborhood = neighborhood;

  const planMatch = text.match(/(?:مخطط|المخطط)\s*([\p{L}\d\-/]+(?:\s+[\p{L}\d\-/]+){0,3})/u);
  if (planMatch) filters.plan = String(planMatch[1] || '').trim();

  const partMatch = normalizeDigits(text).match(/(?:قطعه|قطعة|رقم)\s*(\d{1,6}[\-/]?\d{0,4})/u);
  if (partMatch) filters.part = partMatch[1];

  // إذا لم نستخرج أي فلتر واضح، لا نرجع كل العروض عشوائياً؛ نبحث نصياً داخل العنوان والوصف.
  if (!Object.keys(filters).length && normalized.length >= 2) {
    filters.q = normalized;
  }

  return filters;
}
