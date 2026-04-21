'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ============================================================
// المكون الرئيسي ListingDetailsClient
// ============================================================
export default function ListingDetailsClient({ listing = {} }) {
  const [activeImage, setActiveImage] = useState(0);

  const data = useMemo(() => {
    const defaultImages = [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687931-cebf10cbdffb?w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
    ];

    return {
      title: listing.title || 'فيلا فاخرة بتصميم مودرن وتشطيبات راقية',
      price: listing.price || 2500000,
      area: listing.area || 350,
      propertyType: listing.propertyType || 'فيلا',
      dealType: listing.dealType || 'sale',
      neighborhood: listing.neighborhood || 'حي الشراع',
      plan: listing.plan || '505',
      part: listing.part || 'أ',
      streetWidth: listing.streetWidth || 20,
      facade: listing.facade || 'شمالية',
      dimensions: listing.dimensions || '14x25',
      description: listing.description ||
        'فيلا بتصميم عصري وتشطيبات VIP. تتميز بموقع استراتيجي بالقرب من الخدمات الرئيسية والمدارس. تحتوي على مسابح، مصعد، وتكييف مركزي. جاهزة للسكن الفوري، بناء شخصي وإشراف هندسي متكامل.\n\nالمميزات الإضافية:\n- غرف نوم واسعة بحمامات داخلية\n- مطبخ مجهز بالكامل\n- حديقة خاصة\n- موقف سيارات يتسع لسيارتين\n- نظام أمان متكامل\n- تشطيبات سوبر ديلوكس\n- قريبة من البحر والخدمات العامة',
      images: listing.images?.length > 0 ? listing.images : defaultImages,
      contactPhone: listing.contactPhone || '0500000000',
      direct: listing.direct ?? true,
      plotNumber: listing.plotNumber || '142',
      dateAdded: listing.createdAt
        ? new Date(listing.createdAt).toLocaleDateString('ar-SA')
        : 'منذ أسبوع',
      views: listing.views || 124,
      status: listing.status || 'متاح',
      id: listing.id || 'AQR-001',
      licenseNumber: listing.licenseNumber || '7200000000',
      city: listing.city || 'جدة',
    };
  }, [listing]);

  const formatPrice = (price) => {
    if (!price) return 'السعر غير محدد';
    return new Intl.NumberFormat('ar-SA').format(price) + ' ر.س';
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data.title,
        text: `شاهد هذا العقار المميز: ${data.title}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('تم نسخ الرابط');
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <style jsx global>{`
        :root {
          --primary-50: #f0fdfa;
          --primary-100: #ccfbf1;
          --primary-400: #2dd4bf;
          --primary-500: #14b8a6;
          --primary-600: #0d9488;
          --primary-700: #0f766e;
        }
        .text-primary-500 { color: var(--primary-500); }
        .text-primary-600 { color: var(--primary-600); }
        .text-primary-700 { color: var(--primary-700); }
        .bg-primary-50 { background-color: var(--primary-50); }
        .hover\\:text-primary-600:hover { color: var(--primary-600); }
        .ring-primary-500 { --tw-ring-color: var(--primary-500); }
        .from-primary-400 { --tw-gradient-from: var(--primary-400); }
        .to-primary-600 { --tw-gradient-to: var(--primary-600); }
        .border-primary-500 { border-color: var(--primary-500); }
      `}</style>

      <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
        <Breadcrumb
          neighborhood={data.neighborhood}
          propertyType={data.propertyType}
          dealType={data.dealType}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ListingHeader data={data} formatPrice={formatPrice} />

          <ImageGallery
            images={data.images}
            activeIndex={activeImage}
            setActiveIndex={setActiveImage}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
            <div className="lg:col-span-8 space-y-6">
              <QuickFeatures
                area={data.area}
                propertyType={data.propertyType}
                streetWidth={data.streetWidth}
                facade={data.facade}
              />
              <TechnicalSpecs data={data} />
              <Description description={data.description} />
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-6 space-y-6">
                <ContactSidebar
                  contactPhone={data.contactPhone}
                  listingId={data.id}
                  onShare={handleShare}
                />
                <TrustBadge />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// المكونات الفرعية (كلها داخل نفس الملف)
// ============================================================

// ------------------- Breadcrumb -------------------
function Breadcrumb({ neighborhood, propertyType, dealType }) {
  const dealText = dealType === 'sale' ? 'للبيع' : 'للإيجار';
  return (
    <div className="bg-white border-b border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-primary-600 transition flex items-center gap-1">
            <span className="material-icons-outlined text-sm">home</span>
            الرئيسية
          </Link>
          <span className="material-icons-outlined text-xs">chevron_left</span>
          <Link href={`/neighborhoods/${neighborhood}`} className="hover:text-primary-600 transition">
            {neighborhood}
          </Link>
          <span className="material-icons-outlined text-xs">chevron_left</span>
          <span className="text-gray-900 font-medium">
            {propertyType} {dealText}
          </span>
        </nav>
      </div>
    </div>
  );
}

// ------------------- ListingHeader -------------------
function ListingHeader({ data, formatPrice }) {
  const dealText = data.dealType === 'sale' ? 'للبيع' : 'للإيجار';
  const pricePerMeter = data.price && data.area ? Math.round(data.price / data.area) : null;

  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${data.status === 'متاح' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {data.status}
          </span>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            {dealText}
          </span>
          {data.direct && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
              <span className="material-icons-outlined text-[14px]">stars</span>
              مباشر من المالك
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
          {data.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <p className="flex items-center gap-1.5">
            <span className="material-icons-outlined text-primary-500">location_on</span>
            {data.neighborhood}{data.plan ? `، مخطط ${data.plan}` : ''}{data.part ? `، جزء ${data.part}` : ''}
          </p>
          <p className="flex items-center gap-1.5 border-r border-gray-300 pr-4">
            <span className="material-icons-outlined text-gray-400">calendar_today</span>
            نُشر: {data.dateAdded}
          </p>
          <p className="flex items-center gap-1.5 border-r border-gray-300 pr-4">
            <span className="material-icons-outlined text-gray-400">visibility</span>
            {data.views} مشاهدة
          </p>
        </div>
      </div>

      <div className="lg:text-left shrink-0 bg-gray-50 p-5 rounded-xl border border-gray-100 text-center lg:text-right">
        <p className="text-sm text-gray-500 mb-1 font-medium">السعر المطلوب</p>
        <div className="text-3xl md:text-4xl font-black text-primary-700">
          {formatPrice(data.price)}
        </div>
        {pricePerMeter && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
            <span className="material-icons-outlined text-[14px] text-gray-400">calculate</span>
            سعر المتر المربع: <span className="font-bold text-gray-700">{new Intl.NumberFormat('ar-SA').format(pricePerMeter)} ر.س</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------- ImageGallery -------------------
function ImageGallery({ images, activeIndex, setActiveIndex }) {
  return (
    <div className="mb-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[400px] md:h-[550px]">
        <div className="md:col-span-8 lg:col-span-9 h-full rounded-xl overflow-hidden relative group">
          <Image
            src={images[activeIndex]}
            alt="الصورة الرئيسية"
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <span className="material-icons-outlined text-[18px]">photo_camera</span>
            {activeIndex + 1} / {images.length}
          </div>
        </div>

        <div className="hidden md:flex flex-col gap-3 h-full md:col-span-4 lg:col-span-3">
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative flex-1 rounded-xl overflow-hidden cursor-pointer ${
                activeIndex === idx ? 'ring-4 ring-primary-500 ring-offset-2' : ''
              }`}
              style={{ minHeight: 0 }}
            >
              <Image
                src={img}
                alt={`صورة ${idx + 1}`}
                fill
                className={`object-cover transition duration-300 ${
                  activeIndex === idx ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* الصور المصغرة للجوال */}
      <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-2 snap-x">
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`snap-center shrink-0 relative w-24 h-24 rounded-lg overflow-hidden cursor-pointer ${
              activeIndex === idx ? 'ring-2 ring-primary-500 ring-offset-1' : 'opacity-70'
            }`}
          >
            <Image src={img} alt="" fill className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------- QuickFeatures -------------------
function QuickFeatures({ area, propertyType, streetWidth, facade }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">نظرة عامة</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
        <Feature icon="straighten" label="المساحة" value={`${area} م²`} />
        <Feature icon="apartment" label="نوع العقار" value={propertyType} />
        <Feature icon="add_road" label="عرض الشارع" value={streetWidth ? `${streetWidth} م` : 'غير محدد'} />
        <Feature icon="explore" label="الواجهة" value={facade || 'غير محدد'} />
      </div>
    </div>
  );
}

function Feature({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex shrink-0 items-center justify-center text-gray-500 border border-gray-100">
        <span className="material-icons-outlined text-[22px]">{icon}</span>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-0.5 font-medium">{label}</div>
        <div className="text-sm font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

// ------------------- TechnicalSpecs -------------------
function TechnicalSpecs({ data }) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
          <span className="material-icons-outlined">fact_check</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">المواصفات الفنية</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
        <SpecRow label="المدينة" value={data.city} />
        <SpecRow label="الحي" value={data.neighborhood} />
        <SpecRow label="المخطط" value={data.plan} />
        <SpecRow label="الجزء" value={data.part} />
        <SpecRow label="رقم القطعة" value={data.plotNumber} />
        <SpecRow label="الأبعاد" value={data.dimensions} dir="ltr" />
        <SpecRow label="حالة العقار" value={data.status} />
        <SpecRow label="رقم رخصة الإعلان" value={data.licenseNumber} />
      </div>
    </div>
  );
}

function SpecRow({ label, value, dir = 'rtl' }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-dashed border-gray-200 last:border-0">
      <span className="text-gray-500 text-sm font-medium">{label}</span>
      <span className="text-gray-900 text-sm font-bold" dir={dir}>{value}</span>
    </div>
  );
}

// ------------------- Description -------------------
function Description({ description }) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
          <span className="material-icons-outlined">description</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">وصف العقار</h2>
      </div>
      <div className="prose prose-slate max-w-none text-gray-600 leading-loose text-base">
        {description.split('\n').map((para, idx) => (
          <p key={idx} className="mb-4">{para}</p>
        ))}
      </div>
    </div>
  );
}

// ------------------- ContactSidebar -------------------
function ContactSidebar({ contactPhone, listingId, onShare }) {
  const whatsappNumber = `966${contactPhone.replace(/^0/, '')}`;
  const message = `مرحباً، أستفسر عن العقار المرجعي #${listingId}`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>

      <div className="text-center mb-6 pt-2">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md relative">
          <span className="material-icons-outlined text-3xl text-primary-600">storefront</span>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">لؤلؤة المنار للعقارات</h3>
        <p className="text-sm text-gray-500 mb-2">مكتب عقاري معتمد</p>
        <RatingStars rating={4.8} />
      </div>

      <div className="space-y-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold transition shadow-sm"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5 filter brightness-0 invert" />
          محادثة واتساب
        </a>
        <a
          href={`tel:${contactPhone}`}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl font-bold transition shadow-sm"
        >
          <span className="material-icons-outlined">phone_in_talk</span>
          إتصال هاتفي
        </a>
        <button
          onClick={onShare}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold transition"
        >
          <span className="material-icons-outlined">ios_share</span>
          مشاركة العرض
        </button>
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
        <span className="font-medium">رقم المرجع:</span>
        <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">#{listingId}</span>
      </div>
    </div>
  );
}

function RatingStars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center justify-center gap-1 text-amber-500 text-sm">
      {[...Array(5)].map((_, i) => {
        if (i < full) return <span key={i} className="material-icons-outlined text-[16px]">star</span>;
        if (i === full && half) return <span key={i} className="material-icons-outlined text-[16px]">star_half</span>;
        return <span key={i} className="material-icons-outlined text-[16px]">star_outline</span>;
      })}
      <span className="text-gray-600 font-medium mr-1">({rating})</span>
    </div>
  );
}

// ------------------- TrustBadge -------------------
function TrustBadge() {
  return (
    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
      <div className="w-12 h-12 bg-white rounded-full flex shrink-0 items-center justify-center text-blue-600 shadow-sm">
        <span className="material-icons-outlined">gpp_good</span>
      </div>
      <div>
        <h4 className="font-bold text-blue-900 mb-1">عقار موثوق</h4>
        <p className="text-sm text-blue-800 leading-relaxed">
          تم التحقق من صحة بيانات هذا العقار ومطابقته للمواصفات المعروضة من قبل فريقنا لضمان تجربة آمنة.
        </p>
      </div>
    </div>
  );
}
