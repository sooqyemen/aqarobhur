import { NextResponse } from 'next/server';
import { extractSearchFilters } from '@/lib/searchUtils';
import { fetchListings } from '@/lib/listings';

const WHATSAPP_NUMBER = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');

export async function POST(request) {
  try {
    const body = await request.json();
    const question = String(body?.question || body?.query || '').trim();

    if (!question) {
      return NextResponse.json({ error: 'نص الطلب مطلوب.' }, { status: 400 });
    }

    const filters = extractSearchFilters(question);
    const results = await fetchListings({
      filters,
      onlyPublic: false,
      includeLegacy: false,
      max: 120,
    });

    const ranked = rankListings(results, question, filters);
    const best = ranked.slice(0, 3);
    const answer = buildAnswer(best, question, filters);
    const whatsappLink = buildWhatsAppLink(question);

    return NextResponse.json({
      ok: true,
      question,
      filters,
      count: ranked.length,
      items: best.map(toSafeClientListing),
      answer,
      whatsappLink,
      ctaText:
        'هل ناسبك أي من هذه العروض؟ لا تتردد بالتواصل معنا مباشرة عبر واتساب وسنكمل لك التفاصيل وننسق لك العرض المناسب.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تنفيذ البحث الذكي.' },
      { status: 500 }
    );
  }
}

function rankListings(items = [], question = '', filters = {}) {
  const q = normalize(question);

  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .filter((item) => {
      if (!item) return false;
      if (String(item.status || '').trim() === 'sold') return false;
      if (String(item.status || '').trim() === 'hidden') return false;
      return true;
    })
    .map((item) => ({
      ...item,
      _score: computeScore(item, q, filters),
    }))
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

  if (filters.neighborhood && neighborhood === normalize(filters.neighborhood)) score += 35;
  if (filters.propertyType && propertyType === normalize(filters.propertyType)) score += 30;
  if (filters.dealType && dealType === normalize(filters.dealType)) score += 25;
  if (filters.part && part === normalize(filters.part)) score += 12;
  if (filters.directOnly && item.direct) score += 18;

  if (q && title.includes(q)) score += 16;
  if (q && description.includes(q)) score += 10;
  if (q && plan.includes(q)) score += 6;

  const roomsRequested = extractRequestedRooms(q);
  const roomsActual = extractRoomsFromListing(item);
  if (roomsRequested && roomsActual) {
    if (roomsRequested === roomsActual) score += 22;
    else if (Math.abs(roomsRequested - roomsActual) === 1) score += 8;
  }

  if (filters.priceMax && item.price) {
    const price = Number(item.price);
    if (price <= Number(filters.priceMax)) score += 15;
    else score -= 10;
  }

  if (filters.priceMin && item.price) {
    const price = Number(item.price);
    if (price >= Number(filters.priceMin)) score += 5;
  }

  return score;
}

function buildAnswer(items, question, filters) {
  if (!items.length) {
    return [
      'حالياً لم أجد عرضاً مطابقاً تماماً لطلبك في قاعدة العروض الداخلية.',
      'يسعدنا نخدمك بشكل أدق إذا تواصلت معنا عبر واتساب وسنبحث لك عن بدائل مناسبة مباشرة.',
    ].join(' ');
  }

  const lines = items.map((item, index) => {
    const bits = [];

    bits.push(`العرض ${index + 1}: ${buildTitle(item)}`);

    if (item.neighborhood) bits.push(`في ${item.neighborhood}`);
    if (item.price) bits.push(`بسعر ${formatPrice(item.price)}`);
    if (item.area) bits.push(`المساحة ${item.area}م`);
    if (item.direct) bits.push('مباشر');

    const brief = buildBriefSpecs(item);
    if (brief) bits.push(brief);

    return `- ${bits.join(' — ')}`;
  });

  const intro = `وجدت ${items.length} عرض${items.length > 1 ? 'اً' : ''} مناسب${items.length > 1 ? 'ة' : ''} لطلبك.`;
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
  const floor = extractFloorFromListing(item);
  const lounge = /صاله|صالة/.test(text) ? 'صالة' : '';
  const kitchen = /مطبخ/.test(text) ? 'مطبخ' : '';

  const parts = [];
  if (rooms) parts.push(`${rooms} غرف`);
  if (baths) parts.push(`${baths} حمامات`);
  if (lounge) parts.push(lounge);
  if (kitchen) parts.push(kitchen);
  if (floor) parts.push(`الدور ${floor}`);

  return parts.join(' + ');
}

function toSafeClientListing(item) {
  return {
    id: item.id || '',
    title: buildTitle(item),
    neighborhood: item.neighborhood || '',
    propertyType: item.propertyType || '',
    dealType: item.dealType || '',
    price: item.price || null,
    area: item.area || null,
    direct: !!item.direct,
    summary: buildBriefSpecs(item),
    description: String(item.description || '').slice(0, 240),
  };
}

function buildWhatsAppLink(question) {
  if (!WHATSAPP_NUMBER) return '';

  const text = [
    'السلام عليكم',
    'سبق أن طلبت عبر العقاري الذكي:',
    question,
    'وأرغب في متابعة العروض المناسبة.',
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function normalize(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .toLowerCase()
    .trim();
}

function extractRequestedRooms(text) {
  const m =
    String(text || '').match(/(\d+)\s*غرف?/) ||
    String(text || '').match(/(\d+)\s*غرفة/);
  return m ? Number(m[1]) : null;
}

function extractRoomsFromListing(item) {
  const text = `${item.title || ''} ${item.description || ''}`;
  const m =
    text.match(/(\d+)\s*غرف?/) ||
    text.match(/(\d+)\s*غرفة/);
  return m ? Number(m[1]) : null;
}

function extractBathroomsFromListing(item) {
  const text = `${item.title || ''} ${item.description || ''}`;
  const m =
    text.match(/(\d+)\s*حمامات?/) ||
    text.match(/(\d+)\s*دورات?\s*مياه/);
  return m ? Number(m[1]) : null;
}

function extractFloorFromListing(item) {
  const text = `${item.title || ''} ${item.description || ''}`;
  const m = text.match(/الدور\s+(الأول|الثاني|الثالث|الرابع|الخامس|\d+)/);
  return m ? m[1] : '';
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
