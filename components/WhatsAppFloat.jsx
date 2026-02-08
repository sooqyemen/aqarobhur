// components/WhatsAppFloat.jsx
'use client';

export default function WhatsAppFloat() {
  const phoneNumber = '+966500000000';
  const message = 'مرحباً، أريد الاستفسار عن عروض عقار أبحر';

  const handleClick = () => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <button 
        className="whatsAppFloat"
        onClick={handleClick}
        aria-label="تواصل معنا على واتساب"
      >
        <div className="floatIcon">💬</div>
        <div className="floatLabel">واتساب</div>
        <div className="floatBadge">جديد</div>
      </button>

      <style jsx>{`
        .whatsAppFloat {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: white;
          padding: 16px 20px;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          box-shadow: 0 12px 32px rgba(37, 211, 102, 0.3);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
        }
        
        .whatsAppFloat:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 20px 50px rgba(37, 211, 102, 0.4);
        }
        
        .whatsAppFloat:active {
          transform: translateY(-2px) scale(1.02);
        }
        
        .floatIcon {
          font-size: 24px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .floatLabel {
          white-space: nowrap;
        }
        
        .floatBadge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          backdrop-filter: blur(10px);
          animation: glow 2s infinite;
        }
        
        @keyframes glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @media (max-width: 768px) {
          .whatsAppFloat {
            bottom: 16px;
            left: 16px;
            padding: 14px 18px;
            font-size: 14px;
          }
          
          .floatLabel {
            display: none;
          }
          
          .floatBadge {
            display: none;
          }
          
          .floatIcon {
            font-size: 22px;
          }
        }
        
        @media (max-width: 480px) {
          .whatsAppFloat {
            bottom: 12px;
            left: 12px;
            padding: 12px 16px;
          }
          
          .floatIcon {
            font-size: 20px;
          }
        }
      `}</style>
    </>
  );
}
