'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      
      <main className="aboutPage">
        {/* Hero Section */}
        <section className="aboutHero">
          <div className="container">
            <div className="heroContent">
              <h1 className="heroTitle">
                منصة <span>عقار أبحر</span> <br />
                شريكك الموثوق في عالم العقار
              </h1>
              <p className="heroSubtitle">
                نقدم حلولاً عقارية متكاملة تجمع بين الخبرة والشفافية والابتكار لنساعدك في العثور على عقار أحلامك أو تسويق عقارك بكفاءة.
              </p>
            </div>
          </div>
          <div className="heroPattern"></div>
        </section>

        {/* About Content */}
        <section className="aboutContent">
          <div className="container">
            <div className="contentGrid">
              <div className="textBlock">
                <h2 className="sectionTitle">من نحن</h2>
                <p className="lead">
                  عقار أبحر هي منصة عقارية سعودية رائدة انطلقت من قلب جدة لتخدم سوق العقارات في منطقة أبحر وما حولها.
                </p>
                <p>
                  تأسست المنصة على يد فريق من الخبراء العقاريين والتقنيين بهدف تبسيط عملية البحث عن العقارات وعرضها، وتوفير تجربة مستخدم سلسة وشفافة. نؤمن بأن التكنولوجيا يمكن أن تحدث فرقاً حقيقياً في القطاع العقاري، ولذلك نستثمر في أحدث الأدوات الرقمية لخدمة عملائنا.
                </p>
                <p>
                  سواء كنت تبحث عن فيلا فاخرة، شقة تمليك، أرض استثمارية، أو ترغب في بيع عقارك أو تأجيره، فإن عقار أبحر توفر لك منصة شاملة تلبي احتياجاتك بكل احترافية.
                </p>
              </div>
              <div className="imageBlock">
                <div className="imageWrapper">
                  <Image 
                    src="/images/about-office.jpg" 
                    alt="مكتب عقار أبحر" 
                    width={600} 
                    height={400}
                    className="aboutImage"
                    priority
                  />
                  <div className="imageBadge">
                    <span className="material-icons-outlined">verified</span>
                    مرخصون ومعتمدون
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="visionMission">
          <div className="container">
            <div className="vmGrid">
              <div className="vmCard">
                <div className="iconCircle">
                  <span className="material-icons-outlined">visibility</span>
                </div>
                <h3>رؤيتنا</h3>
                <p>أن نكون المنصة العقارية الأولى في منطقة أبحر وجدة، والمعيار الذهبي للثقة والشفافية في السوق العقاري السعودي.</p>
              </div>
              <div className="vmCard">
                <div className="iconCircle">
                  <span className="material-icons-outlined">flag</span>
                </div>
                <h3>رسالتنا</h3>
                <p>تمكين الأفراد والمستثمرين من اتخاذ قرارات عقارية ذكية من خلال توفير معلومات دقيقة وأدوات بحث متطورة وتجربة استخدام استثنائية.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="valuesSection">
          <div className="container">
            <h2 className="sectionTitle center">قيمنا الأساسية</h2>
            <div className="valuesGrid">
              <div className="valueCard">
                <span className="material-icons-outlined">verified_user</span>
                <h4>الشفافية</h4>
                <p>نلتزم بتقديم معلومات دقيقة وكاملة عن كل عقار، دون إخفاء أو تلاعب.</p>
              </div>
              <div className="valueCard">
                <span className="material-icons-outlined">handshake</span>
                <h4>الأمانة</h4>
                <p>نبني علاقاتنا مع العملاء على أساس الثقة والصدق في كل تعامل.</p>
              </div>
              <div className="valueCard">
                <span className="material-icons-outlined">auto_awesome</span>
                <h4>الابتكار</h4>
                <p>نطور منصتنا باستمرار باستخدام أحدث التقنيات لتقديم تجربة فريدة.</p>
              </div>
              <div className="valueCard">
                <span className="material-icons-outlined">groups</span>
                <h4>التركيز على العميل</h4>
                <p>رضاكم هو أولويتنا القصوى، ونعمل بجد لتلبية تطلعاتكم.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="statsSection">
          <div className="container">
            <div className="statsGrid">
              <div className="statItem">
                <span className="statNumber">+500</span>
                <span className="statLabel">عقار معروض</span>
              </div>
              <div className="statItem">
                <span className="statNumber">+1200</span>
                <span className="statLabel">عميل سعيد</span>
              </div>
              <div className="statItem">
                <span className="statNumber">+15</span>
                <span className="statLabel">عاماً من الخبرة</span>
              </div>
              <div className="statItem">
                <span className="statNumber">24/7</span>
                <span className="statLabel">دعم متواصل</span>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section (Optional) */}
        <section className="teamSection">
          <div className="container">
            <h2 className="sectionTitle center">فريق القيادة</h2>
            <p className="teamSubtitle">يقود منصتنا فريق من الخبراء العقاريين والمتخصصين في التكنولوجيا</p>
            <div className="teamGrid">
              <div className="teamCard">
                <div className="teamAvatar">👤</div>
                <h4>أحمد الغامدي</h4>
                <p className="teamRole">المؤسس والمدير التنفيذي</p>
                <p className="teamBio">خبرة 20 عاماً في التطوير العقاري والاستثمار.</p>
              </div>
              <div className="teamCard">
                <div className="teamAvatar">👤</div>
                <h4>سارة الحربي</h4>
                <p className="teamRole">رئيس قسم التسويق</p>
                <p className="teamBio">متخصصة في التسويق الرقمي وتجربة العملاء.</p>
              </div>
              <div className="teamCard">
                <div className="teamAvatar">👤</div>
                <h4>خالد الشهري</h4>
                <p className="teamRole">مدير التقنية</p>
                <p className="teamBio">خبير في تطوير المنصات العقارية والذكاء الاصطناعي.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ctaSection">
          <div className="container">
            <div className="ctaBox">
              <h2>هل أنت مستعد لبدء رحلتك العقارية؟</h2>
              <p>تصفح العروض المميزة أو أضف عقارك مجاناً</p>
              <div className="ctaButtons">
                <Link href="/listings" className="btn btnPrimary">
                  تصفح العقارات
                </Link>
                <Link href="/request" className="btn btnOutline">
                  أرسل طلباً
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .aboutPage {
          background: var(--bg);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Hero Section */
        .aboutHero {
          position: relative;
          background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
          color: white;
          padding: 80px 0;
          overflow: hidden;
        }

        .heroPattern {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }

        .heroContent {
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .heroTitle {
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 900;
          margin-bottom: 20px;
          line-height: 1.3;
        }

        .heroTitle span {
          color: #fbbf24;
        }

        .heroSubtitle {
          font-size: 18px;
          opacity: 0.9;
          line-height: 1.8;
          max-width: 700px;
          margin: 0 auto;
        }

        /* About Content Grid */
        .aboutContent {
          padding: 80px 0;
          background: white;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .textBlock .sectionTitle {
          font-size: 32px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 24px;
          position: relative;
          padding-bottom: 16px;
        }

        .textBlock .sectionTitle::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 60px;
          height: 4px;
          background: var(--primary);
          border-radius: 4px;
        }

        .lead {
          font-size: 20px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .textBlock p {
          color: var(--muted);
          line-height: 1.9;
          margin-bottom: 20px;
          font-size: 16px;
        }

        .imageWrapper {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .aboutImage {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
        }

        .imageBadge {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          color: white;
          padding: 10px 20px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* Vision & Mission */
        .visionMission {
          padding: 60px 0;
          background: var(--bg-soft);
        }

        .vmGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px;
        }

        .vmCard {
          background: white;
          padding: 40px 30px;
          border-radius: 24px;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          text-align: center;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .vmCard:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .iconCircle {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(15, 118, 110, 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .iconCircle .material-icons-outlined {
          font-size: 36px;
        }

        .vmCard h3 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 16px;
          color: var(--text);
        }

        .vmCard p {
          color: var(--muted);
          line-height: 1.8;
          font-size: 16px;
        }

        /* Values */
        .valuesSection {
          padding: 80px 0;
          background: white;
        }

        .sectionTitle.center {
          text-align: center;
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 50px;
          color: var(--text);
        }

        .valuesGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .valueCard {
          text-align: center;
          padding: 30px 20px;
          border-radius: 20px;
          background: var(--bg-soft);
          border: 1px solid var(--border);
          transition: all 0.3s;
        }

        .valueCard:hover {
          background: white;
          box-shadow: var(--shadow-md);
          border-color: var(--primary);
        }

        .valueCard .material-icons-outlined {
          font-size: 40px;
          color: var(--primary);
          margin-bottom: 20px;
        }

        .valueCard h4 {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 12px;
          color: var(--text);
        }

        .valueCard p {
          color: var(--muted);
          line-height: 1.7;
          font-size: 14px;
        }

        /* Statistics */
        .statsSection {
          padding: 60px 0;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
          text-align: center;
        }

        .statItem {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .statNumber {
          font-size: 48px;
          font-weight: 900;
          color: #5eead4;
        }

        .statLabel {
          font-size: 16px;
          opacity: 0.8;
        }

        /* Team */
        .teamSection {
          padding: 80px 0;
          background: var(--bg-soft);
        }

        .teamSubtitle {
          text-align: center;
          color: var(--muted);
          margin-bottom: 50px;
          font-size: 18px;
        }

        .teamGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .teamCard {
          background: white;
          padding: 40px 20px;
          border-radius: 24px;
          text-align: center;
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: transform 0.3s;
        }

        .teamCard:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .teamAvatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 48px;
        }

        .teamCard h4 {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 6px;
          color: var(--text);
        }

        .teamRole {
          color: var(--primary);
          font-weight: 600;
          margin-bottom: 12px;
        }

        .teamBio {
          color: var(--muted);
          font-size: 14px;
        }

        /* CTA */
        .ctaSection {
          padding: 60px 0 80px;
          background: white;
        }

        .ctaBox {
          background: linear-gradient(145deg, #0f766e, #0d5f58);
          border-radius: 32px;
          padding: 60px 40px;
          text-align: center;
          color: white;
          box-shadow: var(--shadow-lg);
        }

        .ctaBox h2 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .ctaBox p {
          font-size: 18px;
          opacity: 0.9;
          margin-bottom: 32px;
        }

        .ctaButtons {
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .btnOutline {
          background: transparent;
          border: 2px solid white;
          color: white;
          padding: 14px 32px;
          border-radius: 50px;
          font-weight: 700;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btnOutline:hover {
          background: white;
          color: var(--primary);
        }

        /* Responsive */
        @media (max-width: 900px) {
          .contentGrid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .valuesGrid {
            grid-template-columns: repeat(2, 1fr);
          }
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
          }
          .teamGrid {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }
        }

        @media (max-width: 640px) {
          .valuesGrid {
            grid-template-columns: 1fr;
          }
          .statsGrid {
            grid-template-columns: 1fr;
          }
          .vmGrid {
            grid-template-columns: 1fr;
          }
          .ctaButtons {
            flex-direction: column;
          }
          .heroTitle {
            font-size: 28px;
          }
          .sectionTitle.center {
            font-size: 28px;
          }
        }
      `}</style>
    </>
  );
}
