import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          {/* القسم الأول: الهوية */}
          <div className="footer-brand">
            <div className="footer-logo">
              <strong>عقار<span> أبحر</span></strong>
            </div>
            <p className="footer-tagline">
              وجهتك الموثوقة للخدمات العقارية والحلول السكنية في شمال جدة.
            </p>
          </div>

          {/* القسم الثاني: روابط سريعة */}
          <div className="footer-nav">
            <div className="footer-col">
              <h4>الشركة</h4>
              <Link href="/about">من نحن</Link>
              <Link href="/contact">اتصل بنا</Link>
            </div>
            <div className="footer-col">
              <h4>الخدمات</h4>
              <Link href="/marketing-request">تسويق عقار</Link>
              <Link href="/ejar-request">توثيق عقود</Link>
            </div>
            <div className="footer-col">
              <h4>العقارات</h4>
              <Link href="/listings">أحدث العروض</Link>
              <Link href="/neighborhoods">الأحياء</Link>
            </div>
          </div>
        </div>

        {/* القسم السفلي: الحقوق والتواصل */}
        <div className="footer-bottom">
          <p className="copyright">
            © {currentYear} عقار أبحر. جميع الحقوق محفوظة.
          </p>
          <div className="footer-socials">
            <a href="#" aria-label="Snapchat" className="social-icon">Snapchat</a>
            <a href="#" aria-label="Twitter" className="social-icon">X</a>
            <a href="#" aria-label="Instagram" className="social-icon">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
