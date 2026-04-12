'use client';

import { useRef, useState } from 'react';
import { unzipSync, strFromU8 } from 'fflate';
import { normalizeSaudiPhone } from '@/lib/contactUtils';

function toEnglishDigits(str) {
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(arabicNumbers[i], i);
  }
  return result;
}

function filterOldChats(rawText, monthsLimit = 3) {
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - monthsLimit);

  const lines = rawText.split('\n');
  const filteredLines = [];
  let keepCurrentMessage = true; 

  const dateRegex = /^[\u200E\u200F\s\[]*(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/;

  for (const line of lines) {
    const normalizedLine = toEnglishDigits(line);
    const match = normalizedLine.match(dateRegex);

    if (match) {
      let p1 = parseInt(match[1], 10);
      let p2 = parseInt(match[2], 10);
      let p3 = parseInt(match[3], 10);

      let year, month, day;

      if (p3 > 1000) { 
        year = p3;
        day = p1;
        month = p2;
        if (month > 12) {
          month = p1;
          day = p2;
        }
      } else if (p1 > 1000) {
        year = p1;
        month = p2;
        day = p3;
      }

      if (year && month && day) {
        const msgDate = new Date(year, month - 1, day);
        if (!isNaN(msgDate.getTime())) {
          keepCurrentMessage = msgDate >= limitDate;
        }
      }
    }

    if (keepCurrentMessage) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
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

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze() {
    setLocalError('');
    setFilterMessage('');
    
    if (!form.rawText.trim()) {
      setLocalError('الرجاء لصق النص أو رفع ملف أولاً.');
      return;
    }

    const originalLength = form.rawText.length;
    const filteredText = filterOldChats(form.rawText, 3);
    const filteredLength = filteredText.length;

    if (filteredLength < originalLength) {
      setFilterMessage('تم تنظيف واستبعاد المحادثات الأقدم من 3 أشهر تلقائياً.');
    }

    if (!filteredText.trim()) {
      setLocalError('جميع المحادثات المرفقة أقدم من 3 أشهر! الرجاء رفع محادثات أحدث.');
      return;
    }

    await onAnalyze?.({
      rawText: filteredText, 
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
    });
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLocalError('');
    setFilterMessage('');
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
        if (!chunks.length) throw new Error('لم يتم العثور على ملفات نصية (TXT) صالحة داخل ملف الـ ZIP.');
        updateField('rawText', chunks.join('\n\n'));
        setFileInfo(file.name);
        return;
      }
      throw new Error('نوع الملف غير مدعوم. الرجاء رفع ملفات TXT أو ZIP فقط.');
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
              <p className="subtitle">قم بلصق محادثات الواتساب أو رفع ملفات نصية ليقوم الذكاء الاصطناعي باستخراج العقارات منها.</p>
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
              <input value={form.contactPhone} onChange={(e) => updateField('contactPhone', toEnglishDigits(e.target.value).replace(/[^\d+]/g, ''))} className="inputControl" placeholder="05XXXXXXXX" dir="ltr" />
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
             {fileInfo && <span className="fileBadge"><span className="material-icons-outlined">attach_file</span> {fileInfo}</span>}
          </label>
          <textarea 
            value={form.rawText} 
            onChange={(e) => updateField('rawText', e.target.value)} 
            className="mainTextarea" 
            placeholder="ألصق رسائل الواتساب أو محتوى العروض هنا... (سيتم فلترة الرسائل الأقدم من 3 أشهر تلقائياً)" 
            disabled={loading}
          />
        </div>

        {localError && (
          <div className="alertError">
             <span className="material-icons-outlined">error</span> {localError}
          </div>
        )}
        {filterMessage && !localError && (
          <div className="alertSuccess">
             <span className="material-icons-outlined">filter_alt</span> {filterMessage}
          </div>
        )}

        <div className="panelFooter">
          <button type="button" className="btnOutline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            <span className="material-icons-outlined">upload_file</span>
            رفع ملف (TXT, ZIP)
          </button>
          
          <button type="button" className="btnPrimary" onClick={handleAnalyze} disabled={loading || !form.rawText.trim()}>
            {loading ? (
              <><span className="material-icons-outlined spin">autorenew</span> جاري التحليل...</>
            ) : (
              <><span className="material-icons-outlined">auto_awesome</span> استخراج وحفظ البيانات</>
            )}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept=".txt,.zip" hidden onChange={handleFileChange} />
      </div>

      <style jsx>{`
        .inputPanel { background: white; border-radius: 16px; padding: 20px 25px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 25px; }
        
        .panelHeader { margin-bottom: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 15px; }
        .titleWrap { display: flex; align-items: flex-start; gap: 12px; }
        .titleIcon { color: var(--primary); background: rgba(15, 118, 110, 0.1); padding: 10px; border-radius: 12px; font-size: 24px; }
        .titleWrap h3 { margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: #1a202c; }
        .subtitle { margin: 0; color: #718096; font-size: 14px; }

        .metaGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        
        .inputGroup label { display: block; margin-bottom: 6px; color: #4a5568; font-size: 13px; font-weight: 700; }
        .inputWithIcon { position: relative; display: flex; align-items: center; }
        .inputWithIcon .material-icons-outlined { position: absolute; right: 12px; color: #a0aec0; font-size: 18px; pointer-events: none; }
        
        .inputControl { width: 100%; padding: 10px 40px 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 14px; color: #2d3748; background: #fcfcfd; transition: all 0.2s; }
        .inputControl:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); background: white; }
        select.inputControl { appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A0AEC0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: left 12px center; background-size: 10px auto; padding-left: 30px; }

        .textInputArea { margin-bottom: 20px; }
        .textLabel { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: #4a5568; font-size: 14px; font-weight: 700; }
        .fileBadge { display: inline-flex; align-items: center; gap: 4px; background: rgba(15, 118, 110, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .fileBadge .material-icons-outlined { font-size: 14px; }
        
        .mainTextarea { width: 100%; min-height: 200px; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.8; color: #2d3748; background: #fcfcfd; transition: all 0.2s; }
        .mainTextarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); background: white; }
        .mainTextarea:disabled { background: #f7fafc; color: #a0aec0; cursor: not-allowed; }

        .panelFooter { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding-top: 15px; border-top: 1px solid #edf2f7; }
        
        .btnOutline { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e0; background: white; color: #4a5568; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btnOutline:hover:not(:disabled) { background: #f7fafc; color: #1a202c; border-color: #a0aec0; }
        .btnOutline:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .btnPrimary { display: inline-flex; align-items: center; gap: 6px; padding: 12px 24px; border-radius: 10px; border: none; background: #1a202c; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
        .btnPrimary:hover:not(:disabled) { background: #2d3748; }
        .btnPrimary:disabled { background: #a0aec0; cursor: not-allowed; }
        
        .alertError { display: flex; align-items: center; gap: 8px; color: #c53030; background: #fff5f5; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; border: 1px solid #fed7d7; margin-bottom: 15px; }
        .alertSuccess { display: flex; align-items: center; gap: 8px; color: #0f766e; background: #f0fdfa; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; border: 1px solid #ccfbf1; margin-bottom: 15px; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
