// components/InfoItem.jsx

export default function InfoItem({ label, value, full = false }) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className={`infoItem ${full ? 'full' : ''}`}>
      <div className="infoLabel">{label}</div>
      <div className="infoValue">{value}</div>
    </div>
  );
}
