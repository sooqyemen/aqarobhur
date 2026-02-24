'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export function buildWhatsAppLink({ phone, text }) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '#';
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${digits}?text=${msg}`;
}

export default function WhatsAppBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotification, setHasNotification] = useState(false);
  const [isMobileSmall, setIsMobileSmall] = useState(false);
  const [customText, setCustomText] = useState(
    'السلام عليكم، أريد استفسار عن عروض عقار أبحر.'
  );

  const hideTimerRef = useRef(null);
  const notificationTimerRef = useRef(null);
  const lastScrollYRef = useRef(0);

  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';

  const whatsappHref = useMemo(
    () => buildWhatsAppLink({ phone, text: customText }),
    [phone, customText]
  );

  const quickLinks = useMemo(
    () => [
      {
        label: 'عروض البيع',
        text: 'السلام عليكم، أريد عروض للبيع في عقار أبحر.',
      },
      {
        label: 'عروض الإيجار',
        text: 'السلام عليكم، أريد عروض للإيجار في عقار أبحر.',
      },
      {
        label: 'استفسار عام',
        text: 'السلام عليكم، عندي استفسار عن عقار أبحر.',
      },
      {
        label: 'طلب خاص',
        text: 'السلام عليكم، عندي طلب خاص وأريد مساعدتكم.',
      },
    ],
    []
  );

  // إخفاء/إظهار عند التمرير
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      const current = window.scrollY || 0;
      const last = lastScrollYRef.current;

      if (current > last && current > 300) {
        setIsVisible(false);
        setIsExpanded(false);
      } else if (current < last) {
        setIsVisible(true);
      }

      lastScrollYRef.current = current;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // تحديد شاشة الجوال الصغيرة (بديل media query)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apply = () => setIsMobileSmall(window.innerWidth <= 480);
    apply();

    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  // إشعار أول زيارة
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const seen = window.localStorage.getItem('whatsapp_notification_seen');
      if (!seen) {
        const t = setTimeout(() => {
          setHasNotification(true);
          setUnreadCount(1);
          try {
            window.localStorage.setItem('whatsapp_notification_seen', 'true');
          } catch {}
        }, 3000);

        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // إخفاء الإشعار تلقائيًا
  useEffect(() => {
    if (!hasNotification) return;

    notificationTimerRef.current = setTimeout(() => {
      setHasNotification(false);
    }, 8000);

    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, [hasNotification]);

  // تنظيف المؤقتات
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const dismissNotification = () => {
    setHasNotification(false);
    setUnreadCount(0);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
  };

  const toggleExpand = () => {
    setIsExpanded((v) => !v);
    if (hasNotification) dismissNotification();
  };

  const handleMouseLeave = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setIsExpanded(false), 500);
  };

  const handleMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const desktopBarStyle = {
    position: 'fixed',
    left: 24,
    bottom: 24,
    zIndex: isExpanded ? 101 : 100,
    transition: 'transform 240ms ease, opacity 240ms ease',
    transform: isVisible ? 'translateY(0)' : 'translateY(100px)',
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none',
    display: isMobileSmall ? 'none' : 'block',
    direction: 'rtl',
  };

  const panelWidth =
    typeof window !== 'undefined' && window.innerWidth <= 768
      ? Math.max(280, window.innerWidth - 32)
      : 380;

  return (
    <>
      {/* نسخة سطح المكتب / التابلت */}
      <div
        style={desktopBarStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="زر واتساب للتواصل"
      >
        {/* الإشعار العائم */}
        {hasNotification && !isExpanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 16px)',
              left: 0,
              minWidth: 320,
              maxWidth: Math.min(360, panelWidth),
              background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 18px 40px rgba(15,23,42,0.14)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#000',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: '#25D366',
                  boxShadow: '0 0 0 4px rgba(37,211,102,0.18)',
                  flex: '0 0 auto',
                }}
              />
              <div style={{ flex: 1, display: 'grid', gap: 4 }}>
                <strong style={{ fontWeight: 900, fontSize: 15 }}>تواصل معنا!</strong>
                <span style={{ fontSize: 13, opacity: 0.9 }}>اسأل عن أي عرض عبر واتساب</span>
              </div>
              <button
                type="button"
                onClick={dismissNotification}
                aria-label="إغلاق الإشعار"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: 'none',
                  background: 'rgba(0,0,0,0.1)',
                  color: '#000',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -8,
                left: 24,
                width: 16,
                height: 16,
                transform: 'rotate(45deg)',
                background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
                borderRight: '1px solid rgba(255,255,255,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </div>
        )}

        {/* القائمة الموسعة */}
        {isExpanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 16px)',
              left: 0,
              width: panelWidth,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 20px 44px rgba(15,23,42,0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
                color: '#000',
              }}
            >
              <h4 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>تواصل عبر واتساب</h4>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="إغلاق القائمة"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: 'none',
                  background: 'rgba(0,0,0,0.1)',
                  color: '#000',
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 14,
                  margin: '0 0 20px',
                  textAlign: 'center',
                }}
              >
                اختر نوع الاستفسار أو اكتب رسالتك المخصصة
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    typeof window !== 'undefined' && window.innerWidth <= 768
                      ? '1fr'
                      : 'repeat(2, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {quickLinks.map((link, index) => (
                  <a
                    key={index}
                    href={buildWhatsAppLink({ phone, text: link.text })}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`إرسال رسالة: ${link.label}`}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                      textDecoration: 'none',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="اكتب رسالتك المخصصة هنا..."
                  rows={3}
                  aria-label="نص الرسالة المخصصة"
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 14,
                    color: 'var(--text)',
                    fontSize: 14,
                    resize: 'none',
                    outline: 'none',
                    marginBottom: 12,
                    fontFamily: 'inherit',
                    background: '#fff',
                  }}
                />

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="إرسال الرسالة المخصصة"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    borderRadius: 12,
                    padding: 14,
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: 15,
                    border: '1px solid rgba(214,179,91,0.28)',
                  }}
                >
                  إرسال الرسالة
                </a>
              </div>
            </div>

            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
                color: 'var(--muted)',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>واتساب:</span>
                <span style={{ fontWeight: 700 }}>{phone}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>متوسط وقت الرد: 15 دقيقة</span>
              </div>
            </div>
          </div>
        )}

        {/* الزر الرئيسي */}
        <button
          type="button"
          onClick={toggleExpand}
          aria-label={isExpanded ? 'إغلاق قائمة واتساب' : 'فتح قائمة واتساب'}
          aria-expanded={isExpanded}
          style={{
            width: '100%',
            minWidth:
              typeof window !== 'undefined' && window.innerWidth <= 768 ? 220 : 260,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.2)',
            padding: 0,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            boxShadow: '0 12px 32px rgba(37,211,102,0.30)',
          }}
        >
          {/* توهج خفيف */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.24) 0%, transparent 70%)',
              opacity: isExpanded ? 1 : 0.75,
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding:
                typeof window !== 'undefined' && window.innerWidth <= 768
                  ? '14px 16px'
                  : '16px 20px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flex: '0 0 auto',
              }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a9.5 9.5 0 0 0-8.2 14.3L3 22l5.9-0.8A9.5 9.5 0 1 0 12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.2 8.5c.2-.5.4-.5.6-.5h.6c.2 0 .4 0 .5.4l.7 1.7c.1.3.1.5-.1.7l-.4.5c-.1.2-.1.4 0 .6.5.8 1.4 1.7 2.2 2.2.2.1.4.1.6 0l.5-.4c.2-.2.4-.2.7-.1l1.7.7c.3.1.4.3.4.5v.6c0 .2 0 .4-.5.6-.5.2-1.6.6-3.7-.3-2.1-1-3.7-3.1-4.1-3.8-.4-.7-.9-2.4-.3-3.8Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
                color: '#fff',
                textAlign: 'right',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 900 }}>تواصل واتساب</span>
              <span style={{ fontSize: 12, opacity: 0.9 }}>اسأل عن أي عرض</span>
            </div>

            {unreadCount > 0 && (
              <div
                aria-label={`${unreadCount} رسالة غير مقروءة`}
                style={{
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  minWidth: 24,
                  height: 24,
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#fff',
                  border: '2px solid var(--bg2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  padding: '0 6px',
                }}
              >
                {unreadCount}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* نسخة الجوال الصغيرة */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="فتح واتساب مباشرة"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          color: '#fff',
          textDecoration: 'none',
          boxShadow: '0 8px 24px rgba(37,211,102,0.4)',
          zIndex: 100,
          display: isMobileSmall ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex', lineHeight: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2a9.5 9.5 0 0 0-8.2 14.3L3 22l5.9-0.8A9.5 9.5 0 1 0 12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M9.2 8.5c.2-.5.4-.5.6-.5h.6c.2 0 .4 0 .5.4l.7 1.7c.1.3.1.5-.1.7l-.4.5c-.1.2-.1.4 0 .6.5.8 1.4 1.7 2.2 2.2.2.1.4.1.6 0l.5-.4c.2-.2.4-.2.7-.1l1.7.7c.3.1.4.3.4.5v.6c0 .2 0 .4-.5.6-.5.2-1.6.6-3.7-.3-2.1-1-3.7-3.1-4.1-3.8-.4-.7-.9-2.4-.3-3.8Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </a>
    </>
  );
}
