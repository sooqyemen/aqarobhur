export const metadata = {
  title: 'سياسة الخصوصية | عقار أبحر',
  description: 'سياسة الخصوصية الخاصة بموقع عقار أبحر للخدمات العقارية.',
};

export default function PrivacyPage() {
  return (
    <main className="page" dir="rtl">
      <section className="hero">
        <h1>سياسة الخصوصية</h1>
        <p>نحرص في عقار أبحر على حماية بيانات العملاء واستخدامها فقط لغرض التواصل وتقديم الخدمة العقارية.</p>
      </section>

      <section className="card">
        <h2>البيانات التي نجمعها</h2>
        <p>نجمع الاسم ورقم الجوال عند إرسال طلب أو تعبئة نموذج تواصل، وذلك حتى نستطيع متابعة الطلب والرد على العميل.</p>
      </section>

      <section className="card">
        <h2>استخدام البيانات</h2>
        <p>تستخدم البيانات للتواصل مع العميل بخصوص طلبه العقاري، أو الرد على الاستفسارات المرسلة عبر الموقع.</p>
      </section>

      <section className="card">
        <h2>حماية البيانات</h2>
        <p>لا نستخدم بيانات التواصل إلا للأغراض المرتبطة بالخدمة، ونسعى للحفاظ عليها وعدم مشاركتها إلا عند الحاجة لتقديم الخدمة المطلوبة.</p>
      </section>

      <section className="card">
        <h2>التواصل</h2>
        <p>لأي استفسار متعلق بالخصوصية يمكن التواصل عبر الجوال: +966 59 752 0693 أو البريد الإلكتروني: Aqarobhur@gmail.com.</p>
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
