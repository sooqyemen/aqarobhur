'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export function buildWhatsAppLink({ phone, text }) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '#';
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${digits}?text=${msg}`;
}

export default function WhatsAppBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotification, setHasNotification] = useState(false);
  const timeoutRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  // معلومات الواتساب
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const defaultText = 'السلام عليكم، أريد استفسار عن عروض عقار أبحر.';
  const whatsappHref = buildWhatsAppLink({ phone, text: defaultText });

  // إخفاء/إظهار الزر عند التمرير
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 300) {
        // التمرير لأسفل - إخفاء الزر
        setIsVisible(false);
        setIsExpanded(false);
      } else if (currentScrollY < lastScrollY) {
        // التمرير لأعلى - إظهار الزر
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // إضافة إشعار عند أول زيارة
  useEffect(() => {
    const hasSeenNotification = localStorage.getItem('whatsapp_notification_seen');
    
    if (!hasSeenNotification) {
      setTimeout(() => {
        setHasNotification(true);
        setUnreadCount(1);
        
        // حفظ أن المستخدم رأى الإشعار
        localStorage.setItem('whatsapp_notification_seen', 'true');
      }, 3000);
    }
  }, []);

  // إخفاء الإشعار بعد فترة
  useEffect(() => {
    if (hasNotification) {
      notificationTimeoutRef.current = setTimeout(() => {
        setHasNotification(false);
      }, 8000);
    }

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [hasNotification]);

  // إخفاء الإشعار يدوياً
  const dismissNotification = () => {
    setHasNotification(false);
    setUnreadCount(0);
    
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
  };

  // تأخير إغلاق القائمة الموسعة
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    timeoutRef.current = setTimeout(() => {
      if (!isHovered) {
        setIsExpanded(false);
      }
    }, 500);
  };

  // التبديل بين الحالتين
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (hasNotification) dismissNotification();
  };

  // روابط سريعة
  const quickLinks = [
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
    }
  ];

  return (
    <div 
      className={`whatsappBar ${isVisible ? 'visible' : 'hidden'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="زر واتساب للتواصل"
    >
      {/* الإشعار العائم */}
      {hasNotification && (
        <div className="whatsappNotification">
          <div className="notificationContent">
            <div className="notificationIcon" aria-hidden="true" />
            <div className="notificationText">
              <strong>تواصل معنا!</strong>
              <span>اسأل عن أي عرض عبر واتساب</span>
            </div>
            <button 
              className="notificationClose" 
              onClick={dismissNotification}
              aria-label="إغلاق الإشعار"
            >
              ✕
            </button>
          </div>
          <div className="notificationArrow" />
        </div>
      )}

      {/* القائمة الموسعة */}
      {isExpanded && (
        <div className="whatsappExpanded">
          <div className="expandedHeader">
            <h4 className="expandedTitle">تواصل عبر واتساب</h4>
            <button 
              className="expandedClose" 
              onClick={() => setIsExpanded(false)}
              aria-label="إغلاق القائمة"
            >
              ✕
            </button>
          </div>
          
          <div className="expandedContent">
            <p className="expandedDescription">
              اختر نوع الاستفسار أو اكتب رسالتك المخصصة
            </p>
            
            <div className="quickMessages">
              {quickLinks.map((link, index) => (
                <a
                  key={index}
                  href={buildWhatsAppLink({ phone, text: link.text })}
                  className="quickMessage"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`إرسال رسالة: ${link.label}`}
                >
                  <span className="messageLabel">{link.label}</span>
                </a>
              ))}
            </div>
            
            <div className="customMessage">
              <textarea 
                className="messageInput" 
                placeholder="اكتب رسالتك المخصصة هنا..."
                rows="3"
                defaultValue={defaultText}
                aria-label="نص الرسالة المخصصة"
              />
              <a 
                href={whatsappHref} 
                className="sendCustomButton"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="إرسال الرسالة المخصصة"
              >
                <span className="sendText">إرسال الرسالة</span>
              </a>
            </div>
          </div>
          
          <div className="expandedFooter">
            <div className="contactInfo">
              <span className="contactLabel">واتساب:</span>
              <span className="contactNumber">{phone}</span>
            </div>
            <div className="responseTime">
              <span className="timeText">متوسط وقت الرد: 15 دقيقة</span>
            </div>
          </div>
        </div>
      )}

      {/* الزر الرئيسي */}
      <button
        className={`whatsappButton ${isExpanded ? 'active' : ''}`}
        onClick={toggleExpand}
        aria-label={isExpanded ? 'إغلاق قائمة واتساب' : 'فتح قائمة واتساب'}
        aria-expanded={isExpanded}
      >
        <div className="buttonInner">
          {/* أيقونة الواتساب */}
          <div className="whatsappIcon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

          {/* نص الزر */}
          <div className="buttonText">
            <span className="buttonLabel">تواصل واتساب</span>
            <span className="buttonSub">اسأل عن أي عرض</span>
          </div>

          {/* مؤشر الرسائل غير المقروءة */}
          {unreadCount > 0 && (
            <div className="unreadBadge" aria-label={`${unreadCount} رسالة غير مقروءة`}>
              {unreadCount}
            </div>
          )}

          {/* بدون رموز */}
        </div>

        {/* تأثير التوهج */}
        <div className="buttonGlow" />
        
        {/* تأثير النبض */}
        <div className="pulseEffect" />
      </button>

      {/* زر مساعد للجوال */}
      <a
        href={whatsappHref}
        className="whatsappMobileButton"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="فتح واتساب مباشرة"
      >
        <span className="mobileIcon" aria-hidden="true">
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

      <style jsx>{`
        .whatsappBar {
          position: fixed;
          left: 24px;
          bottom: 24px;
          z-index: 100;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .whatsappBar.visible {
          transform: translateY(0);
          opacity: 1;
        }

        .whatsappBar.hidden {
          transform: translateY(100px);
          opacity: 0;
          pointer-events: none;
        }

        .whatsappBar.expanded {
          z-index: 101;
        }

        /* الإشعار العائم */
        .whatsappNotification {
          position: absolute;
          bottom: calc(100% + 16px);
          left: 0;
          right: 0;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.5s ease-out;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          min-width: 320px;
        }

        .notificationContent {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #000;
        }

        .notificationIcon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .notificationText {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .notificationText strong {
          font-weight: 900;
          font-size: 15px;
        }

        .notificationText span {
          font-size: 13px;
          opacity: 0.9;
        }

        .notificationClose {
          background: rgba(0, 0, 0, 0.1);
          border: none;
          color: #000;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 900;
          font-size: 14px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .notificationClose:hover {
          background: rgba(0, 0, 0, 0.2);
          transform: scale(1.1);
        }

        .notificationArrow {
          position: absolute;
          bottom: -8px;
          left: 24px;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          transform: rotate(45deg);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* القائمة الموسعة */
        .whatsappExpanded {
          position: absolute;
          bottom: calc(100% + 16px);
          left: 0;
          width: 380px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          animation: scaleIn 0.3s ease-out;
          backdrop-filter: blur(20px);
        }

        .expandedHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          color: #000;
        }

        .expandedTitle {
          font-size: 18px;
          font-weight: 900;
          margin: 0;
        }

        .expandedClose {
          background: rgba(0, 0, 0, 0.1);
          border: none;
          color: #000;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 900;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .expandedClose:hover {
          background: rgba(0, 0, 0, 0.2);
          transform: scale(1.1);
        }

        .expandedContent {
          padding: 20px;
        }

        .expandedDescription {
          color: var(--muted);
          font-size: 14px;
          margin: 0 0 20px 0;
          text-align: center;
        }

        /* الرسائل السريعة */
        .quickMessages {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .quickMessage {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--text);
          transition: all 0.2s ease;
        }

        .quickMessage:hover {
          background: var(--primary-light);
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .messageIcon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .messageLabel {
          font-size: 13px;
          font-weight: 700;
          text-align: right;
          flex: 1;
        }

        /* الرسالة المخصصة */
        .customMessage {
          margin-top: 20px;
        }

        .messageInput {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          color: var(--text);
          font-size: 14px;
          resize: none;
          outline: none;
          margin-bottom: 12px;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .messageInput:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .messageInput::placeholder {
          color: var(--muted);
        }

        .sendCustomButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border: none;
          border-radius: 12px;
          padding: 14px;
          color: #000;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .sendCustomButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.3);
        }

        .sendIcon {
          font-size: 18px;
        }

        /* تذييل القائمة الموسعة */
        .expandedFooter {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .contactInfo,
        .responseTime {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--muted);
        }

        .contactIcon,
        .timeIcon {
          font-size: 14px;
        }

        .contactNumber,
        .timeText {
          font-weight: 700;
        }

        /* الزر الرئيسي */
        .whatsappButton {
          width: 100%;
          min-width: 260px;
          background: linear-gradient(135deg, #25D366, #128C7E);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 18px;
          padding: 0;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 12px 32px rgba(37, 211, 102, 0.3);
        }

        .whatsappButton:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(37, 211, 102, 0.4);
        }

        .whatsappButton.active {
          border-radius: 18px 18px 0 0;
        }

        .buttonInner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          position: relative;
          z-index: 2;
        }

        .whatsappIcon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .buttonText {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          color: white;
        }

        .buttonLabel {
          font-size: 16px;
          font-weight: 900;
        }

        .buttonSub {
          font-size: 12px;
          opacity: 0.9;
        }

        .unreadBadge {
          position: absolute;
          top: -8px;
          left: -8px;
          background: #ef4444;
          color: white;
          font-size: 12px;
          font-weight: 900;
          min-width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg2);
          animation: pulse 2s infinite;
        }

        /* تأثير التوهج */
        .buttonGlow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.3) 0%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1;
        }

        .whatsappButton:hover .buttonGlow {
          opacity: 1;
        }

        /* تأثير النبض */
        .pulseEffect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 18px;
          border: 2px solid rgba(37, 211, 102, 0.6);
          animation: pulseBorder 2s infinite;
          z-index: 0;
        }

        @keyframes pulseBorder {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }

        /* زر الجوال */
        .whatsappMobileButton {
          display: none;
          position: fixed;
          right: 20px;
          bottom: 20px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #25D366, #128C7E);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4);
          z-index: 100;
          transition: all 0.3s ease;
        }

        .whatsappMobileButton:hover {
          transform: scale(1.1);
        }

        .mobileIcon {
          font-size: 28px;
        }

        /* تأثيرات الحركة */
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1.1);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        /* التجاوب مع الشاشات المختلفة */
        @media (max-width: 768px) {
          .whatsappBar {
            left: 16px;
            bottom: 16px;
          }
          
          .whatsappExpanded {
            width: calc(100vw - 32px);
            left: 50%;
            transform: translateX(-50%);
          }
          
          .whatsappButton {
            min-width: 220px;
          }
          
          .buttonInner {
            padding: 14px 16px;
          }
          
          .buttonLabel {
            font-size: 15px;
          }
          
          .quickMessages {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .whatsappBar {
            display: none;
          }
          
          .whatsappMobileButton {
            display: flex;
          }
          
          .whatsappNotification {
            display: none;
          }
        }

        /* تحسينات للشاشات الكبيرة جداً */
        @media (min-width: 1440px) {
          .whatsappBar {
            left: 40px;
            bottom: 40px;
          }
        }

        /* تحسينات للوصول */
        .whatsappButton:focus-visible,
        .quickMessage:focus-visible,
        .sendCustomButton:focus-visible,
        .notificationClose:focus-visible,
        .expandedClose:focus-visible {
          outline: 2px solid white;
          outline-offset: 3px;
        }

        /* تحسينات للطباعة */
        @media print {
          .whatsappBar,
          .whatsappMobileButton {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
