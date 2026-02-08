// components/WhatsAppFloat.jsx
'use client';

import { buildWhatsAppLinkSimple } from './WhatsAppBar';

export default function WhatsAppFloat() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
  const text = 'السلام عليكم، أبغى استفسار عن عروض الفلل .';
  const href = buildWhatsAppLinkSimple(phone, text);

  return (
    <a 
      className="whatsAppFloat"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا على واتساب"
    >
      <div className="floatIcon">💬</div>
      <div className="floatLabel">واتساب</div>
      <div className="floatBadge">جديد</div>
    </a>
  );
}
