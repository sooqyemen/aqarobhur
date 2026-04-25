'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAnalyticsSummary } from '@/lib/analytics';

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('ar-SA');
}

function safeText(value, fallback = '—') {
  const text = String(value || '').trim();
  return text || fallback;
}

export default function AnalyticsDashboardCard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const topPages = analytics?.topPages || [];

  return (
    <section className="analyticsPanel">
      <div className="analyticsStats">
        <div className="analyticsStat">
          <span>مشاهدات اليوم</span>
          <strong>{loading ? '...' : formatNumber(analytics?.todayPageViews)}</strong>
        </div>
        <div className="analyticsStat">
          <span>إجمالي المشاهدات</span>
          <strong>{loading ? '...' : formatNumber(analytics?.totalPageViews)}</strong>
        </div>
        <div className="analyticsStat">
          <span>زيارات اليوم</span>
          <strong>{loading ? '...' : formatNumber(analytics?.todayVisits)}</strong>
        </div>
        <div className="analyticsStat">
          <span>إجمالي الزيارات</span>
          <strong>{loading ? '...' : formatNumber(analytics?.totalVisits)}</strong>
        </div>
      </div>

      <div className="analyticsHeader">
        <h3>أكثر الصفحات مشاهدة</h3>
        {analytics?.lastPath ? <small>آخر صفحة: {analytics.lastPath}</small> : null}
      </div>

      {analytics?.error && (
        <div className="analyticsWarning">
          إحصائيات المشاهدات لن تظهر إلا بعد نشر قواعد Firestore الخاصة بالعدادات.
        </div>
      )}

      <div className="topPagesList">
        {loading ? (
          <div className="emptyAnalytics">جاري تحميل المشاهدات...</div>
        ) : !topPages.length ? (
          <div className="emptyAnalytics">لم يتم تسجيل مشاهدات حتى الآن.</div>
        ) : (
          topPages.map((page, index) => (
            <div key={page.id} className="topPageItem">
              <div className="rankBadge">{index + 1}</div>

              <div className="pageInfo">
                <div className="pageTitle">{safeText(page.title, page.path)}</div>
                <Link href={page.path || '/'} className="pagePath">
                  {page.path || '/'}
                </Link>
              </div>

              <div className="pageViews">
                <strong>{formatNumber(page.views)}</strong>
                <span>مشاهدة</span>
              </div>
            </div>
          ))
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

        .analyticsStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
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
          font-size: 24px;
          font-weight: 900;
        }

        .analyticsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
        }

        .analyticsHeader h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
        }

        .analyticsHeader small {
          color: var(--muted);
          font-weight: 800;
          max-width: 48%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        .pageInfo {
          min-width: 0;
        }

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
          direction: ltr;
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
          min-width: 82px;
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
          .analyticsStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .analyticsStats {
            grid-template-columns: 1fr;
          }

          .analyticsHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .analyticsHeader small {
            max-width: 100%;
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
