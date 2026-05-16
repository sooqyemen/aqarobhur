export const metadata = {
  title: 'سياسة الخصوصية | عقار أبحر',
  description: 'سياسة الخصوصية الخاصة بموقع عقار أبحر للخدمات العقارية.',
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

export default function PrivacyPage() {
  return (
    <main style={styles.page} dir="rtl">
      <section style={styles.hero}>
        <h1 style={styles.title}>سياسة الخصوصية</h1>
        <p style={styles.text}>نحرص في عقار أبحر على حماية بيانات العملاء واستخدامها فقط لغرض التواصل وتقديم الخدمة العقارية.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>البيانات التي نجمعها</h2>
        <p style={styles.text}>نجمع الاسم ورقم الجوال عند إرسال طلب أو تعبئة نموذج تواصل، وذلك حتى نستطيع متابعة الطلب والرد على العميل.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>استخدام البيانات</h2>
        <p style={styles.text}>تستخدم البيانات للتواصل مع العميل بخصوص طلبه العقاري، أو الرد على الاستفسارات المرسلة عبر الموقع.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>حماية البيانات</h2>
        <p style={styles.text}>لا نستخدم بيانات التواصل إلا للأغراض المرتبطة بالخدمة، ونسعى للحفاظ عليها وعدم مشاركتها إلا عند الحاجة لتقديم الخدمة المطلوبة.</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>التواصل</h2>
        <p style={styles.text}>لأي استفسار متعلق بالخصوصية يمكن التواصل عبر الجوال: +966 59 752 0693 أو البريد الإلكتروني: Aqarobhur@gmail.com.</p>
      </section>
    </main>
  );
}
