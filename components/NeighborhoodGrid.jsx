'use client';

import Link from 'next/link';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

function uniqueNeighborhoods(list) {
  return [...new Set((Array.isArray(list) ? list : []).map((name) => String(name || '').trim()).filter(Boolean))];
}

export default function NeighborhoodGrid({ title = 'تصفح الأحياء', showViewAll = true }) {
  const list = uniqueNeighborhoods(NEIGHBORHOODS);
  if (!list.length) return null;

  return (
    <section className="nb-section nbSection" aria-label={title} dir="rtl" style={styles.section}>
      <div className="nb-header nbHeader" style={styles.header}>
        <div style={styles.titleWrap}>
          <h2 className="nb-title nbTitle" style={styles.title}>{title}</h2>
        </div>
        {showViewAll ? (
          <Link href="/neighborhoods" className="nb-view-btn nbViewBtn" style={styles.viewAll}>
            عرض جميع الأحياء
          </Link>
        ) : null}
      </div>

      <div className="nb-scroll-area nbScrollArea" role="list" aria-label="قائمة الأحياء" style={styles.scrollArea}>
        <div className="nb-chips-wrapper nbChipsWrapper" style={styles.chipsWrapper}>
          {list.map((name) => (
            <Link
              key={name}
              role="listitem"
              href={`/listings?neighborhood=${encodeURIComponent(name)}`}
              className="nb-chip nbChip"
              prefetch={false}
              style={styles.chip}
            >
              <span className="nb-dot dot" aria-hidden="true" style={styles.dot} />
              <span style={styles.chipText}>{name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles = {
  section: {
    width: '100%',
    maxWidth: '100%',
    margin: '24px 0 28px',
    overflow: 'hidden',
    padding: '4px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  titleWrap: {
    minWidth: 0,
  },
  title: {
    margin: 0,
    color: '#111827',
    fontSize: 'clamp(20px, 4vw, 28px)',
    lineHeight: 1.35,
    fontWeight: 950,
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  },
  viewAll: {
    flex: '0 0 auto',
    color: '#111827',
    fontSize: 14,
    fontWeight: 850,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    opacity: 0.82,
  },
  scrollArea: {
    width: '100%',
    maxWidth: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    padding: '4px 1px 14px',
    overscrollBehaviorInline: 'contain',
  },
  chipsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 10,
    width: 'max-content',
    minWidth: '100%',
  },
  chip: {
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 'max-content',
    minHeight: 43,
    padding: '0 15px',
    borderRadius: 999,
    background: '#fff',
    border: '1px solid rgba(216, 178, 95, 0.38)',
    color: '#1f2937',
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.05)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 850,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  dot: {
    flex: '0 0 auto',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #d8b25f, #b8842f)',
    boxShadow: '0 0 0 4px rgba(216, 178, 95, 0.14)',
  },
  chipText: {
    whiteSpace: 'nowrap',
  },
};
