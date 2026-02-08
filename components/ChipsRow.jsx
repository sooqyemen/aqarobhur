'use client';

export default function ChipsRow({ value, options, onChange, disabled }) {
  return (
    <div className="chipsWrap" aria-disabled={disabled ? 'true' : 'false'}>
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

      <style jsx>{`
        .chipsWrap {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .chip {
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
          transition: 120ms;
        }
        .chip:hover {
          transform: translateY(-1px);
        }
        .chipActive {
          border-color: #1d4ed8;
          background: rgba(29, 78, 216, 0.08);
        }
        .chipsWrap[aria-disabled='true'] {
          opacity: 0.6;
        }
        .chip:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
