'use client';

import { useRef, useState } from 'react';
import { unzipSync, strFromU8 } from 'fflate';
import { normalizeSaudiPhone } from '@/lib/contactUtils';

const MAX_CHARS_PER_BATCH = 120000;
const MAX_BATCHES = 12;
const RETENTION_DAYS = 30;

function toEnglishDigits(str) {
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = String(str || '');
  for (let i = 0; i < 10; i += 1) {
    result = result.replace(arabicNumbers[i], i);
  }
  return result;
}

function stripBidi(value) {
  return String(value || '').replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '');
}

function parseHeaderDate(line) {
  const normalized = toEnglishDigits(stripBidi(line));
  const match = normalized.match(/^[\s\[]*(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/);
  if (!match) return null;

  let p1 = Number(match[1]);
  let p2 = Number(match[2]);
  let p3 = Number(match[3]);
  let year;
  let month;
  let day;

  if (p1 > 1700) {
    year = p1;
    month = p2;
    day = p3;
  } else if (p3 > 1700) {
    year = p3;
    month = p2;
    day = p1;
  } else if (p1 >= 1300 && p1 < 1700) {
    ({ year, month, day } = islamicToGregorian(p1, p2, p3));
  } else if (p3 >= 1300 && p3 < 1700) {
    ({ year, month, day } = islamicToGregorian(p3, p2, p1));
  } else {
    year = p3 < 100 ? 2000 + p3 : p3;
    month = p2;
    day = p1;
  }

  const date = new Date(year, month - 1, day);
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

function filterOldChats(rawText, retentionDays = RETENTION_DAYS) {
  const limitDate = new Date();
  limitDate.setHours(0, 0, 0, 0);
  limitDate.setDate(limitDate.getDate() - retentionDays);

  const lines = String(rawText || '').split('\n');
  const filteredLines = [];
  let keepCurrentMessage = true;

  for (const line of lines) {
    const parsedDate = parseHeaderDate(line);
    if (parsedDate) {
      keepCurrentMessage = parsedDate >= limitDate;
    }

    if (keepCurrentMessage) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
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
    if (next.join('\n').length > maxChars && current.length > 0) {
      pushCurrent();
      current = [line];
    } else {
      current = next;
    }

    if (batches.length >= maxBatches) break;
  }

  if (batches.length < maxBatches) pushCurrent();
  return batches.filter(Boolean);
}

function mergeStats(list = []) {
  return list.reduce(
    (acc, item) => ({
      totalGroups: acc.totalGroups + Number(item?.totalGroups || 0),
      autoSavedCount: acc.autoSavedCount + Number(item?.autoSavedCount || 0),
      internalReadyCount: acc.internalReadyCount + Number(item?.internalReadyCount || 0),
      reviewCount: acc.reviewCount + Number(item?.reviewCount || 0),
      ignoredCount: acc.ignoredCount + Number(item?.ignoredCount || 0),
      expiredCount: acc.expiredCount + Number(item?.expiredCount || 0),
      soldCount: acc.soldCount + Number(item?.soldCount || 0),
      listingCount: acc.listingCount + Number(item?.listingCount || 0),
      requestCount: acc.requestCount + Number(item?.requestCount || 0),
      directCount: acc.directCount + Number(item?.directCount || 0),
    }),
    {
      totalGroups: 0,
      autoSavedCount: 0,
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
    const filteredText = filterOldChats(form.rawText, RETENTION_DAYS);
    const filteredLength = filteredText.length;

    if (filteredLength < originalLength) {
      setFilterMessage(`تم استبعاد الرسائل الأقدم من ${RETENTION_DAYS} يومًا تلقائيًا قبل التحليل.`);
    }

    if (!filteredText.trim()) {
      setLocalError(`كل النصوص المرفوعة أقدم من ${RETENTION_DAYS} يومًا، الرجاء رفع محادثات أحدث.`);
      return;
    }

    const batches = splitIntoBatches(filteredText, MAX_CHARS_PER_BATCH, MAX_BATCHES);
    if (!batches.length) {
      setLocalError('تعذر تقسيم النص إلى دفعات صالحة للمعالجة.');
      return;
    }

    if (batches.length > 1) {
      setBatchMessage(`سيتم تحليل الملف على ${batches.length} دفعات لتفادي الحجم الكبير وتحسين دقة فصل العروض.`);
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
      retentionDays: RETENTION_DAYS,
    };

    try {
      const allItems = [];
      const allStats = [];
      const parsedBlocks = [];
      const summaryLines = [];

      for (let i = 0; i < batches.length; i += 1) {
        const result = await onAnalyze?.({
          ...basePayload,
          rawText: batches[i],
          batchIndex: i + 1,
          batchCount: batches.length,
        });

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

      setLocalError('لم يتم العثور على عروض قابلة للحفظ في النص المرفوع.');
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
        updateField('rawText', await file.text());
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
                ألصق محادثات الواتساب أو ارفع ملفات TXT و ZIP، وسيقوم OpenAI بتقسيم الرسائل متعددة
                العروض واستخراج العروض العقارية الجديدة فقط خلال آخر {RETENTION_DAYS} يومًا.
              </p>
            </div>
          </div>
        </div>

        <div className="metaGrid">
          <div className="inputGroup">
            <label>نوع المصدر</label>
            <div className="inputWithIcon">
              <span className="material-icons-outlined">device_hub</span>
              <select value={form.sourceType} onChange={(e) => updateField('sourceType', e.target.value)} className="inputControl">
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
              <input value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} className="inputControl" placeholder="اسم المصدر أو القروب" />
            </div>
          </div>

          <div className="inputGroup">
            <label>رقم الجوال (إن وجد)</label>
            <div className="inputWithIcon">
              <span className="material-icons-outlined">phone</span>
              <input
                value={form.contactPhone}
                onChange={(e) => updateField('contactPhone', toEnglishDigits(e.target.value).replace(/[^\d+]/g, ''))}
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
              <select value={form.contactRole} onChange={(e) => updateField('contactRole', e.target.value)} className="inputControl">
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
            placeholder="ألصق رسائل الواتساب هنا... سيتم استبعاد القديم، ثم فصل الرسائل متعددة العروض واستخراج العروض الصالحة للحفظ الداخلي."
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
          <button type="button" className="btnOutline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            <span className="material-icons-outlined">upload_file</span>
            رفع ملف (TXT, ZIP)
          </button>

          <button type="button" className="btnPrimary" onClick={handleAnalyze} disabled={loading || !form.rawText.trim()}>
            {loading ? (
              <>
                <span className="material-icons-outlined spin">autorenew</span>
                جاري التحليل...
              </>
            ) : (
              <>
                <span className="material-icons-outlined">auto_awesome</span>
                استخراج العروض الداخلية
              </>
            )}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept=".txt,.zip" hidden onChange={handleFileChange} />
      </div>

      <style jsx>{`
        .inputPanel {
          background: white;
          border-radius: 16px;
          padding: 20px 25px;
          border: 1px solid #edf2f7;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
          margin-bottom: 25px;
        }
        .panelHeader { margin-bottom: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 15px; }
        .titleWrap { display: flex; align-items: flex-start; gap: 12px; }
        .titleIcon { color: var(--primary); background: rgba(15, 118, 110, 0.1); padding: 10px; border-radius: 12px; font-size: 24px; }
        .titleWrap h3 { margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: #1a202c; }
        .subtitle { margin: 0; color: #718096; font-size: 14px; line-height: 1.7; }
        .metaGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .inputGroup label { display: block; margin-bottom: 6px; color: #4a5568; font-size: 13px; font-weight: 700; }
        .inputWithIcon { position: relative; display: flex; align-items: center; }
        .inputWithIcon .material-icons-outlined { position: absolute; right: 12px; color: #a0aec0; font-size: 18px; pointer-events: none; }
        .inputControl { width: 100%; padding: 10px 40px 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 14px; color: #2d3748; background: #fcfcfd; transition: all 0.2s; }
        .inputControl:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); background: white; }
        select.inputControl { appearance: none; background-repeat: no-repeat; background-position: left 12px center; background-size: 10px auto; padding-left: 30px; }
        .textInputArea { margin-bottom: 20px; }
        .textLabel { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: #4a5568; font-size: 14px; font-weight: 700; }
        .fileBadge { display: inline-flex; align-items: center; gap: 4px; background: rgba(15, 118, 110, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .mainTextarea { width: 100%; min-height: 220px; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.8; color: #2d3748; background: #fcfcfd; transition: all 0.2s; }
        .mainTextarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); background: white; }
        .mainTextarea:disabled { background: #f7fafc; color: #a0aec0; cursor: not-allowed; }
        .panelFooter { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding-top: 15px; border-top: 1px solid #edf2f7; }
        .btnOutline { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e0; background: white; color: #4a5568; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btnOutline:hover:not(:disabled) { background: #f7fafc; color: #1a202c; border-color: #a0aec0; }
        .btnPrimary { display: inline-flex; align-items: center; gap: 6px; padding: 12px 24px; border-radius: 10px; border: none; background: #1a202c; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .btnPrimary:hover:not(:disabled) { background: #2d3748; }
        .btnPrimary:disabled, .btnOutline:disabled { opacity: 0.6; cursor: not-allowed; }
        .alertError, .alertSuccess, .alertInfo { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; margin-bottom: 15px; }
        .alertError { color: #c53030; background: #fff5f5; border: 1px solid #fed7d7; }
        .alertSuccess { color: #0f766e; background: #f0fdfa; border: 1px solid #ccfbf1; }
        .alertInfo { color: #1e40af; background: #eff6ff; border: 1px solid #bfdbfe; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
