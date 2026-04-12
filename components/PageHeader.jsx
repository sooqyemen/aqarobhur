'use client';

export default function PageHeader({ icon, title, description, badgeText = 'نحن وسيط عقاري معتمد' }) {
  return (
    <header style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', background: 'rgba(15, 118, 110, 0.1)', color: 'var(--primary)', borderRadius: '16px', marginBottom: '16px' }}>
        <span className="material-icons-outlined" style={{ fontSize: '32px' }}>{icon}</span>
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text)', margin: '0 0 12px' }}>
        {title}
      </h1>
      
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e6fceb', color: '#15803d', padding: '8px 20px', borderRadius: '50px', fontSize: '14px', fontWeight: '800', marginBottom: '15px', border: '1px solid #bbf7d0' }}>
        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>verified_user</span>
        {badgeText}
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '16px', margin: 0, lineHeight: 1.8 }}>
        {description}
      </p>
    </header>
  );
}
