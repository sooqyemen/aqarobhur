'use client';

import { useEffect, useState } from 'react';
import { formatPriceSAR } from '@/lib/format';
import { updateRequestStatus } from '@/lib/requestService';

const STATUS_OPTIONS = [
  { value: 'new', label: 'جديد', color: 'blue' },
  { value: 'followup', label: 'جاري المتابعة', color: 'warning' },
  { value: 'closed', label: 'مغلق', color: 'gray' },
];

export default function RequestsTable({ 
  requests = [], 
  onRefresh, 
  selectedIds = [], 
  onToggleSelect, 
  onToggleSelectAll 
}) {
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [viewRequest, setViewRequest] = useState(null);

  const allSelected = requests.length > 0 && selectedIds.length === requests.length;

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleChange(id, value) {
    setSavingId(id);
    setError('');
    try {
      await updateRequestStatus(id, value);
      onRefresh?.();
    } catch (_) {
      setError('تعذر تحديث حالة الطلب. يرجى التأكد من اتصالك بالإنترنت.');
    } finally {
      setSavingId('');
    }
  }

  const getStatusColor = (val) => {
    const status = STATUS_OPTIONS.find(opt => opt.value === val);
    return status ? status.color : 'gray';
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="tableContainer">
        {error && (
          <div className="alertError">
            <span className="material-icons-outlined">error</span> {error}
          </div>
        )}
        
        <div className="tableScroll">
          <table className="dataTable">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <label className="checkboxContainer">
                    <input 
                      type="checkbox" 
                      checked={allSelected} 
                      onChange={onToggleSelectAll}
                    />
                    <span className="checkmark"></span>
                  </label>
                </th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>رقم الجوال</th>
                <th>الطلب</th>
                <th>الموقع المفضل</th>
                <th>الميزانية</th>
                <th>المصدر</th>
                <th style={{ width: '130px' }}>الحالة</th>
                <th style={{ width: '60px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {requests.length ? requests.map((item) => {
                let dateStr = '—';
                let timeStr = '';
                if (typeof item.createdAt?.toDate === 'function') {
                  const dateObj = item.createdAt.toDate();
                  dateStr = dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                  timeStr = dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                }

                const budget = item.budgetMax || item.budgetMin 
                  ? `${formatPriceSAR(item.budgetMin || 0)} — ${formatPriceSAR(item.budgetMax || 0)}` 
                  : 'غير محددة';

                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr key={item.id} className={`${savingId === item.id ? 'savingRow' : ''} ${isSelected ? 'selectedRow' : ''}`}>
                    
                    <td style={{ textAlign: 'center' }}>
                      <label className="checkboxContainer">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => onToggleSelect(item.id)}
                        />
                        <span className="checkmark"></span>
                      </label>
                    </td>

                    <td className="dateCell">
                      <div className="dateMain">{dateStr}</div>
                      {timeStr && <div className="timeSub">{timeStr}</div>}
                    </td>
                    
                    <td className="boldCell">
                      <div className="clientName" onClick={() => setViewRequest(item)} style={{ cursor: 'pointer' }}>
                        {item.name || 'عميل بدون اسم'}
                      </div>
                    </td>
                    
                    <td>
                      {item.phone ? (
                        <a href={`tel:${item.phone}`} className="phoneLink" dir="ltr">
                          <span className="material-icons-outlined">call</span>
                          {item.phone}
                        </a>
                      ) : <span className="muted">—</span>}
                    </td>
                    
                    <td>
                      <span className="tagBadge typeTag">
                        {[item.dealType === 'rent' ? 'استئجار' : item.dealType === 'sale' ? 'شراء' : item.dealType, item.propertyType].filter(Boolean).join(' / ') || '—'}
                      </span>
                    </td>
                    
                    <td className="locationCell">
                      {[item.neighborhood, item.plan, item.part].filter(Boolean).join(' — ') || '—'}
                    </td>
                    
                    <td className="budgetCell">{budget}</td>
                    
                    <td>
                      <span className="tagBadge sourceTag">
                        {item.sourceContactName || item.sourceType || 'موقع الويب'}
                      </span>
                    </td>
                    
                    <td>
                      <div className={`statusSelectWrapper ${getStatusColor(item.status || 'new')}`}>
                        {savingId === item.id ? (
                           <span className="material-icons-outlined spin loaderIcon">autorenew</span>
                        ) : null}
                        <select 
                          value={item.status || 'new'} 
                          onChange={(e) => handleChange(item.id, e.target.value)} 
                          disabled={savingId === item.id} 
                          className="statusSelect"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button className="actionBtn" onClick={() => setViewRequest(item)} title="عرض تفاصيل الطلب">
                        <span className="material-icons-outlined">visibility</span>
                      </button>
                    </td>
                    
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10}>
                    <div className="emptyState">
                      <span className="material-icons-outlined">inbox</span>
                      <h4>لا توجد طلبات لعرضها حالياً.</h4>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewRequest && (
        <RequestDetailsModal request={viewRequest} onClose={() => setViewRequest(null)} />
      )}

      <style jsx>{`
        .tableContainer { background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; }
        .alertError { display: flex; align-items: center; gap: 8px; color: #c53030; background: #fff5f5; padding: 12px 20px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #fed7d7; }
        .tableScroll { overflow-x: auto; }
        .dataTable { width: 100%; border-collapse: collapse; min-width: 1150px; text-align: right; }
        .dataTable th { padding: 16px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #4a5568; font-size: 13px; font-weight: 800; white-space: nowrap; }
        .dataTable td { padding: 14px 15px; border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: 14px; vertical-align: middle; transition: background 0.2s; }
        .dataTable tbody tr:hover td { background: #fcfcfd; }
        .savingRow td { opacity: 0.6; pointer-events: none; background: #f7fafc !important; }
        .selectedRow td { background: #f0fdfa !important; border-bottom-color: rgba(15, 118, 110, 0.2); }

        .checkboxContainer { display: inline-block; position: relative; width: 20px; height: 20px; cursor: pointer; user-select: none; }
        .checkboxContainer input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
        .checkmark { position: absolute; top: 0; right: 0; height: 20px; width: 20px; background-color: #fff; border: 2px solid #cbd5e0; border-radius: 6px; transition: all 0.2s; }
        .checkboxContainer:hover input ~ .checkmark { border-color: var(--primary); }
        .checkboxContainer input:checked ~ .checkmark { background-color: var(--primary); border-color: var(--primary); }
        .checkmark:after { content: ""; position: absolute; display: none; }
        .checkboxContainer input:checked ~ .checkmark:after { display: block; }
        .checkboxContainer .checkmark:after { left: 6px; top: 2px; width: 5px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }

        .dateCell { white-space: nowrap; }
        .dateMain { font-weight: 700; color: #1a202c; }
        .timeSub { font-size: 12px; color: #a0aec0; margin-top: 2px; }
        .clientName { font-weight: 800; color: var(--primary); transition: color 0.2s; }
        .clientName:hover { color: #0d665f; text-decoration: underline; }
        
        .phoneLink { display: inline-flex; align-items: center; gap: 6px; color: var(--primary); text-decoration: none; font-weight: 700; font-family: monospace; font-size: 15px; padding: 4px 8px; border-radius: 8px; transition: background 0.2s; }
        .phoneLink:hover { background: rgba(15, 118, 110, 0.1); }
        .phoneLink .material-icons-outlined { font-size: 16px; }
        
        .locationCell { color: #4a5568; font-weight: 500; }
        .budgetCell { font-weight: 700; color: #2f855a; }
        .muted { color: #a0aec0; }
        
        .tagBadge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .typeTag { background: #edf2f7; color: #4a5568; border: 1px solid #e2e8f0; }
        .sourceTag { background: #fffff0; color: #b7791f; border: 1px solid #fef08a; }
        
        .statusSelectWrapper { position: relative; display: inline-block; width: 100%; border-radius: 10px; border: 1px solid transparent; transition: all 0.2s; }
        .statusSelect { width: 100%; padding: 8px 12px 8px 30px; border-radius: 10px; border: none; background: transparent; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; appearance: none; color: inherit; }
        .statusSelect:focus { outline: none; box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
        .loaderIcon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; pointer-events: none; }
        .spin { animation: spin 1s linear infinite; }
        .statusSelectWrapper.blue { background: rgba(15, 118, 110, 0.1); color: var(--primary); border-color: rgba(15, 118, 110, 0.2); }
        .statusSelectWrapper.warning { background: #fffaf0; color: #dd6b20; border-color: #feebc8; }
        .statusSelectWrapper.gray { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
        .statusSelectWrapper::after { content: '\\e313'; font-family: 'Material Icons Outlined'; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; pointer-events: none; opacity: 0.7; }
        
        .actionBtn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: #f1f5f9; color: #475569; border: none; cursor: pointer; transition: all 0.2s; }
        .actionBtn:hover { background: #e2e8f0; color: #1a202c; transform: translateY(-2px); }
        .actionBtn .material-icons-outlined { font-size: 20px; }

        .emptyState { padding: 40px 20px; text-align: center; color: #718096; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .emptyState .material-icons-outlined { font-size: 40px; color: #cbd5e0; margin-bottom: 10px; }
        .emptyState h4 { margin: 0; font-size: 16px; font-weight: 600; }
        @keyframes spin { 100% { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </>
  );
}

function RequestDetailsModal({ request, onClose }) {
  if (!request) return null;

  let dateStr = '—';
  if (typeof request.createdAt?.toDate === 'function') {
    dateStr = request.createdAt.toDate().toLocaleString('ar-SA', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  }

  const budget = request.budgetMax || request.budgetMin 
    ? `${formatPriceSAR(request.budgetMin || 0)} — ${formatPriceSAR(request.budgetMax || 0)}` 
    : 'غير محددة';

  const area = request.areaMax || request.areaMin
    ? `${request.areaMin || 0}م — ${request.areaMax || 0}م`
    : 'غير محددة';

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        
        <div className="modalHeader">
          <h2>
            <span className="material-icons-outlined" style={{color: 'var(--primary)'}}>assignment_ind</span>
            تفاصيل الطلب
          </h2>
          <button className="closeBtn" onClick={onClose}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="modalBody">
          <div className="detailSection">
            <h3><span className="material-icons-outlined">person</span> بيانات العميل</h3>
            <div className="detailGrid">
              <div className="detailItem">
                <span className="detailLabel">الاسم</span>
                <span className="detailValue">{request.name || 'غير متوفر'}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">رقم الجوال</span>
                <span className="detailValue" dir="ltr" style={{textAlign: 'right'}}>
                  {request.phone || 'غير متوفر'}
                </span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">المصدر</span>
                <span className="detailValue">{request.sourceContactName || request.sourceType || 'موقع الويب'}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">تاريخ التسجيل</span>
                <span className="detailValue">{dateStr}</span>
              </div>
            </div>
          </div>

          <div className="detailSection">
            <h3><span className="material-icons-outlined">real_estate_agent</span> تفاصيل العقار المطلوب</h3>
            <div className="detailGrid">
              <div className="detailItem">
                <span className="detailLabel">الرغبة (نوع العقد)</span>
                <span className="detailValue">{request.dealType === 'rent' ? 'استئجار' : request.dealType === 'sale' ? 'شراء' : request.dealType}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">نوع العقار</span>
                <span className="detailValue">{request.propertyType || 'غير محدد'}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">الموقع المطلوب</span>
                <span className="detailValue">{[request.neighborhood, request.plan, request.part].filter(Boolean).join(' - ') || 'غير محدد'}</span>
              </div>
              <div className="detailItem">
                <span className="detailLabel">المساحة المطلوبة</span>
                <span className="detailValue">{area}</span>
              </div>
              <div className="detailItem" style={{ gridColumn: '1 / -1' }}>
                <span className="detailLabel">الميزانية</span>
                <span className="detailValue" style={{ color: '#2f855a' }}>{budget}</span>
              </div>
            </div>
          </div>

          {(request.note || request.rawText) && (
            <div className="detailSection" style={{ background: '#fff', borderColor: '#e2e8f0' }}>
              <h3><span className="material-icons-outlined">description</span> النص الأصلي / الملاحظات</h3>
              <div className="rawText">
                {request.note || request.rawText}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modalOverlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease-out; backdrop-filter: blur(4px); }
        .modalContent { background: white; border-radius: 20px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: flex; flex-direction: column; animation: slideUp 0.3s ease-out; }
        
        .modalHeader { padding: 20px 25px; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
        .modalHeader h2 { margin: 0; font-size: 20px; font-weight: 800; color: #1a202c; display: flex; align-items: center; gap: 10px; }
        
        .closeBtn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #f1f5f9; border: none; cursor: pointer; color: #64748b; border-radius: 10px; transition: all 0.2s; }
        .closeBtn:hover { background: #fee2e2; color: #ef4444; transform: rotate(90deg); }
        
        .modalBody { padding: 25px; display: flex; flex-direction: column; gap: 20px; }
        
        .detailSection { background: #f8fafc; border: 1px solid #edf2f7; border-radius: 16px; padding: 20px; }
        .detailSection h3 { margin: 0 0 20px 0; font-size: 16px; font-weight: 800; color: #334155; display: flex; align-items: center; gap: 8px; }
        .detailSection h3 .material-icons-outlined { color: #94a3b8; font-size: 22px; }
        
        .detailGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 600px) { .detailGrid { grid-template-columns: 1fr; } }
        
        .detailItem { display: flex; flex-direction: column; gap: 6px; }
        .detailLabel { font-size: 13px; color: #64748b; font-weight: 700; }
        .detailValue { font-size: 15px; color: #0f172a; font-weight: 800; }
        
        .rawText { background: #f1f5f9; padding: 15px; border-radius: 12px; font-size: 14px; color: #334155; line-height: 1.8; white-space: pre-wrap; direction: rtl; border: 1px solid #e2e8f0; font-family: 'Courier New', Courier, monospace; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
