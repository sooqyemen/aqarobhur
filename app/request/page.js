'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { NEIGHBORHOODS } from '@/lib/taxonomy';
import { formatPriceSAR } from '@/lib/format';
import { createRequest } from '@/lib/requestService';
import PageHeader from '@/components/PageHeader';

const DEAL_TYPES = [
  { key: 'sale', label: 'شراء (بحث عن بيع)' },
  { key: 'rent', label: 'استئجار (بحث عن إيجار)' },
];

const PROPERTY_TYPES = ['أرض', 'فيلا', 'شقة', 'دور', 'عمارة', 'تجاري', 'مستودع'];

function parseSmartAnswer(answer = '') {
  const text = String(answer || '').trim();
  if (!text) return { intro: '', offers: [], outro: '' };

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const offers = [];
  const introLines = [];
  const outroLines = [];
  let afterOffers = false;

  for (const line of lines) {
    const match = line.match(/^[-–—\s]*العرض\s*(\d+)\s*[:：]\s*(.+)$/i);

    if (match) {
      afterOffers = true;
      const number = match[1];
      const body = match[2].trim();
      const parts = body.split(/\s*[—-]\s*/).map((part) => part.trim()).filter(Boolean);
      offers.push({ number, title: parts[0] || body, details: parts.slice(1), raw: body });
      continue;
    }

    if (afterOffers) outroLines.push(line);
    else introLines.push(line);
  }

  return {
    intro: introLines.join('\n'),
    offers,
    outro: outroLines.join('\n'),
  };
}

function formatSmartPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toLocaleString('ar-SA')} ريال`;
}

function buildSmartOffersText(result, question, customerPhone = '') {
  const items = Array.isArray(result?.items) ? result.items : [];
  const lines = [
    'السلام عليكم، هذا طلب متابعة من العقاري الذكي:',
    customerPhone ? `رقم جوال العميل: ${customerPhone}` : '',
    question ? `طلب العميل: ${question}` : '',
    '',
  ].filter(Boolean);

  if (items.length) {
    lines.push('العروض التي ظهرت للعميل:');
    items.forEach((item, index) => {
      const parts = [
        `${index + 1}. ${item.title || item.generatedTitle || 'عرض عقاري'}`,
        item.neighborhood ? `الحي: ${item.neighborhood}` : '',
        item.price ? `السعر: ${formatSmartPrice(item.price)}` : '',
        item.area ? `المساحة: ${item.area}م²` : '',
        item.url ? `الرابط: https://aqarobhur.com${item.url}` : '',
      ].filter(Boolean);
      lines.push(parts.join(' - '));
    });
  } else if (result?.answer) {
    lines.push('نتيجة البحث:');
    lines.push(result.answer);
  }

  return lines.join('\n');
}

function SmartResultBox({ result, question, officePhone }) {
  const parsed = parseSmartAnswer(result?.answer || '');
  const items = Array.isArray(result?.items) ? result.items : [];
  const [customerPhone, setCustomerPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');

  if (!result) return null;

  async function savePhoneLead() {
    const cleanPhone = String(customerPhone || '').replace(/[^0-9+]/g, '').trim();
    setPhoneMessage('');
    setPhoneError('');

    if (!cleanPhone || cleanPhone.length < 8) {
      setPhoneError('اكتب رقم جوال صحيح ليتم متابعة العروض معك عبر واتساب.');
      return;
    }

    setSavingPhone(true);
    try {
      const text = buildSmartOffersText(result, question, cleanPhone);
      await createRequest({
        requestKind: 'smart_assistant_followup',
        sourceType: 'العقاري الذكي',
        source: 'request-page-smart-result',
        name: 'عميل العقاري الذكي',
        phone: cleanPhone,
        note: text,
        rawText: text,
        waText: text,
        status: 'new',
      });

      setPhoneMessage('تم حفظ رقمك وطلبك في لوحة التحكم. سنرسل لك العروض المتوفرة مع التفاصيل عبر واتساب.');

      const officeLink = buildWhatsAppLink({ phone: officePhone, text });
      if (officeLink) window.open(officeLink, '_blank');
    } catch {
      setPhoneError('تعذر حفظ رقم الجوال الآن. حاول مرة أخرى أو تواصل معنا مباشرة عبر واتساب.');
    } finally {
      setSavingPhone(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: '16px', padding: '16px', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, marginBottom: '12px' }}>
        <span className="material-icons-outlined" style={{ color: 'var(--primary)' }}>auto_awesome</span>
        نتيجة العقاري الذكي
      </div>

      {items.length ? (
        <>
          <div style={{ marginBottom: '14px', color: 'var(--text)', lineHeight: 1.9, fontWeight: 800 }}>
            وجدت {items.length} عرض{items.length > 1 ? 'اً' : ''} مناسب{items.length > 1 ? 'ة' : ''} لطلبك.
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map((item, index) => (
              <div
                key={item.id || `${index}-${item.title}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: item.image ? '94px 1fr' : '1fr',
                  gap: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '12px',
                  background: '#fcfcfd',
                  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title || 'عرض عقاري'}
                    style={{ width: '94px', height: '82px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)' }}
                    loading="lazy"
                  />
                ) : null}

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontWeight: 950,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </span>
                    <strong style={{ color: 'var(--text)', fontSize: '15px', lineHeight: 1.6 }}>{item.title || item.generatedTitle || 'عرض عقاري'}</strong>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {item.neighborhood ? <span className="smartChip">{item.neighborhood}</span> : null}
                    {item.price ? <span className="smartChip">{formatSmartPrice(item.price)}</span> : null}
                    {item.area ? <span className="smartChip">{item.area}م²</span> : null}
                    {item.summary ? <span className="smartChip">{item.summary}</span> : null}
                  </div>

                  {item.url ? (
                    <a href={item.url} style={{ display: 'inline-flex', marginTop: '10px', color: 'var(--primary)', fontWeight: 900 }}>
                      عرض تفاصيل الإعلان
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : parsed.offers.length ? (
        <>
          {parsed.intro ? (
            <div style={{ marginBottom: '14px', color: 'var(--text)', lineHeight: 1.9, fontWeight: 800 }}>
              {parsed.intro}
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: '12px' }}>
            {parsed.offers.map((offer) => (
              <div key={`${offer.number}-${offer.raw}`} style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '14px', background: '#fcfcfd', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ width: '34px', height: '34px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: '#fff', fontWeight: 950, flexShrink: 0 }}>{offer.number}</span>
                  <strong style={{ color: 'var(--text)', fontSize: '16px', lineHeight: 1.6 }}>{offer.title}</strong>
                </div>

                {offer.details.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {offer.details.map((detail) => <span key={detail} className="smartChip">{detail}</span>)}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.8 }}>{offer.raw}</p>
                )}
              </div>
            ))}
          </div>

          {parsed.outro ? <div style={{ marginTop: '14px', padding: '12px', borderRadius: '12px', background: '#f8fafc', color: 'var(--muted)', lineHeight: 1.8, fontWeight: 800 }}>{parsed.outro}</div> : null}
        </>
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', lineHeight: 1.9, color: 'var(--text)' }}>{result.answer}</pre>
      )}

      {result?.ctaText ? <div style={{ marginTop: '14px', padding: '12px', borderRadius: '12px', background: '#f8fafc', color: 'var(--muted)', lineHeight: 1.8, fontWeight: 700 }}>{result.ctaText}</div> : null}

      <div style={{ marginTop: '14px', padding: '14px', borderRadius: '16px', background: '#f0fdfa', border: '1px solid rgba(15, 118, 110, .18)' }}>
        <label style={{ display: 'block', fontWeight: 900, marginBottom: '8px', color: 'var(--text)' }}>
          اكتب رقم جوالك اختياريًا لإرسال العروض المتوفرة مع التفاصيل على واتساب
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }} className="smartPhoneGrid">
          <input
            className="input"
            type="tel"
            inputMode="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="05XXXXXXXX"
          />
          <button type="button" className="btn btnPrimary" onClick={savePhoneLead} disabled={savingPhone}>
            {savingPhone ? 'جاري الحفظ...' : 'إرسال العروض لي'}
          </button>
        </div>
        {phoneMessage ? <div style={{ marginTop: '10px', color: 'var(--success)', fontWeight: 900, lineHeight: 1.8 }}>{phoneMessage}</div> : null}
        {phoneError ? <div style={{ marginTop: '10px', color: 'var(--danger)', fontWeight: 900, lineHeight: 1.8 }}>{phoneError}</div> : null}
      </div>

      {result?.whatsappLink ? (
        <a href={result.whatsappLink} target="_blank" rel="noopener noreferrer" className="btn btnPrimary" style={{ width: '100%', marginTop: '14px' }}>
          تواصل معنا مباشرة عبر واتساب
          <span className="material-icons-outlined">chat</span>
        </a>
      ) : null}

      <style jsx>{`
        .smartChip {
          display: inline-flex;
          align-items: center;
          padding: 7px 10px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid var(--border);
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        @media (max-width: 640px) {
          .smartPhoneGrid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function RequestPage() {
  const phoneDefault = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

  const [formData, setFormData] = useState({
    dealType: 'sale',
    propertyType: 'أرض',
    neighborhood: '',
    budgetMin: '',
    budgetMax: '',
    areaMin: '',
    name: '',
    phone: '',
    notes: '',
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartError, setSmartError] = useState('');
  const [smartResult, setSmartResult] = useState(null);
  const [smartQuestionText, setSmartQuestionText] = useState('');
  const [smartQuestionTouched, setSmartQuestionTouched] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleNumericChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value.replace(/[^\d]/g, '') });
  const waPhone = useMemo(() => phoneDefault || '966597520693', [phoneDefault]);

  const generatedSmartQuestion = useMemo(() => {
    const parts = [];
    parts.push(formData.dealType === 'rent' ? 'أحتاج عقار للإيجار' : 'أحتاج عقار للشراء');
    if (formData.propertyType) parts.push(formData.propertyType);
    if (formData.neighborhood) parts.push(`في حي ${formData.neighborhood}`);
    if (formData.areaMin) parts.push(`بمساحة ${formData.areaMin} متر أو أكثر`);
    if (formData.budgetMax) parts.push(`بحد أقصى ${formData.budgetMax} ريال`);
    else if (formData.budgetMin) parts.push(`بميزانية تبدأ من ${formData.budgetMin} ريال`);
    if (formData.notes) parts.push(formData.notes);
    return parts.join(' ');
  }, [formData]);

  useEffect(() => {
    if (!smartQuestionTouched) setSmartQuestionText(generatedSmartQuestion);
  }, [generatedSmartQuestion, smartQuestionTouched]);

  const smartQuestion = useMemo(() => String(smartQuestionText || '').trim() || generatedSmartQuestion, [smartQuestionText, generatedSmartQuestion]);

  const waText = useMemo(() => {
    const min = formData.budgetMin ? formatPriceSAR(Number(formData.budgetMin)) : '';
    const max = formData.budgetMax ? formatPriceSAR(Number(formData.budgetMax)) : '';
    const budgetText = min && max ? `الميزانية: من ${min} إلى ${max}` : min ? `الميزانية: ${min}` : max ? `الميزانية: حتى ${max}` : '';
    const areaText = formData.areaMin ? `المساحة المطلوبة: ${formData.areaMin} م²+` : '';

    return [
      'السلام عليكم، لدي طلب عقاري عبر موقع عقار أبحر 🏢:',
      `🔹 *نوع الطلب:* ${DEAL_TYPES.find((d) => d.key === formData.dealType)?.label || formData.dealType}`,
      `🔹 *نوع العقار:* ${formData.propertyType}`,
      formData.neighborhood ? `📍 *الحي المطلوب:* ${formData.neighborhood}` : '',
      budgetText ? `💰 *${budgetText}*` : '',
      areaText ? `📏 *${areaText}*` : '',
      formData.notes ? `📝 *ملاحظات:* ${formData.notes}` : '',
      smartQuestion ? `🤖 *صياغة الطلب الذكي:* ${smartQuestion}` : '',
      `👤 *الاسم:* ${formData.name}`,
      `📱 *رقم الجوال:* ${formData.phone}`,
    ].filter(Boolean).join('\n');
  }, [formData, smartQuestion]);

  const waLink = useMemo(() => buildWhatsAppLink({ phone: waPhone, text: waText }), [waPhone, waText]);

  async function runSmartSearch() {
    setSmartBusy(true);
    setSmartError('');
    setSmartResult(null);

    const question = String(smartQuestion || '').trim();
    if (!question) {
      setSmartBusy(false);
      setSmartError('اكتب طلبك أولاً في مربع صياغة الطلب الذكي.');
      return;
    }

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'تعذر تنفيذ البحث الذكي.');
      setSmartResult(data);

      try {
        await createRequest({
          requestKind: 'smart_search_conversation',
          sourceType: 'العقاري الذكي',
          source: 'request-page-smart-search',
          name: formData.name || 'زائر العقاري الذكي',
          phone: formData.phone || '',
          dealType: formData.dealType,
          propertyType: formData.propertyType,
          neighborhood: formData.neighborhood || '',
          budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
          budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
          areaMin: formData.areaMin ? Number(formData.areaMin) : null,
          note: `طلب العميل: ${question}\n\nنتيجة العقاري الذكي:\n${data?.answer || ''}`,
          rawText: JSON.stringify(data || {}, null, 2),
          waText: data?.whatsappText || data?.answer || question,
          status: 'new',
        });
      } catch (_) {}
    } catch (error) {
      setSmartError(error?.message || 'تعذر تنفيذ البحث الذكي.');
    } finally {
      setSmartBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setOk(false);

    if (!formData.dealType) return setErr('الرجاء اختيار نوع الطلب.');
    if (!formData.propertyType) return setErr('الرجاء اختيار نوع العقار.');

    setBusy(true);
    try {
      const res = await fetch('/api/client-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealType: formData.dealType,
          propertyType: formData.propertyType,
          neighborhood: formData.neighborhood || '',
          budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
          budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
          areaMin: formData.areaMin ? Number(formData.areaMin) : null,
          note: [formData.notes, smartQuestion ? `صياغة الطلب الذكي: ${smartQuestion}` : ''].filter(Boolean).join('\n'),
          name: formData.name || '',
          phone: formData.phone || '',
          waText,
          source: 'web',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'تعذر إرسال الطلب الآن.');
      setOk(true);
      window.open(data?.whatsappLink || waLink, '_blank');
    } catch {
      setErr('تعذر إرسال الطلب الآن. يرجى المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div style={{ padding: '60px 0', minHeight: '80vh', direction: 'rtl' }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          <PageHeader icon="travel_explore" title="أرسل طلبك العقاري" description="لم تجد العقار المناسب؟ اكتب مواصفات طلبك وسنقوم بالبحث في شبكتنا العقارية وتوفير أفضل الخيارات لك." />

          <div className="card" style={{ padding: '35px' }}>
            <form onSubmit={submit} style={{ display: 'grid', gap: '30px' }}>
              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>1. تفاصيل العقار المطلوب</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 800, fontSize: '14px' }}>نوع الطلب *</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {DEAL_TYPES.map((d) => (
                        <button key={d.key} type="button" className={`filterPill ${formData.dealType === d.key ? 'active' : ''}`} onClick={() => setFormData({ ...formData, dealType: d.key })} style={{ flex: 1, padding: '12px', minWidth: '150px' }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>نوع العقار *</label>
                    <select name="propertyType" className="input" value={formData.propertyType} onChange={handleChange} required>
                      {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الحي المفضل</label>
                    <select name="neighborhood" className="input" value={formData.neighborhood} onChange={handleChange}>
                      <option value="">أي حي</option>
                      {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>المساحة المطلوبة (م²)</label>
                    <input type="text" name="areaMin" className="input" inputMode="numeric" value={formData.areaMin} onChange={handleNumericChange} placeholder="مثال: 400" />
                  </div>
                </div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>2. الميزانية المحددة</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الحد الأدنى للميزانية (ريال)</label>
                    <input type="text" name="budgetMin" className="input" inputMode="numeric" value={formData.budgetMin} onChange={handleNumericChange} placeholder="مثال: 500000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الحد الأقصى للميزانية (ريال)</label>
                    <input type="text" name="budgetMax" className="input" inputMode="numeric" value={formData.budgetMax} onChange={handleNumericChange} placeholder="مثال: 1200000" />
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '18px', background: '#fcfcfd', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 900 }}>
                  <span className="material-icons-outlined">smart_toy</span>
                  جرّب العقاري الذكي قبل إرسال الطلب
                </div>

                <div className="muted" style={{ fontSize: '14px', marginBottom: '14px', lineHeight: 1.8 }}>
                  اكتب طلبك بالطريقة التي تريدها، أو عدّل الصياغة المقترحة ثم اضغط بحث. يمكن حذف النص وكتابة طلب جديد بالكامل.
                </div>

                <div className="card" style={{ padding: '12px', background: '#fff' }}>
                  <label style={{ display: 'block', fontWeight: 900, marginBottom: '8px' }}>صياغة الطلب الذكي:</label>
                  <textarea
                    className="input"
                    value={smartQuestionText}
                    onChange={(e) => { setSmartQuestionTouched(true); setSmartQuestionText(e.target.value); }}
                    rows={4}
                    placeholder="مثال: أبغى أرض في الياقوت بحدود مليون ريال، أو شقة للإيجار في أبحر الشمالية لعائلة صغيرة"
                    style={{ minHeight: '120px', resize: 'vertical', lineHeight: 1.9, fontWeight: 700 }}
                  />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <button type="button" className="btn" onClick={() => { setSmartQuestionTouched(false); setSmartQuestionText(generatedSmartQuestion); }}>توليد من البيانات</button>
                    <button type="button" className="btn" onClick={() => { setSmartQuestionTouched(true); setSmartQuestionText(''); setSmartResult(null); setSmartError(''); }}>مسح النص</button>
                  </div>
                </div>

                <button type="button" className="btn btnPrimary" style={{ marginTop: '14px', width: '100%' }} onClick={runSmartSearch} disabled={smartBusy}>
                  {smartBusy ? 'جاري البحث الذكي...' : 'ابحث بالعقاري الذكي'}
                </button>

                {smartError ? <div style={{ marginTop: '12px', color: 'var(--danger)', fontWeight: 800 }}>{smartError}</div> : null}
                {smartResult ? <SmartResultBox result={smartResult} question={smartQuestion} officePhone={waPhone} /> : null}
              </div>

              <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '0' }} />

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>3. بيانات التواصل</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الاسم الكريم *</label>
                    <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} placeholder="اكتب اسمك" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>رقم الجوال *</label>
                    <input type="tel" name="phone" className="input" value={formData.phone} onChange={handleChange} placeholder="05XXXXXXXX" required />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>مواصفات وملاحظات إضافية</label>
                    <textarea name="notes" className="input" rows={4} value={formData.notes} onChange={handleChange} placeholder="مثال: واجهة شمالية، قريب من الخدمات، لا يقبل البنك..." style={{ resize: 'vertical' }} />
                  </div>
                </div>
              </div>

              {err ? <div style={{ color: 'var(--danger)', fontWeight: 800, textAlign: 'center' }}>{err}</div> : null}
              {ok ? <div style={{ color: 'var(--success)', fontWeight: 800, textAlign: 'center', background: '#e6fceb', padding: '15px', borderRadius: '12px' }}>تم حفظ الطلب بنجاح في النظام! جاري تحويلك للواتساب...</div> : null}

              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn btnPrimary" style={{ width: '100%', fontSize: '18px', padding: '16px' }} disabled={busy}>
                  {busy ? 'جاري معالجة الطلب...' : 'إرسال الطلب واعتماده'}
                  {!busy && <span className="material-icons-outlined">send</span>}
                </button>
                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <span className="material-icons-outlined" style={{ fontSize: '16px' }}>sync</span>
                  بمجرد الإرسال سيتم حفظ طلبك بالنظام وتوجيهك لمحادثة الواتساب مباشرة.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
