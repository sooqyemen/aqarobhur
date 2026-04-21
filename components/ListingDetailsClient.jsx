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
    description: listing.description || 'فيلا بتصميم عصري وتشطيبات VIP. تتميز بموقع استراتيجي بالقرب من الخدمات الرئيسية والمدارس. تحتوي على مسابح، مصعد، وتكييف مركزي. جاهزة للسكن الفوري، بناء شخصي وإشراف هندسي متكامل.',
    images: listing.images?.length > 0 ? listing.images : [
      '/placeholder-image.jpg',
      '/placeholder-image.jpg',
      '/placeholder-image.jpg'
    ],
    contactPhone: listing.contactPhone || '0500000000',
    direct: listing.direct ?? true,
    plotNumber: listing.plotNumber || '142',
  };

  const formatPrice = (price) => {
    if (!price) return 'السعر غير محدد';
    return new Intl.NumberFormat('ar-SA').format(price) + ' ر.س';
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="min-h-screen bg-slate-50 py-8 lg:py-12 font-sans" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* مسار التصفح (Breadcrumb) */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <span className="cursor-pointer hover:text-slate-900 transition">الرئيسية</span>
            <span className="material-icons-outlined text-sm">chevron_left</span>
            <span className="cursor-pointer hover:text-slate-900 transition">{data.neighborhood}</span>
            <span className="material-icons-outlined text-sm">chevron_left</span>
            <span className="text-slate-900 font-semibold">{data.propertyType} {data.dealType === 'sale' ? 'للبيع' : 'للإيجار'}</span>
          </nav>

          {/* العنوان والسعر (Header) */}
          <div className="flex flex-col md:flex-row md:justify-between md:align-end gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">
                  {data.dealType === 'sale' ? 'للبيع' : 'للإيجار'}
                </span>
                {data.direct && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="material-icons-outlined text-[14px]">verified</span> مباشر
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-2">
                {data.title}
              </h1>
              <p className="text-slate-500 flex items-center gap-2 text-sm md:text-base">
                <span className="material-icons-outlined">location_on</span>
                {data.neighborhood} {data.plan ? ` - مخطط ${data.plan}` : ''} {data.part ? ` - جزء ${data.part}` : ''}
              </p>
            </div>
            
            <div className="md:text-left shrink-0">
              <p className="text-sm text-slate-500 mb-1">السعر المطلوب</p>
              <div className="text-3xl md:text-4xl font-extrabold text-teal-700">
                {formatPrice(data.price)}
              </div>
              {data.area && data.price && (
                <p className="text-sm text-slate-400 mt-1">
                  ≈ {Math.round(data.price / data.area).toLocaleString('ar-SA')} ر.س / م²
                </p>
              )}
            </div>
          </div>

          {/* معرض الصور */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 h-[300px] md:h-[500px]">
            <div className="md:col-span-3 rounded-2xl overflow-hidden bg-slate-200 relative group">
              <img 
                src={data.images[activeImage]} 
                alt="العقار" 
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="hidden md:flex flex-col gap-4 h-full">
              {data.images.slice(0, 3).map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`flex-1 rounded-xl overflow-hidden bg-slate-200 cursor-pointer border-2 transition ${activeImage === idx ? 'border-teal-500 opacity-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
            
            {/* المحتوى الرئيسي (يمين) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* بطاقات الميزات السريعة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HighlightCard icon="square_foot" label="المساحة" value={`${data.area} م²`} />
                <HighlightCard icon="home_work" label="نوع العقار" value={data.propertyType} />
                <HighlightCard icon="add_road" label="عرض الشارع" value={data.streetWidth ? `${data.streetWidth} م` : 'غير محدد'} />
                <HighlightCard icon="explore" label="الواجهة" value={data.facade || 'غير محدد'} />
              </div>

              {/* قسم الوصف */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-icons-outlined text-teal-600">description</span>
                  تفاصيل ووصف العقار
                </h2>
                <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-base">
                  {data.description}
                </div>
              </div>

              {/* قسم المواصفات التفصيلية */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="material-icons-outlined text-teal-600">list_alt</span>
                  المواصفات الفنية
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <DetailRow label="الحي" value={data.neighborhood} />
                  <DetailRow label="المخطط" value={data.plan} />
                  <DetailRow label="الجزء" value={data.part} />
                  <DetailRow label="رقم القطعة" value={data.plotNumber} />
                  <DetailRow label="الأبعاد" value={data.dimensions} />
                  <DetailRow label="رقم المعلن" value={listing.licenseNumber || 'مرخص'} />
                </div>
              </div>
            </div>

            {/* الشريط الجانبي - تواصل (يسار) */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-slate-100">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                    <span className="material-icons-outlined text-4xl">real_estate_agent</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">مسؤول المبيعات</h3>
                  <p className="text-sm text-slate-500">مكتب لؤلؤة المنار للعقارات</p>
                </div>

                <div className="space-y-4 mt-8">
                  <a 
                    href={`https://wa.me/966${data.contactPhone.replace(/^0/, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white py-4 rounded-xl font-bold transition shadow-sm"
                  >
                    <span className="material-icons-outlined">chat</span>
                    تواصل عبر واتساب
                  </a>
                  <a 
                    href={`tel:${data.contactPhone}`}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition shadow-sm"
                  >
                    <span className="material-icons-outlined">call</span>
                    إتصل الآن
                  </a>
                  <button className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 py-3.5 rounded-xl font-bold transition">
                    <span className="material-icons-outlined">share</span>
                    مشاركة العرض
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
                  رقم المرجع: #{listing.id || 'AQR-001'}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// مكون فرعي للبطاقات الصغيرة
function HighlightCard({ icon, label, value }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition hover:shadow-md">
      <span className="material-icons-outlined text-teal-600 text-3xl mb-2 bg-teal-50 p-2 rounded-xl">{icon}</span>
      <span className="text-xs text-slate-500 font-medium mb-1">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

// مكون فرعي لسطر التفاصيل
function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 text-sm font-medium">{label}</span>
      <span className="text-slate-900 text-sm font-bold text-left">{value}</span>
    </div>
  );
}
