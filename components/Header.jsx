'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname() || '/';
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="header">
      <div className="headerTop">
        <div className="container headerTopInner">
          <div className="announcement">
            <span className="announcementIcon">🎯</span>
            <span>عروض حصرية في أبحر الشمالية وشمال جدة</span>
            <span className="announcementBadge">جديد</span>
          </div>
          <div className="headerContacts">
            <a href="tel:+966500000000" className="contactLink">
              <span className="contactIcon">📞</span>
              <span>+966 50 000 0000</span>
            </a>
            <div className="separator"></div>
            <a href="https://wa.me/966500000000" className="contactLink">
              <span className="contactIcon">💬</span>
              <span>واتساب</span>
            </a>
          </div>
        </div>
      </div>
      
      <div className="headerMain">
        <div className="container headerInner">
          <Link className="brand" href="/" aria-label="عقار أبحر - الصفحة الرئيسية">
            <div className="brandLogo">
              <div className="logoMark">
                <span className="logoText">ع</span>
              </div>
            </div>
            <div className="brandText">
              <div className="brandTitle">عقار أبحر</div>
              <div className="brandSubtitle">
                <span className="gradient-gold">عروض مباشرة</span>
                <span className="separator">•</span>
                <span>شمال جدة</span>
              </div>
            </div>
          </Link>

          <nav className="nav">
            <Link 
              className={`navLink ${isActive('/') ? 'active' : ''}`} 
              href="/"
              aria-current={isActive('/') ? 'page' : undefined}
            >
              <span className="navIcon">🏠</span>
              <span className="navText">الرئيسية</span>
            </Link>
            
            <Link 
              className={`navLink ${isActive('/listings') ? 'active' : ''}`} 
              href="/listings"
              aria-current={isActive('/listings') ? 'page' : undefined}
            >
              <span className="navIcon">📋</span>
              <span className="navText">كل العروض</span>
              <span className="navBadge">42</span>
            </Link>
            
            <Link 
              className={`navLink ${isActive('/request') ? 'active' : ''}`} 
              href="/request"
              aria-current={isActive('/request') ? 'page' : undefined}
            >
              <span className="navIcon">📨</span>
              <span className="navText">أرسل طلبك</span>
            </Link>
            
            <Link 
              className={`navLink ${isActive('/admin') ? 'active' : ''}`} 
              href="/admin"
              aria-current={isActive('/admin') ? 'page' : undefined}
            >
              <span className="navIcon">⚙️</span>
              <span className="navText">الأدمن</span>
            </Link>
            
            <button className="ctaButton">
              <span className="ctaIcon">💎</span>
              <span className="ctaText">عرض خاص</span>
            </button>
          </nav>
        </div>
      </div>

      <style jsx>{`
        .header {
          border-bottom: 1px solid rgba(229, 231, 235, 0.8);
        }
        
        .headerTop {
          background: linear-gradient(135deg, #1e40af, #1d4ed8);
          padding: 8px 0;
        }
        
        .headerTopInner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
          font-size: 13px;
          font-weight: 500;
        }
        
        .announcement {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .announcementIcon {
          font-size: 14px;
        }
        
        .announcementBadge {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }
        
        .headerContacts {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .contactLink {
          display: flex;
          align-items: center;
          gap: 6px;
          color: white;
          text-decoration: none;
          transition: opacity 0.2s ease;
        }
        
        .contactLink:hover {
          opacity: 0.9;
        }
        
        .contactIcon {
          font-size: 14px;
        }
        
        .separator {
          width: 1px;
          height: 12px;
          background: rgba(255, 255, 255, 0.3);
        }
        
        .headerMain {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
        }
        
        .brand {
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          transition: transform 0.2s ease;
        }
        
        .brand:hover {
          transform: translateX(-2px);
        }
        
        .brandLogo {
          position: relative;
        }
        
        .logoMark {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 32px rgba(29, 78, 216, 0.25);
          position: relative;
          overflow: hidden;
        }
        
        .logoMark:after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), transparent 70%);
        }
        
        .logoText {
          color: white;
          font-size: 24px;
          font-weight: 900;
          z-index: 1;
        }
        
        .brandText {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .brandTitle {
          font-weight: 900;
          letter-spacing: -0.02em;
          font-size: 26px;
          background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .brandSubtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted);
        }
        
        .gradient-gold {
          background: linear-gradient(135deg, var(--gold), #eab308);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        
        .nav {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .navLink {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 14px;
          text-decoration: none;
          color: var(--text);
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .navLink:before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(29, 78, 216, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .navLink:hover {
          background: rgba(29, 78, 216, 0.06);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.1);
        }
        
        .navLink.active {
          background: linear-gradient(135deg, rgba(29, 78, 216, 0.12), rgba(29, 78, 216, 0.06));
          color: var(--blue);
          box-shadow: 0 4px 16px rgba(29, 78, 216, 0.15);
        }
        
        .navLink.active:before {
          opacity: 1;
        }
        
        .navIcon {
          font-size: 16px;
        }
        
        .navBadge {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          min-width: 20px;
          text-align: center;
        }
        
        .ctaButton {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--gold), #d4af37);
          color: white;
          border: none;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-right: 8px;
        }
        
        .ctaButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(201, 162, 39, 0.3);
        }
        
        @media (max-width: 1024px) {
          .headerTopInner {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
          
          .nav {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .navLink {
            padding: 10px 16px;
            font-size: 14px;
          }
          
          .ctaButton {
            padding: 12px 20px;
            font-size: 14px;
          }
        }
        
        @media (max-width: 768px) {
          .brandTitle {
            font-size: 22px;
          }
          
          .logoMark {
            width: 48px;
            height: 48px;
          }
          
          .nav {
            width: 100%;
            justify-content: space-between;
            margin-top: 16px;
          }
          
          .navLink {
            flex: 1;
            justify-content: center;
          }
          
          .ctaButton {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </header>
  );
}
