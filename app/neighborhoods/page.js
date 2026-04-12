'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default function NeighborhoodsPage() {
  const list = Array.isArray(NEIGHBORHOODS) ? NEIGHBORHOODS : [];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '60px 0', direction: 'rtl' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0' }}>
            دليل الأحياء
          </h1>
          <p style={{ color: '#5b6474', fontSize: '16px', margin: 0 }}>
            تصفح العقارات المتاحة في أرقى أحياء شمال جدة
          </p>
        </header>

        {/* شبكة الأحياء - مضمونة التنسيق 100% */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '20px',
          width: '100%'
        }}>
          {list.map((name) => (
            <Link
              key={name}
              href={`/listings?neighborhood=${encodeURIComponent(name)}`}
              style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '20px',
                border: '1px solid #dde5ef',
                textDecoration: 'none',
                textAlign: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                display: 'block',
                transition: 'all 0.2s ease'
              }}
              // تأثيرات الماوس (Hover)
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#dde5ef';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {name}
              </h3>
              <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 800 }}>
                استكشف العقارات
              </span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
