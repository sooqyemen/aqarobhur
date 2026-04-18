import { NextResponse } from 'next/server';
import { normalizeSaudiPhone } from '@/lib/contactUtils';
import { NEIGHBORHOODS, normalizeNeighborhoodName } from '@/lib/taxonomy';

const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4';
const DEFAULT_RETENTION_DAYS = 30;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const KNOWN_NEIGHBORHOODS = [...NEIGHBORHOODS].sort((a, b) => b.length - a.length);

function resolveRetentionDays(payload = {}) {
  const raw = Number(payload?.retentionDays ?? payload?.maxAgeDays ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(raw)) return DEFAULT_RETENTION_DAYS;
  return clamp(Math.round(raw), 1, 30);
}
const SOLD_PATTERNS = [
  /تم البيع/i,
  /مباع/i,
  /مبيوع/i,
  /محجوز/i,
  /تم التأجير/i,
  /تأجر/i,
  /اتأجر/i,
];
const REQUEST_PATTERNS = [/(?:^|\s)(?:مطلوب|أبغى|ابغى|أبحث|ابحث|أحتاج|احتاج)(?:\s|$)/i, /زبون/i, /عميل/i];
const LISTING_HINT_PATTERNS = [/(?:للبيع|للإيجار|للايجار|أرض|نص\s*أرض|فيلا|شقة|عمارة|دور|محل)/i, /مطلوب\s*\d/i, /مساح(?:ة|ه)/i];

export async function POST(request) {
  try {
    const payload = await request.json();
    const rawText = String(payload?.rawText || '').trim();

    if (!rawText) {
      return NextResponse.json({ error: 'النص الخام مطلوب للتحليل.' }, { status: 400 });
    }

    const retentionDays = resolveRetentionDays(payload);
    const now = new Date();
    const conversationTitle = deriveConversationTitle(payload.fileName || payload.source?.contactName || '');
    const messages = parseWhatsAppMessages(rawText);
    const groups = groupMessages(messages, conversationTitle);

    const analyzedGroups = [];
    const allItems = [];

    for (const group of groups) {
      const result = await analyzeGroup({
        group,
        payload,
        conversationTitle,
        retentionDays,
        now,
      });
      analyzedGroups.push(result);
      if (Array.isArray(result.items)) allItems.push(...result.items);
    }

    const dedupedItems = dedupeItems(allItems);
    const stats = buildStats(groups, dedupedItems);
    const summary = buildSummary({
      conversationTitle,
      stats,
      groupsAnalyzed: groups.length,
    });

    return NextResponse.json({
      parsedText: groups.map((group) => group.text).join('\n\n'),
      summary,
      stats,
      retentionDays,
      items: dedupedItems,
    });
  } catch (error) {
    console.error('smart inbox extract error', error);
    return NextResponse.json(
      { error: error?.message || 'تعذر تحليل المحتوى.' },
      { status: 500 }
    );
  }
}

async function analyzeGroup({ group, payload, conversationTitle, retentionDays, now }) {
  const source = buildSourceFromGroup(group, payload, conversationTitle);
  const groupText = cleanText(group.text);
  const timeMeta = buildTimeMeta(group, retentionDays, now);

  if (!groupText) {
    return { items: [] };
  }

  let offers = [];
  let aiUsed = false;

  if (process.env.OPENAI_API_KEY) {
    try {
      offers = await extractOffersWithOpenAI({
        groupText,
        group,
        source,
        retentionDays,
      });
      aiUsed = true;
    } catch (error) {
      console.error('OpenAI extraction failed, using fallback heuristics:', error);
    }
  }

  if (!offers.length) {
    offers = extractOffersHeuristically(groupText, source);
  }

  const items = offers
    .map((offer) => normalizeOfferToItem({ offer, group, source, timeMeta, aiUsed }))
    .filter(Boolean);

  return { items };
}

async function extractOffersWithOpenAI({ groupText, group, source, retentionDays }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const systemPrompt = [
    'أنت محلل وارد عقاري سعودي لمدينة جدة.',
    'مهمتك استخراج العروض العقارية فقط من الرسائل أو المحادثات، وليس الطلبات.',
    'قد تحتوي الرسالة الواحدة على عدة عروض. يجب فصل كل عرض في عنصر مستقل.',
    'لا تدمج أي حقل من عرض مع عرض آخر.',
    'تجاهل الطلبات الصادرة من العملاء، والرسائل العامة، والعروض المباعة أو المحجوزة أو المؤجرة.',
    'استخرج عروض البيع والإيجار فقط إذا كانت عروضًا فعلية معروضة.',
    'إذا كان الحقل غير موجود فأرجعه null.',
    'السعر يجب أن يكون رقمًا فقط بدون عملة، والمساحة رقمًا فقط بالمتر المربع.',
    'نوع العقار يبقى بالعربية مثل: أرض، نص أرض، فيلا، شقة، عمارة، دور، محل.',
    'نوع الصفقة يجب أن يكون sale أو rent.',
    'إذا وجدت رابط خرائط ضعه في mapUrl.',
    'إذا لم يكن هناك أي عرض صالح فأعد offers كمصفوفة فارغة.',
  ].join('\n');

  const userPrompt = [
    `بيانات المصدر: ${JSON.stringify({
      sender: source.contactName || group.sender || '',
      phone: source.contactPhone || '',
      timestamp: group.timestamp || '',
      retentionDays,
    })}`,
    'النص:',
    groupText,
  ].join('\n\n');

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'smart_inbox_extraction',
          strict: true,
          schema: extractionSchema(),
        },
      },
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message || 'OpenAI API request failed');
  }

  const content = json?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(content);
  const offers = Array.isArray(parsed?.offers) ? parsed.offers : [];
  return offers;
}

function extractionSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      offers: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            propertyType: { type: ['string', 'null'] },
            dealType: { type: ['string', 'null'], enum: ['sale', 'rent', null] },
            neighborhood: { type: ['string', 'null'] },
            plan: { type: ['string', 'null'] },
            part: { type: ['string', 'null'] },
            plotNumber: { type: ['string', 'null'] },
            area: { type: ['number', 'null'] },
            price: { type: ['number', 'null'] },
            streetDetails: { type: ['string', 'null'] },
            dimensions: { type: ['string', 'null'] },
            direct: { type: ['boolean', 'null'] },
            mapUrl: { type: ['string', 'null'] },
            description: { type: ['string', 'null'] },
            contactPhone: { type: ['string', 'null'] },
            soldLike: { type: ['boolean', 'null'] },
            requestLike: { type: ['boolean', 'null'] },
            confidence: { type: ['number', 'null'] },
          },
          required: [
            'propertyType',
            'dealType',
            'neighborhood',
            'plan',
            'part',
            'plotNumber',
            'area',
            'price',
            'streetDetails',
            'dimensions',
            'direct',
            'mapUrl',
            'description',
            'contactPhone',
            'soldLike',
            'requestLike',
            'confidence',
          ],
        },
      },
    },
    required: ['offers'],
  };
}

function extractOffersHeuristically(groupText, source) {
  const segments = splitListingSegments(groupText);
  return segments
    .map((segment) => extractOfferFromSegment(segment, source))
    .filter(Boolean);
}

function splitListingSegments(text) {
  const normalized = cleanText(text);
  if (!normalized) return [];

  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const segments = [];
  let current = [];

  const pushCurrent = () => {
    const chunk = current.join('\n').trim();
    if (chunk) segments.push(chunk);
    current = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const prev = current.join('\n');
    const startNew = current.length > 0 && isLikelyStartOfNewListing(line, prev);

    if (startNew) {
      pushCurrent();
    }

    current.push(line);

    if (/https?:\/\//i.test(line) && hasEnoughListingSignals(current.join('\n'))) {
      pushCurrent();
    }
  }

  pushCurrent();

  return segments.length ? segments : [normalized];
}

function isLikelyStartOfNewListing(line, currentText) {
  if (!line) return false;
  const current = cleanText(currentText);
  const hasClosedOffer = /(?:مطلوب|السوم|حد|نهائي|مباشر|مباشرة|مبااشرة|https?:\/\/)/i.test(current);

  if (/^(?:للبيع|للإيجار|للايجار)\b/i.test(line)) return hasClosedOffer;
  if (/^(?:حي\s+|مخطط\s+|جوهرة\s+العروس|طيبة|طيبه|الخالدية|الخالديه|الزمرد|الياقوت|الشراع|الصوارى|الصواري)/i.test(line)) {
    return hasClosedOffer;
  }
  if (/^(?:رقم\s*الارض|رقم\s*الأرض|رقم\s*القطعه|رقم\s*القطعة|رقم\b)/i.test(line) && /(?:مطلوب|https?:\/\/)/i.test(current)) {
    return true;
  }
  return false;
}

function hasEnoughListingSignals(text) {
  return /(مطلوب|مساح(?:ة|ه)|للبيع|للإيجار|للايجار|شارع|رقم)/i.test(text);
}

function extractOfferFromSegment(segment, source) {
  const text = cleanText(segment);
  if (!text) return null;
  if (SOLD_PATTERNS.some((pattern) => pattern.test(text))) return null;
  if (REQUEST_PATTERNS.some((pattern) => pattern.test(text)) && !LISTING_HINT_PATTERNS.some((pattern) => pattern.test(text))) {
    return null;
  }

  const propertyType = extractPropertyType(text);
  const dealType = extractDealType(text);
  const neighborhood = extractNeighborhood(text);
  const plan = extractPlan(text);
  const part = extractPart(text);
  const plotNumber = extractPlotNumber(text);
  const area = extractArea(text);
  const price = extractPrice(text);
  const streetDetails = extractStreetDetails(text);
  const dimensions = extractDimensions(text);
  const mapUrl = extractMapUrl(text);
  const direct = isDirect(text);
  const contactPhone = normalizeSaudiPhone(extractPhone(text) || source.contactPhone || '');
  const confidence = scoreOffer({ propertyType, dealType, neighborhood, plan, part, plotNumber, area, price, streetDetails, direct, mapUrl, contactPhone });

  if (!propertyType && !area && !price && !neighborhood && !plan) return null;

  return {
    propertyType,
    dealType,
    neighborhood,
    plan,
    part,
    plotNumber,
    area,
    price,
    streetDetails,
    dimensions,
    direct,
    mapUrl,
    description: text,
    contactPhone,
    soldLike: false,
    requestLike: false,
    confidence,
  };
}

function normalizeOfferToItem({ offer, group, source, timeMeta, aiUsed }) {
  const propertyType = cleanString(offer?.propertyType) || extractPropertyType(offer?.description || group.text) || 'عرض عقاري';
  const dealType = normalizeDealType(offer?.dealType || extractDealType(offer?.description || group.text) || 'sale');
  const neighborhood = normalizeNeighborhoodName(cleanString(offer?.neighborhood)) || extractNeighborhood(offer?.description || '') || '';
  const plan = cleanString(offer?.plan) || extractPlan(offer?.description || '') || '';
  const part = cleanString(offer?.part) || extractPart(offer?.description || '') || '';
  const plotNumber = cleanString(offer?.plotNumber) || extractPlotNumber(offer?.description || '') || '';
  const area = cleanNumber(offer?.area);
  const price = cleanNumber(offer?.price);
  const streetDetails = cleanString(offer?.streetDetails) || extractStreetDetails(offer?.description || '') || '';
  const dimensions = cleanString(offer?.dimensions) || extractDimensions(offer?.description || '') || '';
  const mapUrl = cleanString(offer?.mapUrl) || extractMapUrl(offer?.description || '') || '';
  const direct = typeof offer?.direct === 'boolean' ? offer.direct : isDirect(offer?.description || group.text);
  const soldLike = !!offer?.soldLike || SOLD_PATTERNS.some((pattern) => pattern.test(cleanText(offer?.description || group.text)));
  const requestLike = !!offer?.requestLike;
  const sourcePhone = normalizeSaudiPhone(cleanString(offer?.contactPhone) || source.contactPhone || extractPhone(offer?.description || group.text) || '');
  const description = buildDescription({
    text: offer?.description || group.text,
    streetDetails,
    dimensions,
    mapUrl,
  });

  if (soldLike || requestLike) return null;
  if (!timeMeta.isFresh) return null;
  if (!price && !area && !propertyType && !neighborhood && !plan) return null;

  const confidence = clamp(
    Number.isFinite(Number(offer?.confidence)) ? Number(offer.confidence) : scoreOffer({ propertyType, dealType, neighborhood, plan, part, plotNumber, area, price, streetDetails, direct, mapUrl, contactPhone: sourcePhone }),
    0,
    1,
  );

  const listing = {
    title: buildListingTitle({ propertyType, dealType, neighborhood, plan, part, plotNumber }),
    dealType,
    propertyType,
    neighborhood,
    plan,
    part,
    plotNumber,
    area,
    price,
    direct,
    streetDetails,
    dimensions,
    mapUrl,
    description,
    status: 'hidden',
    messageDate: timeMeta.messageDate,
    expiresAt: timeMeta.expiresAt,
  };

  const duplicateKey = buildDuplicateKey({ listing, sourcePhone, timeMeta });
  const extractionStatus = confidence >= 0.72 ? 'auto_saved' : 'needs_review';
  const summary = buildSummaryLine({ listing, source: { ...source, contactPhone: sourcePhone } });

  return {
    recordType: 'listing',
    extractionStatus,
    confidence,
    priorityScore: buildPriorityScore({ direct, confidence }),
    summary,
    listing,
    rawText: cleanString(offer?.description || group.text),
    reason: aiUsed
      ? 'تم الاستخراج عبر OpenAI مع منع دمج العروض المتعددة.'
      : 'تم الاستخراج بالقواعد الاحتياطية لأن استخراج OpenAI لم يتوفر.',
    source: {
      ...source,
      contactPhone: sourcePhone,
    },
    groupMeta: {
      sender: group.sender || '',
      timestamp: group.timestamp || '',
      messagesCount: Array.isArray(group.messages) ? group.messages.length : 1,
    },
    retentionDays: timeMeta.retentionDays,
    messageDate: timeMeta.messageDate,
    expiresAt: timeMeta.expiresAt,
    publishedAt: '',
    isFresh: true,
    ageDays: timeMeta.ageDays,
    sourceHash: hashString(normalizeFingerprintText(cleanString(offer?.description || group.text))),
    duplicateKey,
  };
}

function buildSourceFromGroup(group, payload, conversationTitle) {
  const rawPhone = [
    payload?.source?.contactPhone,
    extractPhone(group?.text || ''),
    extractPhone(group?.sender || ''),
    extractPhone(conversationTitle || ''),
  ].find(Boolean);

  return {
    sourceType: cleanString(payload?.sourceType || payload?.source?.sourceType || 'الوارد الذكي') || 'الوارد الذكي',
    contactName: cleanString(group?.sender || payload?.source?.contactName || conversationTitle || 'مسوق') || 'مسوق',
    contactPhone: normalizeSaudiPhone(rawPhone || ''),
    contactRole: cleanString(payload?.source?.contactRole || 'وسيط') || 'وسيط',
  };
}

function buildTimeMeta(group, retentionDays, now) {
  const messageDateObj = group?.messageDate instanceof Date && !Number.isNaN(group.messageDate.getTime())
    ? group.messageDate
    : null;
  const expiresAtObj = messageDateObj ? addDays(messageDateObj, retentionDays) : null;
  const isFresh = expiresAtObj ? expiresAtObj.getTime() >= now.getTime() : true;

  return {
    retentionDays,
    messageDate: messageDateObj ? messageDateObj.toISOString() : '',
    expiresAt: expiresAtObj ? expiresAtObj.toISOString() : '',
    isFresh,
    ageDays: messageDateObj ? diffDays(messageDateObj, now) : null,
  };
}

function buildStats(groups, items) {
  const safeItems = Array.isArray(items) ? items : [];
  const autoSavedCount = safeItems.filter((item) => item.extractionStatus === 'auto_saved').length;
  const reviewCount = safeItems.filter((item) => item.extractionStatus === 'needs_review').length;

  return {
    totalGroups: safeItems.length,
    sourceGroups: Array.isArray(groups) ? groups.length : 0,
    autoSavedCount,
    internalReadyCount: autoSavedCount,
    reviewCount,
    ignoredCount: 0,
    expiredCount: 0,
    soldCount: 0,
    listingCount: safeItems.length,
    requestCount: 0,
    directCount: safeItems.filter((item) => item.listing?.direct).length,
  };
}

function buildSummary({ conversationTitle, stats, groupsAnalyzed }) {
  const sourceLabel = conversationTitle || 'المحادثة';
  return `تم تحليل ${groupsAnalyzed} رسالة/مقطع من ${sourceLabel}، واستخراج ${stats.listingCount} عرض صالح (${stats.autoSavedCount} حفظ داخلي تلقائي، ${stats.reviewCount} للمراجعة).`;
}

function dedupeItems(items) {
  const seen = new Set();
  const out = [];

  for (const item of items || []) {
    const key = cleanString(item?.duplicateKey);
    if (!key) {
      out.push(item);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function buildListingTitle({ propertyType, dealType, neighborhood, plan, part, plotNumber }) {
  const bits = [propertyType || 'عرض عقاري', dealType === 'rent' ? 'للإيجار' : 'للبيع'];
  const locationBits = [neighborhood, plan, part].filter(Boolean).join(' — ');
  if (locationBits) bits.push(locationBits);
  if (plotNumber) bits.push(`رقم ${plotNumber}`);
  return bits.join(' — ');
}

function buildSummaryLine({ listing, source }) {
  const bits = [listing.title];
  if (listing.area) bits.push(`المساحة ${listing.area}م²`);
  if (listing.price) bits.push(`السعر ${formatPrice(listing.price)}`);
  if (source?.contactName) bits.push(`المصدر ${source.contactName}`);
  if (source?.contactPhone) bits.push(source.contactPhone);
  if (listing.direct) bits.push('مباشر');
  return bits.join(' — ');
}

function buildPriorityScore({ direct, confidence }) {
  let score = Math.round(clamp(confidence, 0, 1) * 100);
  if (direct) score += 10;
  return clamp(score, 0, 100);
}

function buildDuplicateKey({ listing, sourcePhone, timeMeta }) {
  const keyText = [
    listing?.dealType || '',
    listing?.propertyType || '',
    normalizeNeighborhoodName(listing?.neighborhood || ''),
    cleanString(listing?.plan || ''),
    cleanString(listing?.part || ''),
    cleanString(listing?.plotNumber || ''),
    Number.isFinite(Number(listing?.area)) ? Number(listing.area) : '',
    Number.isFinite(Number(listing?.price)) ? Number(listing.price) : '',
    sourcePhone || '',
    timeMeta?.messageDate || '',
  ].join('|');
  return hashString(normalizeFingerprintText(keyText));
}

function buildDescription({ text, streetDetails, dimensions, mapUrl }) {
  const lines = cleanText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^https?:\/\//i.test(line));

  const extra = [streetDetails, dimensions].filter(Boolean).join(' — ');
  if (extra) lines.push(extra);
  if (mapUrl) lines.push(`رابط الموقع: ${mapUrl}`);
  return Array.from(new Set(lines)).join('\n');
}

function parseWhatsAppMessages(rawText) {
  const lines = String(rawText || '').split(/\r?\n/);
  const messages = [];
  const headerRegex = /^\s*(?:\[)?[‎‏‪-‮﻿\s]*?(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4})\s*[،,]?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م|صباحًا|مساءً)?)\s*(?:\])?\s*(?:-|–|—)?\s*([^:]+):\s?(.*)$/u;

  let current = null;

  for (const rawLine of lines) {
    const line = stripBidi(rawLine);
    const match = line.match(headerRegex);

    if (match) {
      if (current) messages.push(current);
      const timestampText = `${match[1]} ${match[2]}`.trim();
      current = {
        timestamp: timestampText,
        sender: cleanString(match[3]),
        text: cleanString(match[4]),
        parsedAt: parseWhatsAppTimestamp(timestampText),
      };
      continue;
    }

    if (!current) {
      current = {
        timestamp: '',
        sender: '',
        text: cleanString(rawLine),
        parsedAt: null,
      };
      continue;
    }

    const extra = cleanString(rawLine);
    if (extra) current.text += `\n${stripBidi(extra)}`;
  }

  if (current) messages.push(current);
  return messages.filter((item) => cleanText(item.text));
}

function groupMessages(messages, conversationTitle) {
  if (!messages.length) {
    return [{
      sender: cleanString(conversationTitle) || 'مسوق',
      text: cleanString(conversationTitle),
      messages: [],
      timestamp: '',
      messageDate: null,
    }];
  }

  const groups = [];
  let current = null;

  for (const message of messages) {
    if (!current || current.sender !== message.sender || current.messages.length >= 4) {
      if (current) groups.push(finalizeGroup(current));
      current = {
        sender: message.sender || cleanString(conversationTitle) || 'مسوق',
        text: cleanString(message.text),
        timestamp: message.timestamp || '',
        messages: [message],
      };
    } else {
      current.messages.push(message);
      current.text += `\n${cleanString(message.text)}`;
    }
  }

  if (current) groups.push(finalizeGroup(current));
  return groups.filter((group) => cleanText(group.text));
}

function finalizeGroup(group) {
  const dates = (group.messages || [])
    .map((item) => item.parsedAt)
    .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()));
  const firstDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  return {
    ...group,
    messageDate: firstDate,
  };
}

function parseWhatsAppTimestamp(timestampText) {
  const clean = normalizeArabicDigits(stripBidi(timestampText));
  const match = clean.match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm|ص|م|صباحًا|مساءً)?/);
  if (!match) return null;

  let p1 = Number(match[1]);
  let p2 = Number(match[2]);
  let p3 = Number(match[3]);
  let day;
  let month;
  let year;

  if (p1 > 1700) {
    year = p1;
    month = p2;
    day = p3;
  } else if (p3 > 1700) {
    year = p3;
    month = p2;
    day = p1;
  } else if (p1 >= 1300 && p1 < 1700) {
    year = p1;
    month = p2;
    day = p3;
    ({ year, month, day } = islamicToGregorian(year, month, day));
  } else if (p3 >= 1300 && p3 < 1700) {
    ({ year, month, day } = islamicToGregorian(p3, p2, p1));
  } else {
    year = p3 < 100 ? 2000 + p3 : p3;
    month = p2;
    day = p1;
  }

  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  const meridiem = cleanString(match[7]).toLowerCase();

  if (meridiem === 'pm' || meridiem === 'م' || meridiem === 'مساءً') {
    if (hour < 12) hour += 12;
  } else if (meridiem === 'am' || meridiem === 'ص' || meridiem === 'صباحًا') {
    if (hour === 12) hour = 0;
  }

  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
}

function islamicToGregorian(hYear, hMonth, hDay) {
  const jd = Math.floor((11 * hYear + 3) / 30) + 354 * hYear + 30 * hMonth - Math.floor((hMonth - 1) / 2) + hDay + 1948440 - 385;
  return julianDayToGregorian(jd);
}

function julianDayToGregorian(jd) {
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l -= Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l -= Math.floor((1461 * i) / 4) - 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

function extractPropertyType(text) {
  const clean = cleanText(text);
  if (/نص\s*أرض|نص\s*ارض/i.test(clean)) return 'نص أرض';
  if (/أرض|ارض/i.test(clean)) return 'أرض';
  if (/فيلا/i.test(clean)) return 'فيلا';
  if (/شقة/i.test(clean)) return 'شقة';
  if (/عمارة/i.test(clean)) return 'عمارة';
  if (/دور/i.test(clean)) return 'دور';
  if (/محل/i.test(clean)) return 'محل';
  return '';
}

function extractDealType(text) {
  const clean = cleanText(text);
  if (/للإيجار|للايجار|إيجار|ايجار/i.test(clean)) return 'rent';
  return /للبيع|بيع/i.test(clean) ? 'sale' : 'sale';
}

function extractNeighborhood(text) {
  const clean = cleanText(text);
  for (const item of KNOWN_NEIGHBORHOODS) {
    if (clean.includes(item)) return normalizeNeighborhoodName(item);
  }
  const districtMatch = clean.match(/حي\s+([^\n،,]+)/i);
  if (districtMatch) return normalizeNeighborhoodName(cleanString(districtMatch[1]));
  return '';
}

function extractPlan(text) {
  const clean = cleanText(text);
  const match = clean.match(/مخطط\s+([^\n]+)/i);
  if (match) return cleanString(match[1]).replace(/^(?:حي\s+)/, '');
  const firstLine = clean.split(/\n+/)[0] || '';
  if (/جوهرة\s+العروس|طيبة|طيبه|الخالدية|الخالديه/i.test(firstLine)) return cleanString(firstLine);
  return '';
}

function extractPart(text) {
  const clean = cleanText(text);
  const match = clean.match(/جزء\s*([\w\u0600-\u06FF\/\-]+)/i);
  if (match) return cleanString(match[1]);
  return '';
}

function extractPlotNumber(text) {
  const clean = cleanText(text);
  const match = clean.match(/(?:رقم\s*(?:الارض|الأرض|القطعه|القطعة)?|القطعه|القطعة)\s*[:»]?\s*([\dA-Za-z\/\-]+)/i);
  return match ? cleanString(match[1]) : '';
}

function extractArea(text) {
  const clean = normalizeArabicDigits(cleanText(text));
  const match = clean.match(/(?:مساح(?:ة|ه)|المساح(?:ة|ه))\s*[:»]?\s*(\d+(?:\.\d+)?)\s*(?:متر|م²|م|sqm)?/i)
    || clean.match(/(\d+(?:\.\d+)?)\s*(?:متر|م²|م)(?!\s*(?:شمالي|جنوبي|شرقي|غربي))/i);
  return match ? cleanNumber(match[1]) : null;
}

function extractPrice(text) {
  const clean = normalizeArabicDigits(cleanText(text));
  const match = clean.match(/(?:مطلوب|السوم|حد|نهائي|مفاوضة|تفاوض)\s*[:»]?\s*([\d,.]+)\s*(ألف|الف|مليون|ريال)?/i);
  if (match) return parseArabicMoney(match[1], match[2]);

  const loose = clean.match(/([\d,.]+)\s*(ألف|الف|مليون)\b/i);
  if (loose) return parseArabicMoney(loose[1], loose[2]);
  return null;
}

function parseArabicMoney(rawNumber, rawUnit) {
  const base = Number(String(rawNumber || '').replace(/,/g, ''));
  if (!Number.isFinite(base)) return null;
  const unit = cleanString(rawUnit).toLowerCase();
  if (unit === 'الف' || unit === 'ألف') return base * 1000;
  if (unit === 'مليون') return base * 1000000;
  return base;
}

function extractStreetDetails(text) {
  const clean = cleanText(text);
  const matches = clean.match(/(?:شارع|شارعين|الشارع)\s*[:»]?\s*([^\n]+)/i);
  return matches ? cleanString(matches[1]) : '';
}

function extractDimensions(text) {
  const clean = normalizeArabicDigits(cleanText(text));
  const match = clean.match(/(\d+\s*[xX×]\s*\d+)/);
  return match ? cleanString(match[1]).replace(/x/ig, '×') : '';
}

function extractMapUrl(text) {
  const match = String(text || '').match(/https?:\/\/\S+/i);
  return match ? cleanString(match[0]) : '';
}

function extractPhone(text) {
  const clean = normalizeArabicDigits(String(text || ''));
  const match = clean.match(/(?:\+?966|0)?5\d{8}/);
  return match ? match[0] : '';
}

function isDirect(text) {
  return /مباشر|مباشرة|مبااشرة|مباشر\s+من\s+المالك/i.test(cleanText(text));
}

function scoreOffer(fields = {}) {
  let score = 0.25;
  if (fields.propertyType) score += 0.12;
  if (fields.dealType) score += 0.08;
  if (fields.neighborhood || fields.plan) score += 0.12;
  if (fields.plotNumber) score += 0.08;
  if (Number.isFinite(Number(fields.area))) score += 0.14;
  if (Number.isFinite(Number(fields.price))) score += 0.18;
  if (fields.streetDetails) score += 0.06;
  if (fields.direct) score += 0.05;
  if (fields.mapUrl) score += 0.05;
  if (fields.contactPhone) score += 0.05;
  return clamp(score, 0, 0.99);
}

function diffDays(fromDate, toDate) {
  return Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeDealType(value) {
  return value === 'rent' ? 'rent' : 'sale';
}

function cleanString(value) {
  return String(value || '').trim();
}

function cleanNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deriveConversationTitle(fileName) {
  return cleanString(fileName)
    .replace(/^WhatsApp Chat -\s*/i, '')
    .replace(/\.txt$/i, '')
    .replace(/\.zip$/i, '');
}

function stripBidi(value) {
  return String(value || '').replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '');
}

function normalizeArabicDigits(value) {
  return String(value || '').replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
}

function cleanText(value) {
  return stripBidi(normalizeArabicDigits(value))
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeFingerprintText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\u0600-\u06FF\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return cleanString(value);
  return `${new Intl.NumberFormat('ar-SA').format(num)} ر.س`;
}
