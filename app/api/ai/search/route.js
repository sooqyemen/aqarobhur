import { NextResponse } from 'next/server';
import { extractSearchFilters } from '@/lib/searchUtils';
import { fetchListings } from '@/lib/listings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1';
const WHATSAPP_NUMBER = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');

const FILTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    filters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        propertyType: { type: ['string', 'null'] },
        dealType: { type: ['string', 'null'], enum: ['sale', 'rent', null] },
        propertyClass: { type: ['string', 'null'], enum: ['residential', 'commercial', null] },
        neighborhood: { type: ['string', 'null'] },
        plan: { type: ['string', 'null'] },
        part: { type: ['string', 'null'] },
        priceMin: { type: ['number', 'null'] },
        priceMax: { type: ['number', 'null'] },
        areaMin: { type: ['number', 'null'] },
        areaMax: { type: ['number', 'null'] },
        directOnly: { type: 'boolean' },
        q: { type: ['string', 'null'] },
      },
      required: [
        'propertyType',
        'dealType',
        'propertyClass',
        'neighborhood',
        'plan',
        'part',
        'priceMin',
        'priceMax',
        'areaMin',
        'areaMax',
        'directOnly',
        'q',
      ],
    },
  },
  required: ['answer', 'filters'],
};

export async function POST(request) {
  try {
    const body = await request.json();
    const question = String(body?.question || body?.query || '').trim();

    if (!question) {
      return NextResponse.json({ error: 'نص الطلب مطلوب.' }, { status: 400 });
    }

    const fallbackFilters = extractSearchFilters(question);
    const aiResult = await getOpenAiFilters(question, fallbackFilters);
    const filters = mergeFilters(aiResult.filters, fallbackFilters);

    let results = await fetchListings({
      filters,
      onlyPublic: false,
      includeLegacy: true,
      max: 900,
    });

    let searchMode = 'strict';

    if (!Array.isArray(results) || results.length === 0) {
      const allListings = await fetchListings({
        filters: {},
        onlyPublic: false,
        includeLegacy: true,
        max: 1200,
      });
      results = looseMatchListings(allListings, filters, question);
      searchMode = 'loose-server-scan';
    }

    const ranked = rankListings(results, question, filters);
    const best = ranked.slice(0, 8);
    const answer = buildAnswer(best, filters, aiResult.answer);
    const whatsappText = buildWhatsAppText(question, best);

    return NextResponse.json({
      ok: true,
      source: aiResult.source,
      openaiError: aiResult.openaiError || '',
      searchMode,
      model: aiResult.model || null,
      question,
      filters,
      count: ranked.length,
      items: best.map(toSafeClientListing),
      answer,
      whatsappText,
      whatsappLink: buildWhatsAppLink(whatsappText),
      ctaText: 'هل ناسبك أي من هذه العروض؟ اكتب رقم جوالك اختيارياً وسنرسل لك العروض المتوفرة مع التفاصيل عبر واتساب، أو تواصل معنا مباشرة الآن.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تنفيذ البحث الذكي.' },
      { status: 500 }
    );
  }
}

async function getOpenAiFilters(question, fallbackFilters) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      source: 'rules',
      model: null,
      openaiError: 'OPENAI_API_KEY missing',
      answer: 'فهمت طلبك وطبقت الفلاتر المناسبة على العروض المتوفرة.',
      filters: fallbackFilters,
    };
  }

  try {
    const systemPrompt = [
      'أنت مساعد بحث عقاري لموقع عقار أبحر في شمال جدة.',
      'مهمتك تحويل طلب المستخدم إلى فلاتر بحث فقط، ولا تخترع نتائج.',
      'إذا كتب المستخدم شقة أو شقق أو شقه أو دور: propertyType = شقة.',
      'إذا كتب المستخدم فيلا أو فيلا أو فله أو فلل: propertyType = فيلا.',
      'إذا كتب المستخدم فندق أو فنادق أو فندقي: propertyType = فندق.',
      'إذا كتب المستخدم أرض أو اراضي أو قطعة: propertyType = أرض.',
      'إذا كتب إيجار أو للايجار أو سنوي أو شهري: dealType = rent.',
      'إذا كتب بيع أو للبيع أو تمليك: dealType = sale.',
      'إذا لم يحدد بيع أو إيجار اجعل dealType = null.',
      'إذا قال بحدود مليون أو ميزانية مليون اجعل priceMax قريب من الرقم ولا تجعل priceMin إلزامي.',
      'أعد JSON فقط حسب المخطط.',
    ].join('\n');

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'real_estate_search_filters',
            strict: true,
            schema: FILTER_SCHEMA,
          },
        },
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error?.message || 'OpenAI API request failed');
    }

    const content = json?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      source: 'openai',
      model: OPENAI_MODEL,
      openaiError: '',
      answer: String(parsed?.answer || '').trim() || 'فهمت طلبك وطبقت الفلاتر المناسبة.',
      filters: parsed?.filters || fallbackFilters,
    };
  } catch (error) {
    return {
      source: 'rules',
      model: OPENAI_MODEL,
      openaiError: error?.message || 'OpenAI failed',
      answer: 'فهمت طلبك وطبقت الفلاتر المناسبة على العروض المتوفرة.',
      filters: fallbackFilters,
    };
  }
}

function normalizeFilters(filters = {}) {
  const output = {};
  const copyString = (key) => {
    const value = String(filters[key] || '').trim();
    if (value && value !== 'null' && value !== 'undefined') output[key] = value;
  };
  const copyNumber = (key) => {
    const value = Number(filters[key]);
    if (Number.isFinite(value) && value >= 0) output[key] = Math.round(value);
  };

  copyString('propertyType');
  copyString('neighborhood');
  copyString('plan');
  copyString('part');
  copyString('q');
  if (filters.dealType === 'sale' || filters.dealType === 'rent') output.dealType = filters.dealType;
  if (filters.propertyClass === 'residential' || filters.propertyClass === 'commercial') output.propertyClass = filters.propertyClass;
  if (filters.directOnly === true) output.directOnly = true;
  copyNumber('priceMin');
  copyNumber('priceMax');
  copyNumber('areaMin');
  copyNumber('areaMax');
  return output;
}

function mergeFilters(aiFilters = {}, fallbackFilters = {}) {
  const ai = normalizeFilters(aiFilters);
  const fallback = normalizeFilters(fallbackFilters);
  return {
    ...fallback,
    ...ai,
    propertyType: ai.propertyType || fallback.propertyType,
    neighborhood: ai.neighborhood || fallback.neighborhood,
    dealType: ai.dealType || fallback.dealType,
    propertyClass: ai.propertyClass || fallback.propertyClass,
  };
}

function looseMatchListings(items = [], filters = {}, question = '') {
  const safe = Array.isArray(items) ? items.filter(Boolean) : [];
  const wantedKind = getPropertyKind(filters.propertyType || question);
  const wantedDeal = getDealKind(filters.dealType || question);
  const wantedArea = normalize(filters.neighborhood || '');

  return safe.filter((item) => {
    if (String(item.status || '').trim() === 'sold') return false;

    const hay = normalize([
      item.propertyType,
      item.dealType,
      item.title,
      item.description,
      item.neighborhood,
      item.plan,
    ].filter(Boolean).join(' '));

    if (wantedKind && getPropertyKind(hay) !== wantedKind) return false;
    if (wantedDeal && getDealKind(hay) !== wantedDeal) return false;
    if (wantedArea && !hay.includes(wantedArea)) return false;

    const price = toNumber(item.price);
    if (filters.priceMin != null && (price == null || price < Number(filters.priceMin))) return false;
    if (filters.priceMax != null && (price == null || price > Number(filters.priceMax))) return false;

    const area = toNumber(item.area);
    if (filters.areaMin != null && (area == null || area < Number(filters.areaMin))) return false;
    if (filters.areaMax != null && (area == null || area > Number(filters.areaMax))) return false;

    return true;
  });
}

function rankListings(items = [], question = '', filters = {}) {
  const q = normalize(question);
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .filter((item) => String(item.status || '').trim() !== 'sold')
    .map((item) => ({ ...item, _score: computeScore(item, q, filters) }))
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt);
    });
}

function computeScore(item, q, filters) {
  let score = 0;
  const hay = normalize(`${item.propertyType || ''} ${item.dealType || ''} ${item.title || ''} ${item.description || ''} ${item.neighborhood || ''} ${item.plan || ''}`);
  const wantedKind = getPropertyKind(filters.propertyType || q);
  const actualKind = getPropertyKind(hay);
  const wantedDeal = getDealKind(filters.dealType || q);
  const actualDeal = getDealKind(hay);

  if (wantedKind && actualKind === wantedKind) score += 45;
  if (wantedDeal && actualDeal === wantedDeal) score += 25;
  if (filters.neighborhood && hay.includes(normalize(filters.neighborhood))) score += 35;
  if (filters.directOnly && item.direct) score += 18;
  if (q && normalize(item.title).includes(q)) score += 16;
  if (q && normalize(item.description).includes(q)) score += 10;
  return score;
}

function buildAnswer(items, filters, aiIntro = '') {
  if (!items.length) {
    const type = filters.propertyType ? ` من نوع ${filters.propertyType}` : '';
    return `حالياً لم أجد عرضاً مطابقاً تماماً${type} لطلبك في قاعدة العروض الداخلية. يسعدنا نخدمك إذا أرسلت الطلب عبر واتساب لنبحث لك عن بدائل مناسبة.`;
  }

  const lines = items.map((item, index) => {
    const bits = [`العرض ${index + 1}: ${buildTitle(item)}`];
    if (item.neighborhood) bits.push(`في ${item.neighborhood}`);
    if (item.price) bits.push(`بسعر ${formatPrice(item.price)}`);
    if (item.area) bits.push(`المساحة ${item.area}م²`);
    if (item.direct) bits.push('مباشر');
    const brief = buildBriefSpecs(item);
    if (brief) bits.push(brief);
    return `- ${bits.join(' — ')}`;
  });

  const intro = aiIntro || `وجدت ${items.length} عرض مناسب لطلبك.`;
  return [intro, ...lines].join('\n');
}

function buildTitle(item) {
  const type = item.propertyType || inferPropertyTitle(item) || 'عرض عقاري';
  const deal = getDealKind(`${item.dealType || ''} ${item.title || ''} ${item.description || ''}`) === 'rent' ? 'للإيجار' : 'للبيع';
  return `${type} ${deal}`;
}

function inferPropertyTitle(item) {
  const kind = getPropertyKind(`${item.propertyType || ''} ${item.title || ''} ${item.description || ''}`);
  const map = { apartment: 'شقة', land: 'أرض', villa: 'فيلا', building: 'عمارة', hotel: 'فندق', resthouse: 'استراحة', shop: 'محل', warehouse: 'مستودع' };
  return map[kind] || '';
}

function buildBriefSpecs(item) {
  const text = normalize(item.description || '');
  const rooms = extractRoomsFromListing(item);
  const baths = extractBathroomsFromListing(item);
  const parts = [];
  if (rooms) parts.push(`${rooms} غرف`);
  if (baths) parts.push(`${baths} حمامات`);
  if (/صاله|صالة/.test(text)) parts.push('صالة');
  if (/مطبخ/.test(text)) parts.push('مطبخ');
  return parts.join(' + ');
}

function toSafeClientListing(item) {
  return {
    id: item.id || '',
    title: item.title || buildTitle(item),
    generatedTitle: buildTitle(item),
    neighborhood: item.neighborhood || '',
    propertyType: item.propertyType || inferPropertyTitle(item),
    dealType: item.dealType || '',
    price: item.price || null,
    area: item.area || null,
    direct: !!item.direct,
    summary: buildBriefSpecs(item),
    description: String(item.description || '').slice(0, 240),
    image: getFirstImage(item),
    url: item.id ? `/listing/${encodeURIComponent(String(item.id))}` : '',
  };
}

function getFirstImage(item = {}) {
  const images = Array.isArray(item.images) ? item.images : [];
  const image = images.find(Boolean) || item.image || item.coverImage || '';
  return typeof image === 'string' ? image : image?.url || '';
}

function buildWhatsAppText(question, items = []) {
  const lines = ['السلام عليكم', 'سبق أن طلبت عبر العقاري الذكي:', question, ''];
  if (items.length) {
    lines.push('العروض الأقرب لطلبك:');
    items.forEach((item, index) => {
      const safe = toSafeClientListing(item);
      const details = [
        `${index + 1}. ${safe.title || safe.generatedTitle}`,
        safe.neighborhood ? `الحي: ${safe.neighborhood}` : '',
        safe.price ? `السعر: ${formatPrice(safe.price)}` : '',
        safe.area ? `المساحة: ${safe.area}م²` : '',
        safe.url ? `الرابط: https://aqarobhur.com${safe.url}` : '',
      ].filter(Boolean);
      lines.push(details.join(' - '));
    });
  } else {
    lines.push('لم تظهر نتيجة مطابقة، وأرغب في متابعة الطلب وتوفير بدائل مناسبة.');
  }
  return lines.join('\n');
}

function buildWhatsAppLink(text) {
  if (!WHATSAPP_NUMBER) return '';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function normalize(value) {
  return String(value || '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function getPropertyKind(value = '') {
  const v = normalize(value);
  if (!v) return '';
  if (['شقه', 'شقق', 'دور', 'ادوار', 'apartment', 'flat'].some((x) => v.includes(x))) return 'apartment';
  if (['ارض', 'اراضي', 'قطعه', 'land'].some((x) => v.includes(x))) return 'land';
  if (['فيلا', 'فله', 'فلل', 'فيلات', 'villa'].some((x) => v.includes(x))) return 'villa';
  if (['عماره', 'عماير', 'عمائر', 'building'].some((x) => v.includes(x))) return 'building';
  if (['فندق', 'فنادق', 'فندقي', 'hotel'].some((x) => v.includes(x))) return 'hotel';
  if (['استراحه', 'شاليه', 'شاليهات'].some((x) => v.includes(x))) return 'resthouse';
  if (['محل', 'محلات', 'معرض', 'معارض', 'مكتب', 'مكاتب'].some((x) => v.includes(x))) return 'shop';
  if (['مستودع', 'مستودعات', 'ورشه'].some((x) => v.includes(x))) return 'warehouse';
  return '';
}

function getDealKind(value = '') {
  const v = normalize(value);
  if (!v) return '';
  if (['rent', 'rental', 'lease', 'ايجار', 'اجار', 'للايجار', 'سنوي', 'شهري'].some((x) => v.includes(x))) return 'rent';
  if (['sale', 'sell', 'buy', 'بيع', 'للبيع', 'شراء', 'تمليك'].some((x) => v.includes(x))) return 'sale';
  return '';
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractRoomsFromListing(item) {
  const text = `${item.title || ''} ${item.description || ''}`;
  const m = text.match(/(\d+)\s*غرف?/) || text.match(/(\d+)\s*غرفة/);
  return m ? Number(m[1]) : null;
}

function extractBathroomsFromListing(item) {
  const text = `${item.title || ''} ${item.description || ''}`;
  const m = text.match(/(\d+)\s*حمامات?/) || text.match(/(\d+)\s*دورات?\s*مياه/);
  return m ? Number(m[1]) : null;
}

function toMillis(v) {
  try {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
  } catch (_) {}
  return 0;
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('ar-SA').format(num) + ' ريال';
}
