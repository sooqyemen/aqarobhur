'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from '@/components/ListingCard';
import NeighborhoodGrid from '@/components/NeighborhoodGrid';
import { fetchLatestListings } from '@/lib/listings';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';

const QUICK_CARDS = [
  {
    icon: 'real_estate_agent',
    title: 'العروض العقارية',
    description: 'تصفح أحدث عروض الأراضي والفلل والشقق المتاحة للبيع والإيجار في أبحر الشمالية وشمال جدة.',
    href: '/listings',
    cta: 'تصفح العروض',
  },
  {
    icon: 'smart_toy',
    title: 'العقاري الذكي',
    description: 'اكتب طلبك العقاري بلغة بسيطة، وسيبحث العقاري الذكي في العروض المتوفرة ويقترح الأقرب لاحتياجك.',
    href: '/request',
    cta: 'اسأل العقاري الذكي',
    highlight: true,
  },
  {
    icon: 'playlist_add_check_circle',
    title: 'أرسل طلبك',
    description: 'إذا لم تجد العقار المناسب، أرسل طلبك وسنقوم بمراجعته والبحث عن الخيارات المناسبة لك.',
    href: '/request',
    cta: 'إرسال طلب',
  },
];

const SERVICE_CARDS = [
  {
    icon: 'verified',
    title: 'عقود الوساطة وترخيص الإعلان',
    description: 'إنشاء عقد وساطة بين المكتب ومالك العقار عبر منصة هيئة العقار، ثم إصدار ترخيص الإعلان العقاري بعد اعتماد العقد.',
    href: '/marketing-request',
    cta: 'طلب الخدمة',
  },
  {
    icon: 'assignment_turned_in',
    title: 'عقود الإيجار',
    description: 'نقدم خدمة توثيق عقود الإيجار وتجهيز بيانات العقد ومتابعة خطوات القبول والتوثيق حتى اكتمال الإجراء.',
    href: '/ejar-request',
    cta: 'طلب توثيق',
  },
  {
    icon: 'campaign',
    title: 'تسويق عقارك',
    description: 'نقدم خدمة تسويق عقارك باحتراف، من عرض العقار وإبرازه للعملاء الجادين إلى متابعة طلبات المهتمين.',
    href: '/marketing-request',
    cta: 'سوّق عقارك',
  },
  {
    icon: 'support_agent',
    title: 'استشارة عقارية مجانية',
    description: 'نقدم استشارة عقارية مجانية في البيع والشراء والإيجار والتسويق والعقود، ونوضح لك الخيارات الأنسب لاحتياجك.',
    href: '/request',
    cta: 'اطلب استشارة',
  },
];

const FAQ_ITEMS = [
  {
    question: 'كيف أصدر ضريبة التصرفات العقارية؟',
    answer: 'يتم تسجيل التصرف العقاري قبل الإفراغ عبر الخدمة الرسمية، بإدخال بيانات العقار وقيمة البيع، ثم إصدار رقم الطلب أو فاتورة السداد عند وجود مبلغ مستحق. وللتوضيح والمساعدة يمكنك التواصل معنا عبر واتساب.',
  },
  {
    question: 'كيف أقبل عرض البيع في البورصة العقارية؟',
    answer: 'عند وصول عرض بيع أو طلب صفقة، تتم مراجعة بيانات الصك والصفقة والسعر من حسابك في البورصة العقارية، ثم قبول الطلب أو رفضه حسب الإجراء المتاح في المنصة.',
  },
  {
    question: 'كيف أقدم عرض بيع على منصة البورصة العقارية؟',
    answer: 'يمكن تقديم عرض بيع عبر الدخول للمنصة، اختيار العقار أو الصك، إدخال بيانات الصفقة والسعر والطرف الآخر، ثم إرسال الطلب ليتم استكمال القبول والإجراءات.',
  },
];

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

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="homeSectionHeader">
      <div>
        {eyebrow ? <span className="sectionEyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function InfoCard({ item }) {
  return (
    <Link href={item.href} className={`homeInfoCard ${item.highlight ? 'highlight' : ''}`}>
      <div className="homeInfoIcon"><span className="material-icons-outlined">{item.icon}</span></div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <span className="homeInfoLink">
        {item.cta}
        <span className="material-icons-outlined">arrow_back</span>
      </span>
    </Link>
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
    text: 'السلام عليكم، أرغب في الاستفسار عن عروض وخدمات عقار أبحر.',
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
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
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (activeTab === 'all') return safeItems;
    return safeItems.filter((item) => item.dealType === activeTab);
  }, [items, activeTab]);

  const listingHref = activeTab === 'all' ? '/listings' : `/listings?dealType=${activeTab}`;

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div>
        <section className="home-hero-section">
          <div className="home-hero-overlay" />
          <div className="container home-hero-content">
            <span className="heroBadge">عقار أبحر — شمال جدة</span>
            <h1 className="home-hero-title">عقارات أبحر الشمالية <span>وشمال جدة</span></h1>
            <p className="home-hero-subtitle">عروض بيع وإيجار، خدمات عقارية، عقود وساطة، عقود إيجار، واستشارة عقارية مجانية.</p>

            <div className="heroActions">
              <Link href="/listings" className="heroPrimaryBtn">
                تصفح العروض
                <span className="material-icons-outlined">arrow_back</span>
              </Link>
              <Link href="/request" className="heroSecondaryBtn">
                اسأل العقاري الذكي
                <span className="material-icons-outlined">smart_toy</span>
              </Link>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="heroSecondaryBtn">
                واتساب
                <span className="material-icons-outlined">chat</span>
              </a>
            </div>

            <div className="search-container glass-effect compactHeroSearch">
              <div className="search-tabs">
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>الكل</button>
                <button className={`tab-btn ${activeTab === 'sale' ? 'active' : ''}`} onClick={() => setActiveTab('sale')}>للبيع</button>
                <button className={`tab-btn ${activeTab === 'rent' ? 'active' : ''}`} onClick={() => setActiveTab('rent')}>للإيجار</button>
              </div>
              <div className="search-action">
                <Link href={listingHref} className="main-search-btn">
                  استكشف العقارات الآن
                  <span className="material-icons-outlined">arrow_back</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="container home-content-body">
          <section className="homeQuickGrid">
            {QUICK_CARDS.map((item) => <InfoCard key={item.title} item={item} />)}
          </section>

          <section className="latest-listings-section homeBlock">
            <SectionHeader
              eyebrow="العروض"
              title="أحدث العروض العقارية"
              description="اكتشف أحدث الأراضي والفلل والشقق المدرجة لدينا، مع إمكانية تصفية العروض حسب البيع أو الإيجار."
              action={<Link href="/listings" className="nb-view-btn outline-btn">عرض جميع العقارات</Link>}
            />
            <div className="homeListingTabs">
              <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>الكل</button>
              <button className={activeTab === 'sale' ? 'active' : ''} onClick={() => setActiveTab('sale')}>للبيع</button>
              <button className={activeTab === 'rent' ? 'active' : ''} onClick={() => setActiveTab('rent')}>للإيجار</button>
            </div>
            <ListingsState loading={loading} error={errorText} items={filteredItems} />
          </section>

          <section className="homeBlock">
            <SectionHeader
              eyebrow="الخدمات"
              title="خدماتنا العقارية"
              description="نقدم خدمات عقارية متكاملة تشمل عقود الوساطة، ترخيص الإعلانات، عقود الإيجار، تسويق العقارات، والاستشارة العقارية المجانية."
            />
            <div className="homeServicesGrid">
              {SERVICE_CARDS.map((item) => <InfoCard key={item.title} item={item} />)}
            </div>
          </section>

          <section className="homeBlock neighborhoodsBlock">
            <NeighborhoodGrid title="استكشف المناطق والأحياء" showViewAll />
          </section>

          <section className="homeBlock faqHomeBlock">
            <SectionHeader
              eyebrow="معرفة عقارية"
              title="أسئلة عقارية مهمة"
              description="إجابات مختصرة على أسئلة يحتاجها المالك أو المشتري عند البيع، الإفراغ، ضريبة التصرفات العقارية، والتعامل مع البورصة العقارية."
              action={<Link href="/faq" className="nb-view-btn outline-btn">عرض جميع الأسئلة</Link>}
            />
            <div className="homeFaqGrid">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="homeFaqCard">
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
            <div className="faqWhatsappNote">
              <span className="material-icons-outlined">support_agent</span>
              <p>للتوضيح أو المساعدة في أي إجراء عقاري، يمكنك التواصل معنا عبر واتساب وسنوضح لك الخطوات المناسبة حسب حالتك.</p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">تواصل عبر واتساب</a>
            </div>
          </section>

          <section className="cta-section gradient-bg">
            <div className="cta-text">
              <h2>تحتاج خدمة أو استشارة عقارية؟</h2>
              <p>تواصل معنا لطلب خدمة عقارية، استشارة مجانية، أو متابعة عروض البيع والإيجار في أبحر الشمالية وشمال جدة.</p>
            </div>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="whatsapp-cta-btn pulse-effect">
              <span className="material-icons-outlined">chat</span>
              تحدث معنا عبر الواتساب
            </a>
          </section>
        </div>
      </div>

      <style jsx>{`
        .heroBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.18);
          color: #fff;
          border: 1px solid rgba(255,255,255,.25);
          font-weight: 900;
          margin-bottom: 14px;
          backdrop-filter: blur(10px);
        }

        .heroActions {
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          margin: 24px 0 12px;
        }

        .heroPrimaryBtn,
        .heroSecondaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          border-radius: 999px;
          padding: 12px 18px;
          font-weight: 900;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .heroPrimaryBtn {
          background: var(--primary);
          color: #fff;
          box-shadow: 0 14px 30px rgba(0,0,0,.18);
        }

        .heroSecondaryBtn {
          background: rgba(255,255,255,.14);
          color: #fff;
          border: 1px solid rgba(255,255,255,.26);
          backdrop-filter: blur(10px);
        }

        .heroPrimaryBtn:hover,
        .heroSecondaryBtn:hover {
          transform: translateY(-2px);
        }

        .compactHeroSearch {
          margin-top: 20px;
        }

        .homeBlock {
          margin-top: 36px;
        }

        .homeQuickGrid,
        .homeServicesGrid,
        .homeFaqGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .homeServicesGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .homeInfoCard {
          position: relative;
          min-height: 225px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 22px;
          border-radius: 22px;
          background: #fff;
          border: 1px solid var(--border);
          color: var(--text);
          text-decoration: none;
          box-shadow: 0 10px 28px rgba(15, 23, 42, .05);
          overflow: hidden;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }

        .homeInfoCard::after {
          content: '';
          position: absolute;
          inset-inline-start: -40px;
          top: -40px;
          width: 115px;
          height: 115px;
          border-radius: 999px;
          background: rgba(214, 179, 91, .12);
        }

        .homeInfoCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, .08);
          border-color: rgba(214, 179, 91, .55);
        }

        .homeInfoCard.highlight {
          border-color: rgba(214, 179, 91, .65);
          background: linear-gradient(135deg, rgba(214,179,91,.13), #fff 58%);
        }

        .homeInfoIcon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(214, 179, 91, .14);
          color: var(--primary);
          position: relative;
          z-index: 1;
        }

        .homeInfoIcon .material-icons-outlined {
          font-size: 27px;
        }

        .homeInfoCard h3 {
          margin: 6px 0 0;
          font-size: 18px;
          font-weight: 950;
          color: var(--text);
          position: relative;
          z-index: 1;
        }

        .homeInfoCard p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.9;
          font-weight: 700;
          position: relative;
          z-index: 1;
        }

        .homeInfoLink {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--primary);
          font-weight: 900;
          position: relative;
          z-index: 1;
        }

        .homeInfoLink .material-icons-outlined {
          font-size: 18px;
        }

        .homeSectionHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .homeSectionHeader h2 {
          margin: 6px 0 8px;
          color: var(--text);
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 950;
        }

        .homeSectionHeader p {
          margin: 0;
          color: var(--muted);
          font-weight: 700;
          line-height: 1.9;
          max-width: 720px;
        }

        .sectionEyebrow {
          color: var(--primary);
          font-weight: 950;
          font-size: 13px;
        }

        .homeListingTabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .homeListingTabs button {
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          border-radius: 999px;
          padding: 9px 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .homeListingTabs button.active {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary);
        }

        .homeFaqCard {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, .04);
        }

        .homeFaqCard h3 {
          margin: 0 0 10px;
          color: var(--text);
          font-size: 17px;
          font-weight: 950;
          line-height: 1.7;
        }

        .homeFaqCard p {
          margin: 0;
          color: var(--muted);
          line-height: 1.95;
          font-weight: 700;
          font-size: 14px;
        }

        .faqWhatsappNote {
          margin-top: 16px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid var(--border);
        }

        .faqWhatsappNote .material-icons-outlined {
          color: var(--primary);
          font-size: 26px;
        }

        .faqWhatsappNote p {
          margin: 0;
          color: var(--muted);
          line-height: 1.8;
          font-weight: 800;
        }

        .faqWhatsappNote a {
          color: #fff;
          background: var(--primary);
          text-decoration: none;
          border-radius: 999px;
          padding: 10px 15px;
          font-weight: 900;
          white-space: nowrap;
        }

        @media (max-width: 1000px) {
          .homeServicesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .homeQuickGrid,
          .homeFaqGrid {
            grid-template-columns: 1fr;
          }

          .homeSectionHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .faqWhatsappNote {
            grid-template-columns: 1fr;
            text-align: right;
          }
        }

        @media (max-width: 640px) {
          .homeServicesGrid {
            grid-template-columns: 1fr;
          }

          .homeInfoCard {
            min-height: auto;
          }

          .heroActions a {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
