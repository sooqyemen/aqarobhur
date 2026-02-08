'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import WhatsAppBar, { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { createRequest } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';
import { formatPriceSAR } from '@/lib/format';

const EMPTY_FORM = {
  name: '',
  phone: '',
  neighborhood: '',
  part: '',
  budget: '',
  note: '',
};

function makePublicRequestId(rawId) {
  const s = String(rawId || '');
  if (!s) return '';
  return `REQ-${s.slice(-6).toUpperCase()}`;
}

function buildRequestWhatsAppText({ publicId, rawId, data }) {
  const budgetTxt = data?.budget ? formatPriceSAR(Number(data.budget)) : 'غير محدد';

  return (
    `السلام عليكم، قدّمت طلب عبر موقع عقار أبحر.` +
    `\nرقم الطلب: ${publicId || '-'}${rawId ? ` (ID: ${rawId})` : ''}` +
    `\nالاسم: ${data?.name || '-'}` +
    `\nالجوال: ${data?.phone || '-'}` +
    `\nالحي: ${data?.neighborhood || '-'}` +
    `\nالجزء: ${data?.part || '-'}` +
    `\nالميزانية: ${budgetTxt}` +
    `\nملاحظات: ${data?.note || '-'}`
  );
}

export default function RequestPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null); // { id, publicId, whatsappHref, data }

  const previewWhatsAppHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const budgetTxt = form.budget ? formatPriceSAR(Number(form.budget)) : 'غير محدد';
    const text =
      `السلام عليكم، هذا طلبي:` +
      `\nالاسم: ${form.name || '-'}` +
      `\nالجوال: ${form.phone || '-'}` +
      `\nالحي: ${form.neighborhood || '-'}` +
      `\nالجزء: ${form.part || '-'}` +
      `\nالميزانية: ${budgetTxt}` +
      `\nملاحظات: ${form.note || '-'}`;
    return buildWhatsAppLink({ phone, text });
  }, [form]);

  async function submit(e) {
    e.preventDefault();
    if (sending) return;

    const name = String(form.name || '').trim();
    const phone = String(form.phone || '').trim();
    const neighborhood = String(form.neighborhood || '').trim();

    if (!name || !phone || !neighborhood) {
      alert('فضلاً أكمل البيانات الأساسية: الاسم + الجوال + الحي.');
      return;
    }

    const rawBudget = Number(String(form.budget || '').replace(/[^0-9.]/g, ''));
    const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : null;

    const payload = {
      name,
      phone,
      neighborhood,
      part: String(form.part || '').trim(),
      budget,
      note: String(form.note || '').trim(),
    };

    setSending(true);
    try {
      const id = await createRequest(payload);
      const publicId = makePublicRequestId(id);
      const phoneTo = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
      const text = buildRequestWhatsAppText({ publicId, rawId: id, data: payload });
      const whatsappHref = buildWhatsAppLink({ phone: phoneTo, text });

      setDone({ id, publicId, whatsappHref, data: payload });
      setForm(EMPTY_FORM);
    } catch (err) {
      alert('حصل خطأ أثناء الإرسال. تأكد من إعداد Firebase (Rules والمتغيرات) وجرّب مرة ثانية.');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 14 }}>
        {!done ? (
          <>
            <h1 style={{ margin: '6px 0 4px' }}>أرسل طلبك</h1>
            <div className="muted">اكتب طلبك وسنرجع لك عبر واتساب</div>

            <section className="card" style={{ marginTop: 12 }}>
              <form onSubmit={submit} className="grid">
                <div className="col-6">
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الاسم</div>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="اسمك"
                  />
                </div>
                <div className="col-6">
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الجوال</div>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    inputMode="tel"
                  />
                </div>

                <div className="col-6">
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الحي</div>
                  <select
                    className="select"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  >
                    <option value="">اختر</option>
                    {NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="col-6">
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الجزء (اختياري)</div>
                  <input
                    className="input"
                    value={form.part}
                    onChange={(e) => setForm({ ...form, part: e.target.value })}
                    placeholder="مثال: 1ط أو 2ر"
                  />
                </div>

                <div className="col-6">
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الميزانية (اختياري)</div>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="مثال: 1200000"
                  />
                </div>

                <div className="col-12">
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>ملاحظات</div>
                  <textarea
                    className="input"
                    rows={4}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="نوع العقار، المساحة، أي تفاصيل مهمة…"
                  />
                </div>

                <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
                  <a className="btn" href={previewWhatsAppHref} target="_blank" rel="noreferrer">معاينة رسالة واتساب</a>
                  <button className="btnPrimary" disabled={sending}>{sending ? 'جاري الإرسال…' : 'إرسال الطلب'}</button>
                </div>
              </form>
            </section>

            <footer className="footer muted">نرد عليك بأقرب وقت. إذا تحتاج رد فوري اضغط زر واتساب أسفل الصفحة.</footer>
          </>
        ) : (
          <>
            <h1 style={{ margin: '6px 0 4px' }}>تم استلام طلبك ✅</h1>
            <div className="muted">اضغط الزر بالأسفل لإرسال الطلب على واتساب</div>

            <section className="card" style={{ marginTop: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>رقم الطلب: {done.publicId}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>ID: {done.id}</div>
                </div>
                <span className="badge ok">تم الحفظ</span>
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                {done.data.neighborhood || '—'}{done.data.part ? ` • ${done.data.part}` : ''}
                {done.data.budget ? ` • ${formatPriceSAR(done.data.budget)}` : ''}
              </div>

              <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <a className="btnPrimary" href={done.whatsappHref} target="_blank" rel="noreferrer">إرسال الطلب على واتساب</a>
                <button className="btn" type="button" onClick={() => setDone(null)}>طلب جديد</button>
              </div>
            </section>

            <footer className="footer muted">إذا ما وصلك رد سريع، أرسل استفسارك من زر واتساب أسفل الصفحة.</footer>
          </>
        )}
      </main>
      <WhatsAppBar />
    </>
  );
}
