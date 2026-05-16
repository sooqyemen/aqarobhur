'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRequest, fetchLatestListings } from '@/lib/listings';
import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { formatPriceSAR } from '@/lib/format';
import { collectMediaEntries, isVideoLike } from '@/lib/media';

const NEIGHBORHOODS = [
  'أبحر الشمالية',
  'الفنار',
  'الزمرد',
  'الياقوت',
  'الشراع',
  'الأمواج',
  'جوهرة العروس',
  'الهجرة',
  'طيبة الفرعية',
];

const SERVICES = [
  {
    icon: 'groups',
    title: 'تسويق عقاري',
    text: 'تسويق احترافي لعقارك للوصول لأفضل المشترين والمستأجرين.',
    href: '/marketing-request',
  },
  {
    icon: 'fact_check',
    title: 'إصدار ترخيص إعلان',
    text: 'نساعدك في عقد الوساطة وإصدار ترخيص الإعلان بسرعة واحترافية.',
    href: '/marketing-request',
  },
  {
    icon: 'assignment',
    title: 'إدارة الطلبات',
    text: 'تنظيم طلبات العملاء ومطابقتها مع العروض المناسبة بكفاءة.',
    href: '/request',
  },
  {
    icon: 'grade',
    title: 'عروض مباشرة',
    text: 'عروض عقارية مباشرة من الملاك والوكلاء المعتمدين متى توفرت.',
    href: '/listings',
  },
];

const FAQ_ITEMS = [
  'كيف يمكنني إضافة إعلان؟',
  'هل هناك رسوم على نشر الإعلانات؟',
  'كيف يتم التحقق من الإعلانات؟',
  'هل يمكنني تعديل أو حذف الإعلان؟',
];

function updateQuery(filters) {
  const params = new URLSearchParams();
  if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.dealType) params.set('dealType', filters.dealType);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  const query = params.toString();
  return query ? `/listings?${query}` : '/listings';
}

function requestDealType(type = '') {
  const text = String(type || '').trim();
  if (text === 'شراء') return 'sale';
  if (text === 'إيجار') return 'rent';
  return '';
}

function getListingId(item) {
  return item?.id || item?.docId || item?.listingId || item?._id || '';
}

function getCoverUrl(item) {
  try {
    const entries = collectMediaEntries(item);
    const image = entries.find((entry) => entry?.url && !isVideoLike(entry));
    return image?.url || entries?.[0]?.url || '';
  } catch {
    return '';
  }
}

function listingWhatsAppText(item) {
  const title = item?.title || 'العرض العقاري';
  const neighborhood = item?.neighborhood ? ` في ${item.neighborhood}` : '';
  return `السلام عليكم، أرغب في الاستفسار عن ${title}${neighborhood}.`;
}

function HomeListingCard({ item, index, fallbackPhone }) {
  const safeId = getListingId(item);
  const detailLink = safeId ? `/listing/${encodeURIComponent(String(safeId))}` : '/listings';
  const coverUrl = getCoverUrl(item);
  const isRent = item?.dealType === 'rent';
  const price = item?.price ? formatPriceSAR(item.price) : 'السعر عند التواصل';
  const phone = item?.contactPhone || fallbackPhone;
  const whatsappHref = buildWhatsAppLink({ phone, text: listingWhatsAppText(item) });
  const area = item?.area ? `${item.area} م²` : 'المساحة غير محددة';
  const facade = item?.facade || item?.frontage || item?.direction || 'الواجهة غير محددة';
  const neighborhood = item?.neighborhood || 'أبحر الشمالية';
  const title = item?.title || item?.propertyType || 'عرض عقاري';

  return (
    <article className="homeListingCard">
      <Link href={detailLink} className="homeListingMedia" aria-label={title}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} loading="lazy" />
        ) : (
          <div className={`listingFallback fallback${(index % 4) + 1}`}>
            <span className="material-icons-outlined">villa</span>
          </div>
        )}
        <span className={`dealChip ${isRent ? 'rent' : 'sale'}`}>{isRent ? 'للإيجار' : 'للبيع'}</span>
        <span className="heartChip"><span className="material-icons-outlined">favorite_border</span></span>
        <strong className="priceOverlay">{price}{isRent ? <small> / سنوي</small> : null}</strong>
      </Link>

      <div className="homeListingBody">
        <Link href={detailLink} className="homeListingTitle">{title}</Link>
        <p className="homeListingLocation">{neighborhood}</p>
        <div className="homeListingFacts">
          <span>{area}</span>
          <span>{facade}</span>
        </div>
        <div className="homeListingActions">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="whatsBtn">
            <span className="material-icons-outlined">chat</span>
            واتساب
          </a>
          <Link href={detailLink} className="detailsBtn">التفاصيل</Link>
        </div>
      </div>
    </article>
  );
}

function ListingSkeletons() {
  return (
    <div className="homeListingsGrid">
      {[1, 2, 3, 4].map((id) => <div key={id} className="homeListingSkeleton" />)}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [filters, setFilters] = useState({
    neighborhood: '',
    propertyType: '',
    dealType: '',
    maxPrice: '',
  });
  const [request, setRequest] = useState({ name: '', phone: '', type: '', message: '' });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState({ type: '', text: '' });

  const officePhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const listingsHref = useMemo(() => updateQuery(filters), [filters]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setErrorText('');
        const result = await fetchLatestListings({ n: 8, onlyPublic: true, includeLegacy: false });
        if (!active) return;
        setItems(Array.isArray(result) ? result.filter(Boolean) : []);
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

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filters.dealType && item?.dealType !== filters.dealType) return false;
        if (filters.neighborhood && item?.neighborhood !== filters.neighborhood) return false;
        if (filters.propertyType && item?.propertyType !== filters.propertyType) return false;
        return true;
      })
      .slice(0, 4);
  }, [items, filters]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function updateRequestField(key, value) {
    setRequestStatus({ type: '', text: '' });
    setRequest((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    router.push(listingsHref);
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();
    if (requestSubmitting) return;

    const name = String(request.name || '').trim();
    const phone = String(request.phone || '').trim();
    const type = String(request.type || '').trim();
    const message = String(request.message || '').trim();

    if (!name || !phone) {
      setRequestStatus({ type: 'error', text: 'اكتب الاسم ورقم الجوال فقط، وبعدها نقدر نستقبل طلبك مباشرة.' });
      return;
    }

    setRequestSubmitting(true);
    setRequestStatus({ type: '', text: '' });

    try {
      await createRequest({
        name,
        phone,
        dealType: requestDealType(type),
        propertyType: '',
        city: 'جدة',
        region: 'شمال جدة',
        neighborhood: '',
        note: message,
        goal: type,
        sourceType: 'نموذج الصفحة الرئيسية',
        status: 'new',
      });

      setRequest({ name: '', phone: '', type: '', message: '' });
      setRequestStatus({ type: 'success', text: 'تم استلام طلبك بنجاح. سيقوم أحد موظفينا بالتواصل معك قريباً.' });
    } catch (error) {
      console.warn('Home request submit failed', error);
      setRequestStatus({ type: 'error', text: 'تعذر إرسال الطلب الآن. تأكد من الاتصال أو جرّب مرة أخرى.' });
    } finally {
      setRequestSubmitting(false);
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <main className="premiumHome" dir="rtl">
        <section className="heroPanel">
          <div className="heroBackdrop" aria-hidden="true">
            <span className="sun" />
            <span className="coastLine" />
            <span className="villa villaOne" />
            <span className="villa villaTwo" />
            <span className="villa villaThree" />
            <span className="palm palmOne" />
            <span className="palm palmTwo" />
          </div>

          <div className="container heroContent">
            <h1>عقارات أبحر الشمالية وشمال جدة</h1>
            <p>أراضي، فلل، شقق للبيع والإيجار في أرقى أحياء أبحر وشمال جدة</p>

            <form className="heroSearch" onSubmit={handleSearchSubmit}>
              <label>
                <span>الحي</span>
                <select value={filters.neighborhood} onChange={(e) => setFilter('neighborhood', e.target.value)}>
                  <option value="">اختر الحي</option>
                  {NEIGHBORHOODS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>

              <label>
                <span>نوع العقار</span>
                <select value={filters.propertyType} onChange={(e) => setFilter('propertyType', e.target.value)}>
                  <option value="">اختر نوع العقار</option>
                  <option value="أرض">أرض</option>
                  <option value="فيلا">فيلا</option>
                  <option value="شقة">شقة</option>
                  <option value="عمارة">عمارة</option>
                </select>
              </label>

              <label>
                <span>بيع / إيجار</span>
                <select value={filters.dealType} onChange={(e) => setFilter('dealType', e.target.value)}>
                  <option value="">الكل</option>
                  <option value="sale">للبيع</option>
                  <option value="rent">للإيجار</option>
                </select>
              </label>

              <label>
                <span>السعر</span>
                <select value={filters.maxPrice} onChange={(e) => setFilter('maxPrice', e.target.value)}>
                  <option value="">الحد الأدنى - الحد الأقصى</option>
                  <option value="500000">حتى 500 ألف</option>
                  <option value="1000000">حتى مليون</option>
                  <option value="2000000">حتى 2 مليون</option>
                  <option value="5000000">حتى 5 مليون</option>
                </select>
              </label>

              <button type="submit">
                <span className="material-icons-outlined">search</span>
                بحث
              </button>
            </form>
          </div>
        </section>

        <section className="container neighborhoodsBand" aria-label="تصفح الأحياء">
          <div className="bandHeader">
            <h2><span className="material-icons-outlined">location_on</span> تصفح الأحياء</h2>
            <Link href="/neighborhoods">عرض جميع الأحياء</Link>
          </div>
          <div className="chipsScroller">
            {NEIGHBORHOODS.map((name) => (
              <Link key={name} href={`/listings?neighborhood=${encodeURIComponent(name)}`} className="neighborhoodChip">
                <span className="material-icons-outlined">park</span>
                {name}
              </Link>
            ))}
          </div>
        </section>

        <section className="container listingsSection">
          <div className="sectionHeading compactHeading">
            <div>
              <h2><span className="material-icons-outlined">apartment</span> أحدث العروض العقارية</h2>
            </div>
            <Link href="/listings">عرض جميع العروض</Link>
          </div>

          {loading ? <ListingSkeletons /> : null}
          {!loading && errorText ? <div className="homeError">{errorText}</div> : null}
          {!loading && !errorText && !visibleItems.length ? <div className="homeEmpty">لا توجد عقارات مطابقة حالياً. جرّب عرض جميع العروض.</div> : null}
          {!loading && !errorText && visibleItems.length ? (
            <div className="homeListingsGrid">
              {visibleItems.map((item, index) => (
                <HomeListingCard key={getListingId(item) || `home-listing-${index}`} item={item} index={index} fallbackPhone={officePhone} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="container mapRequestGrid">
          <article className="mapPreviewCard">
            <div className="sectionHeading miniHeading">
              <div>
                <h2><span className="material-icons-outlined">pin_drop</span> استعرض العقارات على الخريطة</h2>
                <p>ابحث عن العقارات المتاحة مباشرة على الخريطة وتعرّف على مواقعها بدقة.</p>
              </div>
            </div>
            <div className="mapMock" aria-hidden="true">
              <span className="seaBlock" />
              <span className="road r1" />
              <span className="road r2" />
              <span className="road r3" />
              <span className="pin p1" />
              <span className="pin p2" />
              <span className="pin p3" />
              <span className="mapLabel l1">الفنار</span>
              <span className="mapLabel l2">الزمرد</span>
              <span className="mapLabel l3">الشراع</span>
            </div>
            <Link href="/map" className="goldAction mapAction"><span className="material-icons-outlined">map</span> فتح الخريطة</Link>
          </article>

          <article className="requestCard">
            <div className="sectionHeading miniHeading centeredHeading">
              <div>
                <h2><span className="material-icons-outlined">send</span> أرسل طلبك العقاري</h2>
                <p>اكتب بياناتك مرة واحدة فقط، ويتم حفظ طلبك مباشرة في لوحة الإدارة بدون تحويلك لصفحة ثانية.</p>
              </div>
            </div>

            <form className="requestForm" onSubmit={handleRequestSubmit}>
              <label>
                <span>الاسم</span>
                <input value={request.name} onChange={(e) => updateRequestField('name', e.target.value)} placeholder="الاسم الكامل" disabled={requestSubmitting} />
              </label>
              <label>
                <span>رقم الجوال</span>
                <input value={request.phone} onChange={(e) => updateRequestField('phone', e.target.value)} placeholder="05XXXXXXXX" disabled={requestSubmitting} />
              </label>
              <label>
                <span>نوع الطلب</span>
                <select value={request.type} onChange={(e) => updateRequestField('type', e.target.value)} disabled={requestSubmitting}>
                  <option value="">اختر نوع الطلب</option>
                  <option value="شراء">شراء</option>
                  <option value="إيجار">إيجار</option>
                  <option value="تسويق عقار">تسويق عقار</option>
                </select>
              </label>
              <label>
                <span>تفاصيل الطلب</span>
                <textarea value={request.message} onChange={(e) => updateRequestField('message', e.target.value)} placeholder="اكتب تفاصيل طلبك..." rows={3} disabled={requestSubmitting} />
              </label>

              {requestStatus.text ? (
                <div className={`requestNotice ${requestStatus.type === 'success' ? 'success' : 'error'}`}>
                  <span className="material-icons-outlined">{requestStatus.type === 'success' ? 'check_circle' : 'error'}</span>
                  {requestStatus.text}
                </div>
              ) : null}

              <button type="submit" className="goldAction fullAction" disabled={requestSubmitting}>
                <span className={`material-icons-outlined ${requestSubmitting ? 'spinIcon' : ''}`}>{requestSubmitting ? 'autorenew' : 'near_me'}</span>
                {requestSubmitting ? 'جاري إرسال الطلب...' : 'إرسال الطلب مباشرة'}
              </button>
            </form>
          </article>
        </section>

        <section className="container servicesSection">
          <div className="sectionHeading compactHeading">
            <div>
              <h2><span className="material-icons-outlined">real_estate_agent</span> خدماتنا</h2>
            </div>
          </div>
          <div className="serviceGrid">
            {SERVICES.map((service) => (
              <Link href={service.href} key={service.title} className="serviceCard">
                <span className="material-icons-outlined">{service.icon}</span>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="container faqSection">
          <div className="sectionHeading compactHeading">
            <div>
              <h2><span className="material-icons-outlined">chat_bubble_outline</span> الأسئلة الشائعة</h2>
            </div>
          </div>
          <div className="faqRow">
            {FAQ_ITEMS.map((question) => (
              <Link href="/faq" key={question} className="faqPill">
                {question}
                <span className="material-icons-outlined">expand_more</span>
              </Link>
            ))}
          </div>
          <Link href="/faq" className="allFaqLink">عرض جميع الأسئلة</Link>
        </section>
      </main>
    </>
  );
}
