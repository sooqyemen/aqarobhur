'use client';

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
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 900;
          cursor: pointer;
          transition: 120ms;
        }
        .chipActive {
          border-color: #1d4ed8;
          background: rgba(29, 78, 216, 0.08);
        }
        .chipsOuter[aria-disabled='true'] {
          opacity: 0.55;
        }
        .chip:disabled {
          cursor: not-allowed;
        }

        /* أصغر على الجوال */
        @media (max-width: 640px) {
          .chip {
            padding: 7px 10px;
            font-weight: 800;
          }
        }
      `}</style>
    </div>
  );
}
