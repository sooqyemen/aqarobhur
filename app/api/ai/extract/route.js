import { NextResponse } from 'next/server';
import { NEIGHBORHOODS, normalizeNeighborhoodName } from '@/lib/taxonomy';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_RETENTION_DAYS = 15;

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
  /‎<Media omitted>/i,
  /تم حذف هذه الرسالة/,
  /السلام عليكم$/,
  /^هلا$/,
  /^مرحبا$/,
  /^صباح الخير$/,
];

const SOLD_PATTERNS = [
  /تم البيع/,
  /انباع/,
  /مباع/,
  /مبيوع/,
  /محجوز/,
  /تم التأجير/,
  /اتأجر/,
  /تأجر/,
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

    const heuristicItems = grouped.map((group) =>
      classifyGroupHeuristic(group, payload, conversationTitle, { retentionDays, now, grouped })
    );

    let finalItems = heuristicItems;
    let aiSummary = '';

    if (process.env.OPENAI_API_KEY) {
      try {
        const aiResult = await analyzeWithOpenAI({
          grouped,
          payload,
          conversationTitle,
          retentionDays,
        });

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

function classifyGroupHeuristic(group, payload, conversationTitle, options) {
  const text = normalizeText(group.text);
  const source = buildSourceFromGroup(group, payload, conversationTitle, options?.grouped || []);
  const timeMeta = buildTimeMeta(group, options);

  if (!text || IGNORE_PATTERNS.some((pattern) => pattern.test(text)) || isPureFollowup(text)) {
    return withMeta(makeIgnored(group, source, 'رسالة عامة أو متابعة قصيرة لا تستحق الحفظ.'), timeMeta);
  }

  const propertyType = extractPropertyType(text);
  const dealType = extractDealType(text);
  const neighborhood = extractNeighborhood(text);
  const schemeName = extractSchemeName(text);
  const part = extractPart(text);
  const plotNumber = extractPlotNumber(text);
  const area = extractArea(text);
  const price = extractPrice(text);
  const streetDetails = extractStreetDetails(text);
  const phone = extractPhone(text) || source.contactPhone || extractPhoneFromNearbyGroups(group, options?.grouped || []);
  const direct = isDirectOffer(text) || /وكيل حصري|حصري/.test(text);
  const soldLike = SOLD_PATTERNS.some((pattern) => pattern.test(text));
  const exclusiveAgent = /وكيل حصري|حصري/.test(text);

  const hasStrongListingWords =
    /للبيع|للايجار|للإيجار|أرض للبيع|فيلا للبيع|عمارة للبيع|شقة للبيع|شقة للإيجار|للبيع في|مباشر من المالك|مباشرة من المالك|وكيل إفراغ|صك|شارع\s*\d+|رقم\s*\d+/i.test(text);

  const hasRequestWords =
    /(?:^|\s)(?:مطلوب|ابحث|أبحث|ابغى|أبغى|احتاج|أحتاج)(?:\s|$)|زبون|عميل/i.test(text);

  const requestLike = hasRequestWords && !hasStrongListingWords;
  const listingLike =
    hasStrongListingWords ||
    (/بيع|إيجار|ايجار/.test(text) && !!(propertyType || neighborhood || part || schemeName || price || area));

  const hasLocation = !!(neighborhood || part || schemeName || plotNumber);
  const hasCore = !!(price || area || propertyType);

  if (group.isFromMe) {
    return withMeta({
      recordType: 'ignored',
      extractionStatus: 'ignored',
      confidence: 0.9,
      priorityScore: 0,
      summary: `رسالة صادرة منك إلى ${source.contactName || group.sender || 'الطرف الآخر'}`,
      rawText: group.text,
      reason: 'الرسائل الصادرة منك لا تُحفظ كعروض أو طلبات واردة.',
      source,
      groupMeta: { sender: group.sender, isFromMe: true, messagesCount: group.messages.length },
    }, timeMeta);
  }

  if (requestLike && (hasLocation || propertyType || price || area)) {
    const requestBudget = inferRequestBudget(text);
    const requestArea = inferRequestArea(text, propertyType);

    const confidence = scoreConfidence({
      propertyType,
      hasLocation,
      price: requestBudget,
      area: requestArea,
      phone,
      direct,
      text,
      kind: 'request',
    });

    const request = {
      dealType: dealType || 'sale',
      propertyType: propertyType || '',
      neighborhood: neighborhood || '',
      plan: schemeName || '',
      part: part || '',
      budgetMax: requestBudget || null,
      areaMin: requestArea || null,
      areaMax: requestArea || null,
      directClient: /زبون مباشر|عميل مباشر/.test(text),
      name: source.contactName,
      phone,
      note: buildRequestNote(text, schemeName, plotNumber, streetDetails, exclusiveAgent),
      rawText: group.text,
      plotNumber: plotNumber || '',
      schemeName: schemeName || '',
      streetDetails,
    };

    return withMeta({
      recordType: 'request',
      extractionStatus: confidence >= 0.74 ? 'internal_ready' : 'needs_review',
      confidence,
      priorityScore: buildPriorityScore({ direct: false, confidence, soldLike: false }),
      summary: buildRequestSummary(request),
      request,
      rawText: group.text,
      reason:
        confidence >= 0.83
          ? 'طلب واضح بموقع أو نوع عقار مع مساحة أو ميزانية أو وصف كافٍ.'
          : 'يبدو طلبًا لكنه يحتاج مراجعة قبل الاعتماد الداخلي.',
      source,
      groupMeta: { sender: group.sender, isFromMe: false, messagesCount: group.messages.length },
    }, {
      ...timeMeta,
      duplicateKey: buildDuplicateKey({ recordType: 'request', request, source }),
    });
  }

  if (listingLike && hasCore && (hasLocation || propertyType)) {
    let confidence = scoreConfidence({
      propertyType,
      hasLocation,
      price,
      area,
      phone,
      direct,
      text,
      kind: 'listing',
    });

    if (direct) confidence = clamp(confidence + 0.08, 0, 0.99);

    const listing = {
      title: buildListingTitle(propertyType, neighborhood, part, schemeName),
      dealType: dealType || 'sale',
      propertyType: propertyType || 'أرض',
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
      rawText: group.text,
    };

    let extractionStatus = confidence >= 0.74 ? 'internal_ready' : 'needs_review';
    let reason =
      confidence >= 0.83
        ? 'عرض واضح داخليًا فيه نوع عقار وموقع ومواصفات كافية.'
        : 'عرض محتمل لكنه يحتاج مراجعة داخلية قبل الاعتماد.';

    if (!timeMeta.isFresh) {
      extractionStatus = 'expired';
      reason = `العرض أقدم من ${timeMeta.retentionDays} يومًا، وسيبقى داخليًا فقط دون استخدام نشط.`;
    }

    if (soldLike) {
      extractionStatus = 'sold';
      reason = 'يبدو من الرسالة أن العرض مباع أو محجوز أو لم يعد متاحًا.';
    }

    return withMeta({
      recordType: 'listing',
      extractionStatus,
      confidence,
      priorityScore: buildPriorityScore({ direct, confidence, soldLike }),
      summary: buildListingSummary(listing),
      listing,
      rawText: group.text,
      reason,
      source: { ...source, contactPhone: phone || source.contactPhone },
      groupMeta: { sender: group.sender, isFromMe: false, messagesCount: group.messages.length },
    }, {
      ...timeMeta,
      duplicateKey: buildDuplicateKey({
        recordType: 'listing',
        listing,
        source: { ...source, contactPhone: phone || source.contactPhone },
      }),
    });
  }

  if (propertyType || hasLocation || price || area) {
    const requestBudget = inferRequestBudget(text);
    const requestArea = inferRequestArea(text, propertyType);

    return withMeta({
      recordType: requestLike ? 'request' : 'listing',
      extractionStatus: 'needs_review',
      confidence: 0.56,
      priorityScore: buildPriorityScore({ direct, confidence: 0.56, soldLike }),
      summary: `سجل محتمل من ${source.contactName} يحتاج تأكيدًا قبل الحفظ الداخلي.`,
      listing: requestLike ? null : {
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
      },
      request: requestLike ? {
        dealType: dealType || 'sale',
        propertyType: propertyType || '',
        neighborhood: neighborhood || '',
        plan: schemeName || '',
        part: part || '',
        budgetMax: requestBudget || null,
        areaMin: requestArea || null,
        areaMax: requestArea || null,
        name: source.contactName,
        phone,
        note: buildRequestNote(text, schemeName, plotNumber, streetDetails, exclusiveAgent),
        plotNumber: plotNumber || '',
        schemeName: schemeName || '',
        streetDetails,
      } : null,
      rawText: group.text,
      reason: soldLike
        ? 'هذه الرسالة مرتبطة بعرض غير نشط أو مباع وتحتاج مراجعة.'
        : 'المحتوى له صلة عقارية لكنه غير واضح بما يكفي للاعتماد الداخلي.',
      source: { ...source, contactPhone: phone || source.contactPhone },
      groupMeta: { sender: group.sender, isFromMe: false, messagesCount: group.messages.length },
    }, {
      ...timeMeta,
      duplicateKey: buildDuplicateKey({
        recordType: requestLike ? 'request' : 'listing',
        listing: requestLike ? null : {
          propertyType: propertyType || '',
          neighborhood: neighborhood || '',
          plan: schemeName || '',
          part: part || '',
          area: area || null,
          price: price || null,
          direct,
          plotNumber: plotNumber || '',
        },
        request: requestLike ? {
          propertyType: propertyType || '',
          neighborhood: neighborhood || '',
          plan: schemeName || '',
          part: part || '',
          budgetMax: requestBudget || null,
          areaMin: requestArea || null,
          areaMax: requestArea || null,
          phone,
          plotNumber: plotNumber || '',
        } : null,
        source: { ...source, contactPhone: phone || source.contactPhone },
      }),
    });
  }

  return withMeta(makeIgnored(group, source, 'المحتوى ليس عرضًا أو طلبًا واضحًا.'), timeMeta);
}

function buildSourceFromGroup(group, payload, conversationTitle, grouped = []) {
  const fallbackName = group.sender || payload?.source?.contactName || conversationTitle || 'مسوق';
  const fallbackPhone =
    extractPhone(group.text) ||
    String(payload?.source?.contactPhone || '').trim() ||
    extractPhoneFromNearbyGroups(group, grouped);

  return {
    sourceType: String(payload?.sourceType || payload?.source?.sourceType || 'الوارد الذكي').trim(),
    contactName: fallbackName.trim() || 'مسوق',
    contactPhone: fallbackPhone,
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
    const base =
      heuristicItems[index] ||
      heuristicItems.find((candidate) => candidate.rawText === item.rawText) ||
      {};

    const source = {
      ...base.source,
      ...buildSourceFromGroup(
        { sender: item.sender || base.groupMeta?.sender || '', text: item.rawText || base.rawText || '' },
        payload,
        conversationTitle,
        []
      ),
      ...(item.source || {}),
    };

    const recordType = normalizeRecordType(item.recordType || base.recordType);
    const listing =
      recordType === 'request'
        ? null
        : normalizeListing({ ...(base.listing || {}), ...(item.listing || {}) });

    const req =
      recordType === 'request'
        ? normalizeRequest({ ...(base.request || {}), ...(item.request || {}) }, source)
        : null;

    const merged = {
      ...base,
      ...item,
      source,
      recordType,
      extractionStatus: normalizeStatus(item.extractionStatus || base.extractionStatus),
      confidence: clamp(Number(item.confidence ?? base.confidence ?? 0.55), 0, 1),
      priorityScore: Number(item.priorityScore ?? base.priorityScore ?? 0),
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
      isFresh:
        typeof item.isFresh === 'boolean'
          ? item.isFresh
          : (typeof base.isFresh === 'boolean' ? base.isFresh : true),
      ageDays:
        Number.isFinite(item.ageDays)
          ? item.ageDays
          : (Number.isFinite(base.ageDays) ? base.ageDays : null),
      sourceHash: String(
        item.sourceHash ||
        base.sourceHash ||
        hashString(normalizeFingerprintText(item.rawText || base.rawText || ''))
      ),
      duplicateKey: String(
        item.duplicateKey ||
        base.duplicateKey ||
        buildDuplicateKey({ recordType, listing, request: req, source })
      ),
    };

    if (merged.recordType === 'listing') {
      const soldLike = SOLD_PATTERNS.some((pattern) => pattern.test(normalizeText(merged.rawText)));

      if (soldLike) {
        merged.extractionStatus = 'sold';
        merged.reason = merged.reason || 'يبدو أن العرض مباع أو محجوز.';
      } else if (!merged.isFresh) {
        merged.extractionStatus = 'expired';
        merged.reason = merged.reason || `العرض أقدم من ${merged.retentionDays} يومًا.`;
      } else if (merged.extractionStatus === 'internal_ready') {
        if (!listing.propertyType || !(listing.neighborhood || listing.part || listing.plan) || !(listing.price || listing.area)) {
          merged.extractionStatus = 'needs_review';
        }
      }

      merged.priorityScore = buildPriorityScore({
        direct: !!listing?.direct,
        confidence: merged.confidence,
        soldLike: merged.extractionStatus === 'sold',
      });
    }

    if (merged.recordType === 'request' && merged.extractionStatus === 'internal_ready') {
      if (!(req.propertyType || req.neighborhood || req.part || req.plan) || !(req.budgetMax || req.areaMin)) {
        merged.extractionStatus = 'needs_review';
      }
      merged.priorityScore = buildPriorityScore({
        direct: false,
        confidence: merged.confidence,
        soldLike: false,
      });
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
          'أنت محلل وارد عقاري داخلي لمكتب "عقار أبحر" بجدة. العروض المستخرجة تحفظ داخليًا فقط في لوحة التحكم ولا تنشر للعامة. المطلوب: تصنيف المقاطع إلى listing أو request أو ignored. إذا كان العرض واضحًا اجعله internal_ready. إذا كان غامضًا اجعله needs_review. إذا كان قديمًا خارج نافذة الاحتفاظ اجعله expired. إذا كان النص يدل على أن العرض مباع أو محجوز اجعله sold. أعط أولوية أعلى للعروض التي فيها كلمة مباشر. استخرج رقم الجوال بدقة، والجزء مثل ٢و، ورقم القطعة، والمخطط، وتفاصيل الشوارع. في الطلبات لا تعتبر 900 سعرًا إذا كان السياق يدل على أنها مساحة 900 متر. أعد JSON فقط.'
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
              extractionStatus: 'internal_ready | needs_review | ignored | possible_duplicate | expired | sold',
              confidence: 0.0,
              priorityScore: 0,
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
                plotNumber: 'string',
                streetDetails: ['string'],
                area: 0,
                price: 0,
                direct: true,
                exclusiveAgent: true,
                description: 'string'
              },
              request: {
                dealType: 'sale|rent',
                propertyType: 'string',
                neighborhood: 'string',
                plan: 'string',
                part: 'string',
                plotNumber: 'string',
                streetDetails: ['string'],
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
    plotNumber: String(listing.plotNumber || '').trim(),
    streetDetails: Array.isArray(listing.streetDetails) ? listing.streetDetails.filter(Boolean) : [],
    area: toNullableNumber(listing.area),
    price: toNullableNumber(listing.price),
    direct: !!listing.direct,
    exclusiveAgent: !!listing.exclusiveAgent,
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
    plotNumber: String(request.plotNumber || '').trim(),
    streetDetails: Array.isArray(request.streetDetails) ? request.streetDetails.filter(Boolean) : [],
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
  const allowed = [
    'internal_ready',
    'needs_review',
    'ignored',
    'possible_duplicate',
    'expired',
    'sold',
  ];
  const v = String(value || '').trim();
  return allowed.includes(v) ? v : 'needs_review';
}

function buildStats(grouped, items) {
  return {
    totalGroups: grouped.length,
    internalReadyCount: items.filter((item) => item.extractionStatus === 'internal_ready').length,
    reviewCount: items.filter((item) => item.extractionStatus === 'needs_review').length,
    ignoredCount: items.filter((item) => item.extractionStatus === 'ignored').length,
    expiredCount: items.filter((item) => item.extractionStatus === 'expired').length,
    soldCount: items.filter((item) => item.extractionStatus === 'sold').length,
    listingCount: items.filter((item) => item.recordType === 'listing').length,
    requestCount: items.filter((item) => item.recordType === 'request').length,
    directCount: items.filter((item) => item.recordType === 'listing' && item.listing?.direct).length,
  };
}

function buildFallbackSummary(stats, title) {
  const who = title ? `من ${title}` : 'من الوارد';
  return `تم تحليل ${stats.totalGroups} مقطع ${who}: ${stats.listingCount} عروض، ${stats.requestCount} طلبات، ${stats.internalReadyCount} جاهزة داخليًا، ${stats.reviewCount} للمراجعة، ${stats.expiredCount} منتهية، ${stats.soldCount} مباعة أو محجوزة.`;
}

function makeIgnored(group, source, reason) {
  return {
    recordType: 'ignored',
    extractionStatus: 'ignored',
    confidence: 0.92,
    priorityScore: 0,
    summary: 'رسالة غير مهمة للحفظ العقاري',
    rawText: group.text,
    reason,
    source,
    groupMeta: {
      sender: group.sender,
      isFromMe: !!group.isFromMe,
      messagesCount: group.messages?.length || 1,
    },
  };
}

function scoreConfidence({ propertyType, hasLocation, price, area, phone, direct, text, kind }) {
  let score = 0.42;
  if (propertyType) score += 0.14;
  if (hasLocation) score += 0.14;
  if (price) score += 0.12;
  if (area) score += 0.1;
  if (phone) score += 0.08;
  if (direct) score += 0.08;
  if (kind === 'request' && /مطلوب|زبون|عميل/.test(text)) score += 0.08;
  if (kind === 'listing' && /للبيع|للإيجار|للايجار|مباشر من المالك|وكيل إفراغ|مباشر/.test(text)) score += 0.08;
  return clamp(score, 0, 0.99);
}

function buildPriorityScore({ direct, confidence, soldLike }) {
  let score = Math.round(Number(confidence || 0) * 100);
  if (direct) score += 25;
  if (soldLike) score -= 40;
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
    place,
    listing.price ? `${listing.price}` : '',
    listing.area ? `${listing.area}م` : '',
    listing.direct ? 'مباشر' : '',
  ].filter(Boolean).join(' — ');

  return details || 'عرض عقاري داخلي واضح';
}

function buildRequestSummary(request) {
  const place = [
    request.neighborhood,
    request.plan,
    request.part ? `جزء ${request.part}` : '',
    request.plotNumber ? `قطعة ${request.plotNumber}` : '',
  ].filter(Boolean).join(' — ');

  const details = [
    'طلب',
    request.propertyType,
    place,
    request.areaMin ? `${request.areaMin}م` : '',
    request.budgetMax ? `${request.budgetMax}` : '',
  ].filter(Boolean).join(' — ');

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
      normalizeKey(listing?.plotNumber),
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
      normalizeKey(request?.plotNumber),
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
  const base = String(text || '').trim();

  const candidates = [
    base,
    base.replace(/\s+/g, ' '),
    base.replace(/حي\s+/gu, ' '),
    base.replace(/منطقة\s+/gu, ' '),
  ]
    .map((item) => item.trim())
    .filter(Boolean);

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
  const match =
    text.match(/(?:رقم\s*القطعة|القطعة|قطعة)\s*[:\-]?\s*([0-9٠-٩]+)/u);

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
  const match =
    normalized.match(/(?:مساحة|المساحة|المساحه|متر|م٢|م2|م²)\s*[:\-]?\s*(\d{2,5})/i) ||
    normalized.match(/(\d{2,5})\s*(?:متر|م٢|م2|م²)/i);

  return match ? Number(match[1]) : null;
}

function extractPrice(text) {
  const normalized = replaceArabicDigits(text);
  const explicit =
    normalized.match(/(?:السعر|مطلوب|الحد|حده|حدها|الصافي|بحدود)\s*[:\-]?\s*(\d{2,7})\s*(مليون|الف|ألف)?/i);

  if (!explicit) return null;

  let value = Number(explicit[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (explicit[2] && /مليون/.test(explicit[2])) value *= 1000000;
  else if (explicit[2] && /الف|ألف/.test(explicit[2])) value *= 1000;

  return value;
}

function inferRequestBudget(text) {
  const normalized = replaceArabicDigits(text);

  const budgetMatch =
    normalized.match(/(?:ميزانية|الميزانية|حده|حدها|بحدود|سعر|بمبلغ|المبلغ)\s*[:\-]?\s*(\d{2,7})\s*(مليون|الف|ألف)?/i) ||
    normalized.match(/(\d{2,7})\s*(مليون|الف|ألف)\b/i);

  if (!budgetMatch) return null;

  let value = Number(budgetMatch[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (budgetMatch[2] && /مليون/.test(budgetMatch[2])) value *= 1000000;
  else if (budgetMatch[2] && /الف|ألف/.test(budgetMatch[2])) value *= 1000;

  return value;
}

function inferRequestArea(text, propertyType) {
  const explicitArea = extractArea(text);
  if (explicitArea) return explicitArea;

  const normalized = replaceArabicDigits(text);

  if (/مطلوب|ابغى|أبغى|احتاج|أحتاج|عميل|زبون/.test(normalized) && /ارض|أرض/.test(normalized)) {
    const standalone = normalized.match(/\b(\d{3,4})\b/);
    if (standalone) {
      const value = Number(standalone[1]);
      if (value >= 100 && value <= 5000) return value;
    }
  }

  if (String(propertyType || '') === 'أرض') {
    const standalone = normalized.match(/\b(\d{3,4})\b/);
    if (standalone) {
      const value = Number(standalone[1]);
      if (value >= 100 && value <= 5000 && !/الف|ألف|مليون/.test(normalized)) return value;
    }
  }

  return null;
}

function extractPhone(text) {
  const normalized = replaceArabicDigits(text);
  const matches = [...normalized.matchAll(/(?:\+966|00966|966|0)?5\d{8}/g)];
  if (!matches.length) return '';

  const last = matches[matches.length - 1][0];
  let digits = last.replace(/\D/g, '');

  if (digits.startsWith('966')) digits = `0${digits.slice(3)}`;
  if (digits.length === 9 && digits.startsWith('5')) digits = `0${digits}`;

  return digits;
}

function extractPhoneFromNearbyGroups(group, grouped = []) {
  const idx = grouped.findIndex((g) => g === group || g?.rawText === group?.rawText || g?.text === group?.text);
  if (idx === -1) return '';

  const start = Math.max(0, idx - 2);
  const end = Math.min(grouped.length - 1, idx + 2);

  for (let i = start; i <= end; i += 1) {
    const phone = extractPhone(grouped[i]?.text || '');
    if (phone) return phone;
  }

  return '';
}

function isDirectOffer(text) {
  return /(?:^|\s)مباشر(?:\s|$)|مباشرة|مباشر من المالك|مباشره من المالك|المالك مباشر|زبون مباشر|من المالك/u.test(text);
}

function buildListingDescription(text, streetDetails, plotNumber, schemeName, exclusiveAgent) {
  const extra = [];

  if (plotNumber) extra.push(`رقم القطعة: ${plotNumber}`);
  if (schemeName) extra.push(`المخطط: ${schemeName}`);
  if (streetDetails?.length) extra.push(`الشوارع: ${streetDetails.join(' + ')}`);
  if (exclusiveAgent) extra.push('وكيل حصري');

  return [text.slice(0, 1200), ...extra].filter(Boolean).join(' | ');
}

function buildRequestNote(text, schemeName, plotNumber, streetDetails, exclusiveAgent) {
  const extra = [];

  if (schemeName) extra.push(`المخطط: ${schemeName}`);
  if (plotNumber) extra.push(`القطعة: ${plotNumber}`);
  if (streetDetails?.length) extra.push(`الشوارع: ${streetDetails.join(' + ')}`);
  if (exclusiveAgent) extra.push('وكيل حصري');

  return [text.slice(0, 1200), ...extra].filter(Boolean).join(' | ');
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

function toWesternDigits(text) {
  return replaceArabicDigits(String(text || ''));
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
