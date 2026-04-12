'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import RequestsTable from '@/components/admin/RequestsTable'; 
import { fetchRequests, deleteRequestsBulk } from '@/lib/requestService';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRequests(250);
      setRequests(data || []);
      setSelectedIds([]); 
    } catch (_) {
      setError('تعذر تحميل الطلبات. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} طلب نهائياً؟`)) return;
    
    setIsDeleting(true);
    setError('');
    try {
      await deleteRequestsBulk(selectedIds);
      await load(); 
    } catch (err) {
      setError('حدث خطأ أثناء الحذف الجماعي. يرجى المحاولة مجدداً.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <AdminGuard title="الطلبات الواردة">
        <AdminShell 
          title="سجل الطلبات العقارية" 
          description="تتبع جميع الطلبات الواردة من العملاء عبر الموقع أو المستخرجة بواسطة الذكاء الاصطناعي، وقم بإدارتها من مكان واحد."
          actions={[
            selectedIds.length > 0 && (
              <button 
                key="bulk-delete" 
                onClick={handleBulkDelete} 
                className="btnDanger"
                disabled={isDeleting}
              >
                <span className="material-icons-outlined">delete_sweep</span>
                {isDeleting ? 'جاري الحذف...' : `حذف المحدد (${selectedIds.length})`}
              </button>
            )
          ]}
        >
          
          {error && (
            <div className="alert alertError">
               <span className="material-icons-outlined">error</span> {error}
            </div>
          )}

          <div className="tableWrapper">
            {loading ? (
               <div className="statusState">
                 <span className="material-icons-outlined spin">autorenew</span>
                 <p>جاري تحميل الطلبات...</p>
               </div>
            ) : requests.length === 0 && !error ? (
               <div className="statusState emptyState">
                 <span className="material-icons-outlined">inbox</span>
                 <h3>لا توجد طلبات حالياً</h3>
                 <p>لم يتم تسجيل أو استخراج أي طلبات عقارية حتى الآن.</p>
               </div>
            ) : (
              <RequestsTable 
                requests={requests} 
                onRefresh={load} 
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
            )}
          </div>

        </AdminShell>
      </AdminGuard>

      <style jsx>{`
        .alert { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 600; }
        .alertError { background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; }

        .btnDanger { background: #fff5f5; color: #e53e3e; border: 1px solid #feb2b2; padding: 10px 18px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btnDanger:hover:not(:disabled) { background: #e53e3e; color: white; border-color: #e53e3e; }
        .btnDanger:disabled { opacity: 0.6; cursor: not-allowed; }

        .tableWrapper { background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; min-height: 400px; display: flex; flex-direction: column; }
        
        .statusState { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #718096; flex-grow: 1; text-align: center; }
        .statusState .spin { font-size: 40px; color: var(--primary); animation: spin 1s linear infinite; margin-bottom: 15px; }
        .statusState.emptyState .material-icons-outlined { font-size: 50px; color: #cbd5e0; margin-bottom: 15px; }
        .statusState h3 { margin: 0 0 8px 0; color: #2d3748; font-size: 20px; font-weight: 800; }
        .statusState p { margin: 0; font-size: 15px; }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
