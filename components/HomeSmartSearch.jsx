'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROPERTY_TYPES } from '@/lib/taxonomy'; //

// الأحياء المميزة التي طلبتها
const FEATURED_NEIGHBORHOODS = [
  'أبحر الشمالية', 'الشراع', 'الأمواج', 'الصواري', 
  'الياقوت', 'الزمرد', 'اللؤلؤ', 'الفنار', 'البحيرات'
];

export default function HomeSmartSearch() {
  const router = useRouter();
  
  // تتبع خطوات الاختيار
  const [step, setStep] = useState(1); // 1=Neigh, 2=Deal, 3=Type
  const [selections, setSelections] = useState({
    neighborhood: '',
    dealType: '',
    category: 'سكني' // الافتراضي سكني، ويمكن تغييره عبر الأيقونة
  });

  // دالة لتنفيذ البحث النهائي
  const executeSearch = (finalType) => {
    const params = new URLSearchParams();
    if (selections.neighborhood) params.set('neighborhood', selections.neighborhood);
    if (selections.dealType) params.set('dealType', selections.dealType);
    if (finalType) params.set('propertyType', finalType);
    
    // توجيه لصفحة العروض مع الفلاتر
    router.push(`/listings?${params.toString()}`);
  };

  const reset = () => {
    setStep(1);
    setSelections(prev => ({ ...prev, neighborhood: '', dealType: '' }));
  };

  return (
    <div className="smartSearchContainer">
      
      {/* رأس الفلتر: أيقونة تجاري/سكني + زر إعادة ضبط */}
      <div className="searchHeader">
        <div className="toggleGroup">
          <button 
            className={`toggleBtn ${selections.category === 'سكني' ? 'active' : ''}`}
            onClick={() => setSelections(p => ({...p, category: 'سكني'}))}
          >
            🏠 سكني
          </button>
          <button 
            className={`toggleBtn ${selections.category === 'تجاري' ? 'active' : ''}`}
            onClick={() => setSelections(p => ({...p, category: 'تجاري'}))}
          >
            🏢 تجاري
          </button>
        </div>
        
        {step > 1 && (
          <button onClick={reset} className="resetBtn">
            ↺ تغيير الحي
          </button>
        )}
      </div>

      {/* الخطوة 1: الأحياء المميزة */}
      {step === 1 && (
        <div className="stepAnimation">
          <div className="gridLabels">اختر الحي المفضل:</div>
          <div className="neighGrid">
            {FEATURED_NEIGHBORHOODS.map(n => (
              <button 
                key={n} 
                className="neighBtn"
                onClick={() => {
                  setSelections(p => ({ ...p, neighborhood: n }));
                  setStep(2);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الخطوة 2: بيع أو إيجار */}
      {step === 2 && (
        <div className="stepAnimation">
          <div className="gridLabels">ما هو طلبك في {selections.neighborhood}؟</div>
          <div className="dealGrid">
            <button 
              className="dealBtn"
              onClick={() => {
                setSelections(p => ({ ...p, dealType: 'sale' }));
                setStep(3);
              }}
            >
              شراء (بيع)
            </button>
            <button 
              className="dealBtn"
              onClick={() => {
                setSelections(p => ({ ...p, dealType: 'rent' }));
                setStep(3);
              }}
            >
              استئجار (إيجار)
            </button>
          </div>
        </div>
      )}

      {/* الخطوة 3: نوع العقار */}
      {step === 3 && (
        <div className="stepAnimation">
          <div className="gridLabels">حدد نوع العقار ({selections.category}):</div>
          <div className="typeGrid">
            {PROPERTY_TYPES.map(type => (
              <button 
                key={type} 
                className="typeBtn"
                onClick={() => executeSearch(type)}
              >
                {type}
              </button>
            ))}
            <button className="typeBtn gold" onClick={() => executeSearch('')}>
              عرض الكل
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .smartSearchContainer {
          background: rgba(10, 13, 18, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          margin-top: -30px; /* تداخل مع الهيرو */
          position: relative;
          z-index: 10;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .searchHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 12px;
        }
        .toggleGroup {
          display: flex;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 4px;
        }
        .toggleBtn {
          background: transparent;
          border: none;
          color: var(--muted);
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 13px;
          transition: all 0.2s;
        }
        .toggleBtn.active {
          background: var(--card2);
          color: var(--gold);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .resetBtn {
          background: none;
          border: none;
          color: var(--gold);
          cursor: pointer;
          font-size: 12px;
        }

        .gridLabels {
          color: var(--muted);
          margin-bottom: 10px;
          font-size: 14px;
          text-align: center;
        }

        /* تنسيق شبكة الأحياء */
        .neighGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
        }
        .neighBtn {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px 5px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .neighBtn:hover {
          border-color: var(--gold);
          background: rgba(214,179,91,0.05);
        }

        /* تنسيق أزرار البيع/الإيجار */
        .dealGrid {
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        .dealBtn {
          flex: 1;
          padding: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
          border: 1px solid var(--border);
          border-radius: 16px;
          color: var(--text);
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }
        .dealBtn:hover {
          border-color: var(--gold);
          transform: translateY(-2px);
        }

        /* تنسيق أزرار الأنواع */
        .typeGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
        }
        .typeBtn {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
        }
        .typeBtn:hover {
          background: var(--card2);
        }
        .typeBtn.gold {
          border-color: var(--gold);
          color: var(--gold);
        }

        .stepAnimation {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
