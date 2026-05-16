export const metadata = {
  title: 'شروط الاستخدام | عقار أبحر',
  description: 'شروط استخدام موقع عقار أبحر للخدمات العقارية.',
};

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
  card: {
    background: '#fff',
    border: '1px solid rgba(15,23,42,.08)',
    borderRadius: 20,
    padding: 20,
    marginTop: 14,
    boxShadow: '0 10px 28px rgba(15,23,42,.035)',
  },
  cardTitle: {
    margin: '0 0 10px',
    fontSize: 20,
    color: '#0f172a',
    fontWeight: 950,
  },
};

export default function TermsPage() {
  return (
    <main style={styles.page} dir="rtl">
      <section style={styles.hero}>
        <h1 style={styles.title}>شروط الاستخدام</h1>
        <p style={styles.text}>توضح هذه الصفحة الشروط العامة لاستخدام موقع عقار أبحر والخدمات العقارية المتاحة من خلاله.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>استخدام الموقع</h2>
        <p style={styles.text}>يرجى استخدام الموقع بطريقة نظامية ومناسبة، وعدم إساءة استخدام النماذج أو وسائل التواصل الموجودة في الموقع.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>المعلومات العقارية</h2>
        <p style={styles.text}>نسعى لعرض المعلومات العقارية بشكل واضح، وقد تتغير الأسعار أو حالة التوفر أو تفاصيل العقار بحسب تحديثات السوق.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>طلبات العملاء</h2>
        <p style={styles.text}>عند إرسال طلب عبر الموقع، يتم استخدام بيانات التواصل لمتابعة الطلب والرد على العميل بما يناسب احتياجه العقاري.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>التواصل</h2>
        <p style={styles.text}>لأي استفسار يمكن التواصل عبر الجوال: +966 59 752 0693 أو البريد الإلكتروني: Aqarobhur@gmail.com.</p>
      </section>
    </main>
  );
}
