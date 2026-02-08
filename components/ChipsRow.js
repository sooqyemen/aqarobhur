'use client';

// شريط اختيارات (Chips) متوافق مع ثيم الموقع الداكن/الذهبي
// - يدعم التمرير الأفقي في الجوال
// - يعطّل الاختيارات إذا كان disabled

export default function ChipsRow({ value, options, onChange, disabled }) {
  return (
    <div className="chipsOuter" aria-disabled={disabled ? 'true' : 'false'}>
      <div className="chipsInner">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={`chip ${active ? 'chipActive' : ''}`}
              onClick={() => !disabled && onChange(active ? '' : opt.value)}
              disabled={disabled}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .chipsOuter {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .chipsInner {
          display: flex;
          gap: 8px;
          white-space: nowrap;
        }

        .chip {
          flex: 0 0 auto;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.04);
          color: var(--text);
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .chip:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.18);
        }

        .chipActive {
          border-color: rgba(214,179,91,0.55);
          background: rgba(214,179,91,0.12);
          color: #f6f0df;
        }

        .chipsOuter[aria-disabled='true'] {
          opacity: 0.55;
        }
        .chip:disabled {
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .chip {
            padding: 7px 10px;
            font-weight: 850;
          }
        }
      `}</style>
    </div>
  );
}
