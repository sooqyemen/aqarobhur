import { NextResponse } from 'next/server';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_RETENTION_DAYS = 8;

const KNOWN_NEIGHBORHOODS = [
  'الياقوت', 'الشراع', 'الصواري', 'اللؤلؤ', 'اللؤلؤة', 'الزمرد', 'الفنار', 'الشويصي',
  'أبحر الشمالية', 'البحيرات', 'الخليج', 'جوهرة العروس', 'الدرة', 'النجمة', 'اليسر',
  'الشاطئ الذهبي', 'البندر', 'المروج', 'الموسى', 'العبير', 'الفرقان', 'الجزيرة',
];

const FOLLOWUP_ONLY = ['مباشر', 'أكد', 'اكّد', 'هذا نفسه', 'موجود', 'أرسل', 'تم', 'تمت', 'عندك شي', 'فيه', 'اوك', 'تمام'];
const IGNORE_PATTERNS = [/انضم/, /غادر/, /تم إنشاء/, /‎<Media omitted>/i, /السلام عليكم$/, /^هلا$/, /^مرحبا$/, /^صباح الخير$/];

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
    const heuristicItems = grouped.map((group) =>
      classifyGroupHeuristic(group, payload, conversationTitle, { retentionDays, now })
    );

    let finalItems = heuristicItems;
    let aiSummary = '';

    if (process.env.OPENAI_API_KEY) {
      try {
        const aiResult = await analyzeWithOpenAI({ grouped, payload, conversationTitle, retentionDays });
        if (Array.isArray(aiResult?.items) && aiResult.items.length) {
          finalItems = mergeAiWithHeuristic(
            aiResult.items,
            heuristicItems,
            payload,
            conversationTitle,
            { retentionDays, now }
          );
        }
        aiSummary = String(aiResult?.summary || '').trim();
      } catch (err) {
        console.error('AI Analysis failed, falling back to heuristics:', err);
      }
    }

    const stats = buildStats(grouped, finalItems);
    const summary = aiSummary || buildFallbackSummary(stats, conversationTitle);

    return NextResponse.json({
      parsedText: grouped.map((group) => group.text).join('\n\n'),
      summary,
      stats,
      retentionDays,
      items: finalItems,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'تعذر تحليل المحتوى.' }, { status: 500 });
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
  const headerRegex = /^\s*(?:\[)?[‎‏‪-‮﻿\s]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[،,]?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م|صباحًا|مساءً)?)\s*(?:\])?\s*(?:-|–|—)?\s*([^:]+):\s?(.*)$/u;
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

  const oneToOneChat = uniqueSenders.length > 0 && uniqueSenders.length <= 2 && !!likelyExternalSender;
  const groups = [];
  let current = null;

  for (const msg of messages) {
    const isFromMe = oneToOneChat ? msg.sender !== likelyExternalSender : false;

    if (!current || current.sender !== msg.sender || current.isFromMe !== isFromMe || current.messages.length >= 6) {
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

function classifyGroupHeuristic(group, payload, conversationTitle, options) {
  const text = normalizeText(group.text);
  const source = buildSourceFromGroup(group, payload, conversationTitle);
  const timeMeta = buildTimeMeta(group, options);

  if (!text || IGNORE_PATTERNS.some((pattern) => pattern.test(text)) || isPureFollowup(text)) {
    return withMeta(makeIgnored(group, source, 'رسالة عامة أو متابعة قصيرة لا تستحق الحفظ.'), timeMeta);
  }

  const propertyType = extractPropertyType(text);
  const dealType = extractDealType(text);
  const neighborhood = extractNeighborhood(text);
  const part = extractPart(text);
  const plan = extractPlan(text);
  const area = extractArea(text);
  const price = extractPrice(text);
  const phone = extractPhone(text) || source.contactPhone;
  const direct = /مباشر|مباشرة|مباشر من المالك|زبون مباشر|المالك/.test(text);

  const hasStrongListingWords = /للبيع|للايجار|للإيجار|أرض للبيع|فيلا للبيع|عمارة للبيع|شقة للبيع|شقة للإيجار|للبيع في|مباشر من المالك|مباشرة من المالك|وكيل إفراغ|صك|شارع\s*\d+|رقم\s*\d+/i.test(text);
  const hasRequestWords = /(?:^|\s)(?:مطلوب|ابحث|أبحث|ابغى|أبغى|احتاج|أحتاج)(?:\s|$)|زبون|عميل/i.test(text);
  const requestLike = hasRequestWords && !hasStrongListingWords;

  const listingLike = hasStrongListingWords || (/بيع|إيجار|ايجار/.test(text) && !!(propertyType || neighborhood || part || plan || price || area));
  const hasLocation = !!(neighborhood || part || plan);
  const hasCore = !!(price || area || propertyType);

  if (group.isFromMe) {
    return withMeta({
      recordType: 'ignored',
      extractionStatus: 'ignored',
      confidence: 0.9,
      summary: `رسالة صادرة منك إلى ${source.contactName || group.sender || 'الطرف الآخر'}`,
      rawText: group.text,
      reason: 'الرسائل الصادرة منك لا تُحفظ تلقائيًا كعروض واردة.',
      source,
      groupMeta: { sender: group.sender, isFromMe: true, messagesCount: group.messages.length },
    }, timeMeta);
  }

  if (requestLike && (hasLocation || propertyType || price || area)) {
    const confidence = scoreConfidence({ propertyType, hasLocation, price, area, phone, direct, text, kind: 'request' });
    const request = {
      dealType: dealType || 'sale',
      propertyType: propertyType || '',
      neighborhood: neighborhood || '',
      plan: plan || '',
      part: part || '',
      budgetMax: price || null,
      areaMin: area || null,
      areaMax: area || null,
      directClient: /زبون مباشر|عميل مباشر/.test(text),
      name: source.contactName,
      phone,
      note: text.slice(0, 1200),
      rawText: group.text,
    };

    return withMeta({
      recordType: 'request',
      extractionStatus: confidence >= 0.74 ? 'auto_saved' : 'needs_review',
      confidence,
      summary: buildRequestSummary(request),
      request,
      rawText: group.text,
      reason: confidence >= 0.83 ? 'طلب واضح بموقع أو نوع عقار مع ميزانية/وصف كافٍ.' : 'يبدو طلبًا لكنه يحتاج مراجعة قبل الحفظ النهائي.',
      source,
      groupMeta: { sender: group.sender, isFromMe: false, messagesCount: group.messages.length },
    }, {
      ...timeMeta,
      duplicateKey: buildDuplicateKey({ recordType: 'request', request, source }),
    });
  }

  if (listingLike && hasCore && (hasLocation || propertyType)) {
    const confidence = scoreConfidence({ propertyType, hasLocation, price, area, phone, direct, text, kind: 'listing' });
    const listing = {
      title: buildListingTitle(propertyType, neighborhood, part),
      dealType: dealType || 'sale',
      propertyType: propertyType || 'أرض',
      neighborhood: neighborhood || '',
      plan: plan || '',
      part: part || '',
      area: area || null,
      price: price || null,
      direct,
      description: text.slice(0, 1200),
      rawText: group.text,
    };

    const expiredStatus = timeMeta.isFresh ? null : 'expired';

    return withMeta({
      recordType: 'listing',
      extractionStatus: expiredStatus || (confidence >= 0.74 ? 'auto_saved' : 'needs_review'),
      confidence,
      summary: buildListingSummary(listing),
      listing,
      rawText: group.text,
      reason: !timeMeta.isFresh
        ? `العرض أقدم من ${timeMeta.retentionDays} أيام، لذلك لن يُرفع تلقائيًا للمنصة.`
        : confidence >= 0.83
          ? 'عرض واضح فيه نوع عقار وموقع مع مواصفات كافية.'
          : 'عرض محتمل لكنه غير مكتمل أو يحتاج مراجعة.',
      source: { ...source, contactPhone: phone || source.contactPhone },
      groupMeta: { sender: group.sender, isFromMe: false, messagesCount: group.messages.length },
    }, {
      ...timeMeta,
      duplicateKey: buildDuplicateKey({ recordType: 'listing', listing, source: { ...source, contactPhone: phone || source.contactPhone } }),
    });
  }

  if (propertyType || hasLocation || price || area) {
    return withMeta({
      recordType: requestLike ? 'request' : 'listing',
      extractionStatus: 'needs_review',
      confidence: 0.56,
      summary: `سجل محتمل من ${source.contactName} يحتاج تأكيدًا قبل الحفظ النهائي.`,
      listing: requestLike ? null : {
        title: buildListingTitle(propertyType, neighborhood, part),
        dealType: dealType || 'sale',
        propertyType: propertyType || '',
        neighborhood: neighborhood || '',
        plan: plan || '',
        part: part || '',
        area: area || null,
        price: price || null,
        direct,
        description: text.slice(0, 1200),
      },
      request: requestLike ? {
        dealType: dealType || 'sale',
        propertyType: propertyType || '',
        neighborhood: neighborhood || '',
        plan: plan || '',
        part: part || '',
        budgetMax: price || null,
        areaMin: area || null,
        areaMax: area || null,
        name: source.contactName,
        phone,
        note: text.slice(0, 1200),
      } : null,
      rawText: group.text,
      reason: 'المحتوى له صلة عقارية لكنه غير واضح بما يكفي للحفظ التلقائي.',
      source: { ...source, contactPhone: phone || source.contactPhone },
      groupMeta: { sender: group.sender, isFromMe: false, messagesCount: group.messages.length },
    }, {
      ...timeMeta,
      duplicateKey: buildDuplicateKey({
        recordType: requestLike ? 'request' : 'listing',
        listing: requestLike ? null : {
          propertyType: propertyType || '',
          neighborhood: neighborhood || '',
          plan: plan || '',
          part: part || '',
          area: area || null,
          price: price || null,
        },
        request: requestLike ? {
          propertyType: propertyType || '',
          neighborhood: neighborhood || '',
          plan: plan || '',
          part: part || '',
          budgetMax: price || null,
          areaMin: area || null,
          areaMax: area || null,
          phone,
        } : null,
        source: { ...source, contactPhone: phone || source.contactPhone },
      }),
    });
  }

  return withMeta(makeIgnored(group, source, 'المحتوى ليس عرضًا أو طلبًا واضحًا.'), timeMeta);
}

function buildSourceFromGroup(group, payload, conversationTitle) {
  const fallbackName = group.sender || payload?.source?.contactName || conversationTitle || 'مسوق';
  return {
    sourceType: String(payload?.sourceType || payload?.source?.sourceType || 'الوارد الذكي').trim(),
    contactName: fallbackName.trim() || 'مسوق',
    contactPhone: extractPhone(group.text) || String(payload?.source?.contactPhone || '').trim(),
    contactRole: String(payload?.source?.contactRole || '').trim() || 'مسوق',
  };
}

function buildTimeMeta(group, options = {}) {
  const retentionDays = resolveRetentionDays({ retentionDays: options?.retentionDays });
  const now = options?.now instanceof Date ? options.now : new Date();

  const messageDate = group?.messageDate instanceof Date && !Number.isNaN(group.messageDate.getTime())
    ? group.messageDate
    : null;

  const expiresAt = messageDate ? addDays(messageDate, retentionDays) : null;
  const isFresh = expiresAt ? expiresAt.getTime() >= now.getTime() : true;

  return {
    retentionDays,
    messageDate: messageDate ? messageDate.toISOString() : '',
    expiresAt: expiresAt ? expiresAt.toISOString() : '',
    publishedAt: '',
    isFresh,
    ageDays: messageDate ? diffDays(messageDate, now) : null,
    sourceHash: hashString(normalizeFingerprintText(group?.text || '')),
    duplicateKey: '',
  };
}

function withMeta(item, meta = {}) {
  return {
    ...item,
    retentionDays: meta.retentionDays ?? DEFAULT_RETENTION_DAYS,
    messageDate: meta.messageDate || '',
    expiresAt: meta.expiresAt || '',
    publishedAt: meta.publishedAt || '',
    isFresh: typeof meta.isFresh === 'boolean' ? meta.isFresh : true,
    ageDays: Number.isFinite(meta.ageDays) ? meta.ageDays : null,
    sourceHash: String(meta.sourceHash || ''),
    duplicateKey: String(meta.duplicateKey || ''),
  };
}

function mergeAiWithHeuristic(aiItems, heuristicItems, payload, conversationTitle, options = {}) {
  return aiItems.map((item, index) => {
    const base = heuristicItems[index] || heuristicItems.find((candidate) => candidate.rawText === item.rawText) || {};
    const source = {
      ...base.source,
      ...buildSourceFromGroup(
        { sender: item.sender || base.groupMeta?.sender || '', text: item.rawText || base.rawText || '' },
        payload,
        conversationTitle
      ),
      ...(item.source || {}),
    };

    const recordType = normalizeRecordType(item.recordType || base.recordType);
    const listing = recordType === 'request'
      ? null
      : normalizeListing({ ...(base.listing || {}), ...(item.listing || {}) });

    const req = recordType === 'request'
      ? normalizeRequest({ ...(base.request || {}), ...(item.request || {}) }, source)
      : null;

    const merged = {
      ...base,
      ...item,
      source,
      recordType,
      extractionStatus: normalizeStatus(item.extractionStatus || base.extractionStatus),
      confidence: clamp(Number(item.confidence ?? base.confidence ?? 0.55), 0, 1),
      rawText: String(item.rawText || base.rawText || '').trim(),
      summary: String(item.summary || base.summary || '').trim(),
      reason: String(item.reason || base.reason || '').trim(),
      listing,
      request: req,
      groupMeta: base.groupMeta || null,
      retentionDays: Number(item.retentionDays || base.retentionDays || options.retentionDays || DEFAULT_RETENTION_DAYS),
      messageDate: String(item.messageDate || base.messageDate || '').trim(),
      expiresAt: String(item.expiresAt || base.expiresAt || '').trim(),
      publishedAt: String(item.publishedAt || base.publishedAt || '').trim(),
      isFresh: typeof item.isFresh === 'boolean' ? item.isFresh : (typeof base.isFresh === 'boolean' ? base.isFresh : true),
      ageDays: Number.isFinite(item.ageDays) ? item.ageDays : (Number.isFinite(base.ageDays) ? base.ageDays : null),
      sourceHash: String(item.sourceHash || base.sourceHash || hashString(normalizeFingerprintText(item.rawText || base.rawText || ''))),
      duplicateKey: String(
        item.duplicateKey
        || base.duplicateKey
        || buildDuplicateKey({ recordType, listing, request: req, source })
      ),
    };

    if (merged.recordType === 'listing') {
      if (!merged.isFresh) {
        merged.extractionStatus = 'expired';
        merged.reason = merged.reason || `العرض أقدم من ${merged.retentionDays} أيام.`;
      } else if (merged.extractionStatus === 'auto_saved') {
        if (!listing.propertyType || !(listing.neighborhood || listing.part || listing.plan) || !(listing.price || listing.area)) {
          merged.extractionStatus = 'needs_review';
        }
      }
    }

    if (merged.recordType === 'request' && merged.extractionStatus === 'auto_saved') {
      if (!(req.propertyType || req.neighborhood || req.part || req.plan) || !(req.budgetMax || req.areaMin)) {
        merged.extractionStatus = 'needs_review';
      }
    }

    return merged;
  });
}

async function analyzeWithOpenAI({ grouped, payload, conversationTitle, retentionDays }) {
  const modelName = process.env.OPENAI_MODEL || MODEL;

  const body = {
    model: modelName,
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'أنت محلل وارد عقاري لمكتب "عقار أبحر" بجدة. المطلوب: تصنيف المقاطع إلى عرض أو طلب أو ignored. احفظ تلقائيًا فقط الواضح. أي غامض اجعله needs_review. إذا كان المقطع رسالة صادرة من صاحب النظام isFromMe=true فلا تحفظه كعرض وارد، بل اجعله ignored. الرسائل القصيرة مثل مباشر/أكد/موجود/تم ليست عرضًا مستقلًا. إذا كان العرض أقدم من نافذة الاحتفاظ فلا تجعله auto_saved بل expired أو needs_review. أعد JSON فقط بدون أي شرح خارجي.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          conversationTitle,
          retentionDays,
          source: payload.source || {},
          groups: grouped.map((group, index) => ({
            index,
            sender: group.sender,
            isFromMe: group.isFromMe,
            messageDate: group.messageDate instanceof Date ? group.messageDate.toISOString() : '',
            text: group.text,
          })),
          outputShape: {
            summary: 'string',
            items: [{
              recordType: 'listing | request | ignored',
              extractionStatus: 'auto_saved | needs_review | ignored | possible_duplicate | expired',
              confidence: 0.0,
              summary: 'string',
              reason: 'string',
              rawText: 'string',
              messageDate: 'ISO string',
              expiresAt: 'ISO string',
              isFresh: true,
              duplicateKey: 'string',
              source: { contactName: 'string', contactPhone: 'string', contactRole: 'string', sourceType: 'string' },
              listing: {
                title: 'string',
                dealType: 'sale|rent',
                propertyType: 'string',
                neighborhood: 'string',
                plan: 'string',
                part: 'string',
                area: 0,
                price: 0,
                direct: true,
                description: 'string'
              },
              request: {
                dealType: 'sale|rent',
                propertyType: 'string',
                neighborhood: 'string',
                plan: 'string',
                part: 'string',
                budgetMax: 0,
                areaMin: 0,
                areaMax: 0,
                directClient: true,
                name: 'string',
                phone: 'string',
                note: 'string'
              },
            }],
          },
        }),
      }
    ]
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('OpenAI Error Details:', errData);
    throw new Error('فشل استدعاء OpenAI.');
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '{}';

  const parsed = safeParseJson(text);
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('لم أستطع قراءة نتيجة OpenAI كـ JSON.');
  }

  return parsed;
}

function normalizeListing(listing = {}) {
  return {
    title: String(listing.title || '').trim(),
    dealType: String(listing.dealType || 'sale').trim(),
    propertyType: String(listing.propertyType || '').trim(),
    neighborhood: String(listing.neighborhood || '').trim(),
    plan: String(listing.plan || '').trim(),
    part: String(listing.part || '').trim(),
    area: toNullableNumber(listing.area),
    price: toNullableNumber(listing.price),
    direct: !!listing.direct,
    description: String(listing.description || '').trim(),
  };
}

function normalizeRequest(request = {}, source = {}) {
  return {
    dealType: String(request.dealType || 'sale').trim(),
    propertyType: String(request.propertyType || '').trim(),
    neighborhood: String(request.neighborhood || '').trim(),
    plan: String(request.plan || '').trim(),
    part: String(request.part || '').trim(),
    budgetMax: toNullableNumber(request.budgetMax),
    areaMin: toNullableNumber(request.areaMin),
    areaMax: toNullableNumber(request.areaMax),
    directClient: !!request.directClient,
    name: String(request.name || source.contactName || '').trim(),
    phone: String(request.phone || source.contactPhone || '').trim(),
    note: String(request.note || '').trim(),
  };
}

function normalizeRecordType(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'request') return 'request';
  if (v === 'listing') return 'listing';
  return 'ignored';
}

function normalizeStatus(value) {
  const allowed = ['auto_saved', 'needs_review', 'ignored', 'possible_duplicate', 'expired'];
  const v = String(value || '').trim();
  return allowed.includes(v) ? v : 'needs_review';
}

function buildStats(grouped, items) {
  return {
    totalGroups: grouped.length,
    autoSavedCount: items.filter((item) => item.extractionStatus === 'auto_saved').length,
    reviewCount: items.filter((item) => item.extractionStatus === 'needs_review').length,
    ignoredCount: items.filter((item) => item.extractionStatus === 'ignored').length,
    expiredCount: items.filter((item) => item.extractionStatus === 'expired').length,
    listingCount: items.filter((item) => item.recordType === 'listing').length,
    requestCount: items.filter((item) => item.recordType === 'request').length,
    freshCount: items.filter((item) => item.recordType === 'listing' && item.isFresh).length,
  };
}

function buildFallbackSummary(stats, title) {
  const who = title ? `من ${title}` : 'من الوارد';
  return `تم تحليل ${stats.totalGroups} مقطع ${who}: ${stats.listingCount} عروض، ${stats.requestCount} طلبات، ${stats.autoSavedCount} محفوظ تلقائيًا، ${stats.reviewCount} للمراجعة، ${stats.expiredCount} منتهية.`;
}

function makeIgnored(group, source, reason) {
  return {
    recordType: 'ignored',
    extractionStatus: 'ignored',
    confidence: 0.92,
    summary: 'رسالة غير مهمة للحفظ العقاري',
    rawText: group.text,
    reason,
    source,
    groupMeta: { sender: group.sender, isFromMe: !!group.isFromMe, messagesCount: group.messages?.length || 1 },
  };
}

function scoreConfidence({ propertyType, hasLocation, price, area, phone, direct, text, kind }) {
  let score = 0.42;
  if (propertyType) score += 0.14;
  if (hasLocation) score += 0.14;
  if (price) score += 0.12;
  if (area) score += 0.08;
  if (phone) score += 0.04;
  if (direct) score += 0.03;
  if (kind === 'request' && /مطلوب|زبون|عميل/.test(text)) score += 0.08;
  if (kind === 'listing' && /للبيع|للإيجار|للايجار|مباشر من المالك|وكيل إفراغ/.test(text)) score += 0.08;
  return clamp(score, 0, 0.97);
}

function buildListingTitle(propertyType, neighborhood, part) {
  const type = propertyType || 'عرض عقاري';
  const place = [neighborhood, part].filter(Boolean).join(' ');
  return place ? `${type} ${place}` : type;
}

function buildListingSummary(listing) {
  const place = [listing.neighborhood, listing.plan, listing.part].filter(Boolean).join(' — ');
  const details = [listing.propertyType, place, listing.price ? `${listing.price}` : '', listing.area ? `${listing.area}م` : ''].filter(Boolean).join(' — ');
  return details || 'عرض عقاري واضح';
}

function buildRequestSummary(request) {
  const place = [request.neighborhood, request.plan, request.part].filter(Boolean).join(' — ');
  const details = ['طلب', request.propertyType, place, request.budgetMax ? `${request.budgetMax}` : ''].filter(Boolean).join(' — ');
  return details;
}

function buildDuplicateKey({ recordType, listing, request, source }) {
  if (recordType === 'listing') {
    const parts = [
      'listing',
      normalizeKey(listing?.dealType),
      normalizeKey(listing?.propertyType),
      normalizeKey(listing?.neighborhood),
      normalizeKey(listing?.plan),
      normalizeKey(listing?.part),
      normalizeNumeric(listing?.area),
      normalizeNumeric(listing?.price),
      normalizePhone(source?.contactPhone),
    ];
    return parts.join('|');
  }

  if (recordType === 'request') {
    const parts = [
      'request',
      normalizeKey(request?.dealType),
      normalizeKey(request?.propertyType),
      normalizeKey(request?.neighborhood),
      normalizeKey(request?.plan),
      normalizeKey(request?.part),
      normalizeNumeric(request?.budgetMax),
      normalizeNumeric(request?.areaMin),
      normalizeNumeric(request?.areaMax),
      normalizePhone(request?.phone || source?.contactPhone),
    ];
    return parts.join('|');
  }

  return '';
}

function extractPropertyType(text) {
  if (/ارض|أرض/.test(text)) return 'أرض';
  if (/فيلا|فله/.test(text)) return 'فيلا';
  if (/شقة|شقه/.test(text)) return 'شقة';
  if (/عمارة|عماره/.test(text)) return 'عمارة';
  if (/دور/.test(text)) return 'دور';
  if (/محل/.test(text)) return 'محل';
  return '';
}

function extractDealType(text) {
  if (/ايجار|إيجار|للإيجار|للايجار|سنوي/.test(text)) return 'rent';
  if (/للبيع|بيع|أرض للبيع|شقة للبيع|فيلا للبيع|عمارة للبيع/.test(text)) return 'sale';
  return '';
}

function extractNeighborhood(text) {
  return KNOWN_NEIGHBORHOODS.find((item) => text.includes(item)) || '';
}

function extractPart(text) {
  const match = text.match(/\b([12][أ-يa-zA-Z]?[^\s،,.]{0,2})\b/u);
  return match ? match[1] : '';
}

function extractPlan(text) {
  const match = text.match(/(?:مخطط|حي)\s+([^\n،.]+)/u);
  return match ? String(match[1] || '').trim().slice(0, 60) : '';
}

function extractArea(text) {
  const normalized = replaceArabicDigits(text);
  const match =
    normalized.match(/(?:مساحة|المساحة|المساحه|متر|م٢|م2|م²)\s*[:\-]?\s*(\d{2,5})/i)
    || normalized.match(/(\d{2,5})\s*(?:متر|م٢|م2|م²)/i);
  return match ? Number(match[1]) : null;
}

function extractPrice(text) {
  const normalized = replaceArabicDigits(text);
  const match = normalized.match(/(?:السعر|مطلوب|الحد|حده|حدها|الصافي|بحدود)?\s*[:\-]?\s*(\d{2,7})\s*(مليون|الف|ألف)?/i);
  if (!match) return null;

  let value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (match[2] && /مليون/.test(match[2])) value *= 1000000;
  else if (match[2] && /الف|ألف/.test(match[2])) value *= 1000;

  return value;
}

function extractPhone(text) {
  const normalized = replaceArabicDigits(text);
  const match = normalized.match(/(?:\+966|00966|966|0)?5\d{8}/);
  if (!match) return '';

  let digits = match[0].replace(/\D/g, '');
  if (digits.startsWith('966')) digits = `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith('5')) digits = `0${digits}`;

  return digits;
}

function isPureFollowup(text) {
  const clean = text.trim().replace(/\n/g, ' ');
  if (clean.length > 30) return false;
  return FOLLOWUP_ONLY.some((item) => clean === item || clean.includes(item));
}

function parseWhatsAppTimestamp(raw) {
  const clean = replaceArabicDigits(stripBidi(String(raw || '').trim()))
    .replace(/صباحًا|صباحا|صباحاً/g, 'AM')
    .replace(/مساءً|مساء|مساءا|مساءاً/g, 'PM')
    .replace(/\s+ص\b/g, ' AM')
    .replace(/\s+م\b/g, ' PM');

  const match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let day = Number(match[1]);
  let month = Number(match[2]);
  let year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  const meridiem = String(match[7] || '').toUpperCase();

  if (year < 100) year += 2000;

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

function tokenize(text) {
  return String(text || '').split(/[\s\-_/،,.]+/).map((item) => item.trim()).filter(Boolean);
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {}

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (_) {}
  }

  return null;
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

function toNullableNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
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
