import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractSearchFilters } from '@/lib/searchUtils';
import { fetchListings } from '@/lib/listings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WHATSAPP_NUMBER = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const FILTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intent: { type: 'string', enum: ['property_search', 'unknown'] },
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
  required: ['intent', 'answer', 'filters'],
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

    const results = await fetchListings({
      filters,
      onlyPublic: false,
      includeLegacy: false,
      max: 250,
    });

    const ranked = rankListings(results, question, filters);
    const best = ranked.slice(0, 8);
    const answer = buildAnswer(best, question, filters, aiResult.answer);
    const whatsappText = buildWhatsAppText(question, best);
    const whatsappLink = buildWhatsAppLink(whatsappText);

    return NextResponse.json({
      ok: true,
      source: aiResult.source,
      model: aiResult.model || null,
      question,
      filters,
      count: ranked.length,
      items: best.map(toSafeClientListing),
      answer,
      whatsappText,
      whatsappLink,
      ctaText:
        'هل ناسبك أي من هذه العروض؟ اكتب رقم جوالك اختيارياً وسنرسل لك العروض المتوفرة مع التفاصيل عبر واتساب، أو تواصل معنا مباشرة الآن.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تنفيذ البحث الذكي.' },
      { status: 500 }
    );
  }
}

async function getOpenAiFilters(question, fallbackFilters) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      source: 'rules',
      model: null,
      answer: 'فهمت طلبك وطبقت الفلاتر المناسبة على العروض المتوفرة.',
      filters: fallbackFilters,
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [
            'أنت مساعد بحث عقاري لموقع عقار أبحر في شمال جدة.',
            'حوّل طلب المستخدم العربي إلى فلاتر بحث دقيقة فقط.',
            'لا تخترع نتائج ولا تقول إن العقار متوفر؛ النتائج ستأتي من قاعدة البيانات.',
            'إذا قال المستخدم فندق أو فنادق أو فندقي يجب أن يكون propertyType = فندق، ولا يجوز تحويله إلى أرض.',
            'إذا قال أرض أو قطعة أو أراضي يكون propertyType = أرض.',
            'إذا قال بحدود مليون أو ميزانية مليون فالأفضل priceMax قريب من الرقم ولا تجعل priceMin إلزامي.',
            'إذا لم يذكر بيع أو إيجار اترك dealType = null.',
            'استخدم أسماء الأحياء كما كتبها المستخدم قدر الإمكان.',
            'الأحياء والمناطق المهمة: أبحر الشمالية، الفردوس، الشراع، الأمواج، الصواري، الياقوت، اللؤلؤ، الزمرد، المنارات، الفنار، البحيرات، النور، المروج، الخليج، جوهرة العروس، النجمة، الزهور، الغربية، الشويضي، الغدير، الربيع، الدرة، العبير، العقيق، المجامع، الفرقان، اليسر، الجزيرة، طيبة الفرعية، الوداد، التوفيق، الندى، البيان، المجد، الهجرة، رضوى، البوادر، أم سدرة، العويجاء، الشرائع.',
          ].join('\n'),
        },
        { role: 'user', content: question },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'real_estate_search_filters',
          strict: true,
          schema: FILTER_SCHEMA,
        },
      },
    });

    const parsed = JSON.parse(response.output_text || '{}');
    return {
      source: 'openai',
      model: OPENAI_MODEL,
      answer: String(parsed?.answer || '').trim() || 'فهمت طلبك وطبقت الفلاتر المناسبة.',
      filters: parsed?.filters || fallbackFilters,
    };
  } catch (_) {
    return {
      source: 'rules',
      model: null,
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
  const neighborhood = normalize(item.neighborhood);
  const propertyType = normalize(item.propertyType);
  const dealType = normalize(item.dealType);
  const plan = normalize(item.plan);
  const part = normalize(item.part);
  const description = normalize(item.description);
  const title = normalize(item.title);

  if (filters.neighborhood && neighborhood.includes(normalize(filters.neighborhood))) score += 35;
  if (filters.propertyType && propertyType === normalize(filters.propertyType)) score += 40;
  if (filters.dealType && dealType === normalize(filters.dealType)) score += 25;
  if (filters.part && part === normalize(filters.part)) score += 12;
  if (filters.directOnly && item.direct) score += 18;
  if (q && title.includes(q)) score += 16;
  if (q && description.includes(q)) score += 10;
  if (q && plan.includes(q)) score += 6;

  return score;
}

function buildAnswer(items, question, filters, aiIntro = '') {
  if (!items.length) {
    const type = filters.propertyType ? ` من نوع ${filters.propertyType}` : '';
    return `حالياً لم أجد عرضاً مطابقاً تماماً${type} لطلبك في قاعدة العروض الداخلية. يسعدنا نخدمك إذا أرسلت الطلب عبر واتساب لنبحث لك عن بدائل مناسبة.`;
  }

  const lines = items.map((item, index) => {
    const bits = [];
    bits.push(`العرض ${index + 1}: ${buildTitle(item)}`);
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
  const type = item.propertyType || 'عرض عقاري';
  const deal = item.dealType === 'rent' ? 'للإيجار' : 'للبيع';
  return `${type} ${deal}`;
}

function buildBriefSpecs(item) {
  const text = normalize(item.description || '');
  const rooms = extractRoomsFromListing(item);
  const baths = extractBathroomsFromListing(item);
  const lounge = /صاله|صالة/.test(text) ? 'صالة' : '';
  const kitchen = /مطبخ/.test(text) ? 'مطبخ' : '';
  const parts = [];
  if (rooms) parts.push(`${rooms} غرف`);
  if (baths) parts.push(`${baths} حمامات`);
  if (lounge) parts.push(lounge);
  if (kitchen) parts.push(kitchen);
  return parts.join(' + ');
}

function toSafeClientListing(item) {
  return {
    id: item.id || '',
    title: item.title || buildTitle(item),
    generatedTitle: buildTitle(item),
    neighborhood: item.neighborhood || '',
    propertyType: item.propertyType || '',
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
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .toLowerCase()
    .trim();
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
