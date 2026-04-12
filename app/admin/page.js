'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getCountFromServer, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebaseClient';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';

// دالة مساعدة لترجمة حالات الذكاء الاصطناعي
function translateExtractionStatus(status) {
  switch (status) {
    case 'needs_review': return { label: 'يحتاج مراجعة', color: '#dd6b20', bg: '#feebc8', icon: 'pending_actions' };
    case 'auto_saved': return { label: 'تم الحفظ', color: '#15803d', bg: '#dcfce7', icon: 'verified' };
    case 'ignored': return { label: 'متجاهل', color: '#718096', bg: '#edf2f7', icon: 'block' };
    default: return { label: status || 'غير معروف', color: '#4a5568', bg: '#e2e8f0', icon: 'help_outline' };
  }
}

// دالة مساعدة لترجمة أنواع السجلات
function translateRecordType(type) {
  if (type === 'request') return 'طلب عقاري';
  if (type === 'listing') return 'عرض عقاري';
  return 'غير محدد';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentAiItems, setRecentAiItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOptimizedData() {
      setLoading(true);
      setError('');
      try {
        const { db } = getFirebase();

        // 1. الاستعلامات الخفيفة جداً للعد
        const listingsColl = collection(db, 'fanar_listings');
        const requestsColl = collection(db, 'fanar_requests');
        const extractedColl = collection(db, 'fanar_extracted_items');

        const [
          totalListingsSnap,
          newRequestsSnap,
          aiNeedsReviewSnap,
          aiAutoSavedSnap,
          latestRequestsSnap,
          latestAiSnap
        ] = await Promise.all([
          getCountFromServer(listingsColl),
          getCountFromServer(query(requestsColl, where('status', '==', 'new'))),
          getCountFromServer(query(extractedColl, where('extractionStatus', '==', 'needs_review'))),
          getCountFromServer(query(extractedColl, where('extractionStatus', '==', 'auto_saved'))),
          getDocs(query(requestsColl, orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(extractedColl, orderBy('createdAt', 'desc'), limit(5)))
        ]);

        setStats([
          { id: 1, label: 'إجمالي العروض', value: totalListingsSnap.data().count, icon: 'real_estate_agent', color: '#0f766e' },
          { id: 2, label: 'طلبات العملاء الجديدة', value: newRequestsSnap.data().count, icon: 'mark_email_unread', color: '#dd6b20' },
          { id: 3, label: 'رسائل تحتاج مراجعة', value: aiNeedsReviewSnap.data().count, icon: 'rule', color: '#dc2626' },
          { id: 4, label: 'عقارات سُجلت آلياً', value: aiAutoSavedSnap.data().count, icon: 'smart_toy', color: '#15803d' },
        ]);

        setRecentRequests(latestRequestsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRecentAiItems(latestAiSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error(err);
        setError('تعذر الاتصال بقاعدة البيانات. تأكد من اتصالك بالإنترنت.');
      } finally {
        setLoading(false);
      }
    }

    fetchOptimizedData();
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <AdminGuard title="نظرة عامة">
        {/* نستخدم الـ AdminShell الذي لا يحتوي على أي أزرار تسجيل خروج */}
        <AdminShell
          title="مرحباً بك في عقار أبحر 👋"
          description="ملخص سريع لأداء المنصة والطلبات المعلقة التي تحتاج لانتباهك."
          actions={[
            <Link key="add" href="/add" className="btn primaryBtn">
               <span className="material-icons-outlined">add</span> إضافة إعلان
            </Link>,
            <Link key="inbox" href="/admin/inbox" className="btn secondaryBtn">
                <span className="material-icons-outlined">inbox</span> الوارد الذكي
            </Link>,
          ]}
        >
          {error && (
             <div className="alertError">
                <span className="material-icons-outlined">error</span> {error}
             </div>
          )}

          {/* 1. قسم الإحصائيات (Stats Grid) */}
          <div className="statsGrid">
            {stats.map((item) => (
              <div key={item.id} className="statCard">
                <div className="statIconWrap" style={{ color: item.color, background: `${item.color}15` }}>
                  <span className="material-icons-outlined">{item.icon}</span>
                </div>
                <div className="statData">
                  <div className="statValue">{loading ? <span className="loader"></span> : item.value}</div>
                  <div className="statLabel">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 2. قسم القوائم السريعة (Recent Activity) */}
          <div className="listsGrid">
            
            {/* آخر الطلبات */}
            <section className="dashboardPanel">
              <div className="panelHeader">
                <div className="panelTitle">
                    <span className="material-icons-outlined" style={{color: '#dd6b20'}}>support_agent</span>
                    <h3>أحدث طلبات العملاء</h3>
                </div>
                <Link href="/admin/requests" className="viewAllLink">عرض الكل</Link>
              </div>
              
              <div className="listContainer">
                {loading ? (
                    <div className="emptyState"><span className="material-icons-outlined spin">autorenew</span> جاري التحميل...</div>
                ) : recentRequests.length === 0 ? (
                    <div className="emptyState">لا توجد طلبات جديدة.</div>
                ) : (
                  recentRequests.map((item) => (
                    <div key={item.id} className="listItem">
                      <div className="itemAvatar">
                          <span className="material-icons-outlined">person</span>
                      </div>
                      <div className="itemContent">
                        <div className="itemTitle">{item.name || 'عميل بدون اسم'}</div>
                        <div className="itemDesc">
                           {[item.dealType === 'rent' ? 'إيجار' : 'شراء', item.propertyType, item.neighborhood].filter(Boolean).join(' - ') || 'طلب غير مكتمل'}
                        </div>
                      </div>
                      <div className="itemAction">
                          {item.phone ? (
                              <a href={`tel:${item.phone}`} className="phoneBtn" title="اتصال">
                                  <span className="material-icons-outlined">call</span>
                              </a>
                          ) : <span className="mutedTxt">—</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* آخر مراجعات الذكاء الاصطناعي */}
            <section className="dashboardPanel">
              <div className="panelHeader">
                <div className="panelTitle">
                    <span className="material-icons-outlined" style={{color: '#0f766e'}}>memory</span>
                    <h3>صندوق الوارد (الذكاء الاصطناعي)</h3>
                </div>
                <Link href="/admin/inbox" className="viewAllLink">مراجعة الوارد</Link>
              </div>
              
              <div className="listContainer">
                {loading ? (
                    <div className="emptyState"><span className="material-icons-outlined spin">autorenew</span> جاري التحميل...</div>
                ) : recentAiItems.length === 0 ? (
                    <div className="emptyState">لا توجد رسائل معالجة حديثاً.</div>
                ) : (
                  recentAiItems.map((item) => {
                    const statusConfig = translateExtractionStatus(item.extractionStatus);
                    return (
                      <div key={item.id} className="listItem">
                        <div className="itemIcon" style={{ color: statusConfig.color, background: statusConfig.bg }}>
                            <span className="material-icons-outlined">{statusConfig.icon}</span>
                        </div>
                        <div className="itemContent">
                          <div className="itemTitle" title={item.summary}>{item.summary?.slice(0, 40) + '...' || 'بدون ملخص'}</div>
                          <div className="itemDesc">
                              <span className="sourceBadge">{item.source?.contactName || 'مجهول'}</span>
                              <span> • {translateRecordType(item.recordType)}</span>
                          </div>
                        </div>
                        <div className="itemAction">
                            <span className="statusBadge" style={{ color: statusConfig.color, background: statusConfig.bg }}>
                                {statusConfig.label}
                            </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
            
          </div>
        </AdminShell>
      </AdminGuard>

      <style jsx>{`
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 14px; font-weight: 800; text-decoration: none; transition: all 0.2s; cursor: pointer; }
        .primaryBtn { background: var(--primary); color: white; border: 1px solid var(--primary); }
        .primaryBtn:hover { background: #0d665f; }
        .secondaryBtn { background: white; color: var(--text); border: 1px solid var(--border); }
        .secondaryBtn:hover { background: var(--bg-soft); color: var(--primary); border-color: var(--primary); }

        .alertError { display: flex; align-items: center; gap: 10px; background: #fff5f5; color: #dc2626; border: 1px solid #fecaca; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 800; }

        .statsGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 25px; }
        .statCard { background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 15px; transition: transform 0.2s; }
        .statCard:hover { transform: translateY(-3px); box-shadow: 0 10px 15px rgba(0,0,0,0.04); border-color: var(--primary); }
        .statIconWrap { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .statIconWrap .material-icons-outlined { font-size: 26px; }
        .statData { display: flex; flex-direction: column; }
        .statValue { font-size: 24px; font-weight: 900; color: var(--text); line-height: 1.2; }
        .statLabel { font-size: 13px; color: var(--muted); font-weight: 800; margin-top: 2px; }

        .loader { display: inline-block; width: 16px; height: 16px; border: 3px solid var(--border); border-bottom-color: var(--primary); border-radius: 50%; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .listsGrid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 1024px) { .listsGrid { grid-template-columns: 1fr 1fr; } }
        
        .dashboardPanel { background: white; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; }
        .panelHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border); background: #fcfcfd; }
        .panelTitle { display: flex; align-items: center; gap: 10px; }
        .panelTitle h3 { margin: 0; font-size: 18px; font-weight: 900; color: var(--text); }
        .viewAllLink { font-size: 13px; font-weight: 800; color: var(--primary); text-decoration: none; padding: 6px 12px; background: rgba(15, 118, 110, 0.1); border-radius: 8px; transition: background 0.2s; }
        .viewAllLink:hover { background: rgba(15, 118, 110, 0.2); }

        .listContainer { padding: 10px 20px 20px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1; }
        .emptyState { text-align: center; color: var(--muted); padding: 40px 0; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .spin { animation: spin 1s linear infinite; }
        
        .listItem { display: flex; align-items: center; gap: 15px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: white; transition: border-color 0.2s; }
        .listItem:hover { border-color: var(--primary); }
        
        .itemAvatar { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-soft); color: var(--muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .itemIcon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        
        .itemContent { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .itemTitle { font-size: 14px; font-weight: 900; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .itemDesc { font-size: 12px; color: var(--muted); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .sourceBadge { background: var(--bg-soft); color: var(--muted); padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px; }
        
        .itemAction { flex-shrink: 0; }
        .phoneBtn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #e6fffa; color: #0f766e; text-decoration: none; transition: all 0.2s; }
        .phoneBtn:hover { background: #ccfbf1; transform: scale(1.05); }
        .phoneBtn .material-icons-outlined { font-size: 20px; }
        
        .statusBadge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 900; white-space: nowrap; }
        .mutedTxt { color: var(--border-strong); }
      `}</style>
    </>
  );
}
