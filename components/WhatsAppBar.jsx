'use client';

export function buildWhatsAppLink({ phone, text }) {
  const digits = String(phone || '').replace(/\D/g, '');
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${digits}?text=${msg}`;
}

export default function WhatsAppBar() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const text = 'السلام عليكم، أبغى استفسار عن عروض عقار أبحر.';
  const href = buildWhatsAppLink({ phone, text });

  return (
    <div className="whatsBar">
      <div className="whatsInner">
        <div>
          <div style={{ fontWeight: 700 }}>تواصل واتساب</div>
          <div className="muted" style={{ fontSize: 12 }}>رد سريع • أرسل طلبك أو استفسارك الآن</div>
        </div>
        <a className="btnPrimary" href={href} target="_blank" rel="noreferrer">فتح واتساب</a>
      </div>
    </div>
  );
}
