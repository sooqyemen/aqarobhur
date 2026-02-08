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
    <div className="waFloat" aria-label="زر واتساب عائم">
      <a
        className="waBtn"
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label="فتح واتساب للتواصل"
        title="تواصل واتساب"
      >
        {/* WhatsApp glyph (simple) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2a9.5 9.5 0 0 0-8.2 14.3L3 22l5.9-0.8A9.5 9.5 0 1 0 12 2Z"
            stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
          />
          <path
            d="M9.2 8.5c.2-.5.4-.5.6-.5h.6c.2 0 .4 0 .5.4l.7 1.7c.1.3.1.5-.1.7l-.4.5c-.1.2-.1.4 0 .6.5.8 1.4 1.7 2.2 2.2.2.1.4.1.6 0l.5-.4c.2-.2.4-.2.7-.1l1.7.7c.3.1.4.3.4.5v.6c0 .2 0 .4-.5.6-.5.2-1.6.6-3.7-.3-2.1-1-3.7-3.1-4.1-3.8-.4-.7-.9-2.4-.3-3.8Z"
            fill="currentColor"
          />
        </svg>
        <span className="waTip">تواصل واتساب</span>
      </a>
    </div>
  );
}
