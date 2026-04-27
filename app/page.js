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

const styles = {
  section: { marginTop: 34 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'stretch' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'stretch' },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 210,
    padding: 20,
    borderRadius: 22,
    background: '#fff',
    border: '1px solid var(--border)',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
    color: 'var(--text)',
    textDecoration: 'none',
    overflow: 'hidden',
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(214, 179, 91, 0.14)',
    color: 'var(--primary)',
    flexShrink: 0,
  },
  title: { margin: '4px 0 0', color: 'var(--text)', fontSize: 19, fontWeight: 950, lineHeight: 1.55 },
  desc: { margin: 0, color: 'var(--muted)', fontSize: 14, fontWeight: 700, lineHeight: 1.9 },
  link: { marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 950 },
};

function ListingsState({ loading, error, items }) {
  if (loading) {
    return (
      <div className="listing-grid">
        {[1, 2, 3, 4].map((id) => <div key={id} className="skeleton-card" />)}
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
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
      <div style={{ maxWidth: 760 }}>
        {eyebrow ? <span style={{ color: 'var(--primary)', fontWeight: 950, fontSize: 13 }}>{eyebrow}</span> : null}
        <h2 style={{ margin: '6px 0 8px', color: 'var(--text)', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 950, lineHeight: 1.35 }}>{title}</h2>
        {description ? <p style={{ margin: 0, color: 'var(--muted)', fontWeight: 700, lineHeight: 1.9, fontSize: 15 }}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function InfoCard({ item }) {
  return (
    <Link
      href={item.href}
      style={{
        ...styles.card,
        borderColor: item.highlight ? 'rgba(214, 179, 91, 0.65)' : 'var(--border)',
        background: item.highlight ? 'linear-gradient(135deg, rgba(214,179,91,.14), #fff 62%)' : '#fff',
      }}
    >
      <div style={styles.icon}><span className="material-icons-outlined" style={{ fontSize: 28 }}>{item.icon}</span></div>
      <h3 style={styles.title}>{item.title}</h3>
      <p style={styles.desc}>{item.description}</p>
      <span style={styles.link}>{item.cta}<span className="material-icons-outlined" style={{ fontSize: 18 }}>arrow_back</span></span>
    </Link>
  );
}

function FaqCard({ item }) {
  return (
    <div style={{ ...styles.card, minHeight: 0 }}>
      <h3 style={{ ...styles.title, fontSize: 18 }}>{item.question}</h3>
      <p style={{ ...styles.desc, fontSize: 14 }}>{item.answer}</p>
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
    return () => { active = false; };
  }, []);

  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (activeTab === 'all') return safeItems;
    return safeItems.filter((item) => item.dealType === activeTab);
  }, [items, activeTab]);

  const listingHref = activeTab === 'all' ? '/listings' : `/listings?dealType=${activeTab}`;

  const tabStyle = (key) => ({
    border: '1px solid var(--border)',
    background: activeTab === key ? 'var(--primary)' : '#fff',
    color: activeTab === key ? '#fff' : 'var(--text)',
    borderRadius: 999,
    padding: '10px 18px',
    fontWeight: 950,
    cursor: 'pointer',
  });

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <div>
        <section className="home-hero-section">
          <div className="home-hero-overlay" />
          <div className="container home-hero-content">
            <span style={{ display: 'inline-flex', padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.25)', fontWeight: 900, marginBottom: 14 }}>عقار أبحر — شمال جدة</span>
            <h1 className="home-hero-title">عقارات أبحر الشمالية <span>وشمال جدة</span></h1>
            <p className="home-hero-subtitle">عروض بيع وإيجار، خدمات عقارية، عقود وساطة، عقود إيجار، واستشارة عقارية مجانية.</p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', margin: '24px 0 12px' }}>
              <Link href="/listings" className="btn btnPrimary">تصفح العروض <span className="material-icons-outlined">arrow_back</span></Link>
              <Link href="/request" className="btn">اسأل العقاري الذكي <span className="material-icons-outlined">smart_toy</span></Link>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn">واتساب <span className="material-icons-outlined">chat</span></a>
            </div>

            <div className="search-container glass-effect" style={{ marginTop: 18 }}>
              <div className="search-tabs">
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>الكل</button>
                <button className={`tab-btn ${activeTab === 'sale' ? 'active' : ''}`} onClick={() => setActiveTab('sale')}>للبيع</button>
                <button className={`tab-btn ${activeTab === 'rent' ? 'active' : ''}`} onClick={() => setActiveTab('rent')}>للإيجار</button>
              </div>
              <div className="search-action">
                <Link href={listingHref} className="main-search-btn">استكشف العقارات الآن <span className="material-icons-outlined">arrow_back</span></Link>
              </div>
            </div>
          </div>
        </section>

        <div className="container home-content-body">
          <section style={{ ...styles.section, ...styles.grid3 }}>
            {QUICK_CARDS.map((item) => <InfoCard key={item.title} item={item} />)}
          </section>

          <section className="latest-listings-section" style={styles.section}>
            <SectionHeader
              eyebrow="العروض"
              title="أحدث العروض العقارية"
              description="اكتشف أحدث الأراضي والفلل والشقق المدرجة لدينا، مع إمكانية تصفية العروض حسب البيع أو الإيجار."
              action={<Link href="/listings" className="nb-view-btn outline-btn">عرض جميع العقارات</Link>}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>الكل</button>
              <button style={tabStyle('sale')} onClick={() => setActiveTab('sale')}>للبيع</button>
              <button style={tabStyle('rent')} onClick={() => setActiveTab('rent')}>للإيجار</button>
            </div>
            <ListingsState loading={loading} error={errorText} items={filteredItems} />
          </section>

          <section style={styles.section}>
            <SectionHeader
              eyebrow="الخدمات"
              title="خدماتنا العقارية"
              description="نقدم خدمات عقارية متكاملة تشمل عقود الوساطة، ترخيص الإعلانات، عقود الإيجار، تسويق العقارات، والاستشارة العقارية المجانية."
            />
            <div style={styles.grid4}>
              {SERVICE_CARDS.map((item) => <InfoCard key={item.title} item={item} />)}
            </div>
          </section>

          <section style={styles.section}>
            <NeighborhoodGrid title="استكشف المناطق والأحياء" showViewAll />
          </section>

          <section style={styles.section}>
            <SectionHeader
              eyebrow="معرفة عقارية"
              title="أسئلة عقارية مهمة"
              description="إجابات مختصرة على أسئلة يحتاجها المالك أو المشتري عند البيع، الإفراغ، ضريبة التصرفات العقارية، والتعامل مع البورصة العقارية."
              action={<Link href="/faq" className="nb-view-btn outline-btn">عرض جميع الأسئلة</Link>}
            />
            <div style={styles.grid3}>
              {FAQ_ITEMS.map((item) => <FaqCard key={item.question} item={item} />)}
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid var(--border)' }} className="faqHelpBox">
              <span className="material-icons-outlined" style={{ color: 'var(--primary)', fontSize: 28 }}>support_agent</span>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.8, fontWeight: 800 }}>للتوضيح أو المساعدة في أي إجراء عقاري، يمكنك التواصل معنا عبر واتساب وسنوضح لك الخطوات المناسبة حسب حالتك.</p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', background: 'var(--primary)', textDecoration: 'none', borderRadius: 999, padding: '10px 16px', fontWeight: 950, whiteSpace: 'nowrap' }}>تواصل عبر واتساب</a>
            </div>
          </section>

          <section className="cta-section gradient-bg" style={styles.section}>
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
        @media (max-width: 720px) {
          .faqHelpBox { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
