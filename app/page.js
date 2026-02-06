'use client';

const WHATSAPP = 'https://wa.me/966000000000'; // غيّر الرقم

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="heroText">
          <h1>موقع عقارات أبحر الشمالية</h1>
          <p className="muted">
            عروض وطلبات الأراضي والفلل والشقق في أبحر الشمالية (الزمرد، الياقوت، الشراع، الصواري…).
            قريبًا: فلترة متقدمة + بوت واتساب للرد التلقائي وتسجيل العروض.
          </p>

          <div className="heroActions">
            <a className="btn btnPrimary" href={WHATSAPP} target="_blank" rel="noreferrer">
              تواصل واتساب
            </a>
            <a className="btn" href="#offers">
              شاهد العروض
            </a>
            <a className="btn" href="#request">
              اطلب عقارك
            </a>
          </div>

          <div className="heroBadges">
            <span className="badge">مباشر</span>
            <span className="badge">أبحر الشمالية</span>
            <span className="badge">تحديث يومي</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="card">
            <div className="cardTitle">ابحث بسرعة</div>
            <div className="cardBody">
              <div className="row">
                <input className="input" placeholder="حي / مخطط / جزء (مثال: الزمرد 340)" />
                <a className="btn btnPrimary" href="#offers">
                  بحث
                </a>
              </div>
              <div className="muted small">
                * هذه نسخة أولية. بنضيف قاعدة بيانات + فلترة + صفحة العروض.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="offers">
        <h2>عروض مميزة (تجريبي)</h2>
        <div className="grid">
          <div className="card">
            <div className="cardTitle">أرض — حي الزمرد</div>
            <div className="muted small">مخطط 340 • مساحة 600م • مباشر</div>
            <div className="price">1,250,000 ر.س</div>
            <a className="link" href={WHATSAPP} target="_blank" rel="noreferrer">اسأل على العرض</a>
          </div>

          <div className="card">
            <div className="cardTitle">فيلا — حي الياقوت</div>
            <div className="muted small">مساحة 375م • تشطيب ممتاز</div>
            <div className="price">2,950,000 ر.س</div>
            <a className="link" href={WHATSAPP} target="_blank" rel="noreferrer">اسأل على العرض</a>
          </div>

          <div className="card">
            <div className="cardTitle">شقة — حي الشراع</div>
            <div className="muted small">3 غرف • قريب من الخدمات</div>
            <div className="price">650,000 ر.س</div>
            <a className="link" href={WHATSAPP} target="_blank" rel="noreferrer">اسأل على العرض</a>
          </div>
        </div>
      </section>

      <section className="section" id="request">
        <h2>اطلب عقارك</h2>
        <div className="card">
          <div className="cardBody">
            <div className="row">
              <input className="input" placeholder="اكتب طلبك (مثال: أرض 500م الزمرد 339)" />
              <a className="btn btnPrimary" href={WHATSAPP} target="_blank" rel="noreferrer">
                إرسال على واتساب
              </a>
            </div>
            <div className="muted small">
              لاحقًا: هذا النموذج بيرسل الطلب للبوت ويحفظه تلقائيًا.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
