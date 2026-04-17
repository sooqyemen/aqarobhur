import { NextResponse } from 'next/server';
import { NEIGHBORHOODS, normalizeNeighborhoodName } from '@/lib/taxonomy';
import { normalizeSaudiPhone } from '@/lib/contactUtils';

const DEFAULT_RETENTION_DAYS = 30;

const KNOWN_NEIGHBORHOODS = [...NEIGHBORHOODS].sort((a, b) => b.length - a.length);

const FOLLOWUP_ONLY = [
  'مباشر', 'أكد', 'اكّد', 'هذا نفسه', 'موجود', 'أرسل', 'تم', 'تمت', 'عندك شي', 'فيه', 'اوك', 'تمام',
];

const IGNORE_PATTERNS = [
  /انضم/,
  /غادر/,
  /تم إنشاء/,
  /غيّر موضوع المجموعة/,
  /غير موضوع المجموعة/,
  /غيّر اسم المجموعة/,
  /غير اسم المجموعة/,
  /<Media omitted>/i,
  /تم حذف هذه الرسالة/,
  /^السلام عليكم$/u,
  /^هلا$/u,
  /^مرحبا$/u,
  /^صباح الخير$/u,
];

const SOLD_PATTERNS = [
  /تم البيع/u,
  /انباع/u,
  /مباع/u,
  /مبيوع/u,
  /محجوز/u,
  /تم التأجير/u,
  /اتأجر/u,
  /تأجر/u,
];

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
    const grouped = groupMessages(messages, conversationTitle);

    const items = grouped
      .map((group) => classifyGroup(group, payload, conversationTitle, { retentionDays, now, grouped }))
      .filter(Boolean);

    const stats = buildStats(grouped, items);
    const summary = buildSummary(stats, conversationTitle);

    return NextResponse.json({
      parsedText: grouped.map((group) => group.text).join('\n\n'),
      summary,
      stats,
      retentionDays,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'تعذر تحليل المحتوى.' },
      { status: 500 }
    );
  }
}

function resolveRetentionDays(payload = {}) {
  const raw = Number(payload?.retentionDays ?? payload?.maxAgeDays ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(raw)) return DEFAULT_RETENTION_DAYS;
  return clamp(Math.round(raw), 1, 30);
}

function deriveConversationTitle(fileName) {
  return String(fileName || '')
    .replace(/^WhatsApp Chat -\s*/i, '')
    .replace(/\.txt$/i, '')
    .replace(/\.zip$/i, '')
    .trim();
}

function parseWhatsAppMessages(rawText) {
  const lines = String(rawText || '').split(/\r?\n/);
  const messages = [];

  const headerRegex =
    /^\s*(?:\[)?[‎‏‪-‮﻿\s]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[،,]?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م|صباحًا|مساءً)?)\s*(?:\])?\s*(?:-|–|—)?\s*([^:]+):\s?(.*)$/u;

  let current = null;

  for (const rawLine of lines) {
    const line = stripBidi(rawLine);
    const match = line.match(headerRegex);

    if (match) {
      if (current) messages.push(current);

      const timestampText = `${match[1]} ${match[2]}`.trim();
      current = {
        timestamp: timestampText,
        sender: String(match[3] || '').trim(),
        text: String(match[4] || '').trim(),
        parsedAt: parseWhatsAppTimestamp(timestampText),
      };
      continue;
    }

    if (current) {
      const extra = String(rawLine || '').trim();
      if (extra) current.text += `\n${stripBidi(extra)}`;
    } else if (String(rawLine || '').trim()) {
      current = {
        timestamp: '',
        sender: '',
        text: stripBidi(rawLine).trim(),
        parsedAt: null,
      };
    }
  }

  if (current) messages.push(current);
  return messages.filter((item) => item.text.trim());
}

function groupMessages(messages, conversationTitle) {
  if (!messages.length) {
    return [{
      sender: conversationTitle || 'مسوق',
      text: '',
      isFromMe: false,
      messages: [],
      timestamp: '',
      messageDate: null,
      lastMessageDate: null,
    }];
  }

  const uniqueSenders = [...new Set(messages.map((item) => item.sender).filter(Boolean))];
  const titleTokens = tokenize(conversationTitle);
  const likelyExternalSender = uniqueSenders.find((sender) =>
    titleTokens.some((token) => tokenize(sender).includes(token))
  );

  const oneToOneChat =
    uniqueSenders.length > 0 && uniqueSenders.length <= 2 && !!likelyExternalSender;

  const groups = [];
  let current = null;

  for (const msg of messages) {
    const isFromMe = oneToOneChat ? msg.sender !== likelyExternalSender : false;

    if (
      !current ||
      current.sender !== msg.sender ||
      current.isFromMe !== isFromMe ||
      current.messages.length >= 6
    ) {
      if (current) groups.push(finalizeGroup(current));
      current = {
        sender: msg.sender || 'مسوق',
        isFromMe,
        timestamp: msg.timestamp || '',
        messages: [msg],
        text: msg.text.trim(),
      };
    } else {
      current.messages.push(msg);
      current.text += `\n${msg.text.trim()}`;
    }
  }

  if (current) groups.push(finalizeGroup(current));
  return groups.filter((group) => group.text.trim());
}

function finalizeGroup(group) {
  const dates = (group.messages || [])
    .map((msg) => msg?.parsedAt)
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));

  const firstDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
  const lastDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

  return {
    ...group,
    messageDate: firstDate,
    lastMessageDate: lastDate,
  };
}

function classifyGroup(group, payload, conversationTitle, options = {}) {
  const text = normalizeText(group.text);
  if (!text) return null;
  if (group.isFromMe) return null;
  if (IGNORE_PATTERNS.some((pattern) => pattern.test(text))) return null;
  if (isPureFollowup(text)) return null;

  const timeMeta = buildTimeMeta(group, options);
  if (!timeMeta.isFresh) return null;

  const soldLike = SOLD_PATTERNS.some((pattern) => pattern.test(text));
  if (soldLike) return null;

  const propertyType = extractPropertyType(text);
  const dealType = extractDealType(text);
  const neighborhood = extractNeighborhood(text);
  const schemeName = extractSchemeName(text);
  const part = extractPart(text);
  const plotNumber = extractPlotNumber(text);
  const area = extractArea(text);
  const price = extractPrice(text);
  const streetDetails = extractStreetDetails(text);

  const hasStrongListingWords =
    /للبيع|للايجار|للإيجار|أرض للبيع|فيلا للبيع|عمارة للبيع|شقة للبيع|شقة للإيجار|فيلا للإيجار|للبيع في|للإيجار في|صك|شارع\s*\d+|رقم\s*\d+/iu.test(text);

  const hasRequestWords =
    /(?:^|\s)(?:مطلوب|ابحث|أبحث|ابغى|أبغى|احتاج|أحتاج)(?:\s|$)|زبون|عميل/iu.test(text);

  const requestLike = hasRequestWords && !hasStrongListingWords;
  if (requestLike) return null;

  const listingLike =
    hasStrongListingWords ||
    (/بيع|إيجار|ايجار/iu.test(text) && !!(propertyType || neighborhood || part || schemeName || price || area));

  const hasLocation = !!(neighborhood || part || schemeName || plotNumber);
  const hasCore = !!(price || area || propertyType);

  if (!listingLike && !hasCore && !hasLocation) return null;

  const source = buildSourceFromGroup(group, payload, conversationTitle, options?.grouped || []);
  const phone =
    extractPhone(text) ||
    extractPhone(group.sender) ||
    source.contactPhone ||
    extractPhone(conversationTitle) ||
    extractPhoneFromNearbyGroups(group, options?.grouped || []);

  const direct = isDirectOffer(text) || /وكيل حصري|حصري/u.test(text);
  const exclusiveAgent = /وكيل حصري|حصري/u.test(text);

  const confidence = scoreConfidence({
    propertyType,
    hasLocation,
    price,
    area,
    phone,
    direct,
    text,
  });

  const listing = {
    title: buildListingTitle(propertyType, neighborhood, part, schemeName),
    dealType: dealType || 'sale',
    propertyType: propertyType || '',
    neighborhood: neighborhood || '',
    plan: schemeName || '',
    part: part || '',
    plotNumber: plotNumber || '',
    area: area || null,
    price: price || null,
    direct,
    streetDetails,
    exclusiveAgent,
    description: buildListingDescription(text, streetDetails, plotNumber, schemeName, exclusiveAgent),
  };

  return {
    recordType: 'listing',
    extractionStatus: confidence >= 0.72 ? 'internal_ready' : 'needs_review',
    confidence,
    priorityScore: buildPriorityScore({ direct, confidence }),
    summary: buildListingSummary(listing),
    listing,
    request: null,
    rawText: group.text,
    reason:
      confidence >= 0.82
        ? 'عرض جديد صالح للحفظ الداخلي والاستخدام في العقاري الذكي.'
        : 'عرض محتمل يحتاج مراجعة سريعة قبل الاعتماد الداخلي.',
    source: { ...source, contactPhone: phone || source.contactPhone },
    groupMeta: {
      sender: group.sender,
      isFromMe: false,
      messagesCount: group.messages?.length || 1,
    },
    retentionDays: timeMeta.retentionDays,
    messageDate: timeMeta.messageDate,
    expiresAt: timeMeta.expiresAt,
    publishedAt: '',
    isFresh: true,
    ageDays: timeMeta.ageDays,
    sourceHash: timeMeta.sourceHash,
    duplicateKey: buildDuplicateKey({
      dealType: listing.dealType,
      propertyType: listing.propertyType,
      neighborhood: listing.neighborhood,
      plan: listing.plan,
      part: listing.part,
      plotNumber: listing.plotNumber,
      area: listing.area,
      price: listing.price,
      phone: phone || source.contactPhone,
    }),
  };
}

function buildSourceFromGroup(group, payload, conversationTitle, grouped = []) {
  const fallbackName = group.sender || payload?.source?.contactName || conversationTitle || 'مسوق';
  const fallbackPhone =
    extractPhone(group.text) ||
    extractPhone(group.sender) ||
    extractPhone(conversationTitle) ||
    String(payload?.source?.contactPhone || '').trim() ||
    extractPhoneFromNearbyGroups(group, grouped);

  return {
    sourceType: String(payload?.sourceType || payload?.source?.sourceType || 'الوارد الذكي').trim(),
    contactName: fallbackName.trim() || 'مسوق',
    contactPhone: normalizeSaudiPhone(fallbackPhone),
    contactRole: String(payload?.source?.contactRole || '').trim() || 'وسيط',
  };
}

function buildTimeMeta(group, options = {}) {
  const retentionDays = resolveRetentionDays({ retentionDays: options?.retentionDays });
  const now = options?.now instanceof Date ? options.now : new Date();

  const messageDate =
    group?.messageDate instanceof Date && !Number.isNaN(group.messageDate.getTime())
      ? group.messageDate
      : null;

  const expiresAt = messageDate ? addDays(messageDate, retentionDays) : null;
  const isFresh = expiresAt ? expiresAt.getTime() >= now.getTime() : true;

  return {
    retentionDays,
    messageDate: messageDate ? messageDate.toISOString() : '',
    expiresAt: expiresAt ? expiresAt.toISOString() : '',
    isFresh,
    ageDays: messageDate ? diffDays(messageDate, now) : null,
    sourceHash: hashString(normalizeFingerprintText(group?.text || '')),
  };
}

function buildStats(grouped, items) {
  return {
    totalGroups: grouped.length,
    internalReadyCount: items.filter((item) => item.extractionStatus === 'internal_ready').length,
    reviewCount: items.filter((item) => item.extractionStatus === 'needs_review').length,
    ignoredCount: Math.max(0, grouped.length - items.length),
    expiredCount: 0,
    soldCount: 0,
    listingCount: items.length,
    requestCount: 0,
    directCount: items.filter((item) => item.listing?.direct).length,
  };
}

function buildSummary(stats, title) {
  const who = title ? `من ${title}` : 'من الوارد';
  return `تم تحليل ${stats.totalGroups} مقطع ${who}: تم استخراج ${stats.listingCount} عرض جديد صالح، منها ${stats.internalReadyCount} جاهزة داخليًا و${stats.reviewCount} تحتاج مراجعة.`;
}

function scoreConfidence({ propertyType, hasLocation, price, area, phone, direct, text }) {
  let score = 0.42;
  if (propertyType) score += 0.14;
  if (hasLocation) score += 0.14;
  if (price) score += 0.12;
  if (area) score += 0.10;
  if (phone) score += 0.08;
  if (direct) score += 0.08;
  if (/للبيع|للإيجار|للايجار|مباشر|وكيل إفراغ/iu.test(text)) score += 0.08;
  return clamp(score, 0, 0.99);
}

function buildPriorityScore({ direct, confidence }) {
  let score = Math.round(Number(confidence || 0) * 100);
  if (direct) score += 20;
  return clamp(score, 0, 120);
}

function buildListingTitle(propertyType, neighborhood, part, schemeName) {
  const type = propertyType || 'عرض عقاري';
  const place = [neighborhood, schemeName, part].filter(Boolean).join(' — ');
  return place ? `${type} ${place}` : type;
}

function buildListingSummary(listing) {
  const place = [
    listing.neighborhood,
    listing.plan,
    listing.part ? `جزء ${listing.part}` : '',
    listing.plotNumber ? `قطعة ${listing.plotNumber}` : '',
  ].filter(Boolean).join(' — ');

  const details = [
    listing.propertyType,
    listing.dealType === 'rent' ? 'للإيجار' : 'للبيع',
    place,
    listing.price ? `${listing.price}` : '',
    listing.area ? `${listing.area}م` : '',
    listing.direct ? 'مباشر' : '',
  ].filter(Boolean).join(' — ');

  return details || 'عرض عقاري داخلي';
}

function buildDuplicateKey({ dealType, propertyType, neighborhood, plan, part, plotNumber, area, price, phone }) {
  const parts = [
    'listing',
    normalizeKey(dealType),
    normalizeKey(propertyType),
    normalizeKey(neighborhood),
    normalizeKey(plan),
    normalizeKey(part),
    normalizeKey(plotNumber),
    normalizeNumeric(area),
    normalizeNumeric(price),
    normalizePhone(phone),
  ];

  return parts.join('|');
}

function extractPropertyType(text) {
  if (/ارض|أرض/u.test(text)) return 'أرض';
  if (/فيلا|فله/u.test(text)) return 'فيلا';
  if (/شقة|شقه/u.test(text)) return 'شقة';
  if (/عمارة|عماره/u.test(text)) return 'عمارة';
  if (/دور/u.test(text)) return 'دور';
  if (/محل/u.test(text)) return 'محل';
  if (/مستودع/u.test(text)) return 'مستودع';
  return '';
}

function extractDealType(text) {
  if (/ايجار|إيجار|للإيجار|للايجار|سنوي|شهري/u.test(text)) return 'rent';
  if (/للبيع|بيع|أرض للبيع|شقة للبيع|فيلا للبيع|عمارة للبيع/u.test(text)) return 'sale';
  return '';
}

function extractNeighborhood(text) {
  const base = String(text || '').trim();
  const candidates = [
    base,
    base.replace(/\s+/g, ' '),
    base.replace(/حي\s+/gu, ' '),
    base.replace(/منطقة\s+/gu, ' '),
  ].map((item) => item.trim()).filter(Boolean);

  for (const candidate of candidates) {
    for (const item of KNOWN_NEIGHBORHOODS) {
      if (candidate.includes(item)) {
        return normalizeNeighborhoodName(item);
      }
    }
  }

  for (const candidate of candidates) {
    const words = candidate.split(/[\s،,.:\-_/]+/).filter(Boolean);
    for (let i = 0; i < words.length; i += 1) {
      for (let len = 3; len >= 1; len -= 1) {
        const chunk = words.slice(i, i + len).join(' ').trim();
        if (!chunk) continue;
        const normalizedChunk = normalizeNeighborhoodName(chunk);
        if (KNOWN_NEIGHBORHOODS.includes(normalizedChunk)) {
          return normalizedChunk;
        }
      }
    }
  }

  return '';
}

function extractSchemeName(text) {
  const schemeMatch =
    text.match(/(?:مخطط)\s*([0-9٠-٩]+)\s*([أ-يa-zA-Z])?/u) ||
    text.match(/(?:مخطط)\s+([^\n،.]+)/u);

  if (!schemeMatch) return '';

  const base = String(schemeMatch[1] || '').trim();
  const suffix = String(schemeMatch[2] || '').trim();

  if (base && /^[0-9٠-٩]+$/.test(base)) {
    return suffix ? `${toWesternDigits(base)}${suffix}` : toWesternDigits(base);
  }

  return String(schemeMatch[1] || '').trim().slice(0, 60);
}

function extractPart(text) {
  const match =
    text.match(/(?:جزء|الجزء)\s*([0-9٠-٩]+)\s*([أ-يa-zA-Z])/u) ||
    text.match(/(?:جزء|الجزء)\s*([0-9٠-٩]+[أ-يa-zA-Z])/u);

  if (!match) return '';

  if (match[2]) {
    return `${toWesternDigits(match[1])}${String(match[2]).trim()}`;
  }

  return String(match[1] || '').trim();
}

function extractPlotNumber(text) {
  const match = text.match(/(?:رقم\s*القطعة|القطعة|قطعة)\s*[:\-]?\s*([0-9٠-٩]+)/u);
  return match ? toWesternDigits(match[1]) : '';
}

function extractStreetDetails(text) {
  const matches = [...String(text || '').matchAll(/شارع\s*([0-9٠-٩]+)\s*(شمالي|جنوبي|شرقي|غربي)?/gu)];
  const streets = matches.map((m) => {
    const number = toWesternDigits(m[1] || '');
    const dir = String(m[2] || '').trim();
    return `شارع ${number}${dir ? ` ${dir}` : ''}`.trim();
  });

  return Array.from(new Set(streets)).filter(Boolean);
}

function extractArea(text) {
  const normalized = replaceArabicDigits(text);
  const areaPatterns = [
    /(?:المساحة|مساحه|مساحة)\s*[:\-]?\s*(\d{2,5})\s*(?:م|متر|م٢|م2|م²)/iu,
    /(\d{2,5})\s*(?:م|متر|م٢|م2|م²)/iu,
  ];

  for (const pattern of areaPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (value >= 20 && value <= 100000) return value;
    }
  }

  return null;
}

function extractPrice(text) {
  const normalized = replaceArabicDigits(text);
  const compact = normalized.replace(/[,\s]+/g, ' ');

  const millionMatch = compact.match(/(\d+(?:\.\d+)?)\s*(?:مليون|م)/iu);
  if (millionMatch) {
    const value = Number(millionMatch[1]);
    if (Number.isFinite(value)) return Math.round(value * 1000000);
  }

  const thousandMatch = compact.match(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|ك)/iu);
  if (thousandMatch) {
    const value = Number(thousandMatch[1]);
    if (Number.isFinite(value)) return Math.round(value * 1000);
  }

  const explicit = compact.match(/(?:السعر|المطلوب|ب)\s*[:\-]?\s*(\d{4,10})/iu);
  if (explicit) {
    const value = Number(explicit[1]);
    if (value >= 1000) return value;
  }

  const standalone = compact.match(/\b(\d{5,10})\b/u);
  if (standalone) {
    const value = Number(standalone[1]);
    if (value >= 1000) return value;
  }

  return null;
}

function extractPhone(text) {
  const normalized = replaceArabicDigits(String(text || ''));
  const matches = [...normalized.matchAll(/(?:\+966|00966|966|0)?5\d{8}/g)];
  if (!matches.length) return '';
  const last = matches[matches.length - 1][0];
  return normalizeSaudiPhone(last);
}

function extractPhoneFromNearbyGroups(group, grouped = []) {
  const idx = grouped.findIndex((g) => g === group || g?.text === group?.text);
  if (idx === -1) return '';

  const start = Math.max(0, idx - 2);
  const end = Math.min(grouped.length - 1, idx + 2);

  for (let i = start; i <= end; i += 1) {
    const phone = extractPhone(grouped[i]?.text || '') || extractPhone(grouped[i]?.sender || '');
    if (phone) return phone;
  }

  return '';
}

function isDirectOffer(text) {
  return /(?:^|\s)مباشر(?:\s|$)|مباشرة|مباشر من المالك|مباشره من المالك|المالك مباشر|من المالك/u.test(text);
}

function buildListingDescription(text, streetDetails, plotNumber, schemeName, exclusiveAgent) {
  const extra = [];
  if (plotNumber) extra.push(`رقم القطعة: ${plotNumber}`);
  if (schemeName) extra.push(`المخطط: ${schemeName}`);
  if (streetDetails?.length) extra.push(`الشوارع: ${streetDetails.join(' + ')}`);
  if (exclusiveAgent) extra.push('وكيل حصري');
  return [text.slice(0, 1200), ...extra].filter(Boolean).join(' | ');
}

function isPureFollowup(text) {
  const clean = text.trim().replace(/\n/g, ' ');
  if (clean.length > 30) return false;
  return FOLLOWUP_ONLY.some((item) => clean === item || clean.startsWith(`${item} `));
}

function parseWhatsAppTimestamp(raw) {
  const clean = replaceArabicDigits(stripBidi(String(raw || '').trim()))
    .replace(/صباحًا|صباحا|صباحاً/g, 'AM')
    .replace(/مساءً|مساء|مساءا|مساءاً/g, 'PM')
    .replace(/\s+ص\b/g, ' AM')
    .replace(/\s+م\b/g, ' PM');

  const match = clean.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
  );

  if (!match) return null;

  let day = Number(match[1]);
  let month = Number(match[2]);
  let year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  const meridiem = String(match[7] || '').toUpperCase();

  if (year < 100) year += 2000;

  if (year >= 1300 && year <= 1600) {
    const gregorian = islamicToGregorian(year, month, day);
    year = gregorian.year;
    month = gregorian.month;
    day = gregorian.day;
  }

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function islamicToGregorian(year, month, day) {
  const jd =
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    386;
  return julianDayToGregorian(jd);
}

function julianDayToGregorian(jd) {
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

function normalizeText(text) {
  return replaceArabicDigits(stripBidi(String(text || '')).trim());
}

function stripBidi(text) {
  return String(text || '').replace(/[‎‏‪-‮﻿]/g, '').replace(/ /g, ' ');
}

function replaceArabicDigits(text) {
  return String(text || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function toWesternDigits(text) {
  return replaceArabicDigits(String(text || ''));
}

function tokenize(text) {
  return String(text || '').split(/[\s\-_/،,.]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeFingerprintText(text) {
  return normalizeText(text)
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function hashString(input) {
  const text = String(input || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

function normalizeKey(value) {
  return normalizeText(String(value || ''))
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function normalizeNumeric(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? String(Math.round(num)) : '';
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function diffDays(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
