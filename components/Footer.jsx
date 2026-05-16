'use client';

import Link from 'next/link';
import styles from './Footer.module.css';

const quickLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/neighborhoods', label: 'الأحياء' },
  { href: '/map', label: 'الخريطة' },
  { href: '/request', label: 'أرسل طلبك' },
  { href: '/add', label: 'إضافة إعلان' },
];

const infoLinks = [
  { href: '/about', label: 'من نحن' },
  { href: '/terms', label: 'شروط الاستخدام' },
  { href: '/privacy', label: 'سياسة الخصوصية' },
  { href: '/faq', label: 'الأسئلة الشائعة' },
  { href: '/contact', label: 'تواصل معنا' },
];

const seoLinks = [
  { href: '/listings?dealType=sale', label: 'عقارات للبيع في أبحر الشمالية' },
  { href: '/listings?propertyType=أرض&dealType=sale', label: 'أراضي للبيع شمال جدة' },
  { href: '/listings?propertyType=شقة&dealType=rent', label: 'شقق للإيجار شمال جدة' },
  { href: '/listings?propertyType=فيلا&dealType=sale', label: 'فلل للبيع في أبحر' },
  { href: '/listings?neighborhood=جوهرة العروس', label: 'عقارات جوهرة العروس' },
  { href: '/listings?neighborhood=الهجرة', label: 'عقارات الهجرة' },
  { href: '/listings?neighborhood=طيبة الفرعية', label: 'عقارات طيبة الفرعية' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.premiumFooter}>
      <div className={`container ${styles.footerGrid}`}>
        <section className={styles.footerBrand}>
          <div className={styles.footerLogo}>
            <span className={styles.mark}>ع</span>
            <div>
              <strong>عقار أبحر</strong>
              <small>عقارك في أبحر وشمال جدة</small>
            </div>
          </div>
          <p>
            منصة عقارية متخصصة في أرقى أحياء أبحر وشمال جدة. نربط بين البائعين والمشترين
            بشفافية واحترافية.
          </p>
          <div className={styles.socials} aria-label="روابط التواصل">
            <a href="#" aria-label="Instagram">◎</a>
            <a href="#" aria-label="X">𝕏</a>
            <a href="#" aria-label="WhatsApp">☎</a>
            <a href="#" aria-label="YouTube">▶</a>
          </div>
        </section>

        <section className={styles.footerColumn}>
          <h3>روابط مهمة</h3>
          {quickLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </section>

        <section className={styles.footerColumn}>
          <h3>معلومات</h3>
          {infoLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </section>

        <section className={`${styles.footerColumn} ${styles.contactColumn}`}>
          <h3>تواصل معنا</h3>
          <a href="tel:+966501234567">+966 50 123 4567</a>
          <a href="mailto:info@aqarabhur.com">info@aqarabhur.com</a>
          <span>أبحر الشمالية، جدة</span>
          <span>المملكة العربية السعودية</span>
        </section>
      </div>

      <div className={`container ${styles.footerSeo}`}>
        {seoLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </div>

      <div className={`container ${styles.footerBottom}`}>
        <p>© {currentYear} عقار أبحر. جميع الحقوق محفوظة.</p>
        <span>تصميم وتطوير</span>
      </div>
    </footer>
  );
}
