'use client';

import { useRef, useState } from 'react';
import { unzipSync, strFromU8 } from 'fflate';
import { normalizeSaudiPhone } from '@/lib/contactUtils';

const MAX_CHARS_PER_BATCH = 120000;
const MAX_BATCHES = 12;
const MAX_AGE_DAYS = 30;

function toEnglishDigits(str) {
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = str;
  for (let i = 0; i < 10; i += 1) {
    result = result.replace(arabicNumbers[i], i);
  }
  return result;
}

function splitIntoBatches(rawText, maxChars = MAX_CHARS_PER_BATCH, maxBatches = MAX_BATCHES) {
  const lines = String(rawText || '').split('\n');
  const batches = [];
  let current = [];

  const pushCurrent = () => {
    const text = current.join('\n').trim();
    if (text) batches.push(text);
    current = [];
  };

  for (const line of lines) {
    const next = [...current, line];
    const nextText = next.join('\n');

    if (nextText.length > maxChars && current.length > 0) {
      pushCurrent();
      current = [line];
    } else {
      current = next;
    }

    if (batches.length >= maxBatches) break;
  }

  if (batches.length < maxBatches) {
    pushCurrent();
  }

  return batches.filter(Boolean);
}

function parseHeaderDate(line) {
  const normalized = toEnglishDigits(String(line || ''));
  const match = normalized.match(/^[\u200E\u200F\s\[]*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (!match) return null;

  let day = Number(match[1]);
  let month = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) year += 2000;
  if (year >= 1300 && year <= 1600) {
    const gregorian = islamicToGregorian(year, month, day);
    year = gregorian.year;
    month = gregorian.month;
    day = gregorian.day;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
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

function filterOldChats(rawText, maxAgeDays = MAX_AGE_DAYS) {
  const limitDate = new Date();
  limitDate.setHours(0, 0, 0, 0);
  limitDate.setDate(limitDate.getDate() - maxAgeDays);

  const lines = String(rawText || '').split('\n');
  const filteredLines = [];
  let keepCurrentMessage = true;

  for (const line of lines) {
    const msgDate = parseHeaderDate(line);
    if (msgDate) {
      keepCurrentMessage = msgDate >= limitDate;
    }

    if (keepCurrentMessage) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

function mergeStats(list = []) {
  return list.reduce(
    (acc, item) => ({
      totalGroups: acc.totalGroups + Number(item?.totalGroups || 0),
      internalReadyCount: acc.internalReadyCount + Number(item?.internalReadyCount || 0),
      reviewCount: acc.reviewCount + Number(item?.reviewCount || 0),
      ignoredCount: acc.ignoredCount + Number(item?.ignoredCount || 0),
      expiredCount: acc.expiredCount + Number(item?.expiredCount || 0),
      soldCount: acc.soldCount + Number(item?.soldCount || 0),
      listingCount: acc.listingCount + Number(item?.listingCount || 0),
      requestCount: 0,
      directCount: acc.directCount + Number(item?.directCount || 0),
    }),
    {
      totalGroups: 0,
      internalReadyCount: 0,
      reviewCount: 0,
      ignoredCount: 0,
      expiredCount: 0,
      soldCount: 0,
      listingCount: 0,
      requestCount: 0,
      directCount: 0,
    }
  );
}

export default function PasteMessageBox({ onAnalyze, loading = false }) {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    sourceType: 'نسخ ولصق',
    contactName: '',
    contactPhone: '',
    contactRole: 'مسوق',
    rawText: '',
  });

  const [localError, setLocalError] = useState('');
  const [fileInfo, setFileInfo] = useState('');
  const [filterMessage, setFilterMessage] = useState('');
  const [batchMessage, setBatchMessage] = useState('');

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze() {
    setLocalError('');
    setFilterMessage('');
    setBatchMessage('');

    if (!form.rawText.trim()) {
      setLocalError('الرجاء لصق النص أو رفع ملف أولاً.');
      return;
    }

    const originalLength = form.rawText.length;
    const filteredText = filterOldChats(form.rawText, MAX_AGE_DAYS);
    const filteredLength = filteredText.length;

    if (filteredLength < originalLength) {
      setFilterMessage('تم استبعاد الرسائل الأقدم من 30 يومًا تلقائيًا قبل المعالجة.');
    }

    if (!filteredText.trim()) {
      setLocalError('جميع المحادثات المرفقة أقدم من 30 يومًا. الرجاء رفع محادثات أحدث.');
      return;
    }

    const batches = splitIntoBatches(filteredText, MAX_CHARS_PER_BATCH, MAX_BATCHES);

    if (!batches.length) {
      setLocalError('تعذر تقسيم النص إلى دفعات صالحة للمعالجة.');
      return;
    }

    if (batches.length > 1) {
      setBatchMessage(`سيتم تحليل الملف على ${batches.length} دفعات لتفادي أخطاء الحجم وتحسين دقة الاستخراج.`);
    }

    const basePayload = {
      sourceType: form.sourceType,
      source: {
        sourceType: form.sourceType,
        contactName: form.contactName.trim(),
        contactPhone: normalizeSaudiPhone(toEnglishDigits(form.contactPhone)),
        contactRole: form.contactRole.trim() || 'مسوق',
      },
      importMode: fileInfo ? 'file' : 'paste',
      fileName: fileInfo,
      fileType: fileInfo ? (fileInfo.toLowerCase().endsWith('.zip') ? 'zip' : 'txt') : 'text',
      retentionDays: 30,
    };

    try {
      const allItems = [];
      const allStats = [];
      const parsedBlocks = [];
      const summaryLines = [];

      for (let i = 0; i < batches.length; i += 1) {
        const batchPayload = {
          ...basePayload,
          rawText: batches[i],
          batchIndex: i + 1,
          batchCount: batches.length,
        };

        const result = await onAnalyze?.(batchPayload);
        if (result) {
          if (Array.isArray(result.items)) allItems.push(...result.items);
          if (result.stats) allStats.push(result.stats);
          if (result.parsedText) parsedBlocks.push(result.parsedText);
          if (result.summary) summaryLines.push(result.summary);
        }
      }

      if (allItems.length || allStats.length || parsedBlocks.length) {
        return {
          items: allItems,
          stats: mergeStats(allStats),
          parsedText: parsedBlocks.join('\n\n'),
          summary: summaryLines.filter(Boolean).join(' | '),
        };
      }
    } catch (err) {
      setLocalError(err?.message || 'تعذر تحليل إحدى الدفعات.');
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLocalError('');
    setFilterMessage('');
    setBatchMessage('');

    try {
      if (file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        updateField('rawText', text);
        setFileInfo(file.name);
        return;
      }

      if (file.name.toLowerCase().endsWith('.zip')) {
        const buffer = await file.arrayBuffer();
        const files = unzipSync(new Uint8Array(buffer));
        const chunks = [];

        for (const [name, data] of Object.entries(files)) {
          if (name.startsWith('__MACOSX/') || name.endsWith('/')) continue;
          if (!name.toLowerCase().endsWith('.txt')) continue;
          chunks.push(`----- ${name} -----\n${strFromU8(data)}`);
        }

        if (!chunks.length) {
          throw new Error('لم يتم العثور على ملفات TXT صالحة داخل ملف ZIP.');
        }

        updateField('rawText', chunks.join('\n\n'));
        setFileInfo(file.name);
        return;
      }

      throw new Error('نوع الملف غير مدعوم. الرجاء رفع TXT أو ZIP فقط.');
    } catch (err) {
      setLocalError(err?.message || 'تعذر قراءة الملف.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div className="inputPanel">
        <div className="panelHeader">
          <div className="titleWrap">
            <span className="material-icons-outlined titleIcon">chat_paste</span>
            <div>
              <h3>إدخال المحادثات والملفات</h3>
              <p className="subtitle">
                قم بلصق محادثات الواتساب أو رفع ملفات TXT و ZIP ليتم استخراج العروض العقارية الجديدة منها فقط.
              </p>
            </div>
          </div>
        </div>

        <div className="metaGrid">
          <div className="inputGroup">
            <label>نوع المصدر</label>
            <div className="inputWithIcon">
              <span className="material-icons-outlined">device_hub</span>
              <select
                value={form.sourceType}
                onChange={(e) => updateField('sourceType', e.target.value)}
                className="inputControl"
              >
                <option>نسخ ولصق</option>
                <option>واتساب يدوي</option>
                <option>ملف ZIP</option>
                <option>ملف TXT</option>
                <option>مصدر آخر</option>
              </select>
            </div>
          </div>

          <div className="inputGroup">
            <label>اسم صاحب العرض / المجموعة</label>
            <div className="inputWithIcon">
              <span className="material-icons-outlined">person</span>
              <input
                value={form.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
                className="inputControl"
                placeholder="اسم المصدر أو القروب"
              />
            </div>
          </div>

          <div className="inputGroup">
            <label>رقم الجوال (إن وجد)</label>
            <div className="inputWithIcon">
              <span className="material-icons-outlined">phone</span>
              <input
                value={form.contactPhone}
                onChange={(e) =>
                  updateField(
                    'contactPhone',
                    toEnglishDigits(e.target.value).replace(/[^\d+]/g, '')
                  )
                }
                className="inputControl"
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
            </div>
          </div>

          <div className="inputGroup">
            <label>صفة المصدر</label>
            <div className="inputWithIcon">
              <span className="material-icons-outlined">badge</span>
              <select
                value={form.contactRole}
                onChange={(e) => updateField('contactRole', e.target.value)}
                className="inputControl"
              >
                <option>مسوق</option>
                <option>مالك</option>
                <option>مباشر من المالك</option>
                <option>مكتب</option>
                <option>وسيط</option>
              </select>
            </div>
          </div>
        </div>

        <div className="textInputArea">
          <label className="textLabel">
            النص الخام
            {fileInfo && (
              <span className="fileBadge">
                <span className="material-icons-outlined">attach_file</span>
                {fileInfo}
              </span>
            )}
          </label>

          <textarea
            value={form.rawText}
            onChange={(e) => updateField('rawText', e.target.value)}
            className="mainTextarea"
            placeholder="ألصق رسائل الواتساب أو محتوى العروض هنا... سيتم فلترة الرسائل القديمة وتقسيم النص إلى دفعات تلقائيًا."
            disabled={loading}
          />
        </div>

        {localError && (
          <div className="alertError">
            <span className="material-icons-outlined">error</span>
            {localError}
          </div>
        )}

        {filterMessage && !localError && (
          <div className="alertSuccess">
            <span className="material-icons-outlined">filter_alt</span>
            {filterMessage}
          </div>
        )}

        {batchMessage && !localError && (
          <div className="alertInfo">
            <span className="material-icons-outlined">layers</span>
            {batchMessage}
          </div>
        )}

        <div className="panelFooter">
          <button
            type="button"
            className="btnOutline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <span className="material-icons-outlined">upload_file</span>
            رفع ملف (TXT, ZIP)
          </button>

          <button
            type="button"
            className="btnPrimary"
            onClick={handleAnalyze}
            disabled={loading || !form.rawText.trim()}
          >
            {loading ? (
              <>
                <span className="material-icons-outlined spin">autorenew</span>
                جاري التحليل...
              </>
            ) : (
              <>
                <span className="material-icons-outlined">auto_awesome</span>
                استخراج وحفظ العروض
              </>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.zip"
          hidden
          onChange={handleFileChange}
        />
      </div>
    </>
  );
}
