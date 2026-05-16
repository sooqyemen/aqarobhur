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

const styles = {
  page: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '34px 16px 54px',
    color: '#111827',
  },
  hero: {
    padding: '30px 24px',
    borderRadius: 24,
    background: 'linear-gradient(135deg, #fff7e8, #fff, #eef7f5)',
    border: '1px solid rgba(184,132,47,.18)',
    marginBottom: 16,
  },
  title: {
    margin: '0 0 10px',
    fontSize: 'clamp(28px, 5vw, 42px)',
    fontWeight: 950,
    color: '#0f172a',
  },
  text: {
    margin: 0,
    color: '#64748b',
    fontSize: 16,
    lineHeight: 2,
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
  },
  card: {
    background: '#fff',
    border: '1px solid rgba(15,23,42,.08)',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 10px 28px rgba(15,23,42,.035)',
  },
  cardTitle: {
    margin: '0 0 10px',
    fontSize: 18,
    color: '#0f172a',
    fontWeight: 950,
  },
};

export default function FaqPage() {
  return (
    <main style={styles.page} dir="rtl">
      <section style={styles.hero}>
        <h1 style={styles.title}>الأسئلة الشائعة</h1>
        <p style={styles.text}>إجابات سريعة على أهم الأسئلة حول خدمات عقار أبحر.</p>
      </section>

      <section style={styles.grid}>
        {faqs.map((item) => (
          <article style={styles.card} key={item.q}>
            <h2 style={styles.cardTitle}>{item.q}</h2>
            <p style={styles.text}>{item.a}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
