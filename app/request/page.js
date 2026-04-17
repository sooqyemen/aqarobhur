'use client';

import { useMemo, useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { NEIGHBORHOODS } from '@/lib/taxonomy';
import { formatPriceSAR } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

const DEAL_TYPES = [
  { key: 'sale', label: 'شراء (بحث عن بيع)' },
  { key: 'rent', label: 'استئجار (بحث عن إيجار)' },
];

const PROPERTY_TYPES = ['أرض', 'فيلا', 'شقة', 'دور', 'عمارة', 'تجاري', 'مستودع'];

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNumericChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value.replace(/[^\d]/g, '') });
  };

  const waPhone = useMemo(() => phoneDefault || '966597520693', [phoneDefault]);

  const smartQuestion = useMemo(() => {
    const parts = [];

    if (formData.dealType === 'rent') parts.push('أحتاج عقار للإيجار');
    else parts.push('أحتاج عقار للشراء');

    if (formData.propertyType) parts.push(formData.propertyType);

    if (formData.neighborhood) parts.push(`في حي ${formData.neighborhood}`);

    if (formData.areaMin) parts.push(`بمساحة ${formData.areaMin} متر أو أكثر`);

    if (formData.budgetMax) parts.push(`بحد أقصى ${formData.budgetMax} ريال`);
    else if (formData.budgetMin) parts.push(`بميزانية تبدأ من ${formData.budgetMin} ريال`);

    if (formData.notes) parts.push(formData.notes);

    return parts.join(' ');
  }, [formData]);

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
      `👤 *الاسم:* ${formData.name}`,
      `📱 *رقم الجوال:* ${formData.phone}`,
    ].filter(Boolean).join('\n');
  }, [formData]);

  const waLink = useMemo(() => buildWhatsAppLink({ phone: waPhone, text: waText }), [waPhone, waText]);

  async function runSmartSearch() {
    setSmartBusy(true);
    setSmartError('');
    setSmartResult(null);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: smartQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'تعذر تنفيذ البحث الذكي.');
      }

      setSmartResult(data);
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
          note: formData.notes || '',
          name: formData.name || '',
          phone: formData.phone || '',
          waText,
          source: 'web',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'تعذر إرسال الطلب الآن.');
      }

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
          <PageHeader
            icon="travel_explore"
            title="أرسل طلبك العقاري"
            description="لم تجد العقار المناسب؟ اكتب مواصفات طلبك وسنقوم بالبحث في شبكتنا العقارية وتوفير أفضل الخيارات لك."
          />

          <div className="card" style={{ padding: '35px' }}>
            <form onSubmit={submit} style={{ display: 'grid', gap: '30px' }}>
              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: 'var(--text)' }}>1. تفاصيل العقار المطلوب</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 800, fontSize: '14px' }}>نوع الطلب *</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {DEAL_TYPES.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          className={`filterPill ${formData.dealType === d.key ? 'active' : ''}`}
                          onClick={() => setFormData({ ...formData, dealType: d.key })}
                          style={{ flex: 1, padding: '12px', minWidth: '150px' }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>نوع العقار *</label>
                    <select name="propertyType" className="input" value={formData.propertyType} onChange={handleChange} required>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '14px' }}>الحي المفضل</label>
                    <select name="neighborhood" className="input" value={formData.neighborhood} onChange={handleChange}>
                      <option value="">أي حي</option>
                      {NEIGHBORHOODS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
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

                <div className="muted" style={{ fontSize: '14px', marginBottom: '14px' }}>
                  سيبحث لك مباشرة في العروض الداخلية المناسبة لطلبك، ثم يمكنك متابعة التواصل عبر واتساب.
                </div>

                <div className="card" style={{ padding: '12px', background: '#fff' }}>
                  <div style={{ fontWeight: 800, marginBottom: '6px' }}>صياغة الطلب الذكي:</div>
                  <div style={{ color: 'var(--muted)', lineHeight: 1.8 }}>{smartQuestion || 'اكتب بيانات الطلب أولاً'}</div>
                </div>

                <button
                  type="button"
                  className="btn btnPrimary"
                  style={{ marginTop: '14px', width: '100%' }}
                  onClick={runSmartSearch}
                  disabled={smartBusy}
                >
                  {smartBusy ? 'جاري البحث الذكي...' : 'ابحث بالعقاري الذكي'}
                </button>

                {smartError ? (
                  <div style={{ marginTop: '12px', color: 'var(--danger)', fontWeight: 800 }}>{smartError}</div>
                ) : null}

                {smartResult ? (
                  <div className="card" style={{ marginTop: '16px', padding: '16px', background: '#fff' }}>
                    <div style={{ fontWeight: 900, marginBottom: '10px' }}>نتيجة العقاري الذكي</div>

                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                        fontFamily: 'inherit',
                        lineHeight: 1.9,
                        color: 'var(--text)',
                      }}
                    >
                      {smartResult.answer}
                    </pre>

                    {smartResult?.ctaText ? (
                      <div
                        style={{
                          marginTop: '14px',
                          padding: '12px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          color: 'var(--muted)',
                          lineHeight: 1.8,
                          fontWeight: 700,
                        }}
                      >
                        {smartResult.ctaText}
                      </div>
                    ) : null}

                    {smartResult?.whatsappLink ? (
                      <a
                        href={smartResult.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btnPrimary"
                        style={{ width: '100%', marginTop: '14px' }}
                      >
                        تواصل معنا عبر واتساب
                        <span className="material-icons-outlined">chat</span>
                      </a>
                    ) : null}
                  </div>
                ) : null}
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
