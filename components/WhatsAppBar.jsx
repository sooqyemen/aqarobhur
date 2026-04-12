'use client';

import { useEffect, useMemo, useState } from 'react';

// بناء رابط الواتساب بشكل صحيح
export function buildWhatsAppLink({ phone, text }) {
  const digits = String(phone || '').replace(/\D/g, '');
  const encoded = encodeURIComponent(String(text || '').trim());
  return digits ? `https://wa.me/${digits}${encoded ? `?text=${encoded}` : ''}` : '#';
}

export default function WhatsAppBar() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  
  // النص الافتراضي للمربع النصي
  const [customText, setCustomText] = useState('السلام عليكم، أريد استفسار عن عروض عقار أبحر.');

  // رقم واتساب عقار أبحر
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';

  // تأخير بسيط لظهور الشريط لزيادة التفاعل
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  // الخيارات السريعة المأخوذة من مشروع عقار أبحر
  const quickLinks = useMemo(
    () => [
      { label: 'عروض البيع', text: 'السلام عليكم، أريد عروض للبيع في عقار أبحر.' },
      { label: 'عروض الإيجار', text: 'السلام عليكم، أريد عروض للإيجار في عقار أبحر.' },
      { label: 'استفسار عام', text: 'السلام عليكم، عندي استفسار عن عقار أبحر.' },
      { label: 'طلب خاص', text: 'السلام عليكم، عندي طلب خاص وأريد مساعدتكم.' },
    ],
    []
  );

  const customHref = useMemo(() => {
    return buildWhatsAppLink({ phone, text: customText });
  }, [phone, customText]);

  if (!mounted) return null;

  return (
    <>
      <div className={`whatsappWrapper ${open ? 'isOpen' : ''}`}>
        {open && (
          <div className="supportCard">
            <div className="cardHeader">
              <div className="statusDot"></div>
              <div className="supportInfo">
                <strong>الدعم العقاري</strong>
                <span>متصل الآن - جاهزون لخدمتك</span>
              </div>
              <button className="closeBtn" onClick={() => setOpen(false)}>✕</button>
            </div>
            
            <div className="cardBody">
              <p className="hintText">اختر نوع الاستفسار السريع:</p>
              
              <div className="quickLinksGrid">
                {quickLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={buildWhatsAppLink({ phone, text: link.text })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quickLinkBtn"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <p className="hintText" style={{ marginTop: '15px' }}>أو اكتب رسالتك المخصصة هنا:</p>
              
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows="2"
                className="customTextArea"
              />

              <a href={customHref} target="_blank" rel="noopener noreferrer" className="chatBtn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.5 3.47 1.44 4.96L2 22l5.3-1.53c1.46.88 3.13 1.34 4.82 1.34 5.46 0 9.91-4.45 9.91-9.91 0-5.45-4.45-9.9-9.91-9.9zm0 18.18c-1.5 0-2.97-.44-4.22-1.27l-.3-.18-3.16.96.96-3.1-.2-.31a7.9 7.9 0 0 1-1.35-4.37c0-4.37 3.56-7.93 7.93-7.93 4.37 0 7.93 3.56 7.93 7.93 0 4.37-3.56 7.93-7.93 7.93zm4.09-5.86c-.22-.11-1.31-.65-1.51-.72-.2-.07-.35-.11-.5.11-.15.22-.58.72-.71.87-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.09-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.21-.69-1.66-.18-.44-.36-.38-.5-.38h-.43c-.15 0-.39.06-.6.28-.22.22-.83.81-.83 1.98 0 1.17.85 2.3.97 2.46.12.16 1.67 2.55 4.04 3.58.57.24 1.01.38 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.31-.54 1.49-1.06.18-.52.18-.97.13-1.06-.05-.09-.19-.15-.41-.26z"/>
                </svg>
                إرسال عبر واتساب
              </a>
            </div>
          </div>
        )}

        <button className="mainFab" onClick={() => setOpen(!open)} aria-label="واتساب">
          <span className="pulseEffect"></span>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="white">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.5 3.47 1.44 4.96L2 22l5.3-1.53c1.46.88 3.13 1.34 4.82 1.34 5.46 0 9.91-4.45 9.91-9.91 0-5.45-4.45-9.9-9.91-9.9zm0 18.18c-1.5 0-2.97-.44-4.22-1.27l-.3-.18-3.16.96.96-3.1-.2-.31a7.9 7.9 0 0 1-1.35-4.37c0-4.37 3.56-7.93 7.93-7.93 4.37 0 7.93 3.56 7.93 7.93 0 4.37-3.56 7.93-7.93 7.93zm4.09-5.86c-.22-.11-1.31-.65-1.51-.72-.2-.07-.35-.11-.5.11-.15.22-.58.72-.71.87-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.09-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.21-.69-1.66-.18-.44-.36-.38-.5-.38h-.43c-.15 0-.39.06-.6.28-.22.22-.83.81-.83 1.98 0 1.17.85 2.3.97 2.46.12.16 1.67 2.55 4.04 3.58.57.24 1.01.38 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.31-.54 1.49-1.06.18-.52.18-.97.13-1.06-.05-.09-.19-.15-.41-.26z"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .whatsappWrapper {
          position: fixed;
          left: 20px;
          bottom: 100px;
          z-index: 6000;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 15px;
        }

        .supportCard {
          width: 320px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 15px 45px rgba(0,0,0,0.15);
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cardHeader {
          background: #075e54;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          position: relative;
        }

        .statusDot {
          width: 10px; height: 10px;
          background: #25d366;
          border-radius: 50%;
          border: 2px solid white;
        }

        .supportInfo strong { display: block; font-size: 15px; }
        .supportInfo span { font-size: 11px; opacity: 0.8; }

        .closeBtn {
          position: absolute;
          left: 15px; top: 15px;
          background: none; border: none; color: white;
          cursor: pointer; font-size: 18px; font-weight: bold;
        }

        .cardBody { padding: 18px; }
        
        .hintText {
          margin: 0 0 10px;
          font-size: 13px;
          color: #64748b;
          font-weight: 700;
        }

        .quickLinksGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .quickLinkBtn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          padding: 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
          transition: all 0.2s;
        }

        .quickLinkBtn:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }

        .customTextArea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          resize: none;
          margin-bottom: 15px;
          outline: none;
          transition: border-color 0.2s;
        }

        .customTextArea:focus {
          border-color: #25d366;
        }

        .chatBtn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #25d366; color: white; text-decoration: none;
          padding: 14px; border-radius: 12px; font-weight: 800; font-size: 15px;
          transition: background 0.2s;
        }
        .chatBtn:hover { background: #128c7e; }

        .mainFab {
          width: 65px; height: 65px;
          border-radius: 50%; border: none;
          background: linear-gradient(135deg, #25D366, #128c7e);
          box-shadow: 0 10px 25px rgba(37,211,102,0.3);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          position: relative; transition: transform 0.2s;
        }
        .mainFab:hover { transform: scale(1.05); }

        .pulseEffect {
          position: absolute;
          width: 100%; height: 100%;
          border-radius: 50%;
          background: #25d366;
          opacity: 0.4;
          animation: pulse 2s infinite;
          z-index: -1;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
          .supportCard { width: 280px; }
          .whatsappWrapper { bottom: 90px; left: 15px; }
        }
      `}</style>
    </>
  );
}
