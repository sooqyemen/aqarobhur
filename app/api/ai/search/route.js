import { NextResponse } from 'next/server';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { extractSearchFilters } from '@/lib/searchUtils';
import { fetchListings } from '@/lib/listings';
import { getFirebase } from '@/lib/firebaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXTRACTED_COLLECTION = 'abhur_extracted_items';
const WHATSAPP_NUMBER = String(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');

export async function POST(request) {
  try {
    const body = await request.json();
    const question = String(body?.question || body?.query || '').trim();
    if (!question) return NextResponse.json({ error: 'نص الطلب مطلوب.' }, { status: 400 });

    const filters = cleanFilters(extractSearchFilters(question));
    const { items: allItems, sources } = await readAllSources();
    const ranked = rank(matchItems(allItems, filters, question), question, filters);
    const best = ranked.slice(0, 10);
    const whatsappText = makeWhatsappText(question, best);

    return NextResponse.json({
      ok: true,
      source: 'rules',
      searchMode: 'listings-and-smart-inbox',
      question,
      filters,
      sources,
      allListingsCount: allItems.length,
      count: ranked.length,
      items: best.map(toClientItem),
      answer: makeAnswer(best, filters),
      whatsappText,
      whatsappLink: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}` : '',
      ctaText: 'هل ناسبك أي من هذه العروض؟ تواصل معنا وسنرسل لك التفاصيل عبر واتساب.',
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'تعذر تنفيذ البحث الذكي.' }, { status: 500 });
  }
}

async function readAllSources() {
  const items = [];
  const sources = { publicListings: 0, internalListings: 0, smartInboxItems: 0, warnings: [] };

  try {
    const rows = await fetchListings({ filters: {}, onlyPublic: true, includeLegacy: true, max: 1200 });
    const safe = Array.isArray(rows) ? rows : [];
    sources.publicListings = safe.length;
    items.push(...safe.map((x) => ({ ...x, sourceBucket: 'site' })));
  } catch (e) {
    sources.warnings.push(`publicListings: ${e?.message || 'failed'}`);
  }

  try {
    const rows = await fetchListings({ filters: {}, onlyPublic: false, includeLegacy: true, max: 1200 });
    const safe = Array.isArray(rows) ? rows : [];
    sources.internalListings = safe.length;
    items.push(...safe.map((x) => ({ ...x, sourceBucket: 'internal' })));
  } catch (e) {
    sources.warnings.push(`internalListings: ${e?.message || 'failed'}`);
  }

  try {
    const rows = await readInboxListings(900);
    sources.smartInboxItems = rows.length;
    items.push(...rows);
  } catch (e) {
    sources.warnings.push(`smartInboxItems: ${e?.message || 'failed'}`);
  }

  return { items: dedupe(items), sources };
}

async function readInboxListings(max) {
  const { db } = getFirebase();
  let docs = [];
  try {
    const q = query(collection(db, EXTRACTED_COLLECTION), orderBy('createdAt', 'desc'), limit(max));
    docs = (await getDocs(q)).docs;
  } catch (_) {
    const q = query(collection(db, EXTRACTED_COLLECTION), limit(max));
    docs = (await getDocs(q)).docs;
  }

  return docs.map((d) => fromInboxDoc(d.id, d.data())).filter(Boolean).filter((x) => !isUnavailable(x));
}

function fromInboxDoc(id, data = {}) {
  if (data.recordType !== 'listing') return null;
  const status = String(data.extractionStatus || '').trim();
  if (['ignored', 'expired', 'sold'].includes(status)) return null;
  if (data.isFresh === false || expired(data.expiresAt)) return null;

  const listing = data.listing || {};
  const source = data.source || {};
  const promotedDocId = String(data.promotedDocId || '').trim();
  const summary = String(data.summary || '').trim();
  const rawText = String(data.rawText || '').trim();
  const description = [listing.description, summary, rawText].filter(Boolean).join('\n\n');

  const item = {
    ...listing,
    id: promotedDocId || `inbox-${id}`,
    inboxItemId: id,
    promotedDocId,
    sourceBucket: 'smart_inbox',
    extractionStatus: status,
    title: String(listing.title || summary || 'عرض عقاري من الوارد الذكي').trim(),
    description,
    rawText,
    summary,
    status: String(listing.status || 'hidden').trim(),
    contactPhone: String(listing.contactPhone || listing.sourceContactPhone || source.contactPhone || '').trim(),
    messageDate: data.messageDate || listing.messageDate || '',
    expiresAt: data.expiresAt || listing.expiresAt || '',
    createdAt: data.createdAt || listing.createdAt || '',
    updatedAt: data.updatedAt || listing.updatedAt || '',
    duplicateKey: data.duplicateKey || listing.duplicateKey || '',
  };

  return item.title || item.propertyType || item.neighborhood || item.price || item.area || item.description ? item : null;
}

function cleanFilters(filters = {}) {
  const out = {};
  for (const k of ['propertyType', 'neighborhood', 'plan', 'part', 'q']) {
    const v = String(filters[k] || '').trim();
    if (v && v !== 'null' && v !== 'undefined') out[k] = v;
  }
  if (filters.dealType === 'sale' || filters.dealType === 'rent') out.dealType = filters.dealType;
  if (filters.directOnly === true) out.directOnly = true;
  for (const k of ['priceMin', 'priceMax', 'areaMin', 'areaMax']) {
    const n = Number(filters[k]);
    if (Number.isFinite(n) && n >= 0) out[k] = Math.round(n);
  }
  return out;
}

function matchItems(items = [], filters = {}, question = '') {
  const wantedKind = kind(filters.propertyType || question);
  const wantedDeal = deal(filters.dealType || question);
  const wantedArea = norm(filters.neighborhood || '');
  const wantedPlan = norm(filters.plan || '');
  const wantedPart = norm(filters.part || '');
  const q = norm(filters.q || question);

  return items.filter((item) => {
    if (!item || isUnavailable(item)) return false;
    const hay = haystack(item);
    const actualKind = kind(hay);
    const actualDeal = deal(hay);
    if (wantedKind && actualKind && actualKind !== wantedKind) return false;
    if (wantedDeal && actualDeal && actualDeal !== wantedDeal) return false;
    if (wantedArea && !hay.includes(wantedArea)) return false;
    if (wantedPlan && !hay.includes(wantedPlan)) return false;
    if (wantedPart && !hay.includes(wantedPart)) return false;

    const price = num(item.price);
    if (filters.priceMin != null && (price == null || price < Number(filters.priceMin))) return false;
    if (filters.priceMax != null && (price == null || price > Number(filters.priceMax))) return false;

    const area = num(item.area);
    if (filters.areaMin != null && (area == null || area < Number(filters.areaMin))) return false;
    if (filters.areaMax != null && (area == null || area > Number(filters.areaMax))) return false;

    if (!wantedKind && !wantedDeal && !wantedArea && q.length >= 2) return hay.includes(q);
    return true;
  });
}

function rank(items = [], question = '', filters = {}) {
  const q = norm(question);
  return items.map((item) => ({ ...item, _score: score(item, q, filters) })).sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return millis(b.updatedAt || b.createdAt || b.messageDate) - millis(a.updatedAt || a.createdAt || a.messageDate);
  });
}

function score(item, q, filters) {
  const hay = haystack(item);
  let s = 0;
  if (kind(filters.propertyType || q) && kind(filters.propertyType || q) === kind(hay)) s += 45;
  if (deal(filters.dealType || q) && deal(filters.dealType || q) === deal(hay)) s += 25;
  if (filters.neighborhood && hay.includes(norm(filters.neighborhood))) s += 35;
  if (filters.plan && hay.includes(norm(filters.plan))) s += 12;
  if (item.sourceBucket === 'smart_inbox') s += 10;
  if (item.sourceBucket === 'site') s += 8;
  if (q && norm(item.title).includes(q)) s += 16;
  if (q && norm(item.description).includes(q)) s += 10;
  return s;
}

function makeAnswer(items, filters) {
  if (!items.length) {
    const type = filters.propertyType ? ` من نوع ${filters.propertyType}` : '';
    return `حالياً لم أجد عرضاً مطابقاً تماماً${type} في عروض الموقع أو الوارد الذكي.`;
  }
  const lines = items.map((item, i) => {
    const parts = [`العرض ${i + 1}: ${titleOf(item)}`];
    if (item.neighborhood) parts.push(`في ${item.neighborhood}`);
    if (item.price) parts.push(`بسعر ${price(item.price)}`);
    if (item.area) parts.push(`المساحة ${item.area}م²`);
    if (item.sourceBucket === 'smart_inbox') parts.push('من الوارد الذكي');
    return `- ${parts.join(' — ')}`;
  });
  return [`وجدت ${items.length} عرض مناسب من الموقع أو الوارد الذكي.`, ...lines].join('\n');
}

function toClientItem(item) {
  const inboxOnly = item.sourceBucket === 'smart_inbox' && !item.promotedDocId && String(item.id || '').startsWith('inbox-');
  const id = item.promotedDocId || item.id || '';
  return {
    id,
    inboxItemId: item.inboxItemId || '',
    sourceBucket: item.sourceBucket || 'site',
    title: item.title || titleOf(item),
    generatedTitle: titleOf(item),
    neighborhood: item.neighborhood || '',
    propertyType: item.propertyType || typeName(item),
    dealType: item.dealType || '',
    price: item.price || null,
    area: item.area || null,
    direct: !!item.direct,
    summary: item.summary || '',
    description: String(item.description || item.rawText || '').slice(0, 280),
    contactPhone: item.contactPhone || '',
    image: firstImage(item),
    url: !inboxOnly && id ? `/listing/${encodeURIComponent(String(id))}` : '',
  };
}

function makeWhatsappText(question, items = []) {
  const lines = ['السلام عليكم', 'سبق أن طلبت عبر العقاري الذكي:', question, ''];
  if (!items.length) {
    lines.push('لم تظهر نتيجة مطابقة، وأرغب في متابعة الطلب وتوفير بدائل مناسبة.');
    return lines.join('\n');
  }
  lines.push('العروض الأقرب لطلبك:');
  items.forEach((item, i) => {
    const safe = toClientItem(item);
    lines.push([
      `${i + 1}. ${safe.title || safe.generatedTitle}`,
      safe.neighborhood ? `الحي: ${safe.neighborhood}` : '',
      safe.price ? `السعر: ${price(safe.price)}` : '',
      safe.area ? `المساحة: ${safe.area}م²` : '',
      safe.sourceBucket === 'smart_inbox' ? 'المصدر: الوارد الذكي' : '',
      safe.url ? `الرابط: https://aqarobhur.com${safe.url}` : '',
    ].filter(Boolean).join(' - '));
  });
  return lines.join('\n');
}

function titleOf(item) {
  const t = String(item.title || '').trim();
  if (t) return t;
  return `${item.propertyType || typeName(item) || 'عرض عقاري'} ${deal(haystack(item)) === 'rent' ? 'للإيجار' : 'للبيع'}`;
}

function typeName(item) {
  return ({ apartment: 'شقة', land: 'أرض', villa: 'فيلا', building: 'عمارة', hotel: 'فندق', resthouse: 'استراحة', shop: 'محل', warehouse: 'مستودع' })[kind(haystack(item))] || '';
}

function haystack(item = {}) {
  return norm([item.propertyType, item.type, item.category, item.dealType, item.offerType, item.title, item.summary, item.description, item.rawText, item.neighborhood, item.region, item.city, item.plan, item.part, item.contactPhone].filter(Boolean).join(' '));
}

function isUnavailable(item = {}) {
  if (expired(item.expiresAt)) return true;
  const status = norm(item.status || item.availability || item.extractionStatus || '');
  const text = norm(`${item.title || ''} ${item.summary || ''} ${item.description || ''} ${item.rawText || ''}`);
  if (['sold', 'مباع', 'تم البيع', 'deleted', 'ignored', 'expired'].some((x) => status.includes(norm(x)))) return true;
  return ['تم البيع', 'مباع', 'انتهى العرض', 'العرض منتهي'].some((x) => text.includes(norm(x)));
}

function dedupe(items = []) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    if (!item) continue;
    const key = item.promotedDocId ? `p:${item.promotedDocId}` : item.duplicateKey ? `d:${item.duplicateKey}` : item.id ? `i:${item.id}` : `t:${norm(item.title)}:${norm(item.neighborhood)}:${num(item.price) || ''}:${num(item.area) || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function norm(value) {
  return String(value || '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s+/g, ' ').toLowerCase().trim();
}

function kind(value = '') {
  const v = norm(value);
  if (!v) return '';
  if (['شقه', 'شقق', 'دور', 'apartment', 'flat'].some((x) => v.includes(x))) return 'apartment';
  if (['ارض', 'اراضي', 'قطعه', 'قطع', 'land'].some((x) => v.includes(x))) return 'land';
  if (['فيلا', 'فله', 'فلل', 'فيلات', 'villa'].some((x) => v.includes(x))) return 'villa';
  if (['عماره', 'عماير', 'عمائر', 'building'].some((x) => v.includes(x))) return 'building';
  if (['فندق', 'فنادق', 'فندقي', 'hotel'].some((x) => v.includes(x))) return 'hotel';
  if (['استراحه', 'شاليه'].some((x) => v.includes(x))) return 'resthouse';
  if (['محل', 'محلات', 'معرض', 'مكتب'].some((x) => v.includes(x))) return 'shop';
  if (['مستودع', 'مستودعات', 'ورشه'].some((x) => v.includes(x))) return 'warehouse';
  return '';
}

function deal(value = '') {
  const v = norm(value);
  if (!v) return '';
  if (['rent', 'rental', 'lease', 'ايجار', 'اجار', 'للايجار', 'سنوي', 'شهري'].some((x) => v.includes(norm(x)))) return 'rent';
  if (['sale', 'sell', 'buy', 'بيع', 'للبيع', 'شراء', 'تمليك'].some((x) => v.includes(norm(x)))) return 'sale';
  return '';
}

function num(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function firstImage(item = {}) {
  const images = Array.isArray(item.images) ? item.images : [];
  const image = images.find(Boolean) || item.image || item.coverImage || '';
  return typeof image === 'string' ? image : image?.url || '';
}

function expired(value) {
  const t = millis(value);
  return !!t && t < Date.now();
}

function millis(v) {
  try {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const parsed = new Date(v).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000;
  } catch (_) {}
  return 0;
}

function price(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat('ar-SA').format(n) + ' ريال';
}
