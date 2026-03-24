'use client';

import Link from 'next/link';

export default function Footer() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const waDigits = String(phone).replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${waDigits}`;

  const mainLinks = [
    { href: '/', label: 'الرئيسية' },
    { href: '/listings', label: 'كل العروض' },
    { href: '/map', label: 'الخريطة' },
    { href: '/neighborhoods', label: 'الأحياء' },
    { href: '/request', label: 'أرسل طلبك' },
  ];

  return (
    <footer
      style={{
        marginTop: 28,
        borderTop: '1px solid var(--border)',
        background: 'linear-gradient(180deg, #ffffff, #fffdf8)',
      }}
    >
      <div className="container" style={{ paddingTop: 18, paddingBottom: 20 }}>
        <div
          className="card"
          style={{
            padding: 18,
            background: 'linear-gradient(180deg, #ffffff, #fffefb)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-icon-128.png"
                  alt="عقار أبحر"
                  style={{
                    width: 50,
                    height: 50,
                    objectFit: 'contain',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: '#fff',
                    padding: 6,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 950, fontSize: 20 }}>عقار أبحر</div>
                  <div style={{ color: 'var(--muted)', marginTop: 3 }}>عروض عقارية في شمال جدة</div>
                </div>
              </div>

              <p style={{ margin: '12px 0 0', color: 'var(--muted)', lineHeight: 1.9, fontSize: 14 }}>
                منصة تعرض العقارات بشكل مرتب وواضح، مع تركيز على أبحر الشمالية وشمال جدة، وتسهيل الوصول إلى العرض المناسب بسرعة.
              </p>
            </div>

            <div style={{ minWidth: 240, flex: '1 1 240px' }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>روابط سريعة</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {mainLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      textDecoration: 'none',
                      border: '1px solid var(--border)',
                      background: '#fff',
                      padding: '9px 12px',
                      borderRadius: 999,
                      fontWeight: 800,
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div style={{ minWidth: 220, flex: '1 1 220px' }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>التواصل</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'none',
                    border: '1px solid var(--border)',
                    background: '#fff',
                    padding: '12px 14px',
                    borderRadius: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 800 }}>واتساب</span>
                  <span style={{ color: 'var(--muted)', direction: 'ltr' }}>{phone}</span>
                </a>

                <div
                  style={{
                    border: '1px solid var(--border)',
                    background: '#fff',
                    padding: '12px 14px',
                    borderRadius: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 800 }}>البريد</span>
                  <span style={{ color: 'var(--muted)' }}>info@aqarobhur.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            color: 'var(--muted)',
            fontSize: 13,
            flexWrap: 'wrap',
          }}
        >
          <span>© {new Date().getFullYear()} عقار أبحر. جميع الحقوق محفوظة.</span>
          <span>شمال جدة • أبحر الشمالية</span>
        </div>
      </div>
    </footer>
  );
}
