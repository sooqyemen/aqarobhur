export const metadata = {
  title: 'شروط الاستخدام | عقار أبحر',
  description: 'شروط استخدام موقع عقار أبحر للخدمات العقارية.',
};

export default function TermsPage() {
  return (
    <main className="page" dir="rtl">
      <section className="hero">
        <h1>شروط الاستخدام</h1>
        <p>توضح هذه الصفحة الشروط العامة لاستخدام موقع عقار أبحر والخدمات العقارية المتاحة من خلاله.</p>
      </section>

      <section className="card">
        <h2>استخدام الموقع</h2>
        <p>يرجى استخدام الموقع بطريقة نظامية ومناسبة، وعدم إساءة استخدام النماذج أو وسائل التواصل الموجودة في الموقع.</p>
      </section>

      <section className="card">
        <h2>المعلومات العقارية</h2>
        <p>نسعى لعرض المعلومات العقارية بشكل واضح، وقد تتغير الأسعار أو حالة التوفر أو تفاصيل العقار بحسب تحديثات السوق.</p>
      </section>

      <section className="card">
        <h2>طلبات العملاء</h2>
        <p>عند إرسال طلب عبر الموقع، يتم استخدام بيانات التواصل لمتابعة الطلب والرد على العميل بما يناسب احتياجه العقاري.</p>
      </section>

      <section className="card">
        <h2>التواصل</h2>
        <p>لأي استفسار يمكن التواصل عبر الجوال: +966 59 752 0693 أو البريد الإلكتروني: Aqarobhur@gmail.com.</p>
      </section>

      <style jsx>{`
        .page { max-width: 980px; margin: 0 auto; padding: 34px 16px 54px; color: #111827; }
        .hero { padding: 30px 24px; border-radius: 24px; background: linear-gradient(135deg, #fff7e8, #fff, #eef7f5); border: 1px solid rgba(184,132,47,.18); margin-bottom: 16px; }
        h1 { margin: 0 0 10px; font-size: clamp(28px, 5vw, 42px); font-weight: 950; color: #0f172a; }
        .hero p, .card p { margin: 0; color: #64748b; font-size: 16px; line-height: 2; font-weight: 700; }
        .card { background: #fff; border: 1px solid rgba(15,23,42,.08); border-radius: 20px; padding: 20px; margin-top: 14px; box-shadow: 0 10px 28px rgba(15,23,42,.035); }
        .card h2 { margin: 0 0 10px; font-size: 20px; color: #0f172a; font-weight: 950; }
        @media (max-width: 640px) { .hero, .card { border-radius: 18px; padding: 18px; } }
      `}</style>
    </main>
  );
}
