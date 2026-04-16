'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPriceSAR } from '@/lib/format';

const FILTERS = [
  { value: 'all', label: 'الكل', icon: 'apps' },
  { value: 'internal_ready', label: 'جاهز داخليًا', icon: 'inventory_2' },
  { value: 'needs_review', label: 'للمراجعة', icon: 'rule' },
  { value: 'expired', label: 'منتهي', icon: 'event_busy' },
  { value: 'sold', label: 'مباع/محجوز', icon: 'sell' },
  { value: 'possible_duplicate', label: 'مكرر محتمل', icon: 'content_copy' },
  { value: 'ignored', label: 'متجاهل', icon: 'block' },
];

export default function ExtractionReviewTable({
  items = [],
  onApprove,
  onIgnore,
  onDelete,
  onBulkDelete,
  onRefresh,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const sortedItems = useMemo(() => {
    const safe = Array.isArray(items) ? [...items] : [];
    return safe.sort((a, b) => {
      const priorityDiff = Number(b.priorityScore || 0) - Number(a.priorityScore || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt);
    });
  }, [items]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sortedItems;
    return sortedItems.filter((item) => String(item.extractionStatus || '') === activeFilter);
  }, [activeFilter, sortedItems]);

  const filteredIds = useMemo(
    () => filtered.map((item) => item.id).filter(Boolean),
    [filtered]
  );

  const selectedInFilter = useMemo(
    () => selectedIds.filter((id) => filteredIds.includes(id)),
    [selectedIds, filteredIds]
  );

  const allInFilterSelected =
    filteredIds.length > 0 && selectedInFilter.length === filteredIds.length;

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => items.some((item) => item.id === id))
    );
  }, [items]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function handleApprove(item) {
    setBusyId(item.id || item.summary);
    try {
      await onApprove?.(item);
      setMessage('تم اعتماد العنصر داخليًا بنجاح.');
      onRefresh?.();
    } catch (err) {
      setMessage(err?.message || 'تعذر اعتماد العنصر. حاول مرة أخرى.');
    } finally {
      setBusyId('');
    }
  }

  async function handleIgnore(item) {
    setBusyId(item.id || item.summary);
    try {
      await onIgnore?.(item);
      setMessage('تم تجاهل العنصر واستبعاده.');
      onRefresh?.();
    } catch (err) {
      setMessage(err?.message || 'تعذر تحديث حالة العنصر.');
    } finally {
      setBusyId('');
    }
  }

  async function handleDelete(item) {
    if (!window.confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن استرجاع البيانات.')) return;
    setBusyId(item.id || item.summary);
    try {
      await onDelete?.(item);
      setSelectedIds((current) => current.filter((id) => id !== item.id));
      setMessage('تم حذف العنصر نهائيًا.');
      onRefresh?.();
    } catch (err) {
      setMessage('تعذر حذف العنصر. تأكد من صلاحيات قاعدة البيانات.');
    } finally {
      setBusyId('');
    }
  }

  async function handleBulkDelete() {
    const selectedItems = filtered.filter((item) => selectedIds.includes(item.id));
    if (!selectedItems.length) return setMessage('حدد عنصرًا واحدًا على الأقل.');
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedItems.length} عنصر نهائياً؟`)) return;

    setBusyId('__bulk_delete__');
    try {
      if (onBulkDelete) {
        await onBulkDelete(selectedItems);
      } else {
        for (const item of selectedItems) {
          await onDelete?.(item);
        }
      }
      setSelectedIds([]);
      setMessage(`تم حذف ${selectedItems.length} عنصر بنجاح.`);
      onRefresh?.();
    } catch {
      setMessage('حدث خطأ أثناء الحذف الجماعي.');
    } finally {
      setBusyId('');
    }
  }

  function toggleOne(id) {
    if (!id) return;
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllInFilter() {
    setSelectedIds((current) => {
      if (allInFilterSelected) return current.filter((id) => !filteredIds.includes(id));
      return Array.from(new Set([...current, ...filteredIds]));
    });
  }

  const bulkBusy = busyId === '__bulk_delete__';

  return (
    <>
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
        rel="stylesheet"
      />

      <div className="tableContainer">
        <div className="tableHeader">
          <div className="headerText">
            <h3>نتائج معالجة الوارد الذكي</h3>
            <p>هذه العروض داخلية فقط، وتُستخدم لخدمة العملاء والبحث الداخلي دون نشرها للعامة.</p>
          </div>

          <div className="filtersWrap">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setActiveFilter(item.value)}
                className={`filterBtn ${activeFilter === item.value ? 'active' : ''}`}
              >
                <span className="material-icons-outlined">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div
            className={`alert ${
              message.includes('تعذر') || message.includes('خطأ')
                ? 'alertError'
                : 'alertSuccess'
            }`}
          >
            <span className="material-icons-outlined">
              {message.includes('تعذر') || message.includes('خطأ')
                ? 'error'
                : 'check_circle'}
            </span>
            {message}
          </div>
        )}

        <div className={`bulkActionsBar ${selectedInFilter.length > 0 ? 'active' : ''}`}>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={allInFilterSelected}
              onChange={toggleSelectAllInFilter}
              disabled={!filteredIds.length || bulkBusy}
            />
            <span className="checkmark"></span>
            <span className="chkText">
              تحديد كل نتائج ({activeFilter === 'all' ? 'الكل' : FILTERS.find((f) => f.value === activeFilter)?.label})
            </span>
          </label>

          <div className="bulkTools">
            {selectedInFilter.length > 0 && (
              <span className="selectedCount">
                تم تحديد: <strong>{selectedInFilter.length}</strong>
              </span>
            )}
            <button
              type="button"
              className="btnDangerBulk"
              disabled={!selectedInFilter.length || bulkBusy}
              onClick={handleBulkDelete}
            >
              <span className="material-icons-outlined">
                {bulkBusy ? 'autorenew' : 'delete_sweep'}
              </span>
              {bulkBusy ? 'جاري الحذف...' : 'حذف المحدد'}
            </button>
          </div>
        </div>

        <div className="resultsList">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const listing = item.listing || {};
              const request = item.request || {};
              const isRequest = item.recordType === 'request';
              const busy = bulkBusy || busyId === (item.id || item.summary);
              const checked = selectedIds.includes(item.id);
              const confidenceScore = Math.round(Number(item.confidence || 0) * 100);
              const priorityScore = Number(item.priorityScore || 0);
              const contactName = item.source?.contactName || request.name || 'مجهول';
              const contactPhone = item.source?.contactPhone || request.phone || '';
              const isDirect = !!listing.direct;
              const isExpired = item.extractionStatus === 'expired';
              const isSold = item.extractionStatus === 'sold';

              return (
                <div
                  key={item.id || `${item.recordType}-${item.summary}`}
                  className={`resultCard ${checked ? 'selected' : ''}`}
                >
                  <div className="cardTop">
                    <label className="checkboxLabel">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(item.id)}
                        disabled={busy}
                      />
                      <span className="checkmark"></span>
                    </label>

                    <div className="metaBadges">
                      <Badge
                        text={
                          isRequest
                            ? 'طلب عقاري'
                            : item.recordType === 'listing'
                              ? 'عرض داخلي'
                              : 'غير مصنف'
                        }
                        kind={isRequest ? 'green' : 'blue'}
                        icon={isRequest ? 'support_agent' : 'real_estate_agent'}
                      />

                      <Badge
                        text={statusLabel(item.extractionStatus)}
                        kind={statusKind(item.extractionStatus)}
                      />

                      {isDirect ? (
                        <Badge text="مباشر" kind="gold" icon="bolt" />
                      ) : null}

                      <Badge
                        text={`الأولوية: ${priorityScore}`}
                        kind={priorityScore >= 90 ? 'green' : priorityScore >= 70 ? 'warning' : 'gray'}
                        icon="priority_high"
                      />

                      <Badge
                        text={`دقة الذكاء: ${confidenceScore}%`}
                        kind={
                          confidenceScore > 80 ? 'green' : confidenceScore > 50 ? 'warning' : 'gray'
                        }
                        icon="psychology"
                      />
                    </div>
                  </div>

                  <div className="cardSummary">{item.summary || 'بدون ملخص'}</div>

                  {item.reason && (
                    <div className="cardReason">
                      <span className="material-icons-outlined">info</span> {item.reason}
                    </div>
                  )}

                  <div className="infoGrid">
                    {!isRequest ? (
                      <>
                        <Info label="نوع العقار" value={listing.propertyType} />
                        <Info
                          label="نوع الصفقة"
                          value={
                            listing.dealType === 'rent'
                              ? 'للإيجار'
                              : listing.dealType === 'sale'
                                ? 'للبيع'
                                : listing.dealType
                          }
                        />
                        <Info
                          label="الموقع"
                          value={[listing.neighborhood, listing.plan, listing.part].filter(Boolean).join(' — ')}
                        />
                        <Info
                          label="السعر المطلوب"
                          value={listing.price ? formatPriceSAR(listing.price) : 'غير محدد'}
                          highlight
                        />
                        <Info label="المساحة" value={listing.area ? `${listing.area} م²` : '—'} />
                        <Info label="اسم الوسيط/المرسل" value={contactName} />
                        <Info label="رقم الجوال" value={contactPhone || '—'} />
                        <Info label="الصلاحية حتى" value={formatDate(item.expiresAt)} />
                        <Info label="تاريخ الرسالة" value={formatDate(item.messageDate)} />
                      </>
                    ) : (
                      <>
                        <Info label="نوع العقار المطلوب" value={request.propertyType} />
                        <Info
                          label="نوع الصفقة"
                          value={
                            request.dealType === 'rent'
                              ? 'استئجار'
                              : request.dealType === 'sale'
                                ? 'شراء'
                                : request.dealType
                          }
                        />
                        <Info
                          label="الحي المفضل"
                          value={[request.neighborhood, request.plan, request.part].filter(Boolean).join(' — ')}
                        />
                        <Info
                          label="الميزانية"
                          value={request.budgetMax ? formatPriceSAR(request.budgetMax) : 'غير محددة'}
                          highlight
                        />
                        <Info label="العميل/المرسل" value={contactName} />
                        <Info label="رقم الجوال" value={contactPhone || '—'} />
                        <Info label="تاريخ الرسالة" value={formatDate(item.messageDate)} />
                      </>
                    )}
                  </div>

                  <details className="rawTextDetails">
                    <summary>
                      <span className="material-icons-outlined">receipt_long</span>
                      عرض النص الأصلي للمقارنة
                    </summary>
                    <pre className="rawTextContent">{item.rawText || 'لا يوجد نص أصلي مرفق.'}</pre>
                  </details>

                  <div className="cardActions">
                    {item.extractionStatus !== 'internal_ready' &&
                    item.extractionStatus !== 'ignored' &&
                    item.extractionStatus !== 'expired' &&
                    item.extractionStatus !== 'sold' ? (
                      <button
                        type="button"
                        className="btnPrimary"
                        disabled={busy}
                        onClick={() => handleApprove(item)}
                      >
                        <span className="material-icons-outlined">check_circle</span>
                        {busyId === (item.id || item.summary)
                          ? 'جاري الاعتماد...'
                          : isRequest
                            ? 'اعتماد الطلب'
                            : 'اعتماد داخلي'}
                      </button>
                    ) : null}

                    {item.extractionStatus !== 'ignored' ? (
                      <button
                        type="button"
                        className="btnOutline"
                        disabled={busy}
                        onClick={() => handleIgnore(item)}
                      >
                        <span className="material-icons-outlined">block</span>
                        تجاهل
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="btnDanger"
                      disabled={busy}
                      onClick={() => handleDelete(item)}
                    >
                      <span className="material-icons-outlined">delete_forever</span>
                      حذف نهائي
                    </button>
                  </div>

                  {(isExpired || isSold) && (
                    <div className="noticeBar">
                      <span className="material-icons-outlined">
                        {isSold ? 'sell' : 'event_busy'}
                      </span>
                      {isSold
                        ? 'هذا العرض غير نشط لأنه مباع أو محجوز.'
                        : 'هذا العرض منتهي الصلاحية وسيبقى للأرشفة الداخلية فقط.'}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="emptyState">
              <span className="material-icons-outlined">filter_list_off</span>
              <h4>لا توجد بيانات</h4>
              <p>
                لا يوجد أي عنصر يطابق التصفية الحالية ({FILTERS.find((f) => f.value === activeFilter)?.label}).
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .tableContainer { background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; }
        .tableHeader { padding: 20px; border-bottom: 1px solid #edf2f7; display: flex; flex-direction: column; gap: 20px; }
        .headerText h3 { margin: 0 0 5px 0; font-size: 18px; font-weight: 800; color: #1a202c; }
        .headerText p { margin: 0; color: #718096; font-size: 14px; }
        .filtersWrap { display: flex; flex-wrap: wrap; gap: 8px; background: #f7fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; width: fit-content; }
        .filterBtn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; background: transparent; color: #4a5568; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .filterBtn .material-icons-outlined { font-size: 18px; }
        .filterBtn:hover { background: #edf2f7; color: #1a202c; }
        .filterBtn.active { background: white; color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

        .alert { display: flex; align-items: center; gap: 10px; padding: 12px 20px; font-weight: 600; font-size: 14px; margin: 15px 20px 0; border-radius: 10px; animation: fadeIn 0.3s ease-in; }
        .alertSuccess { background: #f0fff4; color: #2f855a; border: 1px solid #c6f6d5; }
        .alertError { background: #fff5f5; color: #c53030; border: 1px solid #fed7d7; }

        .bulkActionsBar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 12px 20px; background: #fcfcfd; border-bottom: 1px solid #edf2f7; transition: background 0.3s; }
        .bulkActionsBar.active { background: rgba(15, 118, 110, 0.1); border-bottom-color: rgba(15, 118, 110, 0.2); }
        .bulkTools { display: flex; align-items: center; gap: 15px; }
        .selectedCount { font-size: 14px; color: var(--primary); font-weight: 600; }
        .btnDangerBulk { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: 1px solid #feb2b2; background: white; color: #e53e3e; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .btnDangerBulk:hover:not(:disabled) { background: #fff5f5; }
        .btnDangerBulk:disabled { opacity: 0.5; cursor: not-allowed; }

        .checkboxLabel { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
        .checkboxLabel input { display: none; }
        .checkmark { width: 20px; height: 20px; border: 2px solid #cbd5e0; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: white; }
        .checkboxLabel input:checked ~ .checkmark { background: var(--primary); border-color: var(--primary); }
        .checkboxLabel input:checked ~ .checkmark::after { content: '\\e876'; font-family: 'Material Icons Outlined'; color: white; font-size: 14px; }
        .chkText { font-size: 14px; font-weight: 600; color: #4a5568; }

        .resultsList { display: flex; flex-direction: column; gap: 15px; padding: 20px; background: #f8fafc; }
        .resultCard { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
        .resultCard:hover { border-color: #cbd5e0; box-shadow: 0 6px 12px rgba(0,0,0,0.03); }
        .resultCard.selected { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }

        .cardTop { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; }
        .metaBadges { display: flex; flex-wrap: wrap; gap: 8px; }

        .cardSummary { font-size: 16px; font-weight: 800; color: #1a202c; line-height: 1.6; margin-bottom: 10px; }
        .cardReason { display: inline-flex; align-items: center; gap: 6px; background: #fffaf0; color: #dd6b20; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 15px; border: 1px solid #feebc8; }
        .cardReason .material-icons-outlined { font-size: 16px; }

        .infoGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 15px; }

        .rawTextDetails { background: #fcfcfd; border: 1px solid #edf2f7; border-radius: 12px; overflow: hidden; transition: all 0.3s; }
        .rawTextDetails summary { padding: 12px 15px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #4a5568; cursor: pointer; list-style: none; user-select: none; }
        .rawTextDetails summary::-webkit-details-marker { display: none; }
        .rawTextDetails summary:hover { background: #f7fafc; color: #2d3748; }
        .rawTextContent { margin: 0; padding: 15px; background: #f8fafc; border-top: 1px dashed #e2e8f0; font-family: monospace; font-size: 13px; line-height: 1.8; color: #4a5568; white-space: pre-wrap; word-break: break-word; }

        .cardActions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #edf2f7; }
        .cardActions button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; }
        .btnPrimary { background: var(--primary); color: white; }
        .btnPrimary:hover:not(:disabled) { background: #0d665f; }
        .btnOutline { background: white; border: 1px solid #cbd5e0; color: #4a5568; }
        .btnOutline:hover:not(:disabled) { background: #f7fafc; color: #1a202c; border-color: #a0aec0; }
        .btnDanger { background: transparent; color: #e53e3e; border: 1px solid transparent; }
        .btnDanger:hover:not(:disabled) { background: #fff5f5; border-color: #feb2b2; }
        .cardActions button:disabled { opacity: 0.6; cursor: not-allowed; }

        .noticeBar { margin-top: 14px; display: flex; align-items: center; gap: 8px; background: #f7fafc; color: #4a5568; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; font-size: 13px; font-weight: 700; }
        .emptyState { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #718096; text-align: center; }
        .emptyState .material-icons-outlined { font-size: 48px; color: #cbd5e0; margin-bottom: 15px; }
        .emptyState h4 { margin: 0 0 5px 0; font-size: 18px; color: #2d3748; }
        .emptyState p { margin: 0; font-size: 14px; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div className={`infoCard ${highlight ? 'highlight' : ''}`}>
      <div className="infoLabel">{label}</div>
      <div className="infoValue">{value || '—'}</div>
      <style jsx>{`
        .infoCard { background: #f8fafc; border: 1px solid #edf2f7; padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px; }
        .infoCard.highlight { background: #f0fff4; border-color: #c6f6d5; }
        .infoLabel { font-size: 12px; color: #718096; font-weight: 600; }
        .infoValue { font-size: 14px; font-weight: 800; color: #1a202c; }
        .highlight .infoValue { color: #2f855a; }
      `}</style>
    </div>
  );
}

function Badge({ text, kind = 'gray', icon }) {
  const styles = {
    blue: { bg: 'rgba(15, 118, 110, 0.1)', text: 'var(--primary)', border: 'rgba(15, 118, 110, 0.2)' },
    green: { bg: '#f0fff4', text: '#2f855a', border: '#c6f6d5' },
    red: { bg: '#fff5f5', text: '#c53030', border: '#fed7d7' },
    warning: { bg: '#fffff0', text: '#b7791f', border: '#fef08a' },
    gray: { bg: '#f7fafc', text: '#4a5568', border: '#e2e8f0' },
    gold: { bg: '#fffaf0', text: '#b7791f', border: '#f6e05e' },
  };
  const theme = styles[kind] || styles.gray;

  return (
    <div
      className="badgeItem"
      style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}
    >
      {icon ? (
        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>
          {icon}
        </span>
      ) : null}
      {text}
      <style jsx>{`
        .badgeItem {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function statusLabel(value) {
  switch (value) {
    case 'internal_ready': return 'جاهز داخليًا';
    case 'needs_review': return 'يحتاج مراجعة';
    case 'possible_duplicate': return 'مكرر محتمل';
    case 'ignored': return 'متجاهل';
    case 'expired': return 'منتهي';
    case 'sold': return 'مباع/محجوز';
    default: return value || 'غير معروف';
  }
}

function statusKind(value) {
  switch (value) {
    case 'internal_ready': return 'green';
    case 'needs_review': return 'blue';
    case 'possible_duplicate': return 'warning';
    case 'ignored': return 'gray';
    case 'expired': return 'red';
    case 'sold': return 'red';
    default: return 'gray';
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function toMillis(v) {
  try {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
  } catch (_) {}
  return 0;
}
