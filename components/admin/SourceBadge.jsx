'use client';

export default function SourceBadge({ item = {} }) {
  const sourceType = item.sourceType || item.source?.sourceType || 'الوارد الذكي';
  const contactName = item.sourceContactName || item.source?.contactName || 'مجهول';
  const contactPhone = item.sourceContactPhone || item.source?.contactPhone || '—';
  const contactRole = item.sourceContactRole || item.source?.contactRole || 'مسوق';

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <div className="sourceCard">
        <div className="sourceHeader">
          <span className="material-icons-outlined sourceIcon">hub</span>
          <span className="sourceType">{sourceType}</span>
        </div>
        
        <div className="sourceBody">
          <div className="infoLine">
            <span className="material-icons-outlined iconMuted">person</span>
            <span className="infoText" title="الاسم والصفة">
               {contactName} <span className="roleTag">({contactRole})</span>
            </span>
          </div>
          
          <div className="infoLine">
            <span className="material-icons-outlined iconMuted">phone_iphone</span>
            {contactPhone !== '—' && contactPhone ? (
              <a href={`tel:${contactPhone}`} className="phoneLink" dir="ltr" title="اتصال مباشر">{contactPhone}</a>
            ) : (
              <span className="infoText muted">—</span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .sourceCard { display: inline-flex; flex-direction: column; background: rgba(15, 118, 110, 0.05); border: 1px solid rgba(15, 118, 110, 0.2); border-radius: 12px; padding: 10px 14px; min-width: 180px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        
        .sourceHeader { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed rgba(15, 118, 110, 0.3); }
        .sourceIcon { font-size: 16px; color: var(--primary); }
        .sourceType { font-size: 12px; font-weight: 800; color: #0d665f; }
        
        .sourceBody { display: flex; flex-direction: column; gap: 8px; }
        
        .infoLine { display: flex; align-items: center; gap: 8px; color: #0f172a; }
        .iconMuted { font-size: 16px; color: #64748b; }
        
        .infoText { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
        .roleTag { font-size: 11px; color: #64748b; font-weight: 600; }
        
        .phoneLink { font-size: 14px; font-weight: 800; color: var(--primary); text-decoration: none; font-family: monospace; transition: all 0.2s; padding: 2px 6px; background: white; border-radius: 6px; border: 1px solid rgba(15, 118, 110, 0.2); }
        .phoneLink:hover { background: rgba(15, 118, 110, 0.1); color: #0d665f; border-color: rgba(15, 118, 110, 0.4); }
        
        .muted { color: #94a3b8; }
      `}</style>
    </>
  );
}
