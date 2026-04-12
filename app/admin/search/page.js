'use client';

import { useState } from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminShell from '@/components/admin/AdminShell';
import SearchAnswerCard from '@/components/admin/SearchAnswerCard';
import { fetchListings } from "@/lib/listings";
import { extractSearchFilters } from "@/lib/searchUtils";

const QUICK_SEARCHES = [
  "هل عندنا أرض سكنية في الياقوت؟",
  "فلل للبيع في الشراع بحدود مليون و500",
  "عروض إيجار مباشر في حي المرجان",
  "أراضي تجارية مساحتها فوق 500 متر"
];

export default function AdminSearchPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  async function handleSearch(event) {
    if (event) event.preventDefault();
    if (!question.trim()) return;
    
    setLoading(true);
    setError('');
    setAnswer('');
    
    try {
      const filters = extractSearchFilters(question);
      const listings = await fetchListings({ onlyPublic: false, filters, max: 120 });
      const finalResults = (listings || []).filter((item) => !filters.directOnly || item.direct).slice(0, 12);
      
      setResults(finalResults);
      setAnswer(finalResults.length ? `وجدت ${finalResults.length} نتيجة مطابقة تقريبًا لبحثك.` : `لم أجد نتيجة مطابقة الآن، يمكنك توسيع النطاق أو إزالة شرط (مباشر).`);
    } catch (err) {
      setError(err?.message || 'تعذر تنفيذ البحث. يرجى التحقق من اتصالك والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />

      <AdminGuard title="البحث الذكي">
        <AdminShell 
          title="البحث الذكي (AI)" 
          description="تحدث مع النظام بلغتك الطبيعية! اسأل عن أي عقار وسيقوم الذكاء الاصطناعي بفهم طلبك والبحث في قاعدة البيانات."
        >
          <div className="searchContainer panel">
            <form onSubmit={handleSearch} className="searchForm">
              <div className="textareaWrapper">
                <span className="material-icons-outlined searchIcon">auto_awesome</span>
                <textarea 
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)} 
                  className="smartTextarea" 
                  placeholder="مثال: هل عندنا أرض سكنية في الياقوت بحدود مليون؟"
                  disabled={loading}
                />
              </div>
              
              <div className="formActions">
                <div className="quickSearches">
                  <span className="mutedText">اقتراحات:</span>
                  <div className="pills">
                    {QUICK_SEARCHES.map((text, idx) => (
                      <button 
                        key={idx} 
                        type="button" 
                        className="quickPill" 
                        onClick={() => setQuestion(text)}
                        disabled={loading}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btnPrimary" disabled={loading || !question.trim()}>
                  {loading ? (
                    <><span className="material-icons-outlined spin">autorenew</span> جاري البحث...</>
                  ) : (
                    <><span className="material-icons-outlined">search</span> ابحث الآن</>
                  )}
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="alert alertError">
               <span className="material-icons-outlined">error</span> {error}
            </div>
          )}

          {answer && (
            <div className="resultsSection">
              <SearchAnswerCard answer={answer} results={results} />
            </div>
          )}
        </AdminShell>
      </AdminGuard>

      <style jsx>{`
        .panel { background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 25px; padding: 20px; }
        
        .searchContainer { background: #fcfcfd; }
        
        .searchForm { display: flex; flex-direction: column; gap: 15px; }
        
        .textareaWrapper { position: relative; }
        .searchIcon { position: absolute; top: 15px; right: 15px; color: var(--primary); font-size: 24px; pointer-events: none; }
        
        .smartTextarea { width: 100%; min-height: 120px; padding: 15px 45px 15px 15px; border-radius: 14px; border: 1px solid #cbd5e0; resize: vertical; font-family: inherit; font-size: 16px; line-height: 1.8; background: white; color: #2d3748; transition: all 0.2s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
        .smartTextarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1); }
        .smartTextarea:disabled { background: #f7fafc; color: #a0aec0; cursor: not-allowed; }

        .formActions { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 15px; }
        
        .quickSearches { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .mutedText { font-size: 12px; color: #718096; font-weight: 700; }
        .pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .quickPill { background: white; border: 1px solid #e2e8f0; color: #4a5568; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .quickPill:hover:not(:disabled) { background: #e6fcf5; border-color: #b2f5ea; color: var(--primary); }
        .quickPill:disabled { opacity: 0.5; cursor: not-allowed; }

        .btnPrimary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; border: none; background: var(--primary); color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .btnPrimary:hover:not(:disabled) { background: #0d665f; }
        .btnPrimary:disabled { background: #a0aec0; cursor: not-allowed; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .alert { display: flex; align-items: center; gap: 10px; padding: 15px; border-radius: 12px; margin-bottom: 20px; font-weight: 600; }
        .alertError { background: #fff5f5; color: #e53e3e; border: 1px solid #fed7d7; }

        .resultsSection { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
