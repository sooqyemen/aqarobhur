'use client';

// نفس ChipsRow.js (موجودة للحفاظ على التوافق إن كان أي ملف يستورد .jsx صراحة)
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
  background: var(--card);
  color: var(--text);
  font-weight: 900;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.chipActive {
  border-color: rgba(30,115,216,.28);
  background: rgba(30,115,216,.10);
  color: var(--primary2);
}
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`}</style>
    </div>
  );
}
