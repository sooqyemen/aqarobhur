'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// بيانات الأحياء المميزة (قابلة للتوسيع)
const FEATURED_NEIGHBORHOODS = [
  { 
    key: 'al-shiraa', 
    label: 'الشراع',
    count: 24,
    description: 'حي راقي بجوار البحر',
    icon: '🌊'
  },
  { 
    key: 'al-yacout', 
    label: 'الياقوت',
    count: 18,
    description: 'أحياء سكنية حديثة',
    icon: '💎'
  },
  { 
    key: 'al-zomorod', 
    label: 'الزمرد',
    count: 15,
    description: 'مجمعات سكنية متميزة',
    icon: '🟢'
  },
  { 
    key: 'obhur-north', 
    label: 'أبحر الشمالية',
    count: 32,
    description: 'قلب أبحر الشمالية',
    icon: '⭐'
  },
  { 
    key: 'al-sawari', 
    label: 'الصواري',
    count: 12,
    description: 'قرب الكورنيش',
    icon: '⛵'
  },
  { 
    key: 'al-lulu', 
    label: 'اللؤلؤ',
    count: 20,
    description: 'عروض متنوعة',
    icon: '⚪'
  },
  { 
    key: 'al-amwaj', 
    label: 'الأمواج',
    count: 16,
    description: 'إطلالات بحرية',
    icon: '🌊'
  },
  { 
    key: 'al-fanar', 
    label: 'الفنار',
    count: 8,
    description: 'موقع استراتيجي',
    icon: '🗼'
  },
  { 
    key: 'al-buhairat', 
    label: 'البحيرات',
    count: 14,
    description: 'طبيعة خلابة',
    icon: '🏞️'
  },
  { 
    key: 'al-firdaws', 
    label: 'الفردوس',
    count: 22,
    description: 'مجمعات راقية',
    icon: '🏘️'
  },
  { 
    key: 'al-muruj', 
    label: 'المروج',
    count: 19,
    description: 'مساحات خضراء',
    icon: '🌿'
  },
  { 
    key: 'al-nour', 
    label: 'النور',
    count: 11,
    description: 'إطلالات بانورامية',
    icon: '✨'
  }
];

// ألوان ثابتة لكل حي
const NEIGHBORHOOD_COLORS = [
  'linear-gradient(135deg, #d6b35b, #b8942a)', // ذهبي
  'linear-gradient(135deg, #2D7FF9, #1e5fbf)', // أزرق
  'linear-gradient(135deg, #00B8A9, #008f81)', // تركواز
  'linear-gradient(135deg, #F59E0B, #d48a08)', // برتقالي
  'linear-gradient(135deg, #8B5CF6, #7048e8)', // بنفسجي
  'linear-gradient(135deg, #EF4444, #dc2626)', // أحمر
  'linear-gradient(135deg, #10B981, #0da271)', // أخضر
  'linear-gradient(135deg, #06B6D4, #059bb4)', // سماوي
  'linear-gradient(135deg, #F97316, #e05f0c)', // برتقالي غامق
  'linear-gradient(135deg, #8B5CF6, #7c3aed)', // بنفسجي فاتح
  'linear-gradient(135deg, #EC4899, #db2777)', // وردي
  'linear-gradient(135deg, #14B8A6, #0d9488)'  // تركواز غامق
];

export default function NeighborhoodGrid({ 
  title = 'الأحياء المميزة',
  showViewAll = true,
  maxItems = 12,
  compact = false 
}) {
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState([]);

  // تصفية الأحياء حسب العدد المطلوب
  useEffect(() => {
    const items = FEATURED_NEIGHBORHOODS.slice(0, maxItems);
    setFilteredNeighborhoods(items);
  }, [maxItems]);

  // الحصول على لون ثابت لكل حي
  const getNeighborhoodColor = (index) => {
    return NEIGHBORHOOD_COLORS[index % NEIGHBORHOOD_COLORS.length];
  };

  // التعامل مع النقر على الحي
  const handleNeighborhoodClick = (neighborhood) => {
    router.push(`/listings?neighborhood=${encodeURIComponent(neighborhood.label)}`);
  };

  // نسخة مدمجة للعرض
  if (compact) {
    return (
      <div className="neighborhoodGrid compact">
        <div className="gridHeader">
          <h3 className="gridTitle">{title}</h3>
          {showViewAll && (
            <Link href="/neighborhoods" className="viewAllLink">
              عرض الكل
              <span className="linkArrow">→</span>
            </Link>
          )}
        </div>
        
        <div className="compactGrid">
          {filteredNeighborhoods.map((neighborhood, index) => (
            <button
              key={neighborhood.key}
              className="compactItem"
              onClick={() => handleNeighborhoodClick(neighborhood)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-label={`تصفح عروض ${neighborhood.label}`}
              style={{ 
                background: getNeighborhoodColor(index),
                transform: hoveredIndex === index ? 'translateY(-4px)' : 'none'
              }}
            >
              <span className="itemIcon">{neighborhood.icon}</span>
              <span className="itemLabel">{neighborhood.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // النسخة الكاملة
  return (
    <section className="neighborhoodGrid full">
      <div className="gridHeader">
        <div className="headerContent">
          <h2 className="gridTitle">{title}</h2>
          <p className="gridDescription">
            اكتشف أفضل العروض العقارية في أحياء أبحر الشمالية المميزة
          </p>
        </div>
        
        {showViewAll && (
          <Link href="/neighborhoods" className="viewAllButton">
            <span className="buttonText">تصفح جميع الأحياء</span>
            <span className="buttonIcon">→</span>
          </Link>
        )}
      </div>

      <div className="neighborhoodsContainer">
        {filteredNeighborhoods.map((neighborhood, index) => (
          <div
            key={neighborhood.key}
            className={`neighborhoodCard ${hoveredIndex === index ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleNeighborhoodClick(neighborhood)}
            role="button"
            tabIndex={0}
            aria-label={`تصفح ${neighborhood.count} عرض في ${neighborhood.label}`}
            onKeyDown={(e) => e.key === 'Enter' && handleNeighborhoodClick(neighborhood)}
          >
            <div 
              className="cardBackground"
              style={{ background: getNeighborhoodColor(index) }}
            >
              <div className="backgroundOverlay" />
              <div className="neighborhoodIcon">{neighborhood.icon}</div>
            </div>
            
            <div className="cardContent">
              <div className="contentHeader">
                <h3 className="neighborhoodName">{neighborhood.label}</h3>
                <div className="neighborhoodCount">
                  <span className="countNumber">{neighborhood.count}</span>
                  <span className="countLabel">عرض</span>
                </div>
              </div>
              
              <p className="neighborhoodDescription">{neighborhood.description}</p>
              
              <div className="cardFooter">
                <button className="exploreButton">
                  <span className="exploreText">تصفح العروض</span>
                  <span className="exploreIcon">→</span>
                </button>
                
                <div className="neighborhoodTags">
                  <span className="tag">عقارات</span>
                  <span className="tag">أبحر</span>
                </div>
              </div>
            </div>
            
            {/* تأثير hover */}
            <div className="hoverEffect" />
          </div>
        ))}
      </div>

      {showViewAll && (
        <div className="gridFooter">
          <Link href="/neighborhoods" className="browseAllButton">
            <span className="browseIcon">🗺️</span>
            <span className="browseText">استكشف جميع أحياء جدة</span>
            <span className="browseArrow">↗</span>
          </Link>
        </div>
      )}

      <style jsx>{`
        .neighborhoodGrid {
          margin: 40px 0;
          position: relative;
        }

        .neighborhoodGrid.full {
          padding: 0 0 30px;
        }

        /* العنوان الرئيسي */
        .gridHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .headerContent {
          flex: 1;
          min-width: 300px;
        }

        .gridTitle {
          font-size: 28px;
          font-weight: 900;
          margin: 0 0 12px 0;
          background: linear-gradient(to right, var(--primary), #fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .gridDescription {
          color: var(--muted);
          font-size: 16px;
          margin: 0;
          line-height: 1.6;
          max-width: 600px;
        }

        /* زر عرض الكل */
        .viewAllButton {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 24px;
          color: var(--text);
          text-decoration: none;
          font-weight: 800;
          font-size: 15px;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .viewAllButton:hover {
          background: var(--primary-light);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(214, 179, 91, 0.2);
        }

        .buttonIcon {
          font-size: 18px;
          transition: transform 0.3s ease;
        }

        .viewAllButton:hover .buttonIcon {
          transform: translateX(4px);
        }

        /* حاوية الأحياء */
        .neighborhoodsContainer {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        @media (max-width: 768px) {
          .neighborhoodsContainer {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }
        }

        @media (max-width: 480px) {
          .neighborhoodsContainer {
            grid-template-columns: 1fr;
          }
        }

        /* بطاقة الحي */
        .neighborhoodCard {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow);
          height: 100%;
          min-height: 280px;
          display: flex;
          flex-direction: column;
        }

        .neighborhoodCard:hover {
          transform: translateY(-8px);
          border-color: var(--primary);
          box-shadow: var(--shadow-lg);
        }

        .neighborhoodCard.hovered {
          z-index: 2;
        }

        /* خلفية البطاقة */
        .cardBackground {
          height: 120px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .backgroundOverlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5));
        }

        .neighborhoodIcon {
          font-size: 48px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
          opacity: 0.9;
        }

        .neighborhoodCard:hover .neighborhoodIcon {
          animation: bounce 0.6s ease;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        /* محتوى البطاقة */
        .cardContent {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
          background: var(--card);
        }

        .contentHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .neighborhoodName {
          font-size: 20px;
          font-weight: 900;
          margin: 0;
          color: var(--text);
          line-height: 1.3;
        }

        .neighborhoodCount {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 6px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        }

        .countNumber {
          font-size: 18px;
          font-weight: 900;
          color: var(--primary);
        }

        .countLabel {
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          margin-top: 2px;
        }

        .neighborhoodDescription {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 20px 0;
          flex: 1;
        }

        /* تذييل البطاقة */
        .cardFooter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }

        .exploreButton {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 16px;
          color: var(--text);
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .neighborhoodCard:hover .exploreButton {
          background: var(--primary);
          border-color: var(--primary);
          color: #000;
        }

        .exploreIcon {
          font-size: 14px;
          transition: transform 0.3s ease;
        }

        .neighborhoodCard:hover .exploreIcon {
          transform: translateX(4px);
        }

        .neighborhoodTags {
          display: flex;
          gap: 6px;
        }

        .tag {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
        }

        /* تأثير hover */
        .hoverEffect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            transparent 30%,
            rgba(214, 179, 91, 0.05) 100%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .neighborhoodCard:hover .hoverEffect {
          opacity: 1;
        }

        /* تذييل الشبكة */
        .gridFooter {
          margin-top: 40px;
          text-align: center;
        }

        .browseAllButton {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 16px 32px;
          color: var(--text);
          text-decoration: none;
          font-weight: 800;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .browseAllButton:hover {
          background: var(--primary-light);
          border: 2px solid var(--primary);
          border-style: solid;
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(214, 179, 91, 0.2);
        }

        .browseIcon {
          font-size: 24px;
        }

        .browseArrow {
          font-size: 20px;
          transition: transform 0.3s ease;
        }

        .browseAllButton:hover .browseArrow {
          transform: translate(4px, -4px);
        }

        /* النسخة المدمجة */
        .neighborhoodGrid.compact {
          margin: 20px 0;
        }

        .compactGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .compactItem {
          aspect-ratio: 1;
          border-radius: 16px;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 16px 8px;
          position: relative;
          overflow: hidden;
          color: white;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .compactItem:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
        }

        .compactItem::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.1), rgba(0,0,0,0.3));
        }

        .itemIcon {
          font-size: 28px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        }

        .itemLabel {
          font-size: 12px;
          font-weight: 900;
          position: relative;
          z-index: 1;
          text-align: center;
          line-height: 1.3;
        }

        .viewAllLink {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--primary);
          text-decoration: none;
          font-weight: 800;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .viewAllLink:hover {
          gap: 10px;
        }

        .linkArrow {
          font-size: 16px;
          transition: transform 0.3s ease;
        }

        .viewAllLink:hover .linkArrow {
          transform: translateX(4px);
        }

        /* تحسينات للشاشات الصغيرة */
        @media (max-width: 640px) {
          .gridHeader {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          
          .viewAllButton {
            width: 100%;
            justify-content: center;
          }
          
          .gridTitle {
            font-size: 24px;
          }
          
          .neighborhoodName {
            font-size: 18px;
          }
          
          .browseAllButton {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .compactGrid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          }
          
          .compactItem {
            padding: 12px 6px;
          }
          
          .itemIcon {
            font-size: 24px;
          }
          
          .itemLabel {
            font-size: 11px;
          }
        }

        /* تحسينات للوصول */
        .neighborhoodCard:focus-visible,
        .compactItem:focus-visible,
        .viewAllButton:focus-visible,
        .browseAllButton:focus-visible,
        .exploreButton:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
        }

        /* تحسينات للطباعة */
        @media print {
          .neighborhoodCard {
            break-inside: avoid;
            border: 2px solid #000;
            box-shadow: none;
          }
          
          .neighborhoodCard:hover {
            transform: none;
          }
          
          .viewAllButton,
          .browseAllButton,
          .exploreButton {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
