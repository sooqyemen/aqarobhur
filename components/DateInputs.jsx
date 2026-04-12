'use client';

export default function DateInputs({ dayName, monthName, yearName, dayVal, monthVal, yearVal, handleChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input type="number" name={dayName} value={dayVal} onChange={handleChange} className="input" placeholder="اليوم" min="1" max="31" required style={{ padding: '10px 5px', textAlign: 'center', fontSize: '14px' }} />
      <input type="number" name={monthName} value={monthVal} onChange={handleChange} className="input" placeholder="الشهر" min="1" max="12" required style={{ padding: '10px 5px', textAlign: 'center', fontSize: '14px' }} />
      <input type="number" name={yearName} value={yearVal} onChange={handleChange} className="input" placeholder="السنة" required style={{ padding: '10px 5px', textAlign: 'center', fontSize: '14px' }} />
    </div>
  );
}
