'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PROPERTY_TYPES, PROPERTY_CLASSES } from '@/lib/taxonomy';

// الأحياء المميزة
const FEATURED_NEIGHBORHOODS = [
  'أبحر الشمالية', 'الشراع', 'الأمواج', 'الصواري', 
  'الياقوت', 'الزمرد', 'اللؤلؤ', 'الفنار', 'البحيرات',
  'الفردوس', 'المروج', 'النور'
];

// أنواع التعامل
const DEAL_TYPES = [
  { value: 'sale', label: 'شراء (بيع)', icon: '💰' },
  { value: 'rent', label: 'استئجار (إيجار)', icon: '🏠' }
];

export default function HomeSmartSearch() {
  const router = useRouter();
  
  // حالة الخطوات
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState({
    neighborhood: '',
    dealType: '',
    propertyClass: 'residential'
  });

  // تحريك للخطوات
  const [slideDirection, setSlideDirection] = useState('right');

  // تصفية أنواع العقارات حسب التصنيف
  const filteredPropertyTypes = PROPERTY_TYPES.filter(type => {
    if (selections.propertyClass === 'commercial') {
      return type.includes('تجاري') || type.includes('محل');
    }
    return !type.includes('تجاري');
  });

  // دالة لتنفيذ البحث
  const executeSearch = (propertyType = '') => {
    const params = new URLSearchParams();
    
    if (selections.neighborhood) params.set('neighborhood', selections.neighborhood);
    if (selections.dealType) params.set('dealType', selections.dealType);
    if (selections.propertyClass) params.set('propertyClass', selections.propertyClass);
    if (propertyType) params.set('propertyType', propertyType);
    
    // توجيه لصفحة العروض مع الفلاتر
    router.push(`/listings?${params.toString()}`);
  };

  // إعادة الضبط
  const resetSearch = () => {
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentStep(1);
      setSelections({
        neighborhood: '',
        dealType: '',
        propertyClass: 'residential'
      });
    }, 300);
  };

  // التعامل مع اختيار الحي
  const handleNeighborhoodSelect = (neighborhood) => {
    setSlideDirection('right');
    setSelections(prev => ({ ...prev, neighborhood }));
    setTimeout(() => setCurrentStep(2), 300);
  };

  // التعامل مع اختيار نوع التعامل
  const handleDealTypeSelect = (dealType) => {
    setSlideDirection('right');
    setSelections(prev => ({ ...prev, dealType }));
    setTimeout(() => setCurrentStep(3), 300);
  };

  // تغيير تصنيف العقار
  const handlePropertyClassToggle = () => {
    setSelections(prev => ({
      ...prev,
      propertyClass: prev.propertyClass === 'residential' ? 'commercial' : 'residential'
    }));
  };

  // مؤشر التقدم
  const ProgressIndicator = () => (
    <div className="progressIndicator">
      {[1, 2, 3].map((step) => (
        <div key={step} className="stepContainer">
          <div className={`stepDot ${currentStep >= step ? 'active' : ''}`}>
            {currentStep > step ? '✓' : step}
          </div>
          <div className="stepLabel">
            {step === 1 && 'الحي'}
            {step === 2 && 'نوع التعامل'}
            {step === 3 && 'نوع العقار'}
          </div>
          {step < 3 && <div className="stepConnector" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="smartSearchContainer">
      {/* رأس المكون */}
      <div className="searchHeader">
        <div className="headerTitle">
          <h2 className="title">بحث ذكي</h2>
          <p className="subtitle">ابحث عن عقار أحلامك في 3 خطوات</p>
        </div>
        
        {/* تبديل تصنيف العقار */}
        <div className="propertyClassToggle">
          <button
            className={`toggleOption ${selections.propertyClass === 'residential' ? 'active' : ''}`}
            onClick={() => selections.propertyClass !== 'residential' && handlePropertyClassToggle()}
            disabled={currentStep > 1}
          >
            <span className="toggleIcon">🏠</span>
            <span className="toggleLabel">سكني</span>
          </button>
          <button
            className={`toggleOption ${selections.propertyClass === 'commercial' ? 'active' : ''}`}
            onClick={() => selections.propertyClass !== 'commercial' && handlePropertyClassToggle()}
            disabled={currentStep > 1}
          >
            <span className="toggleIcon">🏢</span>
            <span className="toggleLabel">تجاري</span>
          </button>
        </div>
      </div>

      {/* مؤشر التقدم */}
      <ProgressIndicator />

      {/* الخطوة 1: اختيار الحي */}
      {currentStep === 1 && (
        <div className={`stepContent ${slideDirection}`}>
          <div className="stepHeader">
            <h3 className="stepTitle">اختر الحي المفضل</h3>
            <p className="stepDescription">اختر الحي الذي تبحث فيه عن عقار</p>
          </div>
          
          <div className="neighborhoodsGrid">
            {FEATURED_NEIGHBORHOODS.map((neighborhood) => (
              <button
                key={neighborhood}
                className={`neighborhoodCard ${selections.neighborhood === neighborhood ? 'selected' : ''}`}
                onClick={() => handleNeighborhoodSelect(neighborhood)}
                aria-label={`اختيار حي ${neighborhood}`}
              >
                <div className="neighborhoodIcon">📍</div>
                <span className="neighborhoodName">{neighborhood}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الخطوة 2: اختيار نوع التعامل */}
      {currentStep === 2 && (
        <div className={`stepContent ${slideDirection}`}>
          <div className="stepHeader">
            <div className="stepBack">
              <button 
                className="backButton"
                onClick={() => {
                  setSlideDirection('left');
                  setTimeout(() => setCurrentStep(1), 300);
                }}
                aria-label="العودة للخطوة السابقة"
              >
                <span className="backIcon">←</span>
                العودة
              </button>
            </div>
            <h3 className="stepTitle">ما هو طلبك في {selections.neighborhood}؟</h3>
            <p className="stepDescription">اختر نوع التعامل الذي تريده</p>
          </div>
          
          <div className="dealTypesContainer">
            {DEAL_TYPES.map((deal) => (
              <button
                key={deal.value}
                className={`dealTypeCard ${selections.dealType === deal.value ? 'selected' : ''}`}
                onClick={() => handleDealTypeSelect(deal.value)}
                aria-label={`اختيار ${deal.label}`}
              >
                <div className="dealIcon">{deal.icon}</div>
                <div className="dealInfo">
                  <h4 className="dealTitle">{deal.label}</h4>
                  <p className="dealDescription">
                    {deal.value === 'sale' 
                      ? 'شراء عقار بشكل دائم' 
                      : 'استئجار عقار لفترة محددة'}
                  </p>
                </div>
                <div className="selectionIndicator">
                  {selections.dealType === deal.value && '✓'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الخطوة 3: اختيار نوع العقار */}
      {currentStep === 3 && (
        <div className={`stepContent ${slideDirection}`}>
          <div className="stepHeader">
            <div className="stepBack">
              <button 
                className="backButton"
                onClick={() => {
                  setSlideDirection('left');
                  setTimeout(() => setCurrentStep(2), 300);
                }}
                aria-label="العودة للخطوة السابقة"
              >
                <span className="backIcon">←</span>
                العودة
              </button>
            </div>
            <h3 className="stepTitle">
              حدد نوع العقار ({selections.propertyClass === 'residential' ? 'سكني' : 'تجاري'})
            </h3>
            <p className="stepDescription">اختر نوع العقار الذي تبحث عنه</p>
          </div>
          
          <div className="propertyTypesGrid">
            {filteredPropertyTypes.map((type) => (
              <button
                key={type}
                className="propertyTypeCard"
                onClick={() => executeSearch(type)}
                aria-label={`البحث عن ${type}`}
              >
                <span className="propertyTypeName">{type}</span>
                <span className="propertyTypeIcon">
                  {type.includes('أرض') ? '🟫' : 
                   type.includes('فيلا') ? '🏡' : 
                   type.includes('شقة') ? '🏢' : 
                   type.includes('دور') ? '🏘️' : 
                   type.includes('عمارة') ? '🏬' : 
                   type.includes('تجاري') ? '🏪' : '🏠'}
                </span>
              </button>
            ))}
            
            <button
              className="propertyTypeCard viewAll"
              onClick={() => executeSearch('')}
              aria-label="عرض جميع الأنواع"
            >
              <span className="propertyTypeName">عرض الكل</span>
              <span className="propertyTypeIcon">🔍</span>
            </button>
          </div>
        </div>
      )}

      {/* إعادة الضبط */}
      {currentStep > 1 && (
        <div className="resetContainer">
          <button 
            className="resetButton"
            onClick={resetSearch}
            aria-label="إعادة البحث من البداية"
          >
            <span className="resetIcon">🔄</span>
            إعادة البحث
          </button>
        </div>
      )}

      <style jsx>{`
        .smartSearchContainer {
          background: rgba(16, 20, 28, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          margin: 20px 0;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
        }

        /* رأس المكون */
        .searchHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .headerTitle {
          flex: 1;
          min-width: 200px;
        }

        .title {
          font-size: 24px;
          font-weight: 900;
          margin: 0 0 8px 0;
          background: linear-gradient(to right, var(--primary), #fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
        }

        /* تبديل تصنيف العقار */
        .propertyClassToggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 6px;
          border: 1px solid var(--border);
          gap: 4px;
        }

        .toggleOption {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .toggleOption:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }

        .toggleOption.active {
          background: var(--primary-light);
          color: var(--primary);
          box-shadow: 0 4px 12px rgba(214, 179, 91, 0.2);
        }

        .toggleOption:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggleIcon {
          font-size: 18px;
        }

        /* مؤشر التقدم */
        .progressIndicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          position: relative;
          padding: 0 20px;
        }

        .stepContainer {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .stepDot {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 16px;
          color: var(--muted);
          transition: all 0.3s ease;
          margin-bottom: 8px;
        }

        .stepDot.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #000;
          transform: scale(1.1);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.3);
        }

        .stepLabel {
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          text-align: center;
        }

        .stepConnector {
          position: absolute;
          top: 20px;
          left: 50%;
          right: -50%;
          height: 2px;
          background: var(--border);
          z-index: 0;
        }

        /* محتوى الخطوات */
        .stepContent {
          animation: slideIn 0.3s ease-out;
        }

        .stepContent.right {
          animation: slideInRight 0.3s ease-out;
        }

        .stepContent.left {
          animation: slideInLeft 0.3s ease-out;
        }

        .stepHeader {
          margin-bottom: 24px;
        }

        .stepBack {
          margin-bottom: 16px;
        }

        .backButton {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 16px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .backButton:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--primary);
          color: var(--primary);
        }

        .backIcon {
          font-size: 16px;
        }

        .stepTitle {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 8px 0;
          color: var(--text);
        }

        .stepDescription {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
        }

        /* شبكة الأحياء */
        .neighborhoodsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }

        .neighborhoodCard {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .neighborhoodCard:hover {
          border-color: var(--primary);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
        }

        .neighborhoodCard.selected {
          background: var(--primary-light);
          border-color: var(--primary);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.2);
        }

        .neighborhoodIcon {
          font-size: 28px;
          opacity: 0.8;
        }

        .neighborhoodCard.selected .neighborhoodIcon {
          opacity: 1;
          transform: scale(1.1);
        }

        .neighborhoodName {
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          line-height: 1.3;
        }

        /* أنواع التعامل */
        .dealTypesContainer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dealTypeCard {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: right;
          position: relative;
        }

        .dealTypeCard:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .dealTypeCard.selected {
          background: var(--primary-light);
          border-color: var(--primary);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.2);
        }

        .dealIcon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .dealInfo {
          flex: 1;
        }

        .dealTitle {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: var(--text);
        }

        .dealDescription {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
          line-height: 1.4;
        }

        .selectionIndicator {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 14px;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.3s ease;
        }

        .dealTypeCard.selected .selectionIndicator {
          opacity: 1;
          transform: scale(1);
        }

        /* أنواع العقارات */
        .propertyTypesGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .propertyTypeCard {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .propertyTypeCard:hover {
          border-color: var(--primary);
          background: var(--primary-light);
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(214, 179, 91, 0.2);
        }

        .propertyTypeCard.viewAll {
          border: 2px dashed var(--primary);
          background: transparent;
        }

        .propertyTypeCard.viewAll:hover {
          background: var(--primary-light);
          border-style: solid;
        }

        .propertyTypeName {
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          line-height: 1.3;
        }

        .propertyTypeIcon {
          font-size: 28px;
          opacity: 0.8;
        }

        .propertyTypeCard:hover .propertyTypeIcon {
          opacity: 1;
          transform: scale(1.1);
        }

        /* زر الإعادة */
        .resetContainer {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .resetButton {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 24px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .resetButton:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
        }

        .resetIcon {
          font-size: 16px;
        }

        /* تأثيرات الحركة */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* التجاوب مع الشاشات المختلفة */
        @media (max-width: 1024px) {
          .smartSearchContainer {
            padding: 20px;
          }
          
          .neighborhoodsGrid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          }
          
          .propertyTypesGrid {
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .smartSearchContainer {
            border-radius: 20px;
            padding: 18px;
          }
          
          .searchHeader {
            flex-direction: column;
            gap: 16px;
          }
          
          .propertyClassToggle {
            width: 100%;
            justify-content: center;
          }
          
          .neighborhoodsGrid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          }
          
          .dealTypeCard {
            padding: 16px;
          }
          
          .dealTitle {
            font-size: 16px;
          }
          
          .stepTitle {
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .smartSearchContainer {
            padding: 16px;
            border-radius: 18px;
          }
          
          .title {
            font-size: 20px;
          }
          
          .neighborhoodsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .propertyTypesGrid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .stepDot {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }
          
          .stepLabel {
            font-size: 10px;
          }
        }

        /* تحسينات للوصول */
        .neighborhoodCard:focus-visible,
        .dealTypeCard:focus-visible,
        .propertyTypeCard:focus-visible,
        .backButton:focus-visible,
        .resetButton:focus-visible,
        .toggleOption:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
