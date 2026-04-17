'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import PasteMessageBox from '@/components/admin/PasteMessageBox';
import ExtractionReviewTable from '@/components/admin/ExtractionReviewTable';
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
        fetchExtractedItems(120),
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
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const analysis = await res.json();

      if (!res.ok) {
        throw new Error(analysis?.error || 'فشل تحليل النص.');
      }

      const inboxEntryId = await saveInboxEntry({
        ...payload,
        parsedText: analysis.parsedText || '',
        aiSummary: analysis.summary || '',
        aiStats: analysis.stats || null,
        status: 'processed',
      });

      const savedItems = await saveExtractedItems({
        inboxEntryId,
        items: analysis.items || [],
      });

      const readyItems = savedItems.filter((item) => item.extractionStatus === 'internal_ready');

      for (const item of readyItems) {
        try {
          const promoted = await promoteExtractedItem(item);
          await updateExtractedItemStatus(item.id, 'auto_saved', {
            promotedAt: new Date(),
            promotedDocId: promoted?.id || '',
            promotedCollection: promoted?.collection || '',
          });
        } catch {
          await updateExtractedItemStatus(item.id, 'needs_review', {
            reason: 'فشل الاعتماد الداخلي التلقائي. يرجى المراجعة اليدوية.',
          });
        }
      }

      const stats = analysis.stats || {};
      const savedCount = savedItems.length;
      setSummary(`اكتمل التحليل: تم استخراج ${stats.listingCount || savedCount} عرض جديد، واعتماد ${readyItems.length} عرض داخليًا.`);
      await load();
    } catch (err) {
      setError(err?.message || 'فشل تحليل النص.');
    } finally {
      setLoading(false);
    }
  }

  const updateItemLocally = (itemId, newStatus, patch = {}) => {
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, extractionStatus: newStatus, ...patch } : it));
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
      updateItemLocally(item.id, 'auto_saved', {
        promotedDocId: promoted?.id || '',
        promotedCollection: promoted?.collection || '',
      });
      setSummary('تم اعتماد العرض داخليًا وإتاحته للعقاري الذكي.');
    } catch (err) {
      setError(err?.message || 'فشل اعتماد العنصر. يرجى المحاولة مرة أخرى.');
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
    } catch {
      setError('فشل تحديث حالة العنصر.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('حذف نهائي؟ سيتم مسح العرض من الوارد ومن قاعدة البيانات الداخلية.')) return;
    setIsActionLoading(true);
    try {
      await deleteExtractedItemEverywhere(item);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSummary('تم حذف العرض وكل ما يتعلق به نهائيًا.');
    } catch {
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
      const deletedIds = selectedItems.map((i) => i.id);
      setItems((prev) => prev.filter((i) => !deletedIds.includes(i.id)));
      setSummary(`تم حذف ${selectedItems.length} عنصر بنجاح.`);
    } catch {
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
        {error && <div>{error}</div>}
        {summary && <div>{summary}</div>}

        <div className="statsGrid">
          <div>إجمالي العروض المستخرجة: {stats.total}</div>
          <div>يحتاج مراجعة: {stats.review}</div>
          <div>معتمد داخليًا: {stats.autoSaved}</div>
          <div>متجاهل: {stats.ignored}</div>
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
                <h3>آخر الإدخالات</h3>
              </div>
              <div className="entriesList">
                {recentEntries.map((entry) => (
                  <div key={entry.id} className="entryItem">
                    <div className="entryTitle">
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
    </AdminGuard>
  );
}
