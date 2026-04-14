// app/listing/[id]/page.jsx (أو .js حسب مشروعك)
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { buildWhatsAppLink } from '@/components/WhatsAppBar';
import { fetchListingById } from '@/lib/listings';
import { formatPriceSAR } from '@/lib/format';
import {
  getSafeImages,
  normalizePhoneDigits,
  normalizeDealTypeLabel,
} from '@/lib/listingUtils';

import HeroSection from '@/components/HeroSection';
import ImageGallery from '@/components/ImageGallery';
import ListingDetails from '@/components/ListingDetails';
import SidebarSummary from '@/components/SidebarSummary';

export default function ListingDetailsPage({ params }) {
  const routeParams = useParams();
  const raw = params?.id ?? routeParams?.id;
  const rawId = Array.isArray(raw) ? raw[0] : raw;

  const id = useMemo(() => {
    try {
      return rawId ? decodeURIComponent(String(rawId)) : '';
    } catch {
      return rawId ? String(rawId) : '';
    }
  }, [rawId]);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    let live = true;
    if (rawId === undefined) {
      setLoading(false);
      return () => { live = false; };
    }

    (async () => {
      try {
        setLoading(true);
        setError('');
        setShareMsg('');

        if (!id) {
          if (live) {
            setItem(null);
            setError('رابط العرض غير صحيح.');
          }
          return;
        }

        const data = await fetchListingById(id);
        if (live) setItem(data || null);
      } catch (e) {
        const msg = String(e?.message || '');
        if (live) {
          setItem(null);
          if (msg.includes('Missing or insufficient permissions') || e?.code === 'permission-denied') {
            setError('لا توجد صلاحية لعرض هذا العرض الآن.');
          } else {
            setError(msg || 'تعذر تحميل العرض حالياً.');
          }
        }
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => { live = false; };
  }, [rawId, id]);

  const images = useMemo(() => getSafeImages(item), [item]);
  const dealTypeLabel = useMemo(() => normalizeDealTypeLabel(item?.dealType), [item]);

  const contactPhone = useMemo(() => {
    const directPhone = item?.phone || item?.contactPhone || item?.mobile || item?.whatsapp || '';
    return normalizePhoneDigits(directPhone || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693');
  }, [item]);

  const whatsappHref = useMemo(() => {
    const text = item
      ? [
          'السلام عليكم، أرغب في الاستفسار عن هذا العرض:',
          item.title || 'عرض عقاري',
          `السعر: ${formatPriceSAR(item.price)}`,
          `الحي: ${item.neighborhood || '—'}`,
          `المخطط: ${item.plan || '—'}`,
          `الجزء: ${item.part || '—'}`,
          `نوع الصفقة: ${dealTypeLabel || '—'}`,
          `نوع العقار: ${item.propertyType || '—'}`,
          item.licenseNumber ? `رقم الترخيص: ${item.licenseNumber}` : '',
          item.direct ? 'مباشر' : '',
          typeof window !== 'undefined' ? `الرابط: ${window.location.href}` : '',
        ].filter(Boolean).join('\n')
      : 'السلام عليكم، أرغب في الاستفسار عن أحد العروض العقارية.';

    return buildWhatsAppLink({ phone: contactPhone, text });
  }, [item, dealTypeLabel, contactPhone]);

  const handleShare = async () => {
    try {
      setShareMsg('');
      const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
      const shareTitle = item?.title || 'عرض عقاري';
      const shareText = `${shareTitle} - ${formatPriceSAR(item?.price)}`;

      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }

      if (navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMsg('تم نسخ رابط الإعلان.');
        setTimeout(() => setShareMsg(''), 2500);
      }
    } catch {
      setShareMsg('');
    }
  };

  return (
    <div className="container listingPageWrap">
      <style jsx>{`
        .listingPageWrap { padding-top: 14px; padding-bottom: 14px; }
        .stateCard { padding: 18px; }
        .topNavRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .backLink, .shareBtn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--border); background: #fff; color: var(--text); text-decoration: none; font-weight: 800; cursor: pointer; }
        .contentGrid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(290px, 0.9fr); gap: 14px; align-items: start; }
        .mainCol, .sideCol { min-width: 0; }
        .sectionCard { padding: 14px; margin-bottom: 14px; }
        .sectionHeading { margin: 0 0 12px; font-size: 18px; font-weight: 900; color: var(--text); }
        .descriptionText { white-space: pre-wrap; line-height: 1.95; color: var(--text); }

        @media (max-width: 900px) {
          .contentGrid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .listingPageWrap { width: min(100%, calc(100% - 18px)); }
          .topNavRow { flex-wrap: wrap; }
          .sectionCard { padding: 12px; border-radius: 16px; }
        }
      `}</style>

      {loading ? (
        <div className="card stateCard">جاري تحميل الإعلان…</div>
      ) : error ? (
        <div className="card stateCard">{error}</div>
      ) : !item ? (
        <div className="card stateCard">العرض غير موجود.</div>
      ) : (
        <>
          <div className="topNavRow">
            <Link href="/listing" className="backLink">
              العودة إلى العروض
            </Link>
            <button type="button" className="shareBtn" onClick={handleShare}>
              مشاركة
            </button>
          </div>

          <HeroSection item={item} whatsappHref={whatsappHref} />

          <div className="contentGrid">
            <div className="mainCol">
              <ImageGallery images={images} title={item.title} />
              <ListingDetails item={item} listingId={id} />
              <div className="card sectionCard">
                <h2 className="sectionHeading">وصف العقار</h2>
                <div className="descriptionText">
                  {item.description || 'لا يوجد وصف مضاف لهذا الإعلان.'}
                </div>
              </div>
            </div>

            <SidebarSummary
              item={item}
              whatsappHref={whatsappHref}
              onShare={handleShare}
              shareMsg={shareMsg}
            />
          </div>
        </>
      )}
    </div>
  );
}
