'use client';

import Link from 'next/link';

export default function Footer() {
  const rawPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '966597520693';
  const phone = String(rawPhone).trim();
  const waDigits = phone.replace(/^0/, '966').replace(/\D/g, '');
  const whatsappLink = `https://wa.me/${waDigits}`;

  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <footer className="siteFooter">
        <div className="container">
          <div className="footerGrid">
            
            {/* القسم الأول: الهوية والتعريف */}
            <section className="footerSection brandSection">
              <div className="brandHead">
                <div className="logoWrapper">
                  <img src="/icon-128x128.png" alt="عقار أبحر" className="brandLogo" loading="lazy" />
                </div>
                <div>
                  <h3 className="brandTitle">عقار أبحر</h3>
                  <p className="brandDesc">واجهة عقارية حديثة لعرض العقارات، استقبال الطلبات، وتسهيل التواصل المباشر لخدمتكم بشكل أسرع.</p>
                </div>
              </div>
              <div className="footerBadges">
                <span className="badge">بيع</span>
                <span className="badge">إيجار</span>
                <span className="badge">تسويق عقاري</span>
                <span className="badge">دعم واتساب</span>
              </div>
            </section>

            {/* القسم الثاني: الروابط السريعة */}
            <section className="footerSection">
              <h4 className="sectionTitle">روابط سريعة</h4>
              <nav className="footerLinks">
                <Link href="/" className="footerLink">
                  <span className="material-icons-outlined">chevron_left</span> الرئيسية
                </Link>
                <Link href="/listings" className="footerLink">
                  <span className="material-icons-outlined">chevron_left</span> كل العقارات
                </Link>
                <Link href="/map" className="footerLink">
                  <span className="material-icons-outlined">chevron_left</span> خريطة العقارات
                </Link>
                <Link href="/neighborhoods" className="footerLink">
                  <span className="material-icons-outlined">chevron_left</span> دليل الأحياء
                </Link>
                <Link href="/request" className="footerLink highlightLink">
                  <span className="material-icons-outlined">add_home_work</span> أرسل طلبك العقاري
                </Link>
              </nav>
            </section>

            {/* القسم الثالث: معلومات التواصل */}
            <section className="footerSection">
              <h4 className="sectionTitle">تواصل معنا</h4>
              <div className="contactList">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="contactItem whatsappBtn">
                  <span className="material-icons-outlined">chat</span>
                  <div className="contactInfo">
                    <span className="contactLabel">مراسلة عبر واتساب</span>
                    <span className="contactValue" dir="ltr">{phone}</span>
                  </div>
                </a>
                
                <a href={`tel:${phone}`} className="contactItem phoneBtn">
                  <span className="material-icons-outlined">phone_in_talk</span>
                  <div className="contactInfo">
                    <span className="contactLabel">اتصال هاتفي مباشر</span>
                    <span className="contactValue" dir="ltr">{phone}</span>
                  </div>
                </a>
                
                <div className="serviceBox">
                  <span className="material-icons-outlined">support_agent</span>
                  <span>الخدمة: استقبال طلبات البيع والإيجار والتسويق الحصري.</span>
                </div>
              </div>
            </section>

          </div>

          <div className="footerBottom">
             <p>© {new Date().getFullYear()} عقار أبحر. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .siteFooter {
          background: #0f172a; /* لون داكن فخم (Slate 900) */
          color: #f8fafc;
          padding: 60px 0 20px;
          margin-top: auto;
          border-top: 4px solid #3182ce;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .footerGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 40px;
          margin-bottom: 40px;
        }

        /* تنسيقات الهوية (القسم الأول) */
        .brandSection {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .brandHead {
          display: flex;
          align-items: flex-start;
          gap: 15px;
        }
        
        .logoWrapper {
          background: white;
          padding: 5px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .brandLogo {
          width: 50px;
          height: 50px;
          object-fit: contain;
        }
        
        .brandTitle {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
        }
        
        .brandDesc {
          margin: 0;
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.8;
        }

        .footerBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .badge {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
        }
        .badge:hover {
          background: rgba(49, 130, 206, 0.2);
          color: #63b3ed;
          border-color: rgba(49, 130, 206, 0.4);
        }

        /* تنسيقات العناوين والأقسام */
        .sectionTitle {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          position: relative;
          padding-bottom: 10px;
        }
        .sectionTitle::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 40px;
          height: 3px;
          background: #3182ce;
          border-radius: 2px;
        }

        /* تنسيقات الروابط (القسم الثاني) */
        .footerLinks {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .footerLink {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 15px;
          transition: all 0.2s;
        }
        
        .footerLink .material-icons-outlined {
          font-size: 16px;
          opacity: 0.5;
          transition: transform 0.2s;
        }
        
        .footerLink:hover {
          color: #63b3ed;
          transform: translateX(-5px);
        }
        .footerLink:hover .material-icons-outlined {
          opacity: 1;
        }

        .highlightLink {
          color: #63b3ed;
          font-weight: 600;
        }

        /* تنسيقات التواصل (القسم الثالث) */
        .contactList {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .contactItem {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        
        .whatsappBtn:hover {
          background: rgba(37, 211, 102, 0.1);
          border-color: rgba(37, 211, 102, 0.3);
        }
        .whatsappBtn .material-icons-outlined { color: #25D366; }
        
        .phoneBtn:hover {
          background: rgba(49, 130, 206, 0.1);
          border-color: rgba(49, 130, 206, 0.3);
        }
        .phoneBtn .material-icons-outlined { color: #63b3ed; }

        .contactInfo {
          display: flex;
          flex-direction: column;
        }
        .contactLabel {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 2px;
        }
        .contactValue {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          font-family: monospace;
        }

        .serviceBox {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
        }
        .serviceBox .material-icons-outlined {
          font-size: 18px;
          color: #64748b;
        }

        /* الحقوق السفلية */
        .footerBottom {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: #64748b;
          font-size: 14px;
        }
        .footerBottom p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .footerGrid { gap: 30px; }
          .siteFooter { padding: 40px 0 20px; }
        }
      `}</style>
    </>
  );
}
