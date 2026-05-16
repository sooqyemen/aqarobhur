'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchAnalyticsSummary } from '@/lib/analytics';
import { fetchListingById } from '@/lib/listings';

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('ar-SA');
}

function safeText(value, fallback = '—') {
  const text = String(value || '').trim();
  return text || fallback;
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toLocaleString('ar-SA')} ريال`;
}

function normalizePath(path = '/') {
  const text = String(path || '/').trim() || '/';
  try {
    const url = new URL(text, 'https://aqarobhur.com');
    return `${url.pathname}${url.search || ''}` || '/';
  } catch {
    return text.startsWith('/') ? text : `/${text}`;
  }
}

function getListingIdFromPath(path = '') {
  const clean = normalizePath(path);
  const match = clean.match(/^\/listing\/([^/?#]+)/);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getQueryLabel(path = '') {
  const clean = normalizePath(path);
  try {
    const url = new URL(clean, 'https://aqarobhur.com');
    const query = url.searchParams.get('q') || url.searchParams.get('search') || url.searchParams.get('neighborhood') || '';
    return query ? decodeURIComponent(query) : '';
  } catch {
    return '';
  }
}

function getStaticPageTitle(path = '') {
  const clean = normalizePath(path);
  const pathname = clean.split('?')[0] || '/';

  if (pathname === '/') return 'الصفحة الرئيسية';
  if (pathname === '/listings') {
    const queryLabel = getQueryLabel(clean);
    return queryLabel ? `صفحة العروض - ${queryLabel}` : 'صفحة العروض العقارية';
  }
  if (pathname === '/marketing-request') return 'تسويق عقارك';
  if (pathname === '/neighborhoods') return 'المناطق والأحياء';
  if (pathname === '/request') return 'إرسال طلب عقاري';
  if (pathname === '/map') return 'الخريطة العقارية';
  if (pathname === '/account') return 'الحساب';
  if (pathname === '/faq') return 'الأسئلة الشائعة';
  if (pathname === '/privacy') return 'سياسة الخصوصية';
  if (pathname === '/terms') return 'شروط الاستخدام';
  if (pathname === '/ejar-request') return 'عقود إيجار';
  if (pathname.startsWith('/neighborhood/')) return `حي ${decodeURIComponent(pathname.split('/').pop() || '')}`;

  return '';
}

function getPageMeta(page, listingMap) {
  const path = normalizePath(page?.path || '/');
  const listingId = safeText(page?.listingId, getListingIdFromPath(path));
  const listing = listingId ? listingMap[listingId] : null;

  if (listing) {
    const parts = [listing.neighborhood, listing.dealType === 'rent' ? 'إيجار' : listing.dealType === 'sale' ? 'بيع' : '', formatPrice(listing.price)].filter(Boolean);
    return {
      title: safeText(listing.title, 'إعلان عقاري'),
      subtitle: parts.join(' · ') || path,
      path,
    };
  }

  const staticTitle = getStaticPageTitle(path);
  if (staticTitle) {
    return {
      title: staticTitle,
      subtitle: path,
      path,
    };
  }

  return {
    title: safeText(page?.title, path),
    subtitle: path,
    path,
  };
}

function formatDateLabel(dateKey) {
  const today = new Date();
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(yesterday);

  if (dateKey === todayKey) return 'اليوم';
  if (dateKey === yesterdayKey) return 'أمس';
  return dateKey;
}

export default function AnalyticsDashboardCard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listingMap, setListingMap] = useState({});

  useEffect(() => {
    let live = true;

    fetchAnalyticsSummary()
      .then((data) => {
        if (live) setAnalytics(data);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  const todayPages = useMemo(() => analytics?.todayPages || analytics?.topPages || [], [analytics]);
  const dailyStats = useMemo(() => analytics?.dailyStats || [], [analytics]);

  useEffect(() => {
    let live = true;

    async function loadListingTitles() {
      const ids = Array.from(
        new Set(
          todayPages
            .map((page) => safeText(page?.listingId, getListingIdFromPath(page?.path || '')))
            .filter(Boolean),
        ),
      );

      if (!ids.length) {
        setListingMap({});
        return;
      }

      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const item = await fetchListingById(id, { includeLegacy: true });
              return item ? [id, item] : null;
            } catch {
              return null;
            }
          }),
        );

        if (!live) return;
        setListingMap(Object.fromEntries(entries.filter(Boolean)));
      } catch {
        if (live) setListingMap({});
      }
    }

    if (!loading) loadListingTitles();

    return () => {
      live = false;
    };
  }, [loading, todayPages]);

  return (
    <section className="analyticsPanel">
      <div className="analyticsHeader topHeader">
        <div>
          <h3>مشاهدات الموقع اليومية</h3>
          <small>يتم حفظ آخر {analytics?.retentionDays || 3} أيام فقط</small>
        </div>
        {analytics?.lastPath ? <small className="lastPath">آخر صفحة: {getStaticPageTitle(analytics.lastPath) || analytics.lastPath}</small> : null}
      </div>

      <div className="analyticsStats">
        <div className="analyticsStat mainStat">
          <span>مشاهدات اليوم</span>
          <strong>{loading ? '...' : formatNumber(analytics?.todayPageViews)}</strong>
        </div>
        <div className="analyticsStat">
          <span>زيارات اليوم</span>
          <strong>{loading ? '...' : formatNumber(analytics?.todayVisits)}</strong>
        </div>
        <div className="analyticsStat">
          <span>صفحات زاروها اليوم</span>
          <strong>{loading ? '...' : formatNumber(analytics?.todayUniquePages)}</strong>
        </div>
      </div>

      {dailyStats.length ? (
        <div className="dailyStrip">
          {dailyStats.map((day) => (
            <div key={day.date} className="dayCard">
              <span>{formatDateLabel(day.date)}</span>
              <strong>{formatNumber(day.pageViews)}</strong>
              <small>مشاهدة</small>
            </div>
          ))}
        </div>
      ) : null}

      <div className="analyticsHeader pagesHeader">
        <h3>الصفحات التي تم زيارتها اليوم</h3>
      </div>

      {analytics?.error && (
        <div className="analyticsWarning">
          إحصائيات المشاهدات لن تظهر إلا بعد السماح بكتابة وقراءة مجموعة abhur_daily_stats في Firestore.
        </div>
      )}

      <div className="topPagesList">
        {loading ? (
          <div className="emptyAnalytics">جاري تحميل المشاهدات...</div>
        ) : !todayPages.length ? (
          <div className="emptyAnalytics">لم يتم تسجيل زيارات اليوم حتى الآن.</div>
        ) : (
          todayPages.map((page, index) => {
            const meta = getPageMeta(page, listingMap);
            return (
              <div key={page.id} className="topPageItem">
                <div className="rankBadge">{index + 1}</div>

                <div className="pageInfo">
                  <div className="pageTitle">{meta.title}</div>
                  <Link href={meta.path || '/'} className="pagePath">
                    {meta.subtitle || meta.path || '/'}
                  </Link>
                </div>

                <div className="pageViews">
                  <strong>{formatNumber(page.views)}</strong>
                  <span>مشاهدة اليوم</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .analyticsPanel {
          background: white;
          border-radius: 16px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
          overflow: hidden;
          margin-bottom: 25px;
        }

        .analyticsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
        }

        .topHeader {
          background: linear-gradient(135deg, #fffbeb, #ffffff 55%, #eef7f5);
        }

        .analyticsHeader h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
        }

        .analyticsHeader small {
          display: block;
          color: var(--muted);
          font-weight: 800;
          margin-top: 4px;
        }

        .lastPath {
          max-width: 48%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }

        .analyticsStats {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 12px;
          padding: 16px;
          background: #fcfcfd;
          border-bottom: 1px solid var(--border);
        }

        .analyticsStat {
          padding: 15px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--border);
        }

        .mainStat {
          border-color: rgba(15, 118, 110, .24);
          background: linear-gradient(135deg, rgba(15, 118, 110, .08), #fff);
        }

        .analyticsStat span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .analyticsStat strong {
          display: block;
          color: var(--text);
          font-size: 28px;
          font-weight: 900;
        }

        .dailyStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: #fff;
        }

        .dayCard {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px;
          background: #fcfcfd;
        }

        .dayCard span,
        .dayCard small {
          display: block;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
        }

        .dayCard strong {
          display: block;
          margin: 5px 0 2px;
          color: var(--text);
          font-size: 20px;
          font-weight: 900;
        }

        .pagesHeader {
          border-bottom: 0;
          padding-bottom: 4px;
        }

        .analyticsWarning {
          margin: 14px 20px 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          font-weight: 800;
          line-height: 1.8;
        }

        .topPagesList {
          padding: 14px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .topPageItem {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .rankBadge {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 900;
        }

        .pageInfo { min-width: 0; }

        .pageTitle {
          font-size: 14px;
          font-weight: 900;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pagePath {
          display: block;
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          margin-top: 3px;
          direction: rtl;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pagePath:hover {
          color: var(--primary);
          text-decoration: underline;
        }

        .pageViews {
          text-align: center;
          min-width: 96px;
        }

        .pageViews strong {
          display: block;
          color: var(--text);
          font-size: 18px;
          font-weight: 900;
        }

        .pageViews span {
          display: block;
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
        }

        .emptyAnalytics {
          text-align: center;
          color: var(--muted);
          padding: 28px 0;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .analyticsStats,
          .dailyStrip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .analyticsHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .lastPath {
            max-width: 100%;
            text-align: right;
          }

          .topPageItem {
            grid-template-columns: 34px minmax(0, 1fr);
          }

          .pageViews {
            grid-column: 2;
            text-align: right;
            display: flex;
            gap: 6px;
            align-items: baseline;
          }
        }
      `}</style>
    </section>
  );
}
