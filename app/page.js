'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';

function ListingsState({ loading, error, items }) {
  if (loading) {
    return (
      <div className="listing-grid">
        {[1, 2, 3, 4].map((id) => (
          <div key={id} className="skeleton-card" />
        ))}
      </div>
    );
  }
  if (error) return <div className="error-card">{error}</div>;
  if (!items.length) return <div className="empty-card">لا توجد عقارات منشورة حاليًا في هذه الفئة.</div>;

  return (
    <div className="listing-grid">
      {items.map((item, index) => (
        <ListingCard key={item?.id || item?.docId || item?.slug || `listing-${index}`} item={item} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [activeTab, setActiveTab] = useState('all'); 

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const whatsappLink = buildWhatsAppLink({
    phone: whatsappNumber,
    text: 'السلام عليكم، أرغب في الاستفسار عن عروض عقار أبحر.',
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true); setErrorText('');
        const result = await fetchLatestListings({ n: 8, onlyPublic: true, includeLegacy: false });
        if (!active) return;
        setItems(Array.isArray(result) ? result : []);
      } catch {
        if (!active) return;
        setErrorText('تعذر تحميل العقارات الآن، يرجى المحاولة لاحقاً.');
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (activeTab === 'all') return safeItems;
    return safeItems.filter(item => item.dealType === activeTab);
  }, [items, activeTab]);

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div>
        {/* القسم العلوي (Hero) */}
        <section className="home-hero-section">
          <div className="home-hero-overlay"></div>
          <div className="container home-hero-content">
            <h1 className="home-hero-title">اكتشف <span>عقارك المثالي</span> في جدة</h1>
            <p className="home-hero-subtitle">خيارات سكنية وتجارية تلبي كافة تطلعاتك وبأفضل الأسعار</p>

            <div className="search-container glass-effect">
              <div className="search-tabs">
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>الكل</button>
                <button className={`tab-btn ${activeTab === 'sale' ? 'active' : ''}`} onClick={() => setActiveTab('sale')}>للبيع</button>
                <button className={`tab-btn ${activeTab === 'rent' ? 'active' : ''}`} onClick={() => setActiveTab('rent')}>للإيجار</button>
              </div>
              <div className="search-action">
                 <Link href={`/listings?dealType=${activeTab !== 'all' ? activeTab : ''}`} className="main-search-btn">
                    استكشف العقارات الآن
                    <span className="material-icons-outlined">arrow_back</span>
                 </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="container home-content-body">
            {/* الخدمات (Features) */}
            <section className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon-container"><span className="material-icons-outlined">campaign</span></div>
                    <h3>تسويق عقارك باحترافية</h3>
                    <p>نصدر لك عقد وساطة رسمي عبر منصة الهيئة، ونتولى تسويق عقارك للوصول للعميل المناسب.</p>
                    <Link href="/marketing-request" className="feature-link">طلب تسويق <span className="material-icons-outlined">arrow_back_ios</span></Link>
                </div>
                <div className="feature-card">
                    <div className="feature-icon-container"><span className="material-icons-outlined">assignment_turned_in</span></div>
                    <h3>توثيق عقود الإيجار</h3>
                    <p>نوفر خدمة إصدار وتوثيق عقود الإيجار الإلكترونية في منصة إيجار لحفظ حقوق جميع الأطراف.</p>
                    <Link href="/ejar-request" className="feature-link">طلب توثيق <span className="material-icons-outlined">arrow_back_ios</span></Link>
                </div>
                <div className="feature-card">
                    <div className="feature-icon-container"><span className="material-icons-outlined">manage_search</span></div>
                    <h3>أرسل طلبك العقاري</h3>
                    <p>لم تجد ما تبحث عنه؟ أرسل مواصفات طلبك وسنقوم بالبحث وتوفير الخيارات المناسبة لك.</p>
                    <Link href="/request" className="feature-link">تقديم طلب <span className="material-icons-outlined">arrow_back_ios</span></Link>
                </div>
            </section>

            {/* الأحياء */}
            <NeighborhoodGrid title="استكشف أبرز أحياء شمال جدة" showViewAll />

            {/* أحدث العروض */}
            <section className="latest-listings-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                    <h2>أحدث العروض العقارية</h2>
                    <p>اكتشف أحدث الشقق، الفلل، والأراضي المدرجة حديثاً لدينا</p>
                </div>
                <Link href="/listings" className="nb-view-btn outline-btn">عرض كافة العقارات</Link>
              </div>
              <ListingsState loading={loading} error={errorText} items={filteredItems} />
            </section>

            {/* بانر التواصل (Call to Action) */}
            <section className="cta-section gradient-bg">
                <div className="cta-text">
                    <h2>هل تبحث عن استشارة سريعة؟</h2>
                    <p>فريقنا متواجد للرد على كافة استفساراتك العقارية، تواصل معنا الآن بضغطة زر.</p>
                </div>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="whatsapp-cta-btn pulse-effect">
                    <span className="material-icons-outlined">chat</span>
                    تحدث معنا عبر الواتساب
                </a>
            </section>
        </div>
      </div>
    </>
  );
}
