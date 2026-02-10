'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// عناصر القائمة مع أيقونات محسنة
const NAV_ITEMS = [
  { href: '/', label: 'الرئيسية', icon: '🏠', activeIcon: '🏠✨' },
  { href: '/neighborhoods', label: 'الأحياء', icon: '📍', activeIcon: '📍✨' },
  { href: '/map', label: 'الخريطة', icon: '🗺️', activeIcon: '🗺️✨' },
  { href: '/account', label: 'الحساب', icon: '👤', activeIcon: '👤✨' },
];

export default function MobileNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('/');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // تحديث التبويب النشط عند تغيير المسار
  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // إخفاء/إظهار شريط التنقل عند التمرير
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // التمرير لأسفل - إخفاء الشريط
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // التمرير لأعلى - إظهار الشريط
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // إخفاء الشريط مؤقتاً عند النقر على رابط
  const handleNavClick = (href) => {
    setIsVisible(false);
    setTimeout(() => setIsVisible(true), 300);
    router.push(href);
  };

  // التحقق إذا كان الرابط نشطاً
  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // عنصر قائمة
  const NavItem = ({ href, label, icon, activeIcon }) => {
    const active = isActive(href);
    return (
      <button
        onClick={() => handleNavClick(href)}
        className={`navItem ${active ? 'active' : ''}`}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
      >
        <div className="iconContainer">
          <span className="icon" aria-hidden="true">
            {active ? activeIcon : icon}
          </span>
          {active && <div className="activePulse" />}
        </div>
        <span className="label">{label}</span>
        {active && <div className="activeIndicator" />}
      </button>
    );
  };

  // زر الإضافة المركزية
  const CenterButton = () => (
    <div className="centerButtonContainer">
      <button
        onClick={() => handleNavClick('/request')}
        className="centerButton"
        aria-label="أرسل طلبك"
      >
        <div className="centerButtonInner">
          <span className="plusIcon" aria-hidden="true">＋</span>
          <span className="buttonLabel">طلبك</span>
        </div>
        <div className="buttonGlow" />
      </button>
      <div className="buttonTooltip">أرسل طلبك</div>
    </div>
  );

  return (
    <nav className={`mobileNav ${isVisible ? 'visible' : 'hidden'}`} aria-label="قائمة الجوال">
      <div className="navContainer">
        <div className="navItems">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          
          <CenterButton />
          
          {NAV_ITEMS.slice(2).map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
        
        {/* مؤشر الموقع الحالي */}
        <div className="locationIndicator">
          <div className="indicatorLine" />
          <div 
            className="indicatorDot"
            style={{
              transform: `translateX(${
                NAV_ITEMS.findIndex(item => isActive(item.href)) * -25
              }%)`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .mobileNav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0 12px 12px;
          pointer-events: none;
        }

        .mobileNav.visible {
          transform: translateY(0);
          pointer-events: auto;
        }

        .mobileNav.hidden {
          transform: translateY(100%);
          pointer-events: none;
        }

        .navContainer {
          background: rgba(16, 20, 28, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid var(--border);
          box-shadow: 
            0 -8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(214, 179, 91, 0.1);
          padding: 12px 16px;
          position: relative;
          overflow: hidden;
        }

        /* تأثير خلفي متحرك */
        .navContainer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          background: linear-gradient(
            135deg,
            rgba(214, 179, 91, 0.05) 0%,
            transparent 50%,
            rgba(79, 117, 255, 0.03) 100%
          );
          z-index: 0;
        }

        .navItems {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        /* عناصر القائمة */
        .navItem {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          position: relative;
          flex: 1;
          transition: all 0.3s ease;
          border-radius: 16px;
          min-height: 64px;
          justify-content: center;
        }

        .navItem:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .navItem.active {
          background: rgba(214, 179, 91, 0.1);
        }

        .iconContainer {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon {
          font-size: 22px;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .navItem.active .icon {
          transform: scale(1.15);
          filter: drop-shadow(0 2px 8px rgba(214, 179, 91, 0.4));
        }

        /* تأثير النبض للعنصر النشط */
        .activePulse {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
          opacity: 0.2;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.2;
          }
        }

        .label {
          font-size: 11px;
          font-weight: 800;
          color: var(--muted);
          transition: all 0.3s ease;
          text-align: center;
          line-height: 1.2;
        }

        .navItem.active .label {
          color: var(--primary);
          font-weight: 900;
          text-shadow: 0 1px 2px rgba(214, 179, 91, 0.3);
        }

        /* مؤشر النشاط */
        .activeIndicator {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: var(--primary);
          border-radius: 50%;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .navItem.active .activeIndicator {
          opacity: 1;
          transform: translateX(-50%) scale(1.5);
          box-shadow: 0 0 8px var(--primary);
        }

        /* الزر المركزي */
        .centerButtonContainer {
          position: relative;
          margin: 0 8px;
        }

        .centerButton {
          width: 68px;
          height: 68px;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--primary), var(--primary2));
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.3s ease;
          box-shadow: 
            0 12px 32px rgba(214, 179, 91, 0.3),
            0 0 0 1px rgba(0, 0, 0, 0.1);
          margin-top: -24px;
        }

        .centerButton:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 
            0 20px 40px rgba(214, 179, 91, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.3);
        }

        .centerButton:active {
          transform: translateY(-2px) scale(1.02);
        }

        .centerButtonInner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          position: relative;
          z-index: 2;
        }

        .plusIcon {
          font-size: 24px;
          font-weight: 900;
          color: #000;
          line-height: 1;
        }

        .buttonLabel {
          font-size: 11px;
          font-weight: 900;
          color: #000;
          letter-spacing: -0.3px;
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
            rgba(214, 179, 91, 0.3) 0%,
            transparent 70%
          );
          border-radius: 20px;
          animation: glow 2s infinite alternate;
          z-index: 1;
        }

        @keyframes glow {
          0% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        /* تلميح الزر */
        .buttonTooltip {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s ease;
          border: 1px solid var(--border);
          backdrop-filter: blur(10px);
        }

        .centerButtonContainer:hover .buttonTooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-4px);
        }

        /* مؤشر الموقع */
        .locationIndicator {
          position: absolute;
          bottom: 4px;
          left: 16px;
          right: 16px;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 1px;
          overflow: hidden;
        }

        .indicatorLine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            var(--primary),
            transparent
          );
          animation: shimmer 3s infinite linear;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .indicatorDot {
          position: absolute;
          top: -2px;
          width: 25%;
          height: 6px;
          background: var(--primary);
          border-radius: 3px;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px var(--primary);
        }

        /* تحسينات للشاشات الصغيرة */
        @media (max-width: 480px) {
          .mobileNav {
            padding: 0 8px 8px;
          }
          
          .navContainer {
            padding: 10px 12px;
            border-radius: 20px;
          }
          
          .navItem {
            padding: 6px 8px;
            min-height: 60px;
          }
          
          .icon {
            font-size: 20px;
          }
          
          .label {
            font-size: 10px;
          }
          
          .centerButton {
            width: 60px;
            height: 60px;
            border-radius: 18px;
            margin-top: -20px;
          }
          
          .plusIcon {
            font-size: 22px;
          }
          
          .buttonLabel {
            font-size: 10px;
          }
        }

        @media (max-width: 360px) {
          .navItem {
            padding: 4px 6px;
          }
          
          .label {
            font-size: 9px;
          }
          
          .centerButton {
            width: 56px;
            height: 56px;
            margin-top: -18px;
          }
        }

        /* تحسينات للشاشات الكبيرة (إخفاء التنقل الجوال) */
        @media (min-width: 769px) {
          .mobileNav {
            display: none;
          }
        }

        /* تحسينات للوضع المظلم */
        @media (prefers-color-scheme: dark) {
          .navContainer {
            background: rgba(10, 13, 18, 0.98);
          }
        }

        /* تحسينات للوصول */
        .navItem:focus-visible,
        .centerButton:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
          border-radius: 8px;
        }

        /* تحسينات للطباعة */
        @media print {
          .mobileNav {
            display: none;
          }
        }

        /* تأثيرات دخول وخروج */
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100%);
          }
        }

        .mobileNav.visible .navContainer {
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobileNav.hidden .navContainer {
          animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </nav>
  );
}
