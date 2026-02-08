'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import WhatsAppBar, { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { createRequest } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';
import { formatPriceSAR } from '@/lib/format';

export default function RequestPage() {
  const [form, setForm] = useState({ name:'', phone:'', neighborhood:'', part:'', budget:'', note:'' });
  const [sending, setSending] = useState(false);
  const [doneId, setDoneId] = useState('');

  const whatsappHref = useMemo(() => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const budgetTxt = form.budget ? formatPriceSAR(Number(form.budget)) : 'غير محدد';
    const text = `السلام عليكم، هذا طلبي:\nالاسم: ${form.name || '-'}\nالجوال: ${form.phone || '-'}\nالحي: ${form.neighborhood || '-'}\nالجزء: ${form.part || '-'}\nالميزانية: ${budgetTxt}\nملاحظات: ${form.note || '-'}`;
    return buildWhatsAppLink({ phone, text });
  }, [form]);

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    try {
      const id = await createRequest({ ...form, budget: form.budget ? Number(form.budget) : null });
      setDoneId(id);
      window.open(whatsappHref, '_blank', 'noreferrer');
      setForm({ name:'', phone:'', neighborhood:'', part:'', budget:'', note:'' });
    } catch (err) {
      alert('حصل خطأ أثناء الإرسال. تأكد من إعداد Firebase وجرّب مرة ثانية.');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 14 }}>
        <h1 style={{ margin: '6px 0 4px' }}>أرسل طلبك</h1>
        <div className="muted">اكتب طلبك وسنرجع لك عبر واتساب</div>

        <section className="card" style={{ marginTop: 12 }}>
          <form onSubmit={submit} className="grid">
            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الاسم</div>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسمك" />
            </div>
            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الجوال</div>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05xxxxxxxx" />
            </div>

            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الحي</div>
              <select className="select" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}>
                <option value="">اختر</option>
                {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الجزء (اختياري)</div>
              <input className="input" value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} placeholder="مثال: 1ط أو 2ر" />
            </div>

            <div className="col-6">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>الميزانية (اختياري)</div>
              <input className="input" inputMode="numeric" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="مثال: 1200000" />
            </div>

            <div className="col-12">
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>ملاحظات</div>
              <textarea className="input" rows={4} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="نوع العقار، المساحة، أي تفاصيل مهمة…" />
            </div>

            <div className="col-12 row" style={{ justifyContent: 'flex-end' }}>
              <a className="btn" href={whatsappHref} target="_blank" rel="noreferrer">معاينة رسالة واتساب</a>
              <button className="btnPrimary" disabled={sending}>{sending ? 'جاري الإرسال…' : 'إرسال الطلب'}</button>
            </div>

            {doneId ? (
              <div className="col-12"><div className="badge ok">تم حفظ الطلب ✅ رقم: {doneId}</div></div>
            ) : null}
          </form>
        </section>

        <footer className="footer muted">نرد عليك بأقرب وقت. إذا تحتاج رد فوري اضغط زر واتساب أسفل الصفحة.</footer>
      </main>
      <WhatsAppBar />
    </>
  );
}
