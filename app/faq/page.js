export const metadata = {
  title: 'الأسئلة الشائعة | عقار أبحر',
  description: 'إجابات مختصرة على الأسئلة الشائعة حول خدمات عقار أبحر.',
};

const faqs = [
  {
    q: 'ما خدمات عقار أبحر؟',
    a: 'نقدم خدمات عقارية في جدة وشمال جدة، تشمل التسويق العقاري واستقبال طلبات العملاء ومتابعة العروض المناسبة.',
  },
  {
    q: 'ما نطاق الخدمة؟',
    a: 'نخدم شمال جدة، أبحر الشمالية، خليج سلمان، والمناطق القريبة.',
  },
  {
    q: 'كيف أرسل طلبي العقاري؟',
    a: 'يمكنك إرسال طلبك من صفحة أرسل طلبك، وسيتم التواصل معك عبر رقم الجوال الذي تكتبه في النموذج.',
  },
  {
    q: 'هل يمكنني تسويق عقاري عبر عقار أبحر؟',
    a: 'يمكنك التواصل معنا وإرسال بيانات العقار، وسيتم مراجعتها والرد عليك بما يناسب الخدمة المطلوبة.',
  },
  {
    q: 'هل يتم مراجعة العروض قبل ظهورها؟',
    a: 'نعم، نراجع بيانات العروض قبل عرضها حتى تكون المعلومات واضحة قدر الإمكان.',
  },
  {
    q: 'كيف أتواصل معكم؟',
    a: 'يمكنك التواصل عبر الجوال: +966 59 752 0693 أو البريد الإلكتروني: Aqarobhur@gmail.com.',
  },
];

export default function FaqPage() {
  return (
    <main className="page" dir="rtl">
      <section className="hero">
        <h1>الأسئلة الشائعة</h1>
        <p>إجابات سريعة على أهم الأسئلة حول خدمات عقار أبحر.</p>
      </section>

      <section className="grid">
        {faqs.map((item) => (
          <article className="card" key={item.q}>
            <h2>{item.q}</h2>
            <p>{item.a}</p>
          </article>
        ))}
      </section>

      <style jsx>{`
        .page { max-width: 980px; margin: 0 auto; padding: 34px 16px 54px; color: #111827; }
        .hero { padding: 30px 24px; border-radius: 24px; background: linear-gradient(135deg, #fff7e8, #fff, #eef7f5); border: 1px solid rgba(184,132,47,.18); margin-bottom: 16px; }
        h1 { margin: 0 0 10px; font-size: clamp(28px, 5vw, 42px); font-weight: 950; color: #0f172a; }
        .hero p, .card p { margin: 0; color: #64748b; font-size: 16px; line-height: 2; font-weight: 700; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .card { background: #fff; border: 1px solid rgba(15,23,42,.08); border-radius: 20px; padding: 20px; box-shadow: 0 10px 28px rgba(15,23,42,.035); }
        .card h2 { margin: 0 0 10px; font-size: 18px; color: #0f172a; font-weight: 950; }
        @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .hero, .card { border-radius: 18px; padding: 18px; } }
      `}</style>
    </main>
  );
}
