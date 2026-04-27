'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { createRequest } from '@/lib/requestService';

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toLocaleString('ar-SA')} ريال`;
}

function buildOfficeText({ question, result, customerPhone = '' }) {
  const items = Array.isArray(result?.items) ? result.items : [];
  const lines = [
    'السلام عليكم، طلب متابعة من صفحة العقاري الذكي:',
    customerPhone ? `رقم جوال العميل: ${customerPhone}` : '',
    question ? `طلب العميل: ${question}` : '',
    '',
  ].filter(Boolean);

  if (items.length) {
    lines.push('العروض المقترحة للعميل:');
    items.forEach((item, index) => {
      lines.push([
        `${index + 1}. ${item.title || item.generatedTitle || 'عرض عقاري'}`,
        item.neighborhood ? `الحي: ${item.neighborhood}` : '',
        item.price ? `السعر: ${formatPrice(item.price)}` : '',
        item.area ? `المساحة: ${item.area}م²` : '',
        item.url ? `الرابط: https://aqarobhur.com${item.url}` : '',
      ].filter(Boolean).join(' - '));
    });
  } else {
    lines.push('لم تظهر عروض مطابقة، والعميل يرغب بالمتابعة عند توفر عرض مناسب.');
  }

  return lines.join('\n');
}

function OfferCard({ item, index }) {
  return (
    <div className="offerCard">
      {item.image ? (
        <img className="offerImage" src={item.image} alt={item.title || 'عرض عقاري'} loading="lazy" />
      ) : (
        <div className="offerImage emptyImage">
          <span className="material-icons-outlined">villa</span>
        </div>
      )}

      <div className="offerBody">
        <div className="offerTitleRow">
          <span className="offerNumber">{index + 1}</span>
          <h3>{item.title || item.generatedTitle || 'عرض عقاري'}</h3>
        </div>

        <div className="offerChips">
          {item.neighborhood ? <span>{item.neighborhood}</span> : null}
          {item.price ? <span>{formatPrice(item.price)}</span> : null}
          {item.area ? <span>{item.area}م²</span> : null}
          {item.summary ? <span>{item.summary}</span> : null}
        </div>

        {item.description ? <p>{item.description}</p> : null}

        {item.url ? (
          <Link href={item.url} className="offerLink">
            عرض تفاصيل الإعلان
            <span className="material-icons-outlined">arrow_back</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function SmartAssistantPage() {
  const officePhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [leadError, setLeadError] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  async function runSearch(e) {
    e?.preventDefault?.();
    const cleanQuestion = String(question || '').trim();
    setError('');
    setResult(null);
    setLeadStatus('');
    setLeadError('');

    if (!cleanQuestion) {
      setError('اكتب طلبك العقاري أولاً.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'تعذر تنفيذ البحث الذكي.');
      setResult(data);

      try {
        await createRequest({
          requestKind: 'smart_assistant_conversation',
          sourceType: 'العقاري الذكي',
          source: 'smart-page-search',
          name: 'زائر العقاري الذكي',
          phone: '',
          note: `طلب العميل: ${cleanQuestion}\n\nنتيجة العقاري الذكي:\n${data?.answer || ''}`,
          rawText: JSON.stringify(data || {}, null, 2),
          waText: data?.whatsappText || data?.answer || cleanQuestion,
          status: 'new',
        });
      } catch (_) {}
    } catch (err) {
      setError(err?.message || 'تعذر تنفيذ البحث الذكي.');
    } finally {
      setBusy(false);
    }
  }

  async function savePhoneLead() {
    const cleanPhone = String(customerPhone || '').replace(/[^0-9+]/g, '').trim();
    setLeadStatus('');
    setLeadError('');

    if (!cleanPhone || cleanPhone.length < 8) {
      setLeadError('اكتب رقم جوال صحيح ليتم إرسال العروض المتوفرة لك عبر واتساب.');
      return;
    }

    setSavingLead(true);
    try {
      const text = buildOfficeText({ question, result, customerPhone: cleanPhone });
      await createRequest({
        requestKind: 'smart_assistant_phone_lead',
        sourceType: 'العقاري الذكي',
        source: 'smart-page-phone-lead',
        name: 'عميل العقاري الذكي',
        phone: cleanPhone,
        note: text,
        rawText: text,
        waText: text,
        status: 'new',
      });

      setLeadStatus('تم حفظ رقمك وطلبك، وسنرسل لك العروض المتوفرة مع التفاصيل عبر واتساب.');
      const wa = buildWhatsAppLink({ phone: officePhone, text });
      if (wa) window.open(wa, '_blank');
    } catch {
      setLeadError('تعذر حفظ رقم الجوال الآن. حاول مرة أخرى أو تواصل معنا عبر واتساب.');
    } finally {
      setSavingLead(false);
    }
  }

  const directWhatsApp = buildWhatsAppLink({
    phone: officePhone,
    text: result?.whatsappText || `السلام عليكم، أبحث عن عقار مناسب: ${question}`,
  });

  const items = Array.isArray(result?.items) ? result.items : [];

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <main className="smartPage">
        <section className="smartHero">
          <div className="container smartHeroInner">
            <span className="smartBadge">العقاري الذكي</span>
            <h1>اكتب طلبك وسنبحث لك في عروض عقار أبحر</h1>
            <p>اكتب طلبك بلغة بسيطة مثل: أبغى أرض في الياقوت بحدود مليون، أو شقة للإيجار في أبحر الشمالية.</p>
          </div>
        </section>

        <div className="container smartContainer">
          <section className="smartSearchCard">
            <form onSubmit={runSearch}>
              <label>اكتب طلبك العقاري</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="مثال: أبحث عن أرض للبيع في الياقوت بحدود مليون ريال، مساحة لا تقل عن 400 متر"
                rows={5}
              />

              {error ? <div className="smartError">{error}</div> : null}

              <button type="submit" disabled={busy}>
                <span className="material-icons-outlined">smart_toy</span>
                {busy ? 'جاري البحث...' : 'ابحث بالعقاري الذكي'}
              </button>
            </form>
          </section>

          {result ? (
            <section className="smartResultSection">
              <div className="resultHeader">
                <div>
                  <span>نتيجة البحث</span>
                  <h2>{items.length ? `وجدنا ${items.length} عروض مناسبة` : 'نتيجة العقاري الذكي'}</h2>
                </div>
                <a href={directWhatsApp} target="_blank" rel="noopener noreferrer" className="directWaBtn">
                  واتساب مباشر
                </a>
              </div>

              {items.length ? (
                <div className="offersGrid">
                  {items.map((item, index) => <OfferCard key={item.id || index} item={item} index={index} />)}
                </div>
              ) : (
                <div className="smartAnswer">{result.answer}</div>
              )}

              <div className="phoneLeadBox">
                <div>
                  <h3>إرسال العروض على واتساب</h3>
                  <p>اكتب رقم جوالك اختياريًا، ونحفظ طلبك عندنا ثم نرسل لك العروض المتوفرة مع التفاصيل.</p>
                </div>
                <div className="phoneLeadForm">
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="05XXXXXXXX" inputMode="tel" />
                  <button type="button" onClick={savePhoneLead} disabled={savingLead}>{savingLead ? 'جاري الحفظ...' : 'إرسال العروض لي'}</button>
                </div>
                {leadStatus ? <div className="leadSuccess">{leadStatus}</div> : null}
                {leadError ? <div className="smartError">{leadError}</div> : null}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <style jsx>{`
        .smartPage {
          background: #f8fafc;
          min-height: 80vh;
          padding-bottom: 70px;
        }

        .smartHero {
          background: linear-gradient(135deg, #0f172a, #0f766e);
          color: #fff;
          padding: 70px 0 110px;
          text-align: center;
        }

        .smartHeroInner {
          max-width: 860px;
        }

        .smartBadge {
          display: inline-flex;
          padding: 8px 15px;
          border-radius: 999px;
          background: rgba(255,255,255,.14);
          border: 1px solid rgba(255,255,255,.22);
          font-weight: 900;
          margin-bottom: 14px;
        }

        .smartHero h1 {
          margin: 0;
          font-size: clamp(30px, 6vw, 52px);
          line-height: 1.35;
          font-weight: 950;
        }

        .smartHero p {
          margin: 16px auto 0;
          max-width: 720px;
          color: rgba(255,255,255,.84);
          font-weight: 700;
          line-height: 1.9;
        }

        .smartContainer {
          margin-top: -72px;
          display: grid;
          gap: 22px;
        }

        .smartSearchCard,
        .smartResultSection {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 26px;
          padding: 24px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, .08);
        }

        .smartSearchCard label {
          display: block;
          font-weight: 950;
          color: var(--text);
          margin-bottom: 10px;
        }

        .smartSearchCard textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
          resize: vertical;
          min-height: 150px;
          line-height: 1.9;
          font-weight: 700;
          color: var(--text);
          background: #fcfcfd;
        }

        .smartSearchCard button,
        .phoneLeadForm button {
          margin-top: 14px;
          width: 100%;
          border: 0;
          border-radius: 18px;
          min-height: 56px;
          background: var(--primary);
          color: #fff;
          font-weight: 950;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        .smartSearchCard button:disabled,
        .phoneLeadForm button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .resultHeader {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-end;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .resultHeader span {
          color: var(--primary);
          font-weight: 950;
          font-size: 13px;
        }

        .resultHeader h2 {
          margin: 6px 0 0;
          color: var(--text);
          font-size: clamp(22px, 4vw, 32px);
        }

        .directWaBtn {
          background: #25d366;
          color: #fff;
          border-radius: 999px;
          padding: 11px 17px;
          font-weight: 950;
        }

        .offersGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
          gap: 16px;
        }

        .offerCard {
          border: 1px solid var(--border);
          border-radius: 22px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 10px 26px rgba(15, 23, 42, .05);
        }

        .offerImage {
          width: 100%;
          height: 170px;
          object-fit: cover;
          display: block;
          background: #eef3f9;
        }

        .emptyImage {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .emptyImage .material-icons-outlined {
          font-size: 44px;
        }

        .offerBody {
          padding: 15px;
        }

        .offerTitleRow {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
        }

        .offerNumber {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--primary);
          color: #fff;
          font-weight: 950;
          flex-shrink: 0;
        }

        .offerTitleRow h3 {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
        }

        .offerChips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .offerChips span {
          border: 1px solid var(--border);
          background: #f8fafc;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 13px;
          color: var(--muted);
          font-weight: 800;
        }

        .offerBody p {
          margin: 10px 0 0;
          color: var(--muted);
          line-height: 1.8;
          font-size: 13px;
          font-weight: 700;
        }

        .offerLink {
          margin-top: 12px;
          color: var(--primary);
          font-weight: 950;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .phoneLeadBox {
          margin-top: 20px;
          padding: 18px;
          border: 1px solid rgba(15, 118, 110, .18);
          background: #f0fdfa;
          border-radius: 22px;
        }

        .phoneLeadBox h3 {
          margin: 0 0 6px;
          color: var(--text);
          font-weight: 950;
        }

        .phoneLeadBox p {
          margin: 0 0 14px;
          color: var(--muted);
          line-height: 1.8;
          font-weight: 800;
        }

        .phoneLeadForm {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .phoneLeadForm input {
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 16px;
          padding: 0 14px;
          min-height: 54px;
          font-weight: 800;
        }

        .phoneLeadForm button {
          margin-top: 0;
          width: auto;
          padding: 0 18px;
        }

        .smartError,
        .leadSuccess {
          margin-top: 12px;
          font-weight: 900;
          line-height: 1.8;
        }

        .smartError {
          color: var(--danger);
        }

        .leadSuccess {
          color: var(--success);
        }

        .smartAnswer {
          background: #f8fafc;
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
          color: var(--text);
          line-height: 1.9;
          font-weight: 800;
          white-space: pre-wrap;
        }

        @media (max-width: 640px) {
          .smartHero {
            padding: 48px 0 95px;
          }

          .smartSearchCard,
          .smartResultSection {
            padding: 18px;
            border-radius: 22px;
          }

          .phoneLeadForm {
            grid-template-columns: 1fr;
          }

          .phoneLeadForm button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
