'use client';

import { useMemo, useState } from 'react';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { createRequest } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';
import { formatPriceSAR } from '@/lib/format';

const REGIONS = [
  'أبحر الشمالية',
  'خليج سلمان',
  'جوهرة العروس',
  'الهجرة',
  'طيبة الفرعية',
];

const PROPERTY_TYPES = ['أرض', 'فيلا', 'شقة', 'دور', 'عمارة', 'تجاري', 'مستودع'];

const OWNERSHIP_TYPES = [
  { key: 'residential', label: 'سكني' },
  { key: 'agri', label: 'زراعي' },
  { key: 'industrial', label: 'صناعي' },
  { key: 'commercial', label: 'تجاري' },
];

const DEAL_TYPES = [
  { key: 'buy', label: 'شراء' },
  { key: 'rent', label: 'إيجار' },
];

const PAYMENT_TYPES = [
  { key: 'cash', label: 'كاش' },
  { key: 'bank', label: 'تمويل بنكي' },
];

const SERIOUSNESS = [
  { key: 'now', label: 'مستعد فوراً' },
  { key: 'month', label: 'خلال شهر' },
  { key: '3months', label: 'خلال 3 أشهر' },
  { key: 'later', label: 'لاحقاً' },
  { key: 'explore', label: 'استكشاف فقط' },
];

const GOALS = [
  { key: 'private_home', label: 'سكن خاص' },
  { key: 'invest_rent', label: 'استثمار وتأجير' },
  { key: 'build_sell', label: 'بناء وبيع' },
  { key: 'commercial_project', label: 'مشروع تجاري' },
];

function Section({ title, children }) {
  return (
    <section className="card" style={{ marginTop: 12, overflow: 'hidden' }}>
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(214,179,91,.95), rgba(180,137,45,.92))',
          color: '#0b0f16',
          padding: '10px 12px',
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {title}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  );
}

function ChipGroup({ value, onChange, options }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            type="button"
            key={o.key}
            onClick={() => onChange(o.key)}
            className={active ? 'btnPrimary' : 'btn'}
            style={{ padding: '8px 12px', borderRadius: 999 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Label({ children }) {
  return <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{children}</div>;
}

export default function RequestPage() {
  const [form, setForm] = useState({
    dealType: 'buy',
    propertyType: 'أرض',
    ownershipType: 'residential',

    city: 'جدة',
    region: '',
    neighborhood: '',
    plan: '',
    part: '',

    areaMin: '',
    areaMax: '',

    budgetMin: '',
    budgetMax: '',
    paymentMethod: 'cash',

    seriousness: 'now',
    goal: 'private_home',
    wantsSimilar: 'yes',

    name: '',
    phone: '',
    note: '',
  });

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState({ id: '', waHref: '' });

  const neighborhoodList = useMemo(() => {
    // الآن نعرض قائمة ثابتة (يمكن لاحقاً تصفيتها حسب المنطقة)
    return Array.isArray(NEIGHBORHOODS) ? NEIGHBORHOODS : [];
  }, []);

  const waText = useMemo(() => {
    const budgetMin = form.budgetMin ? formatPriceSAR(Number(form.budgetMin)) : '';
    const budgetMax = form.budgetMax ? formatPriceSAR(Number(form.budgetMax)) : '';
    const budgetTxt =
      budgetMin && budgetMax ? `${budgetMin} إلى ${budgetMax}` : (budgetMin || budgetMax || 'غير محدد');

    const areaMin = form.areaMin ? `${form.areaMin} م²` : '';
    const areaMax = form.areaMax ? `${form.areaMax} م²` : '';
    const areaTxt = areaMin && areaMax ? `${areaMin} إلى ${areaMax}` : (areaMin || areaMax || 'غير محدد');

    const text =
      `السلام عليكم، هذا طلبي:\n` +
      `النوع: ${DEAL_TYPES.find(d => d.key === form.dealType)?.label || '-'}\n` +
      `العقار: ${form.propertyType || '-'} • ${OWNERSHIP_TYPES.find(o => o.key === form.ownershipType)?.label || '-'}\n` +
      `المدينة: ${form.city || '-'}\n` +
      `المنطقة: ${form.region || '-'}\n` +
      `الحي: ${form.neighborhood || '-'}\n` +
      `المخطط: ${form.plan || '-'}\n` +
      `الجزء: ${form.part || '-'}\n` +
      `المساحة: ${areaTxt}\n` +
      `الميزانية: ${budgetTxt}\n` +
      `طريقة الدفع: ${PAYMENT_TYPES.find(p => p.key === form.paymentMethod)?.label || '-'}\n` +
      `الجدية: ${SERIOUSNESS.find(s => s.key === form.seriousness)?.label || '-'}\n` +
      `الهدف: ${GOALS.find(g => g.key === form.goal)?.label || '-'}\n` +
      `الاسم: ${form.name || '-'}\n` +
      `الجوال: ${form.phone || '-'}\n` +
      `ملاحظات: ${form.note || '-'}`;

    return text;
  }, [form]);

  const waHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    return buildWhatsAppLink({ phone, text: waText });
  }, [waText]);

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function validate() {
    if (!String(form.name || '').trim()) return 'اكتب الاسم';
    if (!String(form.phone || '').trim()) return 'اكتب رقم الجوال';
    if (!String(form.region || '').trim()) return 'اختر المنطقة';
    if (!String(form.neighborhood || '').trim()) return 'اختر الحي';
    return '';
  }

  async function submit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    setSending(true);
    try {
      const payload = {
        ...form,
        // Numbers
        areaMin: form.areaMin ? Number(form.areaMin) : null,
        areaMax: form.areaMax ? Number(form.areaMax) : null,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
        // Keep a ready WhatsApp text snapshot (useful for bot/admin)
        waText,
      };

      const id = await createRequest(payload);
      setDone({ id, waHref });

      // لا نفتح واتساب تلقائيًا (حسب طلبك)، نخليها زر في صفحة النجاح
    } catch (err2) {
      alert('حصل خطأ أثناء الإرسال. تأكد من إعداد Firebase وجرّب مرة ثانية.');
      console.error(err2);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setDone({ id: '', waHref: '' });
    setForm((p) => ({
      ...p,
      region: '',
      neighborhood: '',
      plan: '',
      part: '',
      areaMin: '',
      areaMax: '',
      budgetMin: '',
      budgetMax: '',
      name: '',
      phone: '',
      note: '',
    }));
  }

  return (
    <div className="container" style={{ paddingTop: 16 }}>
        <h1 style={{ margin: '6px 0 4px' }}>إنشاء طلب</h1>
        <div className="muted">املأ البيانات التالية وسيتم حفظ الطلب ثم يمكنك إرساله على واتساب.</div>

        {done.id ? (
          <section className="card" style={{ marginTop: 12 }}>
            <div style={{ padding: 14 }}>
              <div className="badge ok" style={{ display: 'inline-block', marginBottom: 10 }}>
                تم حفظ الطلب ✅ رقم: {done.id}
              </div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>الخطوة الأخيرة:</div>
              <div className="muted" style={{ marginTop: 6 }}>
                اضغط الزر لإرسال ملخص الطلب على واتساب.
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <a className="btnPrimary" href={done.waHref} target="_blank" rel="noreferrer">
                  إرسال الطلب على واتساب
                </a>
                <button type="button" className="btn" onClick={reset}>
                  طلب جديد
                </button>
              </div>
            </div>
          </section>
        ) : (
          <form onSubmit={submit}>
            <Section title="معلومات العقار المطلوب">
              <div className="grid">
                <div className="col-12">
                  <Label>نوع الطلب *</Label>
                  <ChipGroup
                    value={form.dealType}
                    onChange={(v) => setField('dealType', v)}
                    options={DEAL_TYPES}
                  />
                </div>

                <div className="col-6">
                  <Label>نوع العقار *</Label>
                  <select className="select" value={form.propertyType} onChange={(e) => setField('propertyType', e.target.value)}>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="col-6">
                  <Label>نوع الملكية *</Label>
                  <ChipGroup
                    value={form.ownershipType}
                    onChange={(v) => setField('ownershipType', v)}
                    options={OWNERSHIP_TYPES}
                  />
                </div>

                <div className="col-6">
                  <Label>المدينة</Label>
                  <input className="input" value="جدة" disabled />
                </div>

                <div className="col-6">
                  <Label>المنطقة *</Label>
                  <select className="select" value={form.region} onChange={(e) => setField('region', e.target.value)}>
                    <option value="">اختر</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="col-6">
                  <Label>الحي *</Label>
                  <select
                    className="select"
                    value={form.neighborhood}
                    onChange={(e) => setField('neighborhood', e.target.value)}
                  >
                    <option value="">اختر</option>
                    {neighborhoodList.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="col-6">
                  <Label>المخطط (اختياري)</Label>
                  <input className="input" value={form.plan} onChange={(e) => setField('plan', e.target.value)} placeholder="مثال: 505 أو 6جس" />
                </div>

                <div className="col-6">
                  <Label>الجزء (اختياري)</Label>
                  <input className="input" value={form.part} onChange={(e) => setField('part', e.target.value)} placeholder="مثال: 1ط أو 2ر أو أ/ب" />
                </div>

                <div className="col-3">
                  <Label>المساحة من</Label>
                  <input className="input" inputMode="numeric" value={form.areaMin} onChange={(e) => setField('areaMin', e.target.value)} placeholder="مثال: 450" />
                </div>
                <div className="col-3">
                  <Label>المساحة إلى</Label>
                  <input className="input" inputMode="numeric" value={form.areaMax} onChange={(e) => setField('areaMax', e.target.value)} placeholder="مثال: 650" />
                </div>
              </div>
            </Section>

            <Section title="معلومات الميزانية والدفع">
              <div className="grid">
                <div className="col-3">
                  <Label>الميزانية من *</Label>
                  <input className="input" inputMode="numeric" value={form.budgetMin} onChange={(e) => setField('budgetMin', e.target.value)} placeholder="مثال: 900000" />
                </div>
                <div className="col-3">
                  <Label>الميزانية إلى *</Label>
                  <input className="input" inputMode="numeric" value={form.budgetMax} onChange={(e) => setField('budgetMax', e.target.value)} placeholder="مثال: 1200000" />
                </div>

                <div className="col-6">
                  <Label>طريقة الشراء *</Label>
                  <ChipGroup
                    value={form.paymentMethod}
                    onChange={(v) => setField('paymentMethod', v)}
                    options={PAYMENT_TYPES}
                  />
                </div>
              </div>
            </Section>

            <Section title="تفاصيل إضافية">
              <div className="grid">
                <div className="col-12">
                  <Label>الجدّية</Label>
                  <ChipGroup value={form.seriousness} onChange={(v) => setField('seriousness', v)} options={SERIOUSNESS} />
                </div>

                <div className="col-12">
                  <Label>هدف الطلب</Label>
                  <ChipGroup value={form.goal} onChange={(v) => setField('goal', v)} options={GOALS} />
                </div>

                <div className="col-12">
                  <Label>هل ترغب بعروض مشابهة؟</Label>
                  <ChipGroup
                    value={form.wantsSimilar}
                    onChange={(v) => setField('wantsSimilar', v)}
                    options={[
                      { key: 'yes', label: 'نعم' },
                      { key: 'no', label: 'لا' },
                    ]}
                  />
                </div>

                <div className="col-12">
                  <Label>ملاحظات</Label>
                  <textarea className="input" rows={4} value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="مثال: واجهة شمالية، شارع 20، يفضّل زاوية…" />
                </div>
              </div>
            </Section>

            <Section title="بيانات التواصل">
              <div className="grid">
                <div className="col-6">
                  <Label>الاسم الكامل *</Label>
                  <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="اسمك" />
                </div>
                <div className="col-6">
                  <Label>رقم الهاتف *</Label>
                  <input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="05xxxxxxxx" />
                </div>

                <div className="col-12 row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <a className="btn" href={waHref} target="_blank" rel="noreferrer">معاينة رسالة واتساب</a>
                  <button className="btnPrimary" disabled={sending}>
                    {sending ? 'جاري الإرسال…' : 'إرسال الطلب'}
                  </button>
                </div>
              </div>
            </Section>

            <style jsx>{`
              /* جعل الشبكة أقرب للفيديو على الشاشات الصغيرة */
              :global(.grid) { gap: 12px; }
              @media (max-width: 720px) {
                :global(.col-6), :global(.col-3) { width: 100% !important; }
              }
            `}</style>
          </form>
        )}
    </div>
  );
}
