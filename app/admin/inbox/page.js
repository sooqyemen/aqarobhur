'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import PasteMessageBox from '@/components/admin/PasteMessageBox';
import ExtractionReviewTable from '@/components/admin/ExtractionReviewTable';
import { analyzeInboxInput } from '@/lib/aiExtractClient';
import {
  fetchExtractedItems,
  fetchInboxEntries,
  promoteExtractedItem,
  saveExtractedItems,
  saveInboxEntry,
  updateExtractedItemStatus,
  deleteExtractedItemEverywhere,
  deleteExtractedItemsBulk, 
} from '@/lib/inboxService';

export default function AdminInboxPage() {
  const [loading, setLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [entries, extracted] = await Promise.all([
        fetchInboxEntries(40), 
        fetchExtractedItems(120)
      ]);
      setRecentEntries(entries || []);
      setItems(extracted || []);
    } catch {
      setError('تعذر تحميل البيانات. يرجى التأكد من اتصال قاعدة البيانات.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (summary || error) {
      const timer = setTimeout(() => { setSummary(''); setError(''); }, 7000);
      return () => clearTimeout(timer);
    }
  }, [summary, error]);

  async function handleAnalyze(payload) {
    setLoading(true);
    setError('');
    setSummary('');
    try {
      const analysis = await analyzeInboxInput(payload);
      
      const inboxEntryId = await saveInboxEntry({
        ...payload,
        parsedText: analysis.parsedText || '',
        aiSummary: analysis.summary || '',
        aiStats: analysis.stats || null,
        status: analysis.stats?.reviewCount ? 'review' : 'processed',
      });

      const savedItems = await saveExtractedItems({ 
        inboxEntryId, 
        items: analysis.items || [] 
      });

      const autoSaved = savedItems.filter(
        (item) => item.extractionStatus === 'auto_saved' && 
        (item.recordType === 'listing' || item.recordType === 'request')
      );

      for (const item of autoSaved) {
        try {
          const promoted = await promoteExtractedItem(item);
          await updateExtractedItemStatus(item.id, 'auto_saved', {
            promotedAt: new Date(),
            promotedDocId: promoted?.id || '',
            promotedCollection: promoted?.collection || '',
          });
        } catch (promoteErr) {
          console.error("Auto-promote failed for item:", item.id, promoteErr);
          await updateExtractedItemStatus(item.id, 'needs_review', { 
            reason: 'فشل النشر التلقائي. يرجى المراجعة اليدوية.' 
          });
        }
      }

      const stats = analysis.stats || {};
      setSummary(`اكتمل التحليل: تم استخراج ${stats.totalGroups} عنصر. (حفظ آلي: ${stats.autoSavedCount} | مراجعة يدوية: ${stats.reviewCount})`);
      
      await load(); 
    } catch (err) {
      setError(err?.message || 'فشل الذكاء الاصطناعي في تحليل النص.');
    } finally {
      setLoading(false);
    }
  }

  const updateItemLocally = (itemId, newStatus) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, extractionStatus: newStatus } : it));
  };

  async function handleApprove(item) {
    setIsActionLoading(true);
    setError('');
    try {
      const promoted = await promoteExtractedItem(item);
      await updateExtractedItemStatus(item.id, 'auto_saved', {
        promotedAt: new Date(),
        promotedDocId: promoted?.id || '',
        promotedCollection: promoted?.collection || '',
      });
      updateItemLocally(item.id, 'auto_saved');
      setSummary('تم اعتماد العقار ونشره في الموقع بنجاح.');
    } catch (err) {
      setError('فشل اعتماد العنصر. يرجى المحاولة مرة أخرى.');
      await load();
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleIgnore(item) {
    setIsActionLoading(true);
    try {
      await updateExtractedItemStatus(item.id, 'ignored');
      updateItemLocally(item.id, 'ignored');
    } catch (err) {
      setError('فشل تحديث حالة العنصر.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('حذف نهائي؟ سيتم مسح العقار من الوارد ومن قاعدة البيانات العامة.')) return;
    setIsActionLoading(true);
    try {
      await deleteExtractedItemEverywhere(item);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSummary('تم حذف العنصر وكل ما يتعلق به نهائياً.');
    } catch (err) {
      setError('تعذر الحذف. يرجى مراجعة صلاحيات النظام.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleBulkDelete(selectedItems) {
    if (!selectedItems.length) return;
    setIsActionLoading(true);
    try {
      await deleteExtractedItemsBulk(selectedItems);
      const deletedIds = selectedItems.map(i => i.id);
      setItems(prev => prev.filter(i => !deletedIds.includes(i.id)));
      setSummary(`تم حذف ${selectedItems.length} عنصر بنجاح.`);
    } catch (err) {
      setError('حدث خطأ أثناء الحذف الجماعي.');
    } finally {
      setIsActionLoading(false);
    }
  }

  const stats = useMemo(() => ({
    total: items.length,
    review: items.filter((i) => i.extractionStatus === 'needs_review').length,
    autoSaved: items.filter((i) => i.extractionStatus === 'auto_saved').length,
    ignored: items.filter((i) => i.extractionStatus === 'ignored').length,
  }), [items]);

  return (
    <AdminGuard title="صندوق الوارد الذكي">
      <AdminShell title="معالجة الوارد العقاري">
        
        {error && <div className="alert alertError"><span className="material-icons-outlined">error</span> {error}</div>}
        {summary && <div className="alert alertSuccess"><span className="material-icons-outlined">verified</span> {summary}</div>}

        <div className="statsGrid">
          <StatCard icon="analytics" label="إجمالي المستخرجات" value={stats.total} color="var(--primary)" />
          <StatCard icon="pending_actions" label="يحتاج مراجعة" value={stats.review} color="#dd6b20" highlight={stats.review > 0} />
          <StatCard icon="task_alt" label="تم الاعتماد" value={stats.autoSaved} color="#38a169" />
          <StatCard icon="auto_delete" label="متجاهل" value={stats.ignored} color="#718096" />
        </div>

        <div className="mainLayout">
          <div className="workspaceArea">
            <PasteMessageBox onAnalyze={handleAnalyze} loading={loading} />
            
            <div style={{ position: 'relative' }}>
              {isActionLoading && <div className="actionLoadingOverlay" />}
              <ExtractionReviewTable 
                items={items} 
                onApprove={handleApprove} 
                onIgnore={handleIgnore} 
                onDelete={handleDelete} 
                onBulkDelete={handleBulkDelete} 
                onRefresh={load} 
              />
            </div>
          </div>

          <aside className="sidebarArea">
            <div className="card recentCard">
              <div className="cardHeader">
                <span className="material-icons-outlined">history</span>
                <h3>آخر الإدخالات</h3>
              </div>
              <div className="entriesList">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="entryItem">
                    <div className="entryTitle">
                      <span className="material-icons-outlined">chat</span>
                      {entry.fileName || entry.source?.contactName || 'نص يدوي'}
                    </div>
                    <div className="entrySummary">{entry.aiSummary || 'جاري المعالجة...'}</div>
                  </div>
                ))}
                {!recentEntries.length && <div className="emptyState">لا توجد سجلات سابقة.</div>}
              </div>
            </div>
          </aside>
        </div>
      </AdminShell>

      <style jsx>{`
        .alert { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 700; animation: slideDown 0.3s; }
        .alertError { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }
        .alertSuccess { background: #f0fff4; color: #2f855a; border: 1px solid #c6f6d5; }
        
        .statsGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 25px; }
        
        .mainLayout { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 1024px) { .mainLayout { grid-template-columns: 2fr 1.1fr; } }
        
        .actionLoadingOverlay { position: absolute; inset: 0; background: rgba(255,255,255,0.4); z-index: 10; border-radius: 12px; cursor: progress; }

        .card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; }
        .recentCard { height: fit-content; max-height: 850px; display: flex; flex-direction: column; }
        .cardHeader { display: flex; align-items: center; gap: 10px; padding: 18px; border-bottom: 1px solid #edf2f7; background: #fcfcfd; }
        .cardHeader h3 { margin: 0; font-size: 16px; font-weight: 800; }

        .entriesList { padding: 15px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
        .entryItem { padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9; background: #f8fafc; }
        .entryTitle { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #2d3748; font-size: 14px; margin-bottom: 4px; }
        .entrySummary { color: #718096; font-size: 12px; line-height: 1.5; }
        
        .emptyState { text-align: center; color: #cbd5e0; padding: 40px 10px; font-size: 14px; }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </AdminGuard>
  );
}

function StatCard({ icon, label, value, color, highlight }) {
  return (
    <>
      <div className={`statCard ${highlight ? 'pulse' : ''}`}>
        <div className="iconBox" style={{ color: color, background: `${color}15` }}>
            <span className="material-icons-outlined">{icon}</span>
        </div>
        <div className="infoBox">
            <div className="val" style={{ color: highlight ? '#dd6b20' : '#1a202c' }}>{value}</div>
            <div className="lab">{label}</div>
        </div>
      </div>
      <style jsx>{`
        .statCard { display: flex; align-items: center; gap: 15px; background: white; border-radius: 16px; padding: 18px; border: 1px solid #e2e8f0; }
        .statCard.pulse { border: 2px solid #dd6b20; }
        .iconBox { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .val { font-size: 24px; font-weight: 900; line-height: 1; }
        .lab { color: #718096; font-size: 13px; font-weight: 700; margin-top: 4px; }
      `}</style>
    </>
  );
}
