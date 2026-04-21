'use client';

import React, { useState } from 'react';

export default function ListingDetailsClient({ listing = {} }) {
  const [activeImage, setActiveImage] = useState(0);

  // داتا افتراضية للتجربة والتوضيح في حال عدم توفر البيانات
  const data = {
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
    description: listing.description || 'فيلا بتصميم عصري وتشطيبات VIP. تتميز بموقع استراتيجي بالقرب من الخدمات الرئيسية والمدارس. تحتوي على مسابح، مصعد، وتكييف مركزي. جاهزة للسكن الفوري، بناء شخصي وإشراف هندسي متكامل.\n\nالمميزات الإضافية:\n- غرف نوم واسعة بحمامات داخلية\n- مطبخ مجهز بالكامل\n- حديقة خاصة\n- موقف سيارات يتسع لسيارتين\n- نظام أمان متكامل\n- تشطيبات سوبر ديلوكس\n- قريبة من البحر والخدمات العامة',
    images: listing.images?.length > 0 ? listing.images : [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2075&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      'https://images.unsplash.com/photo-1600607687931-cebf10cbdffb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'
    ],
    contactPhone: listing.contactPhone || '0500000000',
    direct: listing.direct ?? true,
    plotNumber: listing.plotNumber || '142',
    dateAdded: listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('ar-SA') : 'منذ أسبوع',
    views: listing.views || 124,
    status: listing.status || 'متاح'
  };

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
      alert('تم نسخ الرابط');
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
        
        {/* قسم مسار التصفح وخلفية بسيطة */}
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <a href="/" className="hover:text-primary-600 transition flex items-center gap-1">
                <span className="material-icons-outlined text-sm">home</span>
                الرئيسية
              </a>
              <span className="material-icons-outlined text-xs">chevron_left</span>
              <a href={`/neighborhoods/${data.neighborhood}`} className="hover:text-primary-600 transition">
                {data.neighborhood}
              </a>
              <span className="material-icons-outlined text-xs">chevron_left</span>
              <span className="text-gray-900 font-medium">
                {data.propertyType} {data.dealType === 'sale' ? 'للبيع' : 'للإيجار'}
              </span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* قسم العنوان (Header) */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${data.status === 'متاح' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {data.status}
                </span>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {data.dealType === 'sale' ? 'للبيع' : 'للإيجار'}
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
              {data.area && data.price && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                  <span className="material-icons-outlined text-[14px] text-gray-400">calculate</span>
                  سعر المتر المربع: <span className="font-bold text-gray-700">{Math.round(data.price / data.area).toLocaleString('ar-SA')} ر.س</span>
                </div>
              )}
            </div>
          </div>

          {/* معرض الصور بتصميم الشبكة (Grid Gallery) */}
          <div className="mb-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[400px] md:h-[550px]">
              {/* الصورة الرئيسية الكبيرة */}
              <div className="md:col-span-8 lg:col-span-9 h-full rounded-xl overflow-hidden relative group">
                <img 
                  src={data.images[activeImage]} 
                  alt="الصورة الرئيسية للعقار" 
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                />
                {/* عداد الصور */}
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                  <span className="material-icons-outlined text-[18px]">photo_camera</span>
                  {activeImage + 1} / {data.images.length}
                </div>
              </div>
              
              {/* الصور المصغرة الجانبية */}
              <div className="hidden md:flex flex-col gap-3 h-full md:col-span-4 lg:col-span-3">
                {data.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveImage(idx)}
                    className={`flex-1 rounded-xl overflow-hidden cursor-pointer relative group ${activeImage === idx ? 'ring-4 ring-primary-500 ring-offset-2' : ''}`}
                    style={{ maxHeight: `calc((100% - ${(data.images.length - 1) * 12}px) / ${data.images.length})` }}
                  >
                    <img 
                      src={img} 
                      alt={`صورة مصغرة ${idx + 1}`} 
                      className={`w-full h-full object-cover transition duration-300 ${activeImage === idx ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} 
                    />
                    {activeImage !== idx && (
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* عرض الصور المصغرة على الجوال */}
            <div className="flex md:hidden gap-2 mt-3 overflow-x-auto pb-2 snap-x">
              {data.images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`snap-center shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer ${activeImage === idx ? 'ring-2 ring-primary-500 ring-offset-1' : 'opacity-70'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* المحتوى الرئيسي (يمين) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* شريط الميزات السريعة */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">نظرة عامة</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <QuickFeature icon="straighten" label="المساحة" value={`${data.area} م²`} />
                  <QuickFeature icon="apartment" label="نوع العقار" value={data.propertyType} />
                  <QuickFeature icon="add_road" label="عرض الشارع" value={data.streetWidth ? `${data.streetWidth} م` : 'غير محدد'} />
                  <QuickFeature icon="explore" label="الواجهة" value={data.facade || 'غير محدد'} />
                </div>
              </div>

              {/* التفاصيل الفنية */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                    <span className="material-icons-outlined">fact_check</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">المواصفات الفنية</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                  <SpecRow label="المدينة" value="جدة" />
                  <SpecRow label="الحي" value={data.neighborhood} />
                  <SpecRow label="المخطط" value={data.plan} />
                  <SpecRow label="الجزء" value={data.part} />
                  <SpecRow label="رقم القطعة" value={data.plotNumber} />
                  <SpecRow label="الأبعاد" value={data.dimensions} dir="ltr" />
                  <SpecRow label="حالة العقار" value={data.status} />
                  <SpecRow label="رقم رخصة الإعلان" value={listing.licenseNumber || '7200000000'} />
                </div>
              </div>

              {/* قسم الوصف */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                    <span className="material-icons-outlined">description</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">وصف العقار</h2>
                </div>
                <div className="prose prose-slate max-w-none text-gray-600 leading-loose text-base">
                  {data.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </div>

            </div>

            {/* الشريط الجانبي - تواصل وإجراءات (يسار) */}
            <div className="lg:col-span-4">
              <div className="sticky top-6 space-y-6">
                
                {/* بطاقة مسؤول المبيعات */}
                <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/40 border border-gray-100 relative overflow-hidden">
                  {/* ديكور علوي */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
                  
                  <div className="text-center mb-6 pt-2">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md relative">
                      <span className="material-icons-outlined text-3xl text-primary-600">storefront</span>
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">لؤلؤة المنار للعقارات</h3>
                    <p className="text-sm text-gray-500 mb-2">مكتب عقاري معتمد</p>
                    <div className="flex items-center justify-center gap-1 text-amber-500 text-sm">
                      <span className="material-icons-outlined text-[16px]">star</span>
                      <span className="material-icons-outlined text-[16px]">star</span>
                      <span className="material-icons-outlined text-[16px]">star</span>
                      <span className="material-icons-outlined text-[16px]">star</span>
                      <span className="material-icons-outlined text-[16px]">star_half</span>
                      <span className="text-gray-600 font-medium mr-1">(4.8)</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <a 
                      href={`https://wa.me/966${data.contactPhone.replace(/^0/, '')}?text=مرحباً، أستفسر عن العقار المرجعي #${listing.id || 'AQR-001'}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold transition shadow-sm"
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5 filter brightness-0 invert" />
                      محادثة واتساب
                    </a>
                    
                    <a 
                      href={`tel:${data.contactPhone}`}
                      className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl font-bold transition shadow-sm"
                    >
                      <span className="material-icons-outlined">phone_in_talk</span>
                      إتصال هاتفي
                    </a>
                    
                    <button 
                      onClick={handleShare}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold transition"
                    >
                      <span className="material-icons-outlined">ios_share</span>
                      مشاركة العرض
                    </button>
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                    <span className="font-medium">رقم المرجع:</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">#{listing.id || 'AQR-001'}</span>
                  </div>
                </div>

                {/* بطاقة معلومات إضافية أو إعلانات */}
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

              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        /* تخصيص ألوان المشروع (يمكنك دمجها في tailwind.config.js لاحقاً) */
        :global(:root) {
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
        .from-primary-400 { --tw-gradient-from: var(--primary-400) var(--tw-gradient-from-position); --tw-gradient-to: rgb(45 212 191 / 0) var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        .to-primary-600 { --tw-gradient-to: var(--primary-600) var(--tw-gradient-to-position); }
      `}</style>
    </>
  );
}

// مكون فرعي للميزات السريعة أعلى التفاصيل
function QuickFeature({ icon, label, value }) {
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

// مكون فرعي لسطر المواصفات الفنية
function SpecRow({ label, value, dir = "rtl" }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-dashed border-gray-200 last:border-0">
      <span className="text-gray-500 text-sm font-medium">{label}</span>
      <span className="text-gray-900 text-sm font-bold" dir={dir}>{value}</span>
    </div>
  );
}
